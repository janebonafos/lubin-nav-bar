import { createFileRoute } from "@tanstack/react-router";

type GenerateBody = {
  patientContext?: {
    firstName?: string;
    age?: number;
    sex?: string;
  };
  presenting?: string;
  observations?: string;
  plan?: string;
  includedAssessments?: {
    name: string;
    clinicalName?: string;
    score?: number;
    statusLabel?: string;
  }[];
  currentMedications?: {
    name: string;
    dose?: string;
    frequency?: string;
  }[];
  allergies?: string;
  country?: "US" | "PH";
};

const COUNTRY_GUIDES: Record<"US" | "PH", string> = {
  US: `Country context: UNITED STATES.
- Suggest only medications available in the US and approved by the FDA for the relevant use (note clearly when a use is off-label but conventional).
- Use US generic naming conventions (e.g. acetaminophen) and common US brand names where helpful.
- Reflect US controlled-substance scheduling (DEA Schedule II-IV) in availabilityNote when relevant, and prefer non-controlled first-line agents.
- Use US units and typical US dosing conventions.`,
  PH: `Country context: PHILIPPINES.
- Suggest only medications realistically available in the Philippines and registered with the FDA Philippines (note clearly when a use is off-label but conventional).
- Use INN/generic names first as required by the Philippine Generics Act, and add locally familiar brand names in parentheses where helpful.
- Note in availabilityNote when a medication is a Dangerous Drug requiring an S2 (yellow) prescription form under Philippine regulations, and prefer non-controlled first-line agents.
- Prefer commonly stocked local formulations and flag when an agent is often unavailable or costly locally.`,
};

const SYSTEM_PROMPT = `You are a clinical decision-support assistant for licensed prescribers (psychiatrists and physicians). You draft a prescription for the clinician to REVIEW and APPROVE. You are NOT the prescriber.

Rules:
- Only suggest medications that are conventional first- or second-line pharmacotherapy for the presenting concerns and assessment findings provided.
- For every medication include a realistic starting dose, route, frequency, duration, indication, patient-facing instructions in plain language, and the most important safety warnings/side effects to counsel the patient on.
- For every medication also include "rationale": 1-2 sentences stating exactly what in the supplied visit context (presenting concerns, observations, plan, assessment scores, current medications) led you to suggest it.
- For every medication also include "availabilityNote": a short note on availability, generic/brand naming, and prescription-class requirements in the specified country.
- Follow the country context strictly. Never suggest a medication that is not available in that country.
- Never recommend controlled substances without an explicit indication in the input. Prefer non-controlled first-line agents.
- ALWAYS be useful: as long as there is any clinical context, return 1-3 concrete medication options the prescriber can edit — including symptomatic/supportive options when a definitive diagnosis is not yet established. Do not refuse. Put diagnostic caveats and required work-up in "warnings" and in "missingInfo" instead of returning an empty list.
- "missingInfo": array of up to 5 short items (max 8 words each) naming what the prescriber should confirm or obtain before signing (e.g. "Chest X-ray", "Weight for dosing", "Penicillin allergy check").
- Return an empty medications array ONLY when there is no clinical context at all.
- Do not diagnose. Base suggestions on the input only.
- Return STRICT JSON matching this schema and nothing else:
{
  "medications": [
    {
      "name": string,
      "genericName": string | null,
      "dose": string,
      "route": string,
      "frequency": string,
      "duration": string,
      "indication": string,
      "instructions": string,
      "warnings": string,
      "rationale": string,
      "availabilityNote": string
    }
  ],
  "missingInfo": string[],
  "clinicalNotes": string
}`;

export const Route = createFileRoute("/api/generate-prescription")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as GenerateBody;
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "AI not configured" }, { status: 500 });
          }

          const lines: string[] = [];
          const country = body.country === "PH" ? "PH" : "US";
          lines.push(
            `Prescribing country: ${country === "PH" ? "Philippines" : "United States"}`,
          );
          if (body.patientContext) {
            const c = body.patientContext;
            lines.push(
              `Patient: ${c.firstName ?? "unspecified"}${c.age ? `, age ${c.age}` : ""}${c.sex ? `, ${c.sex}` : ""}`,
            );
          }
          if (body.presenting) lines.push(`Presenting concerns: ${body.presenting}`);
          if (body.observations) lines.push(`Observations: ${body.observations}`);
          if (body.plan) lines.push(`Clinician plan: ${body.plan}`);
          if (body.includedAssessments?.length) {
            lines.push("Assessment results:");
            for (const a of body.includedAssessments) {
              lines.push(
                `- ${a.name}${a.clinicalName ? ` (${a.clinicalName})` : ""}: ${a.score ?? "—"}${a.statusLabel ? `, ${a.statusLabel}` : ""}`,
              );
            }
          }
          if (body.currentMedications?.length) {
            lines.push("Current medications:");
            for (const m of body.currentMedications) {
              lines.push(
                `- ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? `, ${m.frequency}` : ""}`,
              );
            }
          }
          if (body.allergies) lines.push(`Allergies: ${body.allergies}`);
          if (lines.length === 0)
            lines.push("No clinical context provided.");

          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3.6-flash",
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "system",
                    content: `${SYSTEM_PROMPT}\n\n${COUNTRY_GUIDES[country]}`,
                  },
                  {
                    role: "user",
                    content: `${lines.join("\n")}\n\nDraft the prescription JSON now.`,
                  },
                ],
              }),
            },
          );
          if (!upstream.ok) {
            if (upstream.status === 429)
              return Response.json(
                { error: "Rate limit reached, try again shortly." },
                { status: 429 },
              );
            if (upstream.status === 402)
              return Response.json(
                { error: "AI credits exhausted." },
                { status: 402 },
              );
            const txt = await upstream.text();
            console.error("AI gateway error:", upstream.status, txt);
            return Response.json({ error: "AI gateway error" }, { status: 500 });
          }
          const data = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const raw = data.choices?.[0]?.message?.content ?? "";
          let parsed: {
            medications?: Array<Record<string, string | null | undefined>>;
            clinicalNotes?: string;
          } = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            return Response.json(
              { error: "Could not parse AI response." },
              { status: 500 },
            );
          }
          const medications = (parsed.medications ?? []).map((m) => ({
            name: String(m.name ?? "").trim(),
            genericName: m.genericName ? String(m.genericName) : undefined,
            dose: String(m.dose ?? "").trim(),
            route: m.route ? String(m.route) : "Oral",
            frequency: String(m.frequency ?? "").trim(),
            duration: m.duration ? String(m.duration) : undefined,
            indication: m.indication ? String(m.indication) : undefined,
            instructions: String(m.instructions ?? "").trim(),
            warnings: m.warnings ? String(m.warnings) : undefined,
            rationale: m.rationale ? String(m.rationale) : undefined,
            availabilityNote: m.availabilityNote
              ? String(m.availabilityNote)
              : undefined,
          }));
          return Response.json({
            medications,
            clinicalNotes: parsed.clinicalNotes ?? "",
            country,
          });
        } catch (e) {
          console.error(e);
          return Response.json({ error: "Unexpected error" }, { status: 500 });
        }
      },
    },
  },
});