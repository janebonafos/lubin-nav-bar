import { useState } from "react";
import {
  CalendarDays,
  Check,
  Video,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  Upload,
  FileText,
  AlertCircle,
  CalendarClock,
  User,
  CircleDot,
  Plus,
  X,
  RefreshCw,
  Copy,
  CalendarOff,
  Trash2,
  ChevronDown,
} from "lucide-react";

/* ---------- shared shells ---------- */

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#3D2E6B]">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-[#7E6BAF]">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#EEE7FA] bg-white/70 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-[#3D2E6B]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#7E6BAF]">{hint}</p>}
    </div>
  );
}

/* ---------- Calendar & Availability ---------- */

const DAYS = [
  { key: "Mon", label: "Monday" },
  { key: "Tue", label: "Tuesday" },
  { key: "Wed", label: "Wednesday" },
  { key: "Thu", label: "Thursday" },
  { key: "Fri", label: "Friday" },
  { key: "Sat", label: "Saturday" },
  { key: "Sun", label: "Sunday" },
] as const;

type Interval = { id: string; start: string; end: string };
type DayAvailability = { enabled: boolean; intervals: Interval[] };
type WeekAvail = Record<string, DayAvailability>;

const DEFAULT_INTERVAL: Interval = { id: "default", start: "09:00", end: "17:00" };

/* 12-hour time slots in 30 min steps */
const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
})();

function formatTime12(value: string) {
  const [hStr, mStr] = value.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${period}`;
}

function TimePill({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={`inline-flex min-w-[112px] items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2 text-sm font-semibold tabular-nums text-[#3D2E6B] transition-all ${
          open
            ? "border-[#7E6BAF] ring-4 ring-[#7E6BAF]/10"
            : "border-[#E3DBF5] hover:border-[#A89BD0]"
        }`}
      >
        <span>{formatTime12(value)}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#A89BD0] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[148px] overflow-hidden rounded-xl border border-[#F0EAFB] bg-white py-1.5 shadow-[0_20px_40px_-12px_rgba(126,107,175,0.35)]">
          <div className="max-h-56 overflow-y-auto px-1.5">
            {TIME_SLOTS.map((slot) => {
              const active = slot === value;
              return (
                <button
                  key={slot}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(slot);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors ${
                    active
                      ? "bg-[#F0EAFB] font-semibold text-[#3D2E6B]"
                      : "text-[#5E4A8C] hover:bg-[#F7F2FC] hover:text-[#3D2E6B]"
                  }`}
                >
                  <span>{formatTime12(slot)}</span>
                  {active && <Check className="h-3.5 w-3.5 text-[#7E6BAF]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_WEEK: WeekAvail = {
  Mon: { enabled: true, intervals: [{ ...DEFAULT_INTERVAL, id: "m1" }] },
  Tue: { enabled: true, intervals: [{ ...DEFAULT_INTERVAL, id: "t1" }] },
  Wed: { enabled: true, intervals: [{ ...DEFAULT_INTERVAL, id: "w1" }] },
  Thu: { enabled: true, intervals: [{ ...DEFAULT_INTERVAL, id: "th1" }] },
  Fri: { enabled: true, intervals: [{ ...DEFAULT_INTERVAL, id: "f1" }] },
  Sat: { enabled: false, intervals: [] },
  Sun: { enabled: false, intervals: [] },
};

type CalendarProvider = "google" | "outlook" | "apple" | "ical";

const PROVIDERS: { id: CalendarProvider; name: string; available: boolean }[] = [
  { id: "google", name: "Google Calendar", available: true },
  { id: "outlook", name: "Microsoft Outlook", available: false },
  { id: "apple", name: "Apple Calendar", available: false },
  { id: "ical", name: "Other (iCal feed)", available: false },
];

type Service = { id: string; name: string; length: string; price: string };

const DEFAULT_SERVICES: Service[] = [
  { id: "s1", name: "Initial consultation", length: "30 min", price: "$60" },
  { id: "s2", name: "Therapy session", length: "50 min", price: "$120" },
];

