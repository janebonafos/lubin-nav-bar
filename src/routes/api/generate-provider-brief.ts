import { createFileRoute } from "@tanstack/react-router";

type BriefBulletIn = {
  text: string;
  sourceLabel: string;
  sourceType: "assessment" | "checkin" | "conversation" | "patient" | "system";
};

type Input = {
  providerName?: string;
  appointmentLabel?: string;
  rangeLabel?: string;
  sharedKeys?: string[];
  includeConversations?: boolean;
  snapshot?: {
    moodLabel?: string;
    directionLabel?: string;
    stressLabel?: string;
    themes?: { label: string; count: number }[];
    insight?: string;
    checkinCount?: number;
    latestCheckinDate?: string;
  } | null;
  assessments?: {
    name: string;
    clinicalName?: string;
    score?: number;
    statusLabel?: string;
    statusKind?: string;
    takenAt?: number;
  }[];
  conversationsSummary?: string; // pre-summarised themes from chats (never full transcript)
  medications?: {
    name: string;
    dose?: string;
    frequency?: string;
    action?: string;
    reportedBy?: "patient" | "provider";
  }[];
  patientGoals?: string[];
};

const SYSTEM_PROMPT = `You generate an "AI Provider Brief": a short, scannable summary a mental health provider reads BEFORE an appointment. It is not a clinical note and it never replaces clinical assessment.

Hard rules:
- Use ONLY the information provided in the input. Never invent symptoms, diagnoses, medications, dates, or history.
- Do NOT produce a diagnosis. Do NOT present screening scores as diagnoses. Refer to them as "screening result" or "self-reported score".
- Distinguish patient-reported information from provider-confirmed information. Everything in this input is patient-shared unless the sourceType is "provider".
- Preserve dates and assessment names exactly as given.
- If a section has insufficient input, emit exactly one bullet with text "Not enough information" and sourceType "system".
- Keep the whole brief scannable in about one minute: short bullet fragments, not paragraphs. Aim for 1–4 bullets per section.
- Every bullet MUST carry a sourceLabel that identifies where it came from and, when relevant, a date (e.g. "PHQ-9 · Jul 18, 2026", "3 check-ins · Jul 12–20", "Lubin conversations", "Patient-reported").

Return ONLY valid minified JSON matching this exact shape (no prose, no markdown fences):
{
  "sections": {
    "seekingSupport": [{ "text": string, "sourceLabel": string, "sourceType": "assessment"|"checkin"|"conversation"|"patient"|"system" }],
    "currentConcerns": [...],
    "recentPatterns": [...],
    "relevantAssessments": [...],
    "changesOverTime": [...],
    "medications": [...],
    "whatHelps": [...],
    "patientGoals": [...]
  }
}`;

export const Route = createFileRoute("/api/generate-provider-brief")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Input;
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "AI not configured" }, { status: 500 });
          }

          const userPayload = JSON.stringify(body);

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
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  {
                    role: "user",
                    content: `Patient-consented input JSON:\n${userPayload}\n\nGenerate the AI Provider Brief JSON now.`,
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
            return Response.json({ error: "AI gateway error" }, { status: 500 });
          }

          const data = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const raw = (data.choices?.[0]?.message?.content ?? "").trim();
          let parsed: {
            sections?: Record<string, BriefBulletIn[]>;
          } | null = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            const m = raw.match(/\{[\s\S]*\}/);
            if (m) {
              try {
                parsed = JSON.parse(m[0]);
              } catch {
                /* noop */
              }
            }
          }
          if (!parsed || !parsed.sections) {
            return Response.json(
              { error: "Could not parse AI response." },
              { status: 502 },
            );
          }

          const empty = [
            {
              text: "Not enough information",
              sourceLabel: "System",
              sourceType: "system" as const,
            },
          ];
          const s = parsed.sections;
          const sections = {
            seekingSupport: s.seekingSupport ?? empty,
            currentConcerns: s.currentConcerns ?? empty,
            recentPatterns: s.recentPatterns ?? empty,
            relevantAssessments: s.relevantAssessments ?? empty,
            changesOverTime: s.changesOverTime ?? empty,
            medications: s.medications ?? empty,
            whatHelps: s.whatHelps ?? empty,
            patientGoals: s.patientGoals ?? empty,
          };

          return Response.json({ sections });
        } catch (e) {
          console.error(e);
          return Response.json({ error: "Unexpected error" }, { status: 500 });
        }
      },
    },
  },
});