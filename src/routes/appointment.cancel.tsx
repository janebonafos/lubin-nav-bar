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
      <div className="flex min-h-screen items-center justify-center bg-[#F9F8FF] px-6 py-12" style={{ fontFamily: "Inter, sans-serif" }}>
        <main className="w-full max-w-md">
          <div className="rounded-[16px] border border-[#EAE7F5] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F0FF]">
              <CalendarX2 className="h-7 w-7 text-[#5B4796]" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Cancellation confirmed</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#3D2E6B]">
              The session has been cancelled
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#7E6BAF]">
              We've let {s.client ?? "your client"} know and freed up this slot on your calendar.
            </p>

            {(whenLabel || s.type) && (
              <div className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-[#FBF9FF] p-4 text-left">
                {s.type && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Session</p>
                    <p className="mt-1 text-sm font-medium text-[#3D2E6B]">{s.type}</p>
                  </>
                )}
                {whenLabel && (
                  <>
                    <p className={`text-[10px] font-bold uppercase tracking-wider text-[#A89BD0] ${s.type ? "mt-3" : ""}`}>When</p>
                    <p className="mt-1 text-sm font-medium text-[#3D2E6B]">{whenLabel}</p>
                  </>
                )}
              </div>
            )}

            <p className="mt-6 text-xs leading-relaxed text-[#A89BD0]">
              If a refund applies, the Lubin team will coordinate it directly with the client — no action needed from you.
            </p>

            <button
              onClick={() => window.close()}
              className="mt-7 inline-flex w-full justify-center rounded-[10px] bg-[#3D2E6B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2C2B4B]"
            >
              Close this tab
            </button>
          </div>
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