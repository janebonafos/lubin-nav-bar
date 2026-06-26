import { useState } from "react";
import {
  CalendarDays,
  Check,
  Clock,
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
  ChevronRight,
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
  const [showProviderPicker, setShowProviderPicker] = useState(false);

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

  const providerName =
    PROVIDERS.find((p) => p.id === provider)?.name ?? "No calendar";

  return (
    <div className="space-y-6">
      {/* Calendar connection */}
      <SectionCard
        title="Calendar connection"
        description="We read your busy times to prevent double-bookings — we never share calendar details with clients."
        action={
          provider ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProviderPicker((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E3DBF5] bg-white px-3 py-1.5 text-xs font-semibold text-[#7E6BAF] hover:bg-[#7E6BAF]/10"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Switch calendar
              </button>
              <button
                onClick={() => setProvider(null)}
                className="text-xs font-semibold text-[#A89BD0] hover:text-red-500"
              >
                Disconnect
              </button>
            </div>
          ) : null
        }
      >
        {provider ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E3DBF5] bg-white/70 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7E6BAF]/10">
                <CalendarDays className="h-5 w-5 text-[#7E6BAF]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#3D2E6B]">{providerName}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#7E6BAF]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Connected · {account}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                // simulate reconnect — refresh sync
                setAccount((a) => a);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowProviderPicker(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#A89BD0] bg-white/60 px-5 py-6 text-sm font-semibold text-[#3D2E6B] transition hover:bg-[#7E6BAF]/5"
          >
            <CalendarDays className="h-4 w-4" /> Connect a calendar
          </button>
        )}

        {showProviderPicker && (
          <div className="mt-4 rounded-2xl border border-[#E3DBF5] bg-white/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#A89BD0]">
                Choose a calendar
              </p>
              <button
                onClick={() => setShowProviderPicker(false)}
                className="text-[#A89BD0] hover:text-[#3D2E6B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  disabled={!p.available}
                  onClick={() => {
                    setProvider(p.id);
                    setAccount("maria.santos@gmail.com");
                    setShowProviderPicker(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    p.available
                      ? "border-[#E3DBF5] bg-white hover:border-[#7E6BAF] hover:bg-[#7E6BAF]/5"
                      : "cursor-not-allowed border-[#EEE7FA] bg-[#F8F5FF]/50 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-[#7E6BAF]" />
                    <span className="text-sm font-semibold text-[#3D2E6B]">{p.name}</span>
                  </div>
                  {p.available ? (
                    <ChevronRight className="h-4 w-4 text-[#A89BD0]" />
                  ) : (
                    <span className="rounded-full bg-[#7E6BAF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                      Soon
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Weekly availability */}
      <SectionCard
        title="Weekly availability"
        description="Set hours per day. Add split intervals for breaks (e.g. morning and afternoon)."
        action={
          <button className="inline-flex items-center gap-1.5 rounded-full bg-[#7E6BAF] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#A89BD0]/40 hover:bg-[#3D2E6B]">
            <Check className="h-3.5 w-3.5" /> Save changes
          </button>
        }
      >
        <div className="divide-y divide-[#EEE7FA]">
          {DAYS.map((d) => {
            const day = week[d.key];
            return (
              <div key={d.key} className="grid grid-cols-12 items-start gap-4 py-5">
                {/* day toggle */}
                <div className="col-span-12 sm:col-span-3">
                  <label className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={`relative h-5 w-9 rounded-full transition ${
                        day.enabled ? "bg-[#7E6BAF]" : "bg-[#E3DBF5]"
                      }`}
                      aria-label={`Toggle ${d.label}`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                          day.enabled ? "left-4" : "left-0.5"
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
                  </label>
                </div>

                {/* intervals */}
                <div className="col-span-12 sm:col-span-9">
                  {!day.enabled ? (
                    <p className="text-sm italic text-[#A89BD0]">Unavailable</p>
                  ) : (
                    <div className="space-y-2">
                      {day.intervals.map((iv) => (
                        <div key={iv.id} className="flex flex-wrap items-center gap-2">
                          <input
                            type="time"
                            value={iv.start}
                            onChange={(e) =>
                              updateInterval(d.key, iv.id, { start: e.target.value })
                            }
                            className="w-28 rounded-lg border border-[#E3DBF5] bg-white px-3 py-2 text-sm font-medium text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
                          />
                          <span className="text-[#A89BD0]">–</span>
                          <input
                            type="time"
                            value={iv.end}
                            onChange={(e) =>
                              updateInterval(d.key, iv.id, { end: e.target.value })
                            }
                            className="w-28 rounded-lg border border-[#E3DBF5] bg-white px-3 py-2 text-sm font-medium text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
                          />
                          {day.intervals.length > 1 && (
                            <button
                              onClick={() => removeInterval(d.key, iv.id)}
                              className="rounded-lg p-1.5 text-[#A89BD0] hover:bg-red-50 hover:text-red-500"
                              aria-label="Remove interval"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => addInterval(d.key)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
                        >
                          <Plus className="h-3 w-3" /> Add interval
                        </button>
                        <span className="text-[#E3DBF5]">·</span>
                        <button
                          onClick={() => copyToAll(d.key)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
                        >
                          <Copy className="h-3 w-3" /> Copy to all days
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Holidays & days off */}
      <SectionCard
        title="Holidays & days off"
        description="Block specific dates — clients won't be able to book on these days."
      >
        <div className="space-y-3">
          {holidays.length === 0 ? (
            <p className="text-sm italic text-[#A89BD0]">No days off added yet.</p>
          ) : (
            holidays.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-xl border border-[#EEE7FA] bg-white/70 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <CalendarOff className="h-4 w-4 text-[#7E6BAF]" />
                  <div>
                    <p className="text-sm font-semibold text-[#3D2E6B]">{h.label}</p>
                    <p className="text-xs text-[#7E6BAF]">
                      {new Date(h.date + "T00:00:00").toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeHoliday(h.id)}
                  className="rounded-lg p-1.5 text-[#A89BD0] hover:bg-red-50 hover:text-red-500"
                  aria-label="Remove day off"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-[#E3DBF5] bg-white/40 p-4">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A89BD0]">
              Date
            </span>
            <input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday((p) => ({ ...p, date: e.target.value }))}
              className="mt-1 rounded-lg border border-[#E3DBF5] bg-white px-3 py-2 text-sm font-medium text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
            />
          </label>
          <label className="block flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A89BD0]">
              Reason (optional)
            </span>
            <input
              type="text"
              placeholder="Vacation, holiday, personal..."
              value={newHoliday.label}
              onChange={(e) => setNewHoliday((p) => ({ ...p, label: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[#E3DBF5] bg-white px-3 py-2 text-sm font-medium text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
            />
          </label>
          <button
            onClick={addHoliday}
            disabled={!newHoliday.date}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7E6BAF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#3D2E6B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add day off
          </button>
        </div>
      </SectionCard>

      {/* Per-service availability */}
      <SectionCard
        title="Service availability"
        description="Each service follows your weekly hours by default. Override for specific services if needed."
      >
        <div className="space-y-3">
          {services.map((s) => {
            const mode = serviceMode[s.id] ?? "weekly";
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-[#EEE7FA] bg-white/70 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Video className="h-4 w-4 text-[#7E6BAF]" />
                    <div>
                      <p className="text-sm font-semibold text-[#3D2E6B]">{s.name}</p>
                      <p className="text-xs text-[#7E6BAF]">
                        {s.length} · {s.price}
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex rounded-full border border-[#E3DBF5] bg-white p-1">
                    {(["weekly", "custom"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() =>
                          setServiceMode((p) => ({ ...p, [s.id]: m }))
                        }
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition ${
                          mode === m
                            ? "bg-[#7E6BAF] text-white shadow-sm"
                            : "text-[#7E6BAF] hover:bg-[#7E6BAF]/10"
                        }`}
                      >
                        {m === "weekly" ? "Use weekly hours" : "Custom"}
                      </button>
                    ))}
                  </div>
                </div>
                {mode === "custom" && (
                  <div className="mt-4 rounded-xl border border-dashed border-[#E3DBF5] bg-[#F8F5FF]/60 p-4 text-xs text-[#7E6BAF]">
                    Custom hours for <span className="font-semibold">{s.name}</span>{" "}
                    will appear here — pick specific days and time windows that
                    differ from your weekly schedule.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
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