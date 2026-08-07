import { createServerFn } from "@tanstack/react-start";

/** Returns the caller's Lubin prescribing verification record. Regulated
 *  credential numbers are held by the backend and only ever released to the
 *  prescriber's own prescribing tools — never to client-facing surfaces. */
export const getPrescribingVerification = createServerFn({ method: "GET" })
  .inputValidator((input: { providerName?: string; profession?: string }) => ({
    providerName: String(input?.providerName ?? "").slice(0, 120),
    profession: String(input?.profession ?? "").slice(0, 80),
  }))
  .handler(async ({ data }) => {
    const { lookupPrescribingVerification, providerKeyFromName } = await import(
      "./verification.server"
    );
    const key = providerKeyFromName(data.providerName);
    return lookupPrescribingVerification(key, data.providerName, data.profession);
  });
