import { createFileRoute } from "@tanstack/react-router";

type SoapBody = {
  patientContext?: { firstName?: string; age?: number; sex?: string };
  caseNotes?: string;
  presenting?: string;
  observations?: string;
  plan?: string;
  currentMedications?: { name: string; dose?: string; frequency?: string }[];
  allergies?: string;
  assessments?: { name: string; score?: number; statusLabel?: string }[];
  existing?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  country?: "US" | "PH";
};

const SYSTEM_PROMPT = `You are a clinical documentation assistant for licensed prescribers (psychiatrists and physicians). You draft a SOAP note from the context the clinician supplies. You are assistive only: you do not diagnose, prescribe, or invent findings.

Rules:
- Use ONLY the supplied context. Never fabricate vitals, exam findings, labs, history, or quotes. If something was not supplied, omit it or write that it was not documented.
- "subjective": the patient's reported concerns, history, duration, and relevant negatives, in clinical prose.
- "objective": observable/measured data supplied (mental status observations, assessment scores, current medications, allergies). If little was supplied, say what is not documented.
- "assessment": a concise clinical impression with differential considerations phrased tentatively (e.g. "consistent with", "consider"). Do not state a definitive diagnosis.
- "plan": numbered plan lines covering treatment considerations, monitoring, counselling, safety, and follow-up. Do not name specific doses unless supplied.
- Preserve anything the clinician already wrote in "existing" — refine and extend it rather than replacing its meaning.
- Keep each section tight: 2-6 sentences, or short numbered lines for the plan.
- Return STRICT JSON only: {"subjective": string, "objective": string, "assessment": string, "plan": string}`;

export const Route = createFileRoute("/api/generate-soap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as SoapBody;
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "AI not configured" }, { status: 500 });
          }

          const lines: string[] = [];
          const country = body.country === "PH" ? "PH" : "US";
          lines.push(`Country: ${country === "PH" ? "Philippines" : "United States"}`);
          if (body.patientContext) {
            const c = body.patientContext;
            lines.push(
              `Patient: ${c.firstName ?? "unspecified"}${c.age ? `, age ${c.age}` : ""}${c.sex ? `, ${c.sex}` : ""}`,
            );
          }
          if (body.caseNotes) lines.push(`Clinical case notes: ${body.caseNotes}`);
          if (body.presenting) lines.push(`Presenting concerns: ${body.presenting}`);
          if (body.observations) lines.push(`Session observations: ${body.observations}`);
          if (body.plan) lines.push(`Clinician plan: ${body.plan}`);
          if (body.assessments?.length) {
            lines.push("Assessment results:");
            for (const a of body.assessments) {
              lines.push(
                `- ${a.name}: ${a.score ?? "—"}${a.statusLabel ? `, ${a.statusLabel}` : ""}`,
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
          const ex = body.existing ?? {};
          if (ex.subjective || ex.objective || ex.assessment || ex.plan) {
            lines.push("Clinician's existing SOAP draft (refine, do not discard):");
            if (ex.subjective) lines.push(`S: ${ex.subjective}`);
            if (ex.objective) lines.push(`O: ${ex.objective}`);
            if (ex.assessment) lines.push(`A: ${ex.assessment}`);
            if (ex.plan) lines.push(`P: ${ex.plan}`);
          }
          if (lines.length <= 1) {
            return Response.json(
              { error: "Add some clinical context first." },
              { status: 400 },
            );
          }

          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3.7-flash",
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  {
                    role: "user",
                    content: `${lines.join("\n")}\n\nDraft the SOAP note JSON now.`,
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
              return Response.json({ error: "AI credits exhausted." }, { status: 402 });
            const txt = await upstream.text();
            console.error("AI gateway error:", upstream.status, txt);
            return Response.json({ error: "AI gateway error" }, { status: 500 });
          }

          const data = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const raw = data.choices?.[0]?.message?.content ?? "";
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            return Response.json(
              { error: "Could not parse the AI response." },
              { status: 500 },
            );
          }
          const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
          return Response.json({
            subjective: str(parsed.subjective),
            objective: str(parsed.objective),
            assessment: str(parsed.assessment),
            plan: str(parsed.plan),
          });
        } catch (e) {
          console.error(e);
          return Response.json({ error: "Unexpected error" }, { status: 500 });
        }
      },
    },
  },
});
