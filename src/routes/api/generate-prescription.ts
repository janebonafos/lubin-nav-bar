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
};

const SYSTEM_PROMPT = `You are a clinical decision-support assistant for licensed prescribers (psychiatrists and physicians). You draft a prescription for the clinician to REVIEW and APPROVE. You are NOT the prescriber.

Rules:
- Only suggest medications that are conventional first- or second-line pharmacotherapy for the presenting concerns and assessment findings provided.
- For every medication include a realistic starting dose, route, frequency, duration, indication, patient-facing instructions in plain language, and the most important safety warnings/side effects to counsel the patient on.
- Never recommend controlled substances without an explicit indication in the input. Prefer non-controlled first-line agents.
- If the input lacks the information you need for a safe suggestion, return an empty medications array and a clinicalNotes string explaining what is missing.
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
      "warnings": string
    }
  ],
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
                  { role: "system", content: SYSTEM_PROMPT },
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
          }));
          return Response.json({
            medications,
            clinicalNotes: parsed.clinicalNotes ?? "",
          });
        } catch (e) {
          console.error(e);
          return Response.json({ error: "Unexpected error" }, { status: 500 });
        }
      },
    },
  },
});