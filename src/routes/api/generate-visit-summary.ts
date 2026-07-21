import { createFileRoute } from "@tanstack/react-router";

type GenerateBody = {
  providerName?: string;
  appointmentLabel?: string;
  sharedSnapshot?: {
    moodLabel?: string;
    directionLabel?: string;
    themes?: { label: string }[];
    insight?: string;
    checkinCount?: number;
    rangeLabel?: string;
  } | null;
  includedAssessments?: {
    name: string;
    clinicalName?: string;
    score?: number;
    statusLabel?: string;
    takenAt?: number;
  }[];
  notes?: {
    presenting?: string;
    observations?: string;
    plan?: string;
  };
  medications?: {
    name: string;
    dose?: string;
    frequency?: string;
    instructions?: string;
    action?: string;
  }[];
};

const SYSTEM_PROMPT = `You are a clinician's writing assistant drafting a warm, plain-language visit summary for a mental health patient to read after their appointment.

Rules:
- Write in second person ("you"), warm and non-clinical.
- Use short sections with markdown headings: "## What we talked about", "## What stood out", "## Your plan", "## Medications" (only if provided).
- Never invent facts. Only use the information given. If a section has no info, omit it.
- No diagnoses unless explicitly stated in the input. No clinical jargon.
- Do NOT include private clinician-only notes.
- Keep to 180-320 words.
- End with a short encouraging sentence — no signature, no salutation.`;

export const Route = createFileRoute("/api/generate-visit-summary")({
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
          if (body.providerName) lines.push(`Clinician: ${body.providerName}`);
          if (body.appointmentLabel) lines.push(`Appointment: ${body.appointmentLabel}`);
          if (body.sharedSnapshot) {
            lines.push("\nShared Health Passport (patient-shared):");
            const s = body.sharedSnapshot;
            if (s.rangeLabel) lines.push(`- Range: ${s.rangeLabel}`);
            if (typeof s.checkinCount === "number")
              lines.push(`- Check-ins in range: ${s.checkinCount}`);
            if (s.moodLabel) lines.push(`- Mood trend: ${s.moodLabel}`);
            if (s.directionLabel) lines.push(`- Direction: ${s.directionLabel}`);
            if (s.themes && s.themes.length)
              lines.push(`- Themes: ${s.themes.map((t) => t.label).join(", ")}`);
            if (s.insight) lines.push(`- Insight: ${s.insight}`);
          }
          if (body.includedAssessments?.length) {
            lines.push("\nAssessment results the clinician chose to include:");
            for (const a of body.includedAssessments) {
              const date = a.takenAt
                ? new Date(a.takenAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "";
              lines.push(
                `- ${a.name}${a.clinicalName ? ` (${a.clinicalName})` : ""}: score ${a.score ?? "—"}${a.statusLabel ? `, ${a.statusLabel}` : ""}${date ? `, ${date}` : ""}`,
              );
            }
          }
          if (body.notes) {
            lines.push("\nClinician session notes (use to inform the summary; do NOT quote verbatim; keep private notes hidden):");
            if (body.notes.presenting)
              lines.push(`- Presenting concerns: ${body.notes.presenting}`);
            if (body.notes.observations)
              lines.push(`- Observations: ${body.notes.observations}`);
            if (body.notes.plan) lines.push(`- Plan: ${body.notes.plan}`);
          }
          if (body.medications?.length) {
            lines.push("\nMedications the clinician wants the patient to see:");
            for (const m of body.medications) {
              lines.push(
                `- ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? `, ${m.frequency}` : ""}${m.instructions ? ` — ${m.instructions}` : ""}${m.action ? ` (${m.action})` : ""}`,
              );
            }
          }

          const userMessage = `${lines.join("\n")}\n\nWrite the patient-facing visit summary now.`;

          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  { role: "user", content: userMessage },
                ],
              }),
            },
          );
          if (!upstream.ok) {
            if (upstream.status === 429)
              return Response.json({ error: "Rate limit reached, try again shortly." }, { status: 429 });
            if (upstream.status === 402)
              return Response.json({ error: "AI credits exhausted." }, { status: 402 });
            return Response.json({ error: "AI gateway error" }, { status: 500 });
          }
          const data = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const text = (data.choices?.[0]?.message?.content ?? "").trim();
          return Response.json({ text });
        } catch (e) {
          console.error(e);
          return Response.json({ error: "Unexpected error" }, { status: 500 });
        }
      },
    },
  },
});