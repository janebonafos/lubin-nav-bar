import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";

type OtpRecord = {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
  /** Bound to the exact prescription version being signed. */
  hash: string;
  reviewedAt?: number;
};

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const store = new Map<string, OtpRecord>();

export function otpKey(appointmentId: string, email: string, hash: string) {
  return `${appointmentId}|${email.trim().toLowerCase()}|${hash}`;
}

function prune() {
  const now = Date.now();
  for (const [k, v] of store) if (v.expiresAt < now) store.delete(k);
}

export function issueOtp(args: { appointmentId: string; email: string; hash: string }) {
  prune();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const record: OtpRecord = {
    code,
    email: args.email.trim().toLowerCase(),
    hash: args.hash,
    expiresAt: Date.now() + TTL_MS,
    attempts: 0,
  };
  store.set(otpKey(args.appointmentId, args.email, args.hash), record);
  return { code, expiresAt: record.expiresAt, ttlMinutes: TTL_MS / 60000 };
}

export function consumeOtp(args: {
  appointmentId: string;
  email: string;
  hash: string;
  code: string;
}): { ok: true; reviewedAt: number } | { ok: false; error: string } {
  prune();
  const key = otpKey(args.appointmentId, args.email, args.hash);
  const record = store.get(key);
  if (!record) {
    return { ok: false, error: "That code has expired. Send a new code to your registered email." };
  }
  if (record.expiresAt < Date.now()) {
    store.delete(key);
    return { ok: false, error: "That code has expired. Send a new code to your registered email." };
  }
  record.attempts += 1;
  if (record.attempts > MAX_ATTEMPTS) {
    store.delete(key);
    return { ok: false, error: "Too many attempts. Send a new code to your registered email." };
  }
  if (record.code !== args.code.trim()) {
    return { ok: false, error: "That code does not match. Check the latest email and try again." };
  }
  store.delete(key);
  return { ok: true, reviewedAt: Date.now() };
}

export function maskEmail(email: string) {
  const [user = "", domain = ""] = email.trim().split("@");
  const head = user.slice(0, 2);
  return `${head}${"•".repeat(Math.max(user.length - 2, 2))}@${domain}`;
}

/**
 * Renders the branded signing-code email. When project email delivery is not
 * configured the rendered message is not dispatched and the caller is told so,
 * rather than silently failing.
 */
export async function deliverSigningOtpEmail(args: {
  email: string;
  code: string;
  prescriberName?: string;
  jurisdiction?: string;
  medicationCount?: number;
  ttlMinutes: number;
}): Promise<{ delivered: boolean }> {
  const entry = TEMPLATES["prescription-signing-otp"];
  if (!entry) return { delivered: false };
  const Component = entry.component;
  const html = await render(
    <Component
      prescriberName={args.prescriberName}
      code={args.code}
      expiresInMinutes={args.ttlMinutes}
      jurisdiction={args.jurisdiction}
      medicationCount={args.medicationCount}
      requestedAt={new Date().toLocaleString("en-US")}
    />,
  );

  const endpoint = process.env["EMAIL_SEND_URL"];
  const token = process.env["EMAIL_SEND_TOKEN"];
  if (!endpoint || !token) {
    // No mail transport configured in this environment.
    console.info(
      `[prescription-otp] rendered signing code email for ${maskEmail(args.email)} (${html.length} bytes) — delivery not configured`,
    );
    return { delivered: false };
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
      console.error(`[prescription-otp] delivery failed [${res.status}]: ${await res.text()}`);
      return { delivered: false };
    }
    return { delivered: true };
  } catch (err) {
    console.error("[prescription-otp] delivery error", err);
    return { delivered: false };
  }
}