import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, CalendarDays, CheckCircle2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const searchSchema = z.object({
  id: z.string().optional(),
  client: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  duration: z.string().optional(),
  type: z.string().optional(),
  mode: z.string().optional(),
  timezone: z.string().optional(),
});

export const Route = createFileRoute("/appointment/reschedule")({
  validateSearch: (input: Record<string, unknown>) => searchSchema.parse(input),
  component: ReschedulePage,
  head: () => ({
    meta: [
      { title: "Reschedule appointment — Lubin" },
      { name: "description", content: "Pick a new time for your session." },
    ],
  }),
});

const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

function ReschedulePage() {
  const s = Route.useSearch();
  const days = useMemo(() => {
    const out: { iso: string; label: string; dom: string; dow: string; mon: string; monthStart: boolean }[] = [];
    const base = new Date();
    let lastMonth = -1;
    for (let i = 1; i <= 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const m = d.getMonth();
      out.push({
        iso: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        dom: String(d.getDate()),
        dow: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
        mon: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
        monthStart: m !== lastMonth,
      });
      lastMonth = m;
    }
    return out;
  }, []);

  const [date, setDate] = useState(days[0]?.iso ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    const chosen = days.find((d) => d.iso === date);
    const chosenLabel =
      chosen?.label ??
      (date
        ? new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : "");
    return (
      <div className="min-h-screen bg-[#F9F8FF] py-16" style={{ fontFamily: "Inter, sans-serif" }}>
        <main className="mx-auto max-w-xl px-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F0FF]">
            <CheckCircle2 className="h-7 w-7 text-[#3D2E6B]" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-[#3D2E6B]">Reschedule request sent</h1>
          <p className="mt-2 text-sm text-[#7E6BAF]">
            We've notified {s.client ?? "the client"} about the new proposed time.
          </p>
          <div className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-5 text-left shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">New time</p>
            <p className="mt-1 text-base font-semibold text-[#3D2E6B]">
              {chosenLabel} · {time} {s.timezone ? `· ${s.timezone}` : ""}
            </p>
          </div>
          <button
            onClick={() => window.close()}
            className="mt-8 inline-flex rounded-[10px] bg-[#3D2E6B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2C2B4B]"
          >
            Close this tab
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8FF] py-12" style={{ fontFamily: "Inter, sans-serif" }}>
      <main className="mx-auto max-w-3xl px-6">
        <button
          onClick={() => window.close()}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7E6BAF] hover:text-[#3D2E6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Close
        </button>

        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#A89BD0]">Reschedule</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#3D2E6B]">
            Pick a new time
          </h1>
          <p className="mt-2 text-sm text-[#7E6BAF]">
            Choose a replacement slot. We'll notify {s.client ?? "your client"} for confirmation.
          </p>
        </div>

        <section className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Current appointment</p>
          <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <DetailRow label="Client" value={s.client ?? "—"} />
            <DetailRow label="Session" value={s.type ?? "—"} />
            <DetailRow label="When" value={`${s.date ?? ""} · ${s.time ?? ""}`} />
            <DetailRow label="Duration" value={s.duration ?? "—"} />
            <DetailRow label="Mode" value={s.mode ?? "—"} />
            <DetailRow label="Timezone" value={s.timezone ?? "—"} />
          </div>
        </section>

        <section className="mt-6 rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Select a date</p>
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#3D2E6B]">
                {date
                  ? new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" }).toUpperCase()
                  : ""}
              </p>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#EAE7F5] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#3D2E6B] hover:bg-[#FBF9FF]"
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-[#A89BD0]" />
                    Pick another date
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date + "T00:00:00") : undefined}
                    onSelect={(d) => {
                      if (!d) return;
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      setDate(iso);
                      setPickerOpen(false);
                    }}
                    disabled={{ before: new Date() }}
                    initialFocus
                    className="pointer-events-auto p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {date && !days.find((d) => d.iso === date) && (
            <div className="mt-3 flex items-center justify-between rounded-[10px] border border-[#5B4796] bg-[#5B4796] px-4 py-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Selected</p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => setDate(days[0]?.iso ?? "")}
                className="rounded-[8px] bg-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-white/25"
              >
                Reset
              </button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {days.map((d) => {
              const selected = date === d.iso;
              return (
                <button
                  key={d.iso}
                  onClick={() => setDate(d.iso)}
                  className={`relative flex h-16 w-16 flex-col items-center justify-center rounded-[10px] border text-sm transition ${
                    selected
                      ? "border-[#5B4796] bg-[#5B4796] text-white"
                      : "border-[#EAE7F5] bg-white text-[#3D2E6B] hover:bg-[#FBF9FF]"
                  }`}
                >
                  {d.monthStart && (
                    <span
                      className={`absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${
                        selected ? "bg-[#3D2E6B] text-white" : "bg-[#F3F0FF] text-[#5B4796]"
                      }`}
                    >
                      {d.mon}
                    </span>
                  )}
                  <span className={`text-[9px] font-bold uppercase ${selected ? "text-white/80" : "text-[#A89BD0]"}`}>
                    {d.dow}
                  </span>
                  <span className="text-lg font-bold leading-tight">{d.dom}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Select a time</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setTime(t)}
                className={`rounded-[10px] border px-3 py-2 text-sm font-medium transition ${
                  time === t
                    ? "border-[#5B4796] bg-[#5B4796] text-white"
                    : "border-[#EAE7F5] bg-white text-[#3D2E6B] hover:bg-[#FBF9FF]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Message to client (optional)</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Add a short note explaining the change…"
            className="mt-3 block w-full resize-none rounded-[10px] border border-[#EAE7F5] bg-white px-3.5 py-2.5 text-sm text-[#3D2E6B] outline-none focus:border-[#A89BD0]"
          />

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={() => window.close()}
              className="rounded-[10px] border border-[#EAE7F5] bg-white px-5 py-2.5 text-sm font-medium text-[#3D2E6B] hover:bg-[#FBF9FF]"
            >
              Cancel
            </button>
            <button
              disabled={!date || !time}
              onClick={() => setDone(true)}
              className="rounded-[10px] bg-[#3D2E6B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2C2B4B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm reschedule
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-[#EAE7F5] pl-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">{label}</span>
      <span className="text-sm font-medium text-[#3D2E6B]">{value}</span>
    </div>
  );
}