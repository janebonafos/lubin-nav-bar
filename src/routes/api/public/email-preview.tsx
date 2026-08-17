import { createFileRoute } from "@tanstack/react-router";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";

export const Route = createFileRoute("/api/public/email-preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const templateName = url.searchParams.get("template") || "booking-confirmation";
        const entry = TEMPLATES[templateName];
        if (!entry) {
          return new Response("Template not found", { status: 404 });
        }

        const Component = entry.component;
        const data = entry.previewData ?? {};
        const html = await render(<Component {...data} />, {
          pretty: true,
        });

        const replyTo = typeof entry.replyTo === "function" ? entry.replyTo(data) : entry.replyTo;
        const headers: Record<string, string> = { "Content-Type": "text/html" };
        if (replyTo) {
          headers["Reply-To"] = replyTo;
        }



        return new Response(html, { headers });
      },
    },
  },
});

