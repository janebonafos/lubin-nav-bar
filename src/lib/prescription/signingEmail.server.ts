// Server-only delivery of the prescription signing code. The code itself is
// never returned to the browser in a production build.
import { render } from "@react-email/render";
import { createElement } from "react";
import { TEMPLATES } from "@/lib/email-templates/registry";

export function maskSigningEmail(email: string) {
  const [user = "", domain = ""] = email.trim().split("@");
  if (!domain) return "";
  return `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 2))}@${domain}`;
}

export async function deliverSigningCode(args: {
  email: string;
  code: string;
  reference: string;
  ttlMinutes: number;
  prescriberName?: string;
}): Promise<{ delivered: boolean; reason: string | null }> {
  const entry = TEMPLATES["prescription-signing-otp"];
  if (!entry) return { delivered: false, reason: "Signing email template is unavailable." };

  const html = await render(
    createElement(entry.component as never, {
      prescriberName: args.prescriberName,
      code: args.code,
      expiresInMinutes: args.ttlMinutes,
      jurisdiction: "Philippines",
      requestedAt: new Date().toISOString(),
    } as never),
  );

  const endpoint = process.env["EMAIL_SEND_URL"];
  const token = process.env["EMAIL_SEND_TOKEN"];
  if (!endpoint || !token) {
    console.info(
      `[rx-signing] rendered signing code for ${maskSigningEmail(args.email)} (${html.length} bytes) — email delivery is not configured`,
    );
    return { delivered: false, reason: "Email delivery is not configured for this environment." };
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        to: args.email,
        subject: "Your Lubin prescription signing code",
        html,
      }),
    });
    if (!res.ok) {
      console.error(`[rx-signing] delivery failed [${res.status}]`);
      return { delivered: false, reason: "The signing code email could not be sent." };
    }
    return { delivered: true, reason: null };
  } catch (err) {
    console.error("[rx-signing] delivery error", err);
    return { delivered: false, reason: "The signing code email could not be sent." };
  }
}
