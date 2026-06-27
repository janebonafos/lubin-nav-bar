import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AlertTriangle, ArrowLeft, CalendarX2 } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  id: z.string().optional(),
  client: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  duration: z.string().optional(),
  type: z.string().optional(),
  amount: z.string().optional(),
  paymentStatus: z.string().optional(),
});

export const Route = createFileRoute("/appointment/cancel")({
  validateSearch: (input: Record<string, unknown>) => searchSchema.parse(input),
  component: CancelPage,
  head: () => ({
    meta: [
      { title: "Cancel appointment — Lubin" },
      { name: "description", content: "Cancel an upcoming session." },
    ],
  }),
});

const REASONS = [
  "Schedule conflict",
  "Personal emergency",
  "Illness or health reason",
  "Double booking",
  "Client no-show risk",
  "Other",
];

function CancelPage() {
  const s = Route.useSearch();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    const whenLabel = [s.date, s.time].filter(Boolean).join(" · ");
    return (
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16"
        style={{
          fontFamily: "Inter, sans-serif",
          background:
            "radial-gradient(circle at 20% 0%, #E9E1F8 0%, transparent 55%), radial-gradient(circle at 85% 100%, #F4E8FF 0%, transparent 50%), #F7F4FD",
        }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-[#C9BEE4] opacity-20 blur-3xl" />
          <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#A89BD0] opacity-20 blur-3xl" />
        </div>

        <main className="relative w-full max-w-md">
          <div
            className="overflow-hidden rounded-[20px] border border-white/70 bg-white/90 backdrop-blur-xl"
            style={{ boxShadow: "0 30px 80px -30px rgba(61, 46, 107, 0.35), 0 1px 0 rgba(255,255,255,0.6) inset" }}
          >
            {/* Header band */}
            <div className="relative px-10 pb-8 pt-10 text-center">
              <div
                className="absolute inset-x-0 top-0 h-32 opacity-70"
                style={{ background: "linear-gradient(180deg, #EFE7FB 0%, transparent 100%)" }}
              />
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 animate-pulse rounded-full bg-[#C9BEE4]/40 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#E1D7F2] bg-white shadow-[0_8px_24px_-12px_rgba(61,46,107,0.4)]">
                  <CalendarX2 className="h-7 w-7 text-[#5B4796]" strokeWidth={1.6} />
                </div>
              </div>
              <p className="relative mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A89BD0]">
                Cancellation confirmed
              </p>
              <h1
                className="relative mt-3 text-[28px] leading-tight text-[#2C2148]"
                style={{ fontFamily: '"Instrument Serif", "Cormorant Garamond", Georgia, serif', fontWeight: 400, letterSpacing: "-0.01em" }}
              >
                The session has been cancelled.
              </h1>
              <p className="relative mx-auto mt-3 max-w-xs text-[13.5px] leading-relaxed text-[#7E6BAF]">
                We've let <span className="font-medium text-[#5B4796]">{s.client ?? "your client"}</span> know and freed up this slot on your calendar.
              </p>
            </div>

            {/* Perforated separator */}
            <div className="relative h-6">
              <div className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F7F4FD]" />
              <div className="absolute right-0 top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F7F4FD]" />
              <div
                className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-t border-dashed"
                style={{ borderColor: "#E1D7F2" }}
              />
            </div>

            {/* Receipt body */}
            <div className="px-10 pb-8 pt-2">
              {(whenLabel || s.type) && (
                <dl className="space-y-4">
                  {s.type && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">Session</dt>
                      <dd className="text-right text-[13.5px] font-medium text-[#2C2148]">{s.type}</dd>
                    </div>
                  )}
                  {whenLabel && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">When</dt>
                      <dd className="text-right text-[13.5px] font-medium text-[#2C2148]">{whenLabel}</dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">Client</dt>
                    <dd className="text-right text-[13.5px] font-medium text-[#2C2148]">{s.client ?? "—"}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">Status</dt>
                    <dd className="inline-flex items-center gap-1.5 rounded-full bg-[#F3EDFB] px-2.5 py-0.5 text-[11px] font-semibold text-[#5B4796]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#5B4796]" />
                      Cancelled
                    </dd>
                  </div>
                </dl>
              )}

              <div className="mt-7 rounded-[12px] border border-[#EFE7FB] bg-[#FBF9FF] px-4 py-3">
                <p className="text-[11.5px] leading-relaxed text-[#7E6BAF]">
                  If a refund applies, the Lubin team will coordinate it directly with the client — no action needed from you.
                </p>
              </div>

              <button
                onClick={() => window.close()}
                className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#3D2E6B] px-5 py-3 text-[13.5px] font-semibold tracking-wide text-white transition hover:bg-[#2C2148]"
                style={{ boxShadow: "0 12px 24px -12px rgba(61, 46, 107, 0.6)" }}
              >
                Close this tab
                <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] uppercase tracking-[0.25em] text-[#A89BD0]">
            Lubin · Care coordination
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8FF] py-12" style={{ fontFamily: "Inter, sans-serif" }}>
      <main className="mx-auto max-w-2xl px-6">
        <button
          onClick={() => window.close()}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7E6BAF] hover:text-[#3D2E6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Close
        </button>

        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Cancel appointment</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#3D2E6B]">
            Cancel this session?
          </h1>
          <p className="mt-2 text-sm text-[#7E6BAF]">
            We'll notify your client, free up this time slot on your calendar, and let the Lubin team know so they can handle any billing or refund follow-up.
          </p>
        </div>

        <section className="mt-6 rounded-[12px] border border-rose-100 bg-rose-50/50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-rose-500" />
            <div className="text-sm text-rose-700">
              Cancellations within 24 hours of the session may affect your reliability score. Please cancel only when necessary so clients can rebook in time.
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Appointment</p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-[#A89BD0]">Client:</span> <span className="font-medium text-[#3D2E6B]">{s.client}</span></div>
            <div><span className="text-[#A89BD0]">When:</span> <span className="font-medium text-[#3D2E6B]">{s.date} · {s.time}</span></div>
            <div><span className="text-[#A89BD0]">Session:</span> <span className="font-medium text-[#3D2E6B]">{s.type} · {s.duration}</span></div>
          </div>
        </section>

        <section className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Reason</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`rounded-[10px] border px-3.5 py-1.5 text-sm transition ${
                  reason === r
                    ? "border-[#5B4796] bg-[#5B4796] text-white"
                    : "border-[#EAE7F5] bg-white text-[#3D2E6B] hover:bg-[#FBF9FF]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Message to client (optional)</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Share a short note your client will see…"
            className="mt-3 block w-full resize-none rounded-[10px] border border-[#EAE7F5] bg-white px-3.5 py-2.5 text-sm text-[#3D2E6B] outline-none focus:border-[#A89BD0]"
          />

          {s.paymentStatus === "Paid" && (
            <div className="mt-5 rounded-[10px] border border-[#EAE7F5] bg-[#FBF9FF] p-4 text-sm text-[#3D2E6B]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Billing & refunds</p>
              <p className="mt-1.5 leading-relaxed">
                This session was paid. Refunds are handled by the Lubin team directly with your client — you don't need to take any action here.
              </p>
            </div>
          )}

          <label className="mt-3 flex items-start gap-3">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-rose-500"
            />
            <span className="text-sm text-[#3D2E6B]">
              I understand this will cancel the session, notify my client, and free up this time on my calendar.
            </span>
          </label>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={() => window.close()}
              className="rounded-[10px] border border-[#EAE7F5] bg-white px-5 py-2.5 text-sm font-medium text-[#3D2E6B] hover:bg-[#FBF9FF]"
            >
              Keep appointment
            </button>
            <button
              disabled={!reason || !confirm}
              onClick={() => {
                toast.success("Appointment cancelled", {
                  description: `${s.client ?? "Your client"} has been notified. The slot on ${s.date ?? ""} ${s.time ?? ""} is now open.`,
                });
                setDone(true);
              }}
              className="rounded-[10px] bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel appointment
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}