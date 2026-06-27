import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarX2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { publishAppointmentEvent } from "@/lib/appointments-bus";

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
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 450);
    return () => clearTimeout(t);
  }, []);

  // Release the lock if the user closes the tab without completing.
  useEffect(() => {
    if (!s.id) return;
    const onUnload = () => {
      if (!done) publishAppointmentEvent({ type: "unlock", id: s.id! });
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [s.id, done]);

  if (!ready) {
    return <CancelSkeleton />;
  }

  if (done) {
    const whenLabel = [s.date, s.time].filter(Boolean).join(" · ");
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        style={{ fontFamily: "Inter, sans-serif", backgroundColor: "#F0EAFB" }}
      >
        <div className="flex w-full max-w-[460px] flex-col items-center">
          <div
            className="relative flex w-full flex-col items-center overflow-hidden rounded-[32px] bg-white p-10"
            style={{ boxShadow: "0 24px 48px -12px rgba(61,46,107,0.08)" }}
          >
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#F0EAFB]">
              <CalendarX2 className="h-6 w-6 text-[#3D2E6B]" strokeWidth={1.4} />
            </div>

            <span className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#7E6BAF]">
              Cancellation confirmed
            </span>

            <h1 className="mb-4 text-center text-[32px] font-bold tracking-tight leading-[1.1] text-[#3D2E6B]">
              The session has been cancelled.
            </h1>

            <p className="mb-10 px-6 text-center text-sm leading-relaxed text-[#7E6BAF]">
              We've let{" "}
              <span className="font-semibold text-[#3D2E6B]">
                {s.client ?? "your client"}
              </span>{" "}
              know and freed up this slot on your calendar.
            </p>

            <div className="mb-10 flex w-full items-center gap-4">
              <div className="flex-1 border-t border-dashed border-[#E5DEF2]" />
              <div className="h-1.5 w-1.5 rounded-full bg-[#E5DEF2]" />
              <div className="flex-1 border-t border-dashed border-[#E5DEF2]" />
            </div>

            <div className="mb-10 w-full space-y-5">
              {s.type && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">Session</span>
                  <span className="text-sm font-medium text-[#3D2E6B]">{s.type}</span>
                </div>
              )}
              {whenLabel && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">When</span>
                  <span className="text-sm font-medium text-[#3D2E6B]">{whenLabel}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">Client</span>
                <span className="text-sm font-medium text-[#3D2E6B]">{s.client ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">Status</span>
                <span className="flex items-center gap-1.5 rounded-full bg-[#F0EAFB] px-3 py-1 text-[11px] font-bold uppercase text-[#7E6BAF]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7E6BAF]" />
                  Cancelled
                </span>
              </div>
            </div>

            <div className="mb-10 w-full rounded-2xl border border-[#E5DEF2] bg-[#F0EAFB]/40 p-6 text-sm leading-normal text-[#7E6BAF]">
              If a refund applies, the Lubin team will coordinate it directly with the client — no action needed from you.
            </div>

            <button
              onClick={() => window.close()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#3D2E6B] py-4 text-sm font-semibold text-white transition-all hover:bg-[#2D2250]"
            >
              Close this tab
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <footer className="mt-10 flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#7E6BAF]">Lubin</span>
            <span className="h-1 w-1 rounded-full bg-[#7E6BAF]/40" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#7E6BAF]">Care coordination</span>
          </footer>
        </div>
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
                if (submitting) return;
                setSubmitting(true);
                setTimeout(() => {
                  toast.success("Appointment cancelled", {
                    description: `${s.client ?? "Your client"} has been notified. The slot on ${s.date ?? ""} ${s.time ?? ""} is now open.`,
                  });
                  if (s.id) publishAppointmentEvent({ type: "cancelled", id: s.id });
                  setDone(true);
                }, 700);
              }}
              className="inline-flex items-center gap-2 rounded-[10px] bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Cancelling…" : "Cancel appointment"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[8px] bg-[#EAE7F5] ${className}`} />;
}

function CancelSkeleton() {
  return (
    <div className="min-h-screen bg-[#F9F8FF] py-12" style={{ fontFamily: "Inter, sans-serif" }}>
      <main className="mx-auto max-w-2xl px-6">
        <Shimmer className="h-4 w-16" />
        <div className="mt-4 space-y-3">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-8 w-72" />
          <Shimmer className="h-4 w-full max-w-md" />
        </div>
        <Shimmer className="mt-6 h-16 w-full" />
        <section className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <Shimmer className="h-3 w-24" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-4 w-48" />
          </div>
        </section>
        <section className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <Shimmer className="h-3 w-16" />
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Shimmer key={i} className="h-8 w-32" />
            ))}
          </div>
          <Shimmer className="mt-6 h-3 w-40" />
          <Shimmer className="mt-3 h-20 w-full" />
          <div className="mt-6 flex justify-end gap-3">
            <Shimmer className="h-10 w-36" />
            <Shimmer className="h-10 w-40" />
          </div>
        </section>
      </main>
    </div>
  );
}