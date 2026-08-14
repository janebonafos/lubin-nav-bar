import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are Lubin, a warm mental-health companion helping someone make sense of a self-check result.

Rules:
- Never diagnose, never alarm, never use words like "disorder", "illness", "danger", or "you must".
- Speak in second person, plain everyday language, no clinical jargon.
- Be collaborative and hopeful: "we", "together", "at your pace".
- Suggestions must be small, doable within a day or two, and specific to what the score reflects.
- Only mention professional support as a calm option, never as a warning.

Return ONLY valid minified JSON with this exact shape:
{"meaning":"2-3 sentences explaining what this score reflects in plain language","gauge":"1 sentence explaining how to read the scale for this check","steps":[{"title":"short action title","detail":"one sentence how to do it"},{"title":"...","detail":"..."},{"title":"...","detail":"..."}],"encouragement":"1 warm closing sentence"}`;

export const Route = createFileRoute("/api/result-insight")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            name?: string;
            clinicalName?: string;
            score?: number;
            maxScore?: number;
            band?: string;
            bandExplanation?: string;
            lowerIsBetter?: boolean;
            topics?: string[];
          };

          const apiKey = process.env["LOVABLE_API_KEY"];
          if (!apiKey) {
            return Response.json({ error: "AI not configured" }, { status: 500 });
          }

          const userPrompt = [
            `Check: ${body.name ?? "Self-check"} (${body.clinicalName ?? "self-report tool"})`,
            `Score: ${body.score ?? 0} out of ${body.maxScore ?? 0} (${
              body.lowerIsBetter ? "lower scores mean lighter" : "higher scores mean better"
            })`,
            `Result band: ${body.band ?? "unknown"} — ${body.bandExplanation ?? ""}`,
            body.topics?.length ? `Areas they flagged: ${body.topics.join(", ")}` : "",
            "Write the JSON now.",
          ]
            .filter(Boolean)
            .join("\n");

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
                  { role: "user", content: userPrompt },
                ],
              }),
            },
          );

          if (!upstream.ok) {
            const status = upstream.status === 429 || upstream.status === 402 ? upstream.status : 500;
            return Response.json({ error: "AI unavailable" }, { status });
          }

          const data = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const raw = data.choices?.[0]?.message?.content ?? "";
          const match = raw.match(/\{[\s\S]*\}/);
          if (!match) return Response.json({ error: "Unreadable AI reply" }, { status: 500 });
          return Response.json(JSON.parse(match[0]));
        } catch (e) {
          console.error("result-insight error", e);
          return Response.json({ error: "Unexpected error" }, { status: 500 });
        }
      },
    },
  },
});