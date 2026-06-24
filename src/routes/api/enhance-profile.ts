import { createFileRoute } from "@tanstack/react-router";

type EnhanceField = "headline" | "bio";

const PROMPTS: Record<EnhanceField, string> = {
  headline:
    "You write concise, warm professional headlines for mental health providers on a wellness platform. Return a single natural-sounding headline of 60-100 characters as one short phrase or sentence. No quotes, no emojis, no trailing punctuation, no separator characters (do not use middle dots ·, pipes |, slashes /, or em dashes — to join clauses). Prefer flowing wording like 'Clinical psychologist helping adults navigate anxiety and burnout'.",
  bio:
    "You write short, warm provider bios (2-3 sentences, 280-380 characters) for a mental health platform. Plain prose, no headings, no emojis, no quotes, first person. Convey approach, warmth, and who they help — never invent credentials or numbers.",
};

export const Route = createFileRoute("/api/enhance-profile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { field, current, context, tone, instruction } =
            (await request.json()) as {
              field: EnhanceField;
              current?: string;
              context?: { fullName?: string; specialty?: string; focus?: string };
              tone?: string;
              instruction?: string;
            };
          if (field !== "headline" && field !== "bio") {
            return new Response(JSON.stringify({ error: "Invalid field" }), { status: 400 });
          }
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500 });
          }

          const ctxLines = [
            context?.fullName && `Name: ${context.fullName}`,
            context?.specialty && `Profession: ${context.specialty}`,
            context?.focus && `Focus area: ${context.focus}`,
            tone && `Desired tone/style: ${tone}`,
            instruction?.trim() && `Extra instruction: ${instruction.trim()}`,
            current?.trim()
              ? `Current draft: ${current.trim()}`
              : "No current draft — write a fresh one.",
          ]
            .filter(Boolean)
            .join("\n");

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: PROMPTS[field] },
                {
                  role: "user",
                  content: `${ctxLines}\n\nRewrite or generate the ${field}. Return only the final text.`,
                },
              ],
            }),
          });

          if (!upstream.ok) {
            if (upstream.status === 429)
              return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }), { status: 429 });
            if (upstream.status === 402)
              return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402 });
            return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500 });
          }

          const data = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const text = (data.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");
          return new Response(JSON.stringify({ text }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error(e);
          return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500 });
        }
      },
    },
  },
});