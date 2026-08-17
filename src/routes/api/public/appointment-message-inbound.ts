import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { normaliseInbound } from "@/lib/messages/inboundReply";

const payloadSchema = z.object({
  to: z.string().optional(),
  recipient: z.string().optional(),
  from: z.string().optional(),
  subject: z.string().max(500).optional(),
  text: z.string().max(50_000).optional(),
  plain: z.string().max(50_000).optional(),
});

/**
 * Inbound email endpoint for appointment thread replies.
 * Point the inbound-email provider's webhook here and set INBOUND_EMAIL_SECRET.
 * Replies land back on the appointment thread; personal inboxes stay private.
 */
export const Route = createFileRoute("/api/public/appointment-message-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["INBOUND_EMAIL_SECRET"];
        if (secret && request.headers.get("x-inbound-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = payloadSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });
        }

        const reply = normaliseInbound(parsed.data);
        if (!reply) {
          return Response.json({ ok: false, error: "unrecognised_relay_or_empty_body" }, { status: 422 });
        }

        // Persistence hook: store `reply` on the appointment thread and notify
        // both parties (recipient copy + sender copy email templates).
        return Response.json({ ok: true, reply });
      },
    },
  },
});