type Holiday = { id: string; date: string; label: string };

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export function CalendarAvailabilitySection() {
  // calendar connection
  const [provider, setProvider] = useState<CalendarProvider | null>("google");
  const [account, setAccount] = useState<string>("maria.santos@gmail.com");

  // weekly availability
  const [week, setWeek] = useState<WeekAvail>(DEFAULT_WEEK);

  // holidays / days off
  const [holidays, setHolidays] = useState<Holiday[]>([
    { id: "h1", date: "2026-07-04", label: "Independence Day" },
  ]);
  const [newHoliday, setNewHoliday] = useState<{ date: string; label: string }>({ date: "", label: "" });

  // services + which use weekly hours vs custom
  const [services] = useState<Service[]>(DEFAULT_SERVICES);
  const [serviceMode, setServiceMode] = useState<Record<string, "weekly" | "custom">>({
    s1: "weekly",
    s2: "weekly",
  });

  const toggleDay = (key: string) =>
    setWeek((w) => ({
      ...w,
      [key]: w[key].enabled
        ? { enabled: false, intervals: [] }
        : { enabled: true, intervals: [{ ...DEFAULT_INTERVAL, id: genId() }] },
    }));

  const updateInterval = (day: string, id: string, patch: Partial<Interval>) =>
    setWeek((w) => ({
      ...w,
      [day]: {
        ...w[day],
        intervals: w[day].intervals.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      },
    }));

  const addInterval = (day: string) =>
    setWeek((w) => ({
      ...w,
      [day]: {
        enabled: true,
        intervals: [...w[day].intervals, { id: genId(), start: "13:00", end: "17:00" }],
      },
    }));

  const removeInterval = (day: string, id: string) =>
    setWeek((w) => ({
      ...w,
      [day]: { ...w[day], intervals: w[day].intervals.filter((i) => i.id !== id) },
    }));

  const copyToAll = (sourceKey: string) => {
    const src = week[sourceKey];
    if (!src.enabled) return;
    setWeek((w) => {
      const next: WeekAvail = { ...w };
      DAYS.forEach((d) => {
        if (d.key === sourceKey) return;
        next[d.key] = {
          enabled: true,
          intervals: src.intervals.map((i) => ({ ...i, id: genId() })),
        };
      });
      return next;
    });
  };

  const addHoliday = () => {
    if (!newHoliday.date) return;
    setHolidays((h) => [
      ...h,
      { id: genId(), date: newHoliday.date, label: newHoliday.label || "Day off" },
    ]);
    setNewHoliday({ date: "", label: "" });
  };

  const removeHoliday = (id: string) =>
    setHolidays((h) => h.filter((x) => x.id !== id));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#3D2E6B] sm:text-3xl">
          Calendar & Availability
        </h1>
        <p className="mt-2 text-sm font-medium text-[#7E6BAF]">
          Define your working hours and sync with your digital calendars.
        </p>
      </div>

      {/* Calendar Connections */}
      <section className="rounded-3xl border border-[#EAE7F5] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#3D2E6B]">Calendar Connections</h2>
          {provider ? (
            <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
              Sync Active
            </span>
          ) : (
            <span className="rounded-full border border-[#EAE7F5] bg-[#F0EAFB]/40 px-3 py-1 text-xs font-medium text-[#7E6BAF]">
              Not connected
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Google */}
          <div
            className={`flex items-center justify-between rounded-2xl border-2 p-4 transition ${
              provider === "google"
                ? "border-[#7E6BAF]/30 bg-[#F0EAFB]/30"
                : "border-[#EAE7F5] bg-white"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#3D2E6B]">Google Calendar</p>
                <p className="text-xs text-[#7E6BAF]">
                  {provider === "google" ? `Connected · ${account}` : "Not connected"}
                </p>
              </div>
            </div>
            {provider === "google" ? (
              <button
                onClick={() => setProvider(null)}
                className="text-sm font-medium text-[#7E6BAF] hover:text-[#3D2E6B]"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => {
                  setProvider("google");
                  setAccount("maria.santos@gmail.com");
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#7E6BAF] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#3D2E6B]"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Connect
              </button>
            )}
          </div>

          {/* Coming soon tile */}
          <div className="flex items-center justify-between rounded-2xl border border-dashed border-[#A89BD0] bg-transparent p-4 opacity-70">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#A89BD0]">
                <CalendarDays className="h-5 w-5 text-[#7E6BAF]" />
              </div>
              <p className="text-sm font-medium text-[#7E6BAF]">Outlook & iCloud</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
              Coming Soon
            </span>
          </div>
        </div>
      </section>

      {/* Weekly Hours */}
      <section className="overflow-hidden rounded-3xl border border-[#EAE7F5] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F0EAFB] p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold text-[#3D2E6B]">Weekly Hours</h2>
            <p className="text-sm text-[#7E6BAF]">Set your recurring weekly schedule.</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7E6BAF]">
            Timezone · EST
          </span>
        </div>

        <div className="divide-y divide-[#F0EAFB]">
          {DAYS.map((d) => {
            const day = week[d.key];
            return (
              <div
                key={d.key}
                className={`flex flex-col gap-4 p-6 transition-colors sm:flex-row sm:items-start sm:gap-8 ${
                  day.enabled ? "hover:bg-[#F0EAFB]/20" : "bg-gray-50/40"
                }`}
              >
                <div className="flex w-40 shrink-0 items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => toggleDay(d.key)}
                    aria-label={`Toggle ${d.label}`}
                    aria-pressed={day.enabled}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      day.enabled ? "bg-[#7E6BAF]" : "bg-[#E3DBF5]"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        day.enabled ? "translate-x-[22px]" : "translate-x-[2px]"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-sm font-semibold ${
                      day.enabled ? "text-[#3D2E6B]" : "text-[#A89BD0]"
                    }`}
                  >
                    {d.label}
                  </span>
                </div>

                {!day.enabled ? (
                  <div className="flex-1 pt-2">
                    <p className="text-sm text-[#A89BD0]">Unavailable</p>
                  </div>
                ) : (
                  <div className="flex-1 space-y-3">
                    {day.intervals.map((iv) => (
                      <div key={iv.id} className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <TimePill
                          value={iv.start}
                          ariaLabel="Start time"
                          onChange={(v) => updateInterval(d.key, iv.id, { start: v })}
                        />
                        <span className="text-xs font-medium uppercase tracking-wider text-[#A89BD0]">
                          to
                        </span>
                        <TimePill
                          value={iv.end}
                          ariaLabel="End time"
                          onChange={(v) => updateInterval(d.key, iv.id, { end: v })}
                        />
                        {day.intervals.length > 1 && (
                          <button
                            onClick={() => removeInterval(d.key, iv.id)}
                            className="p-2 text-[#A89BD0] transition-colors hover:text-red-400"
                            aria-label="Remove interval"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <button
                        onClick={() => addInterval(d.key)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#7E6BAF] transition-colors hover:text-[#3D2E6B]"
                      >
                        <Plus className="h-4 w-4" /> Add interval
                      </button>
                      <button
                        onClick={() => copyToAll(d.key)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#7E6BAF] transition-colors hover:text-[#3D2E6B]"
                      >
                        <Copy className="h-4 w-4" /> Copy to all
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Holidays & Service Alignment */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Holidays & Time Off */}
        <section className="rounded-3xl border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#3D2E6B]">
              <CalendarOff className="h-4 w-4" />
              Holidays & Time Off
            </h3>
          <div className="space-y-3">
              {holidays.length === 0 ? (
              <p className="text-xs italic text-[#A89BD0]">No days off added yet.</p>
              ) : (
                holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#F0EAFB]/40 px-3 py-2"
                >
                  <span className="truncate text-xs font-medium text-[#3D2E6B]">
                      {h.label}
                    </span>
                    <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#7E6BAF]">
                        {new Date(h.date + "T00:00:00").toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <button
                        onClick={() => removeHoliday(h.id)}
                        className="text-[#A89BD0] hover:text-red-500"
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}

            <div className="space-y-2 border-t border-[#F0EAFB] pt-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) =>
                      setNewHoliday((p) => ({ ...p, date: e.target.value }))
                    }
                  className="rounded-lg border border-[#EAE7F5] bg-white px-2 py-1.5 text-xs font-medium text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={newHoliday.label}
                    onChange={(e) =>
                      setNewHoliday((p) => ({ ...p, label: e.target.value }))
                    }
                  className="min-w-0 flex-1 rounded-lg border border-[#EAE7F5] bg-white px-2 py-1.5 text-xs font-medium text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
                  />
                </div>
                <button
                  onClick={addHoliday}
                  disabled={!newHoliday.date}
                className="w-full rounded-lg border border-dashed border-[#7E6BAF]/30 py-2 text-[11px] font-bold text-[#7E6BAF] transition-colors hover:bg-[#F0EAFB] disabled:cursor-not-allowed disabled:opacity-50"
                >
                + Add date
                </button>
              </div>
            </div>
        </section>

          {/* Service Availability */}
        <section className="rounded-3xl border border-[#EAE7F5] bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#3D2E6B]">
              <Video className="h-4 w-4" />
              Service Availability
            </h3>
          <div className="space-y-3">
              {services.map((s) => {
                const mode = serviceMode[s.id] ?? "weekly";
                return (
                  <div key={s.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[#3D2E6B]">
                          {s.name}
                        </p>
                      <p className="text-[10px] text-[#7E6BAF]">
                          {s.length} · {s.price}
                        </p>
                      </div>
                      <div className="inline-flex rounded-full border border-[#E3DBF5] bg-[#F8F5FF] p-0.5">
                        {(["weekly", "custom"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() =>
                              setServiceMode((p) => ({ ...p, [s.id]: m }))
                            }
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                              mode === m
                                ? "bg-[#7E6BAF] text-white shadow-sm"
                                : "text-[#7E6BAF] hover:text-[#3D2E6B]"
                            }`}
                          >
                            {m === "weekly" ? "Weekly" : "Custom"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {mode === "custom" && (
                    <div className="rounded-lg border border-dashed border-[#E3DBF5] bg-[#F0EAFB]/40 p-2 text-[11px] font-medium text-[#7E6BAF]">
                        Custom hours for this service will appear here.
                      </div>
                    )}
                  </div>
                );
              })}
            <button className="w-full rounded-lg border border-dashed border-[#7E6BAF]/30 py-2 text-[11px] font-bold text-[#7E6BAF] transition-colors hover:bg-[#F0EAFB]">
                Configure Services
              </button>
            </div>
        </section>
        </div>

        {/* Footer */}
      <div className="flex justify-end gap-4 pt-2">
        <button className="px-6 py-2.5 text-sm font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]">
            Cancel
          </button>
        <button className="transform rounded-2xl bg-[#3D2E6B] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3D2E6B]/20 transition-all hover:-translate-y-0.5 hover:bg-[#7E6BAF]">
          Save Changes
          </button>
      </div>
    </div>
  );
}

/* ---------- Appointments ---------- */

export function AppointmentsSection() {
  const [tab, setTab] = useState<"upcoming" | "requests" | "past">("upcoming");

  const upcoming = [
    { client: "Anna Reyes", when: "Today · 2:00 PM", type: "Therapy · 50 min" },
    { client: "Jordan Lee", when: "Tomorrow · 10:30 AM", type: "Consultation · 30 min" },
    { client: "Sam Cruz", when: "Fri Jun 28 · 4:00 PM", type: "Therapy · 50 min" },
  ];
  const requests = [
    { client: "Priya Patel", when: "Mon Jul 1 · 11:00 AM", type: "Consultation · 30 min" },
  ];
  const past = [
    { client: "Anna Reyes", when: "Last week · 2:00 PM", type: "Therapy · 50 min" },
    { client: "Maya Singh", when: "Jun 18 · 9:00 AM", type: "Therapy · 50 min" },
  ];

  const list = tab === "upcoming" ? upcoming : tab === "requests" ? requests : past;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="This week" value="6" hint="3 confirmed · 3 pending" />
        <Stat label="Pending requests" value="1" hint="Awaiting your response" />
        <Stat label="No-show rate" value="2%" hint="Last 30 days" />
      </div>

      <SectionCard title="Bookings" description="Everything on your schedule.">
        <div className="mb-5 inline-flex rounded-full border border-[#E3DBF5] bg-white/60 p-1">
          {(["upcoming", "requests", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                tab === t
                  ? "bg-[#7E6BAF] text-white shadow-sm"
                  : "text-[#7E6BAF] hover:bg-[#7E6BAF]/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E3DBF5] bg-white/40 p-10 text-center">
            <CalendarClock className="mx-auto h-6 w-6 text-[#A89BD0]" />
            <p className="mt-3 text-sm font-medium text-[#7E6BAF]">Nothing here yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((a, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EEE7FA] bg-white/70 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7E6BAF]/15 text-[#7E6BAF]">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#3D2E6B]">{a.client}</p>
                    <p className="text-xs text-[#7E6BAF]">{a.type}</p>
                  </div>
                </div>
                <p className="text-xs font-medium text-[#3D2E6B]/80">{a.when}</p>
                {tab === "requests" ? (
                  <div className="flex items-center gap-2">
                    <button className="rounded-full border border-[#E3DBF5] px-3 py-1 text-xs font-semibold text-[#7E6BAF] hover:bg-[#7E6BAF]/10">
                      Decline
                    </button>
                    <button className="rounded-full bg-[#7E6BAF] px-3 py-1 text-xs font-semibold text-white hover:bg-[#3D2E6B]">
                      Accept
                    </button>
                  </div>
                ) : (
                  <button className="text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]">
                    View
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ---------- Payments & Payouts ---------- */

export function PaymentsPayoutsSection() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Available balance" value="$1,240.00" hint="Next payout Jul 1" />
        <Stat label="This month" value="$3,180.00" hint="18 sessions completed" />
        <Stat label="Lifetime earnings" value="$12,840.00" />
      </div>

      <SectionCard
        title="Payout method"
        description="Where we send your earnings."
        action={
          <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]">
            Update
          </button>
        }
      >
        <div className="flex items-center justify-between rounded-2xl border border-[#EEE7FA] bg-white/70 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7E6BAF]/15">
              <Wallet className="h-5 w-5 text-[#7E6BAF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#3D2E6B]">Bank transfer · BPI</p>
              <p className="text-xs text-[#7E6BAF]">Account ending in •••• 4821</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            Verified
          </span>
        </div>
      </SectionCard>

      <SectionCard title="Recent transactions">
        <div className="space-y-2">
          {[
            { client: "Anna Reyes", date: "Jun 24", amount: "+$120.00" },
            { client: "Jordan Lee", date: "Jun 23", amount: "+$60.00" },
            { client: "Payout to BPI", date: "Jun 21", amount: "-$840.00" },
            { client: "Sam Cruz", date: "Jun 19", amount: "+$120.00" },
          ].map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-[#EEE7FA] bg-white/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <CircleDot className="h-3.5 w-3.5 text-[#A89BD0]" />
                <div>
                  <p className="text-sm font-medium text-[#3D2E6B]">{t.client}</p>
                  <p className="text-xs text-[#7E6BAF]">{t.date}</p>
                </div>
              </div>
              <p
                className={`text-sm font-semibold ${
                  t.amount.startsWith("-") ? "text-[#7E6BAF]" : "text-emerald-600"
                }`}
              >
                {t.amount}
              </p>
            </div>
          ))}
        </div>
        <button className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]">
          View all <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </SectionCard>
    </div>
  );
}

/* ---------- Verification ---------- */

export function VerificationSection() {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Verification status"
        description="Verified providers get a badge on their profile and rank higher in search."
      >
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#3D2E6B]">Verification pending</p>
              <p className="text-xs text-[#7E6BAF]">
                Submit your credentials below to start the review (usually 2–3 business days).
              </p>
            </div>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
            In review
          </span>
        </div>
      </SectionCard>

      <SectionCard
        title="Documents"
        description="Your documents are encrypted and only seen by our verification team."
      >
        <div className="space-y-3">
          {[
            { name: "Government-issued ID", status: "Uploaded" },
            { name: "Professional license or certificate", status: "Needed" },
            { name: "Diploma or training certificate", status: "Optional" },
          ].map((d) => (
            <div
              key={d.name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EEE7FA] bg-white/70 p-4"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-[#7E6BAF]" />
                <p className="text-sm font-medium text-[#3D2E6B]">{d.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold ${
                    d.status === "Uploaded"
                      ? "text-emerald-600"
                      : d.status === "Needed"
                      ? "text-amber-600"
                      : "text-[#A89BD0]"
                  }`}
                >
                  {d.status}
                </span>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-[#E3DBF5] bg-white px-3 py-1.5 text-xs font-semibold text-[#7E6BAF] hover:bg-[#7E6BAF]/10">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="What gets verified">
        <ul className="space-y-2 text-sm text-[#3D2E6B]/80">
          {[
            "Your identity matches the name on your profile",
            "Your license or certification (when applicable)",
            "Your professional training or coaching credentials",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7E6BAF]" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}