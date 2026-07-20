import { createFileRoute } from "@tanstack/react-router";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";

export const Route = createFileRoute("/api/email-preview")({
  server: {
    handlers: {
      GET: async () => {
        const entry = TEMPLATES["booking-confirmation"];
        if (!entry) {
          return new Response("Template not found", { status: 404 });
        }

        const Component = entry.component;
        const html = await render(
          <Component {...(entry.previewData ?? {})} />,
          {
            pretty: true,
          }
        );

        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        });
      },
    },
  },
});
