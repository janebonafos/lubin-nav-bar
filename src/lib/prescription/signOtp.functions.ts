import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const medicationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Required prescribing fields present (dose, frequency, instructions). */
  fieldsComplete: z.boolean(),
  /** Medication-specific safety checks reviewed or cleared. */
  safetyChecksComplete: z.boolean(),
  /** High-risk / shared safety responses individually acknowledged. */
  highRiskAcknowledged: z.boolean(),
  /** Final clinician confirmation for this medication. */
  clinicianConfirmed: z.boolean(),
});

const reviewStateSchema = z.object({
  appointmentId: z.string().min(1),
  email: z.string().email(),
  prescriberName: z.string().optional(),
  jurisdiction: z.enum(["PH", "US"]),
  version: z.number().int().positive(),
  hash: z.string().min(4),
  /** Required patient information recorded. */
  patientInfoComplete: z.boolean(),
  /** Prescriber credentials required for this jurisdiction are on file. */
  identityComplete: z.boolean(),
  /** Controlled-substance workflow satisfied when applicable. */
  controlledReady: z.boolean(),
  medications: z.array(medicationSchema).min(1),
});

export type SigningReviewState = z.infer<typeof reviewStateSchema>;

/** Server-side gate: the same required review states, re-checked before signing. */
function reviewBlockers(state: SigningReviewState): string[] {
  const out: string[] = [];
  if (!state.patientInfoComplete) out.push("Required patient information is incomplete.");
  if (!state.identityComplete) out.push("Required prescriber information is incomplete.");
  if (!state.controlledReady) out.push("The controlled-substance workflow is incomplete.");
  for (const m of state.medications) {
    if (!m.fieldsComplete) out.push(`${m.name}: required prescribing details are incomplete.`);
    if (!m.safetyChecksComplete) out.push(`${m.name}: medication safety checks are outstanding.`);
    if (!m.highRiskAcknowledged)
      out.push(`${m.name}: a high-risk safety response has not been acknowledged.`);
    if (!m.clinicianConfirmed) out.push(`${m.name}: the clinician confirmation is missing.`);
  }
  return out;
}

export const requestSigningOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reviewStateSchema.parse(data))
  .handler(async ({ data }) => {
    const blockers = reviewBlockers(data);
    if (blockers.length > 0) {
      return { ok: false as const, blockers };
    }
    const { issueOtp, deliverSigningOtpEmail, maskEmail } = await import("./signOtp.server");
    const { code, ttlMinutes } = issueOtp({
      appointmentId: data.appointmentId,
      email: data.email,
      hash: data.hash,
    });
    const { delivered } = await deliverSigningOtpEmail({
      email: data.email,
      code,
      prescriberName: data.prescriberName,
      jurisdiction: data.jurisdiction === "PH" ? "Philippines" : "United States",
      medicationCount: data.medications.length,
      ttlMinutes,
    });
    return {
      ok: true as const,
      blockers: [] as string[],
      delivered,
      maskedEmail: maskEmail(data.email),
      ttlMinutes,
      // Only surfaced when no mail transport is configured, so signing is testable.
      fallbackCode: delivered ? undefined : code,
    };
  });

export const verifySigningOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    reviewStateSchema.extend({ code: z.string().regex(/^\d{6}$/) }).parse(data),
  )
  .handler(async ({ data }) => {
    const blockers = reviewBlockers(data);
    if (blockers.length > 0) {
      return { ok: false as const, blockers, error: blockers[0]! };
    }
    const { consumeOtp } = await import("./signOtp.server");
    const result = consumeOtp({
      appointmentId: data.appointmentId,
      email: data.email,
      hash: data.hash,
      code: data.code,
    });
    if (!result.ok) return { ok: false as const, blockers: [] as string[], error: result.error };
    return {
      ok: true as const,
      blockers: [] as string[],
      /** The prescription version recorded as clinically reviewed. */
      reviewedAt: result.reviewedAt,
      reviewedVersion: data.version,
      reviewedHash: data.hash,
    };
  });