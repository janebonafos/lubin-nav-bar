import { useEffect, useRef, useState } from "react";
import {
  publishAppointmentEvent,
  subscribeAppointmentEvents,
} from "@/lib/appointments-bus";
import {
  availabilityStore,
  useAvailabilityStore,
  type CalendarProvider as StoreProvider,
} from "@/lib/availability-store";
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
  LayoutGrid,
  List,
  AlertTriangle,
  Loader2,
  Building2,
  ExternalLink,
  Globe,
  CheckCircle2,
  Info,
  ArrowLeftRight,
  Link2Off,
  Sparkles,
  Paperclip,
  Mic,
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
  hasError = false,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-invalid={hasError || undefined}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={`inline-flex w-[112px] shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-xl border bg-white px-3 py-2 text-sm font-semibold tabular-nums text-[#3D2E6B] transition-all ${
          hasError
            ? "border-red-300 ring-4 ring-red-200/40"
            : open
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
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-[13px] transition-colors ${
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

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

type IntervalErrors = Record<string, string>;
type DayErrors = { intervals: IntervalErrors; day?: string };
type WeekErrors = Record<string, DayErrors>;

function validateWeek(week: WeekAvail): { errors: WeekErrors; count: number } {
  const errors: WeekErrors = {};
  let count = 0;
  for (const key of Object.keys(week)) {
    const day = week[key];
    const ivErrs: IntervalErrors = {};
    let dayErr: string | undefined;
    if (day.enabled) {
      if (day.intervals.length === 0) {
        dayErr = "Add at least one time interval or turn this day off.";
        count++;
      }
      // per-interval checks
      const sorted = [...day.intervals].sort(
        (a, b) => toMinutes(a.start) - toMinutes(b.start),
      );
      for (const iv of day.intervals) {
        if (toMinutes(iv.end) <= toMinutes(iv.start)) {
          ivErrs[iv.id] = "End time must be after start time.";
          count++;
        }
      }
      // overlaps
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];
        if (toMinutes(cur.start) < toMinutes(prev.end)) {
          if (!ivErrs[cur.id]) {
            ivErrs[cur.id] = "This interval overlaps another on the same day.";
            count++;
          }
        }
      }
    }
    errors[key] = { intervals: ivErrs, day: dayErr };
  }
  return { errors, count };
}

function isPastDate(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return d.getTime() < today.getTime();
}

/* Interactive week-grid editor for weekly availability */
function WeekGridView({
  week,
  errors,
  onAddInterval,
  onUpdateInterval,
  onRemoveInterval,
  onToggleDay,
  onCopyToAll,
}: {
  week: WeekAvail;
  errors: WeekErrors;
  onAddInterval: (day: string, start?: string, end?: string) => void;
  onUpdateInterval: (day: string, id: string, patch: Partial<Interval>) => void;
  onRemoveInterval: (day: string, id: string) => void;
  onToggleDay: (day: string) => void;
  onCopyToAll: (day: string) => void;
}) {
  const startHour = 6;
  const endHour = 22;
  const totalMin = (endHour - startHour) * 60;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const rowH = 44; // px per hour
  const [active, setActive] = useState<{ day: string; id: string } | null>(null);

  const handleEmptyClick = (
    e: React.MouseEvent<HTMLDivElement>,
    dayKey: string,
    enabled: boolean,
  ) => {
    // close popover if open and click was on empty area
    if (active) {
      setActive(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const min = Math.round((ratio * totalMin) / 30) * 30; // snap 30m
    const startM = Math.max(0, Math.min(totalMin - 60, min));
    const endM = Math.min(totalMin, startM + 60);
    const toHHMM = (m: number) => {
      const total = m + startHour * 60;
      const h = Math.floor(total / 60);
      const mm = total % 60;
      return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };
    onAddInterval(dayKey, toHHMM(startM), toHHMM(endM));
    if (!enabled) onToggleDay(dayKey); // ensure enabled (addInterval already enables)
  };

  return (
    <div className="p-4 sm:p-6" onClick={() => active && setActive(null)}>
      <div
        className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header row */}
        <div />
        {DAYS.map((d) => (
          <div
            key={d.key}
            className={`pb-3 text-center text-[11px] font-bold uppercase tracking-widest ${
              week[d.key].enabled ? "text-[#3D2E6B]" : "text-[#A89BD0]"
            }`}
          >
            {d.label.slice(0, 3)}
          </div>
        ))}

        {/* time gutter */}
        <div className="relative" style={{ height: `${(endHour - startHour) * rowH}px` }}>
          {hours.slice(0, -1).map((h, i) => (
            <div
              key={h}
              className="absolute right-3 text-[10px] font-semibold text-[#A89BD0]"
              style={{ top: `${i * rowH + 4}px` }}
            >
              {h % 12 === 0 ? 12 : h % 12}
              {h < 12 ? "a" : "p"}
            </div>
          ))}
        </div>

        {/* day columns */}
        {DAYS.map((d) => {
          const day = week[d.key];
          const dayErr = errors[d.key];
          return (
            <div
              key={d.key}
              className={`group/col relative rounded-xl border transition-colors ${
                day.enabled
                  ? "border-[#EAE7F5] bg-[#FBF9FF] hover:bg-[#F4EDFF]/60"
                  : "border-dashed border-[#EAE7F5] bg-gray-50/40"
              }`}
              style={{ height: `${(endHour - startHour) * rowH}px`, cursor: day.enabled ? "crosshair" : "pointer" }}
              onClick={(e) => {
                // ignore clicks on interval/popover children
                if ((e.target as HTMLElement).closest("[data-block]")) return;
                handleEmptyClick(e, d.key, day.enabled);
              }}
            >
              {/* hour gridlines */}
              {hours.slice(1, -1).map((_, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute inset-x-0 border-t border-[#7E6BAF]/5"
                  style={{ top: `${(i + 1) * rowH}px` }}
                />
              ))}

              {/* off-day affordance */}
              {!day.enabled && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#A89BD0]">
                    Off
                  </span>
                  <span className="rounded-[10px] border border-[#A89BD0]/40 bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-[#7E6BAF] opacity-0 transition-opacity group-hover/col:opacity-100">
                    + Add hours
                  </span>
                </div>
              )}

              {/* empty hover hint */}
              {day.enabled && day.intervals.length === 0 && (
                <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border border-dashed border-[#7E6BAF]/40 bg-[#7E6BAF]/5 opacity-0 transition-opacity group-hover/col:opacity-100">
                  <Plus className="h-4 w-4 text-[#7E6BAF]" />
                </div>
              )}

              {/* intervals */}
              {day.enabled &&
                day.intervals.map((iv) => {
                  const s = Math.max(toMinutes(iv.start) - startHour * 60, 0);
                  const e = Math.min(toMinutes(iv.end) - startHour * 60, totalMin);
                  if (e <= s) return null;
                  const hasErr = !!dayErr?.intervals[iv.id];
                  const isActive = active?.day === d.key && active.id === iv.id;
                  const top = (s / totalMin) * 100;
                  const height = ((e - s) / totalMin) * 100;
                  // popover position: below if block in top half, else above
                  const placeBelow = top < 55;
                  return (
                    <div
                      key={iv.id}
                      data-block
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setActive(isActive ? null : { day: d.key, id: iv.id });
                      }}
                      className={`absolute left-1 right-1 cursor-pointer rounded-xl border px-2 py-1.5 text-[10px] font-semibold shadow-sm transition-all ${
                        hasErr
                          ? "z-10 border-red-300 bg-red-100/90 text-red-700"
                          : isActive
                            ? "z-30 border-[#7E6BAF]/40 bg-[#7E6BAF] text-white shadow-xl ring-4 ring-[#7E6BAF]/20"
                            : "z-10 border-white/40 bg-[#C9BEE4] text-[#3D2E6B] hover:z-20 hover:bg-[#BDB0DC] hover:shadow-md"
                      }`}
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        minHeight: 28,
                      }}
                    >
                      <div className="truncate leading-tight">
                        {formatTime12(iv.start)}
                      </div>
                      <div className="truncate text-[9px] font-medium opacity-80">
                        {formatTime12(iv.end)}
                      </div>

                      {/* edit popover */}
                      {isActive && (
                        <div
                          onClick={(ev) => ev.stopPropagation()}
                          className={`absolute left-1/2 z-50 w-[260px] -translate-x-1/2 rounded-xl border border-[#E3DBF5] bg-white p-3 text-left text-[#3D2E6B] shadow-[0_20px_45px_-12px_rgba(61,46,107,0.35)] ${
                            placeBelow ? "top-[calc(100%+10px)]" : "bottom-[calc(100%+10px)]"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7E6BAF]">
                              Edit slot
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                onRemoveInterval(d.key, iv.id);
                                setActive(null);
                              }}
                              className="rounded-xl p-1 text-[#A89BD0] hover:bg-red-50 hover:text-red-500"
                              aria-label="Delete slot"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex flex-nowrap items-center gap-2">
                            <TimePill
                              value={iv.start}
                              ariaLabel="Start time"
                              hasError={!!dayErr?.intervals[iv.id]}
                              onChange={(v) => onUpdateInterval(d.key, iv.id, { start: v })}
                            />
                            <span className="text-xs font-semibold text-[#A89BD0]">–</span>
                            <TimePill
                              value={iv.end}
                              ariaLabel="End time"
                              hasError={!!dayErr?.intervals[iv.id]}
                              onChange={(v) => onUpdateInterval(d.key, iv.id, { end: v })}
                            />
                          </div>
                          {dayErr?.intervals[iv.id] && (
                            <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              {dayErr.intervals[iv.id]}
                            </p>
                          )}
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F0EAFB] pt-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                onCopyToAll(d.key);
                                setActive(null);
                              }}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
                            >
                              <Copy className="h-3 w-3" /> Copy to all
                            </button>
                            <button
                              type="button"
                              onClick={() => setActive(null)}
                              className="rounded-xl bg-[#7E6BAF] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#3D2E6B]"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-medium text-[#7E6BAF]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-[10px] bg-[#7E6BAF]" />
          Click any empty area to add a slot. Click a slot to edit, delete, or copy.
        </div>
        <div className="hidden items-center gap-4 sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#7E6BAF]" /> Saved
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#3D2E6B]" /> Editing
          </span>
        </div>
      </div>
    </div>
  );
}

export function CalendarAvailabilitySection() {
  // calendar connection
  const connection = useAvailabilityStore((s) => s.connection);
  const provider = connection.provider;
  const account = connection.account;
  const setProvider = (p: CalendarProvider | null) =>
    availabilityStore.setConnection({ ...availabilityStore.getState().connection, provider: p as StoreProvider | null });
  const setAccount = (a: string) =>
    availabilityStore.setConnection({ ...availabilityStore.getState().connection, account: a });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // weekly availability
  const week = useAvailabilityStore((s) => s.week);
  const setWeek = (updater: WeekAvail | ((w: WeekAvail) => WeekAvail)) => {
    const next =
      typeof updater === "function"
        ? (updater as (w: WeekAvail) => WeekAvail)(availabilityStore.getState().week)
        : updater;
    availabilityStore.setWeek(next);
  };

  // holidays / days off
  const [holidays, setHolidays] = useState<Holiday[]>([
    { id: "h1", date: "2026-07-04", label: "Independence Day" },
  ]);
  const [newHoliday, setNewHoliday] = useState<{ date: string; label: string }>({ date: "", label: "" });
  const [holidayError, setHolidayError] = useState<string | null>(null);

  // services + which use weekly hours vs custom
  const [services] = useState<Service[]>(DEFAULT_SERVICES);
  const [serviceMode, setServiceMode] = useState<Record<string, "weekly" | "custom">>({
    s1: "weekly",
    s2: "weekly",
  });

  // per-service custom weekly hours (seeded from main Weekly Hours when user
  // first switches a service to Custom — so they never have to re-enter times).
  const cloneWeek = (w: WeekAvail): WeekAvail =>
    DAYS.reduce((acc, d) => {
      const day = w[d.key];
      acc[d.key] = {
        enabled: day.enabled,
        intervals: day.intervals.map((i) => ({ ...i, id: genId() })),
      };
      return acc;
    }, {} as WeekAvail);
  const [serviceHours, setServiceHours] = useState<Record<string, WeekAvail>>({});
  const toggleServiceDay = (sid: string, key: string) =>
    setServiceHours((p) => {
      const cur = p[sid] ?? cloneWeek(week);
      const day = cur[key];
      return {
        ...p,
        [sid]: {
          ...cur,
          [key]: day.enabled
            ? { enabled: false, intervals: [] }
            : { enabled: true, intervals: [{ ...DEFAULT_INTERVAL, id: genId() }] },
        },
      };
    });
  const updateServiceInterval = (
    sid: string,
    key: string,
    iid: string,
    patch: Partial<Interval>,
  ) =>
    setServiceHours((p) => {
      const cur = p[sid] ?? cloneWeek(week);
      return {
        ...p,
        [sid]: {
          ...cur,
          [key]: {
            ...cur[key],
            intervals: cur[key].intervals.map((it) =>
              it.id === iid ? { ...it, ...patch } : it,
            ),
          },
        },
      };
    });
  const resetServiceToWeekly = (sid: string) =>
    setServiceHours((p) => {
      const { [sid]: _omit, ...rest } = p;
      return rest;
    });
  const addServiceInterval = (sid: string, key: string) =>
    setServiceHours((p) => {
      const cur = p[sid] ?? cloneWeek(week);
      return {
        ...p,
        [sid]: {
          ...cur,
          [key]: {
            enabled: true,
            intervals: [...cur[key].intervals, { id: genId(), start: "13:00", end: "17:00" }],
          },
        },
      };
    });
  const removeServiceInterval = (sid: string, key: string, iid: string) =>
    setServiceHours((p) => {
      const cur = p[sid] ?? cloneWeek(week);
      const next = cur[key].intervals.filter((i) => i.id !== iid);
      return {
        ...p,
        [sid]: {
          ...cur,
          [key]: { enabled: next.length > 0, intervals: next },
        },
      };
    });

  // Weekly hours view + save state
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [saved, setSaved] = useState(false);

  const { errors: weekErrors, count: errorCount } = validateWeek(week);

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

  const addInterval = (day: string, start = "13:00", end = "17:00") =>
    setWeek((w) => ({
      ...w,
      [day]: {
        enabled: true,
        intervals: [...w[day].intervals, { id: genId(), start, end }],
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
    setHolidayError(null);
    if (!newHoliday.date) {
      setHolidayError("Pick a date for this day off.");
      return;
    }
    if (isPastDate(newHoliday.date)) {
      setHolidayError("That date is in the past.");
      return;
    }
    if (holidays.some((h) => h.date === newHoliday.date)) {
      setHolidayError("You already added a day off for that date.");
      return;
    }
    setHolidays((h) => [
      ...h,
      { id: genId(), date: newHoliday.date, label: newHoliday.label || "Day off" },
    ]);
    setNewHoliday({ date: "", label: "" });
  };

  const removeHoliday = (id: string) =>
    setHolidays((h) => h.filter((x) => x.id !== id));

  const handleConnect = () => {
    setSyncError(null);
    setConnecting(true);
    // simulate async — randomly fail to demo error handling
    setTimeout(() => {
      setConnecting(false);
      if (Math.random() < 0.15) {
        setSyncError(
          "We couldn't reach Google Calendar. Check your connection and try again.",
        );
        return;
      }
      setProvider("google");
      setAccount("maria.santos@gmail.com");
    }, 500);
  };

  const handleSave = () => {
    if (errorCount > 0) {
      setSaved(false);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Calendar Connections */}
      <section className="rounded-xl border border-[#EAE7F5] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#3D2E6B]">Calendar Connections</h2>
            <p className="mt-1 text-sm text-[#7E6BAF]">
              Sync bookings directly to your calendar.
            </p>
          </div>
          {provider ? (
            <span className="shrink-0 rounded-[10px] border border-[#E5DCF5] bg-[#EFE8FB] px-3 py-1 text-xs font-medium text-[#3D2E6B]">
              Sync Active
            </span>
          ) : (
            <span className="shrink-0 rounded-[10px] border border-[#EAE7F5] bg-[#F0EAFB]/40 px-3 py-1 text-xs font-medium text-[#7E6BAF]">
              Not connected
            </span>
          )}
        </div>
        {syncError && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-100 bg-red-50/70 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs font-medium text-red-700">{syncError}</p>
            </div>
            <button
              onClick={handleConnect}
              className="shrink-0 text-xs font-semibold text-red-700 underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {/* Google */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E3DBF5]/60 bg-[#F0EAFB]/30 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#EAE7F5]">
                <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.5 39.7 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.3-.4-3.5z"/>
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#3D2E6B]">Google Calendar</p>
                <p className="text-[12.5px] text-[#7E6BAF]">
                  {provider === "google" ? `Connected · ${account}` : "Not connected"}
                </p>
              </div>
            </div>
            {provider === "google" ? (
              <button
                onClick={() => setProvider(null)}
                className="text-[12.5px] font-semibold text-[#A89BD0] hover:text-rose-500"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#7E6BAF] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#3D2E6B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${connecting ? "animate-spin" : ""}`} />
                {connecting ? "Connecting…" : "Connect"}
              </button>
            )}
          </div>

          {/* Coming soon */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#D8CFEC] bg-transparent px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-[#E3DBF5]/80">
                <CalendarDays className="h-5 w-5 text-[#A89BD0]" />
              </div>
              <p className="text-[14px] font-medium text-[#7E6BAF]">Outlook & iCloud</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
              Coming Soon
            </span>
          </div>
        </div>
      </section>

      {/* Weekly Hours */}
      <section className="overflow-hidden rounded-xl border border-[#EAE7F5] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F0EAFB] p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold text-[#3D2E6B]">Weekly Hours</h2>
            <p className="text-sm text-[#7E6BAF]">Set your recurring weekly schedule.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full bg-[#EFEAF7] p-1">
              {([
                { id: "list", label: "List" },
                { id: "grid", label: "Week grid" },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  aria-pressed={viewMode === id}
                  className={`rounded-full px-5 py-1.5 text-sm font-semibold transition ${
                    viewMode === id
                      ? "bg-[#A89BD0] text-white shadow-sm"
                      : "text-[#7E6BAF] hover:text-[#3D2E6B]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="hidden text-[10px] font-bold uppercase tracking-widest text-[#7E6BAF] sm:inline">
              Timezone · EST
            </span>
          </div>
        </div>

        {errorCount > 0 && (
          <div className="flex items-start gap-2 border-b border-red-100 bg-red-50/60 px-6 py-3 sm:px-8">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-xs font-medium text-red-700">
              {errorCount} issue{errorCount > 1 ? "s" : ""} to fix before saving — check the highlighted intervals.
            </p>
          </div>
        )}

        {viewMode === "list" ? (
        <div className="divide-y divide-[#F0EAFB]">
          {DAYS.map((d) => {
            const day = week[d.key];
            const dayErr = weekErrors[d.key];
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
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-[10px] transition-colors ${
                      day.enabled ? "bg-[#7E6BAF]" : "bg-[#E3DBF5]"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-[10px] bg-white shadow transition-transform ${
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
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-3">
                      {dayErr?.day && (
                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600">
                        <AlertTriangle className="h-3 w-3" /> {dayErr.day}
                      </p>
                    )}
                    {day.intervals.map((iv) => (
                      <div key={iv.id} className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <TimePill
                            value={iv.start}
                            ariaLabel="Start time"
                            hasError={!!dayErr?.intervals[iv.id]}
                            onChange={(v) => updateInterval(d.key, iv.id, { start: v })}
                          />
                          <span className="text-xs font-medium uppercase tracking-wider text-[#A89BD0]">
                            to
                          </span>
                          <TimePill
                            value={iv.end}
                            ariaLabel="End time"
                            hasError={!!dayErr?.intervals[iv.id]}
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
                        {dayErr?.intervals[iv.id] && (
                          <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600">
                            <AlertTriangle className="h-3 w-3" /> {dayErr.intervals[iv.id]}
                          </p>
                        )}
                      </div>
                    ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 sm:pt-2.5">
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
        ) : (
          <WeekGridView
            week={week}
            errors={weekErrors}
            onAddInterval={addInterval}
            onUpdateInterval={updateInterval}
            onRemoveInterval={removeInterval}
            onToggleDay={toggleDay}
            onCopyToAll={copyToAll}
          />
        )}
      </section>

      {/* Holidays & Service Alignment */}
      <div className="flex flex-col gap-6">
          {/* Holidays & Time Off */}
        <section className="order-2 rounded-xl border border-[#EFEBF8] bg-white p-6 shadow-[0_4px_20px_-6px_rgba(126,107,175,0.08)]">
          <div className="mb-6 flex items-baseline justify-between border-b border-[#EFEBF8] pb-4">
            <h2 className="text-base font-semibold tracking-tight text-[#5B4B8A]">Holidays & Time Off</h2>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#A89BD0]">Schedule</span>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {holidays.length === 0 ? (
              <p className="text-xs italic text-[#A89BD0]">No days off added yet.</p>
            ) : (
              holidays.map((h) => (
                <div
                  key={h.id}
                  className="group flex items-center justify-between rounded-xl border border-[#EFEBF8] bg-white p-3.5 transition-all hover:border-[#A89BD0]/40"
                >
                  <span className="truncate text-sm font-medium text-[#5B4B8A]">
                    {h.label || "Time off"}
                  </span>
                  <div className="flex items-center gap-3 pr-2">
                    <span className="inline-flex w-[72px] justify-center rounded-lg border border-[#EFEBF8] bg-[#F5F1FC] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A7AB8]">
                      {new Date(h.date + "T00:00:00").toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <button
                      onClick={() => removeHoliday(h.id)}
                      className="p-1 text-[#A89BD0] opacity-0 transition-colors hover:text-red-400 group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 space-y-3 border-t border-dashed border-[#EFEBF8] pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A89BD0]">Add a day off</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday((p) => ({ ...p, date: e.target.value }))}
                className="w-full rounded-xl border border-[#EAE7F5] bg-white px-3 py-2 text-sm text-[#3D2E6B] transition-all placeholder:text-[#A89BD0] focus:outline-none focus:ring-2 focus:ring-[#7E6BAF]/20"
              />
              <input
                type="text"
                placeholder="Reason (optional)"
                value={newHoliday.label}
                onChange={(e) => setNewHoliday((p) => ({ ...p, label: e.target.value }))}
                className="w-full rounded-xl border border-[#EAE7F5] bg-white px-3 py-2 text-sm text-[#3D2E6B] transition-all placeholder:text-[#A89BD0] focus:outline-none focus:ring-2 focus:ring-[#7E6BAF]/20"
              />
            </div>
              <button
              onClick={addHoliday}
              disabled={!newHoliday.date}
              className="w-full rounded-xl border border-[#EFEBF8] bg-white py-2.5 text-xs font-semibold uppercase tracking-wider text-[#8A7AB8] transition-all hover:bg-[#A89BD0] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-[#8A7AB8]"
            >
              + Add date
            </button>
            {holidayError && (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600">
                <AlertTriangle className="h-3 w-3" /> {holidayError}
              </p>
            )}
          </div>
        </section>

        {/* Service Availability */}
        <section className="order-1 flex flex-col rounded-xl border border-[#EFEBF8] bg-white p-6 shadow-[0_4px_20px_-6px_rgba(126,107,175,0.08)]">
          <div className="mb-6 flex items-baseline justify-between border-b border-[#EFEBF8] pb-4">
            <h2 className="text-base font-semibold tracking-tight text-[#5B4B8A]">Service Availability</h2>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#A89BD0]">Sessions</span>
          </div>

          <div className="space-y-6">
            {services.map((s) => {
              const mode = serviceMode[s.id] ?? "weekly";
              return (
                <div key={s.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[#5B4B8A]">{s.name}</h3>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-[#A89BD0]">
                        {s.length} · {s.price}
                      </p>
                    </div>
                    <div className="flex shrink-0 rounded-xl border border-[#EFEBF8] bg-[#F5F1FC] p-1">
                      {(["weekly", "custom"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setServiceMode((p) => ({ ...p, [s.id]: m }))}
                          className={`rounded-lg px-4 py-1.5 text-xs font-medium transition ${
                            mode === m
                              ? "bg-[#A89BD0] text-white shadow-sm"
                              : "text-[#8A7AB8] hover:text-[#5B4B8A]"
                          }`}
                        >
                          {m === "weekly" ? "Weekly" : "Custom"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {mode === "custom" && (() => {
                    const sw = serviceHours[s.id] ?? cloneWeek(week);
                    const isCustomized = Boolean(serviceHours[s.id]);
                    return (
                      <div className="rounded-[12px] border-2 border-dashed border-[#EFEBF8] bg-white p-2">
                        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-1">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-[#A89BD0]">
                            {isCustomized ? "Customized for this service" : "Inherited from Weekly Hours"}
                          </p>
                          {isCustomized && (
                            <button
                              type="button"
                              onClick={() => resetServiceToWeekly(s.id)}
                              className="text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF] hover:text-[#3D2E6B]"
                            >
                              Reset to weekly
                            </button>
                          )}
                        </div>
                        {DAYS.map((d, idx) => {
                          const day = sw[d.key];
                          return (
                            <div
                              key={d.key}
                              className={`flex items-start justify-between gap-3 px-4 py-3 ${
                                idx < DAYS.length - 1 ? "border-b border-[#F0EAFB]" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleServiceDay(s.id, d.key)}
                                className="flex items-center gap-4 pt-1.5 text-left"
                              >
                                <span
                                  className={`relative h-5 w-10 rounded-full transition ${
                                    day?.enabled ? "bg-[#7E6BAF]" : "bg-[#EFEBF8]"
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                                      day?.enabled ? "left-[22px]" : "left-0.5"
                                    }`}
                                  />
                                </span>
                                <span className="w-10 text-[15px] font-medium text-[#3D2E6B]">
                                  {d.key}
                                </span>
                              </button>
                              {day?.enabled && day.intervals.length > 0 ? (
                                <div className="flex flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-2">
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    {day.intervals.map((interval) => (
                                      <div key={interval.id} className="flex items-center gap-2">
                                        <TimePill
                                          value={interval.start}
                                          onChange={(v) =>
                                            updateServiceInterval(s.id, d.key, interval.id, { start: v })
                                          }
                                          ariaLabel={`${d.label} start`}
                                        />
                                        <span className="text-xs font-medium text-[#A89BD0]">to</span>
                                        <TimePill
                                          value={interval.end}
                                          onChange={(v) =>
                                            updateServiceInterval(s.id, d.key, interval.id, { end: v })
                                          }
                                          ariaLabel={`${d.label} end`}
                                        />
                                        {day.intervals.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => removeServiceInterval(s.id, d.key, interval.id)}
                                            aria-label={`Remove interval on ${d.label}`}
                                            className="rounded-md p-1 text-[#A89BD0] transition hover:bg-[#F5F1FC] hover:text-[#5B4B8A]"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addServiceInterval(s.id, d.key)}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF] transition hover:bg-[#F5F1FC] hover:text-[#3D2E6B]"
                                  >
                                    <Plus className="h-3 w-3" /> Interval
                                  </button>
                                </div>
                              ) : (
                                <span className="pt-1.5 text-sm font-medium tracking-tight text-[#A89BD0]">Unavailable</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-8">
            <button className="w-full rounded-xl border border-dashed border-[#EFEBF8] bg-[#F5F1FC]/50 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#8A7AB8] transition-all hover:border-[#A89BD0]/50 hover:text-[#5B4B8A]">
              Configure Services
            </button>
          </div>
        </section>
        </div>

        {/* Footer */}
      <div className="flex flex-wrap items-center justify-end gap-4 pt-2">
        {errorCount > 0 && (
          <p className="mr-auto flex items-center gap-1.5 text-xs font-medium text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            Resolve {errorCount} issue{errorCount > 1 ? "s" : ""} before saving.
          </p>
        )}
        {saved && errorCount === 0 && (
          <p className="mr-auto flex items-center gap-1.5 text-xs font-medium text-green-600">
            <Check className="h-3.5 w-3.5" /> Availability saved.
          </p>
        )}
        <button className="px-6 py-2.5 text-sm font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={errorCount > 0}
          className="transform rounded-xl bg-[#3D2E6B] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3D2E6B]/20 transition-all hover:-translate-y-0.5 hover:bg-[#7E6BAF] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* ---------- Appointments ---------- */
export const UPCOMING_APPOINTMENTS_COUNT = 3;


export function AppointmentsSection() {
  const [tab, setTab] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  type Appt = {
    id: string;
    client: string;
    day: string;
    date: string;
    month: string;
    time: string;
    timezone: string;
    duration: string;
    type: string;
    sessionFormat: "Individual" | "Group";
    mode: string;
    status: "upcoming" | "completed" | "cancelled";
    notes?: string;
    amount: string;
    paymentStatus: "Paid" | "Pending" | "Refunded" | "Failed";
    promoCode?: string;
    attachments?: { name: string; size: string }[];
    recordingConsent?: { client: boolean; provider: boolean };
    aiSummary?: string;
    payoutStatus?: "pending_review" | "in_review" | "approved" | "paid";
  };

  const seed: Appt[] = [
    { id: "u1", client: "Anna Reyes", day: "TODAY", date: "27", month: "JUN", time: "2:00 PM", timezone: "PHT (GMT+8)", duration: "50 min", type: "Therapy", sessionFormat: "Individual", mode: "Video", status: "upcoming", notes: "Follow-up on sleep journaling exercise from last session.", amount: "₱2,500", paymentStatus: "Paid" },
    { id: "u2", client: "Jordan Lee", day: "TMRW", date: "28", month: "JUN", time: "10:30 AM", timezone: "PHT (GMT+8)", duration: "30 min", type: "Consultation", sessionFormat: "Individual", mode: "Video", status: "upcoming", notes: "Intake consultation — review intake form prior to call.", amount: "₱1,200", paymentStatus: "Paid", promoCode: "WELCOME10" },
    { id: "u3", client: "Sam Cruz", day: "FRI", date: "28", month: "JUN", time: "4:00 PM", timezone: "PHT (GMT+8)", duration: "50 min", type: "Group therapy", sessionFormat: "Group", mode: "Video", status: "upcoming", amount: "₱1,500", paymentStatus: "Pending" },
    {
      id: "c1", client: "Anna Reyes", day: "WED", date: "19", month: "JUN", time: "2:00 PM", timezone: "PHT (GMT+8)", duration: "50 min", type: "Therapy", sessionFormat: "Individual", mode: "Video", status: "completed",
      notes: "Discussed boundary-setting at work. Homework: daily wins journal.",
      amount: "₱2,500", paymentStatus: "Paid",
      attachments: [{ name: "session-19-jun-worksheet.pdf", size: "212 KB" }],
      recordingConsent: { client: true, provider: true },
      aiSummary: "Client explored workplace boundary-setting and identified two recurring triggers (after-hours messages, meeting overflow). Agreed on a daily wins journal and a scripted decline for non-urgent requests. Mood improved from session start to close. Next: review journal entries and rehearse the script aloud.",
      payoutStatus: "approved",
    },
    {
      id: "c2", client: "Maya Singh", day: "TUE", date: "18", month: "JUN", time: "9:00 AM", timezone: "PHT (GMT+8)", duration: "50 min", type: "Therapy", sessionFormat: "Individual", mode: "In-person", status: "completed",
      amount: "₱2,500", paymentStatus: "Paid", promoCode: "SUMMER20",
      recordingConsent: { client: false, provider: true },
      payoutStatus: "in_review",
    },
    { id: "x1", client: "Priya Patel", day: "MON", date: "17", month: "JUN", time: "11:00 AM", timezone: "PHT (GMT+8)", duration: "30 min", type: "Consultation", sessionFormat: "Individual", mode: "Video", status: "cancelled", notes: "Cancelled by client 2 hours before start.", amount: "₱1,200", paymentStatus: "Refunded" },
  ];

  const [all, setAll] = useState<Appt[]>(seed);
  const [locks, setLocks] = useState<Record<string, "cancel" | "reschedule">>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const unsub = subscribeAppointmentEvents((evt) => {
      if (evt.type === "lock") {
        setLocks((m) => ({ ...m, [evt.id]: evt.action }));
      } else if (evt.type === "unlock") {
        setLocks((m) => {
          const { [evt.id]: _omit, ...rest } = m;
          return rest;
        });
      } else if (evt.type === "cancelled") {
        setRefreshing(true);
        setAll((list) =>
          list.map((a) => (a.id === evt.id ? { ...a, status: "cancelled" as const } : a)),
        );
        setLocks((m) => {
          const { [evt.id]: _omit, ...rest } = m;
          return rest;
        });
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => setRefreshing(false), 700);
      } else if (evt.type === "rescheduled") {
        setRefreshing(true);
        setAll((list) =>
          list.map((a) => (a.id === evt.id ? { ...a, time: evt.time ?? a.time } : a)),
        );
        setLocks((m) => {
          const { [evt.id]: _omit, ...rest } = m;
          return rest;
        });
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => setRefreshing(false), 700);
      }
    });
    return () => {
      unsub();
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, []);

  const counts = {
    all: all.length,
    upcoming: all.filter((a) => a.status === "upcoming").length,
    completed: all.filter((a) => a.status === "completed").length,
    cancelled: all.filter((a) => a.status === "cancelled").length,
  };
  const list = tab === "all" ? all : all.filter((a) => a.status === tab);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paged = list.slice(pageStart, pageStart + pageSize);

  const statusStyle = {
    upcoming: "bg-[#E0D9F7] text-[#3D2E6B]",
    completed: "bg-[#E6F8F1] text-[#2D8E69]",
    cancelled: "bg-rose-100 text-rose-700",
  } as const;

  if (loading) {
    return <AppointmentsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="This week" value="6" hint="3 confirmed · 3 pending" />
        <StatCard label="Completed" value={String(counts.completed)} hint="Last 30 days" />
        <StatCard label="No-show rate" value="2%" hint="Last 30 days" />
      </div>

      <section className="overflow-hidden rounded-[12px] border border-[#EAE7F5] bg-white shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[#3D2E6B]">Bookings</h2>
            {refreshing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0EAFB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                <Loader2 className="h-3 w-3 animate-spin" /> Updating
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#7E6BAF]">Everything on your schedule.</p>
          <div className="mt-6 inline-flex gap-2 rounded-[10px] bg-[#F0EAFB] p-1">
          {(["all", "upcoming", "completed", "cancelled"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); setExpanded(null); }}
              className={`inline-flex items-center gap-2 rounded-[8px] px-4 py-1.5 text-sm font-medium capitalize transition ${
                tab === t
                  ? "bg-[#5B4796] text-white"
                  : "text-[#3D2E6B] hover:bg-[#A89BD0]/20"
              }`}
            >
              {t}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  tab === t ? "bg-white/25 text-white" : "bg-white/70 text-[#3D2E6B]/60"
                }`}
              >
                {counts[t]}
              </span>
            </button>
          ))}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="border-t border-[#F0EAFB] p-12 text-center">
            <CalendarClock className="mx-auto h-7 w-7 text-[#A89BD0]" />
            <p className="mt-3 text-sm font-semibold text-[#3D2E6B]">All clear here</p>
            <p className="mt-1 text-xs text-[#7E6BAF]">Nothing on this list right now.</p>
          </div>
        ) : (
          <>
          <ul className="border-t border-[#F0EAFB]">
            {paged.map((a, idx) => {
              const isExpanded = expanded === a.id;
              const isLast = idx === paged.length - 1;
              return (
              <li
                key={a.id}
                className={`${isExpanded ? "bg-[#FBF9FF]" : "hover:bg-[#FBF9FF]"} ${
                  !isLast ? "border-b border-[#F0EAFB]" : ""
                } transition-colors`}
              >
                <div className="flex flex-wrap items-center gap-6 p-6 sm:flex-nowrap">
                {/* Date block */}
                <div
                  className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[10px] border bg-white ${
                    isExpanded ? "border-[#A89BD0]" : "border-[#EAE7F5]"
                  } ${a.status !== "upcoming" ? "opacity-60" : ""}`}
                >
                  <span className="text-[10px] font-bold uppercase text-[#A89BD0]">
                    {a.month}
                  </span>
                  <span className="text-xl font-bold leading-tight text-[#3D2E6B]">
                    {a.date}
                  </span>
                  <span className="text-[9px] font-bold uppercase text-[#A89BD0]">
                    {a.day}
                  </span>
                </div>

                {/* Client */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`truncate font-semibold text-[#3D2E6B] ${a.status !== "upcoming" ? "opacity-70" : ""}`}>
                        {a.client}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#7E6BAF]">
                      <span>{a.type}</span>
                      <span className="text-[#C9BEE4]">·</span>
                      <span>{a.duration}</span>
                    </p>
                  </div>
                </div>

                {/* Time + mode */}
                <div className={`hidden flex-col items-end text-right sm:flex ${a.status !== "upcoming" ? "opacity-60" : ""}`}>
                  <p className="font-semibold text-[#3D2E6B]">{a.time}</p>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#7E6BAF]">
                    <Video className="h-3 w-3 text-[#A89BD0]" /> {a.mode}
                  </span>
                </div>

                {/* Actions */}
                <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-4">
                  <button
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className={`inline-flex items-center rounded-[8px] border px-4 py-2 text-sm font-medium transition ${
                      isExpanded
                        ? "border-[#A89BD0] text-[#3D2E6B] hover:bg-white"
                        : "border-[#EAE7F5] text-[#3D2E6B] hover:bg-white"
                    }`}
                  >
                    {isExpanded ? "Hide" : "Details"}
                  </button>
                </div>
                </div>
                {isExpanded && (
                  <div className="px-6 pb-8 pt-2">
                    <div className="mb-6 grid gap-6 sm:grid-cols-3">
                      <DetailItem label="Client" value={a.client} />
                      <DetailItem label="When" value={`${a.month} ${a.date} · ${a.time} · ${a.timezone}`} />
                      <DetailItem label="Duration" value={a.duration} />
                      <DetailItem label="Session type" value={a.type} />
                      <DetailItem label="Session format" value={a.sessionFormat} />
                      <DetailItem label="Mode" value={a.mode} />
                      <DetailItem label="Status" value={a.status} />
                      <DetailItem label="Amount paid" value={a.amount} />
                      <DetailItem
                        label="Payment status"
                        value={
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                              a.paymentStatus === "Paid"
                                ? "bg-[#E6F8F1] text-[#2D8E69]"
                                : a.paymentStatus === "Pending"
                                ? "bg-amber-100 text-amber-700"
                                : a.paymentStatus === "Refunded"
                                ? "bg-[#E0D9F7] text-[#3D2E6B]"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {a.paymentStatus}
                          </span>
                        }
                      />
                      <DetailItem label="Promo code" value={a.promoCode ?? "—"} />
                    </div>
                    {a.notes && (
                      <div className="mb-6 rounded-[10px] border border-[#F0EAFB] bg-white p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Notes</p>
                        <p className="mt-2 text-sm leading-relaxed text-[#3D2E6B]">{a.notes}</p>
                      </div>
                    )}
                    {a.status === "upcoming" && (
                      (() => {
                        const lock = locks[a.id];
                        const isLocked = Boolean(lock);
                        const rescheduleHref = `/appointment/reschedule?id=${encodeURIComponent(a.id)}&client=${encodeURIComponent(a.client)}&date=${encodeURIComponent(`${a.month} ${a.date}`)}&time=${encodeURIComponent(a.time)}&duration=${encodeURIComponent(a.duration)}&type=${encodeURIComponent(a.type)}&mode=${encodeURIComponent(a.mode)}&timezone=${encodeURIComponent(a.timezone)}`;
                        const cancelHref = `/appointment/cancel?id=${encodeURIComponent(a.id)}&client=${encodeURIComponent(a.client)}&date=${encodeURIComponent(`${a.month} ${a.date}`)}&time=${encodeURIComponent(a.time)}&duration=${encodeURIComponent(a.duration)}&type=${encodeURIComponent(a.type)}&amount=${encodeURIComponent(a.amount)}&paymentStatus=${encodeURIComponent(a.paymentStatus)}`;
                        const open = (href: string, action: "reschedule" | "cancel") => {
                          if (isLocked) return;
                          publishAppointmentEvent({ type: "lock", id: a.id, action });
                          window.open(href, "_blank", "noopener,noreferrer");
                        };
                        return (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-3">
                              <button
                                disabled={isLocked}
                                className="rounded-[8px] bg-[#3D2E6B] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2C2B4B] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Join session
                              </button>
                              <button
                                onClick={() => open(rescheduleHref, "reschedule")}
                                disabled={isLocked}
                                className="inline-flex items-center gap-2 rounded-[8px] border border-[#EAE7F5] bg-white px-6 py-2.5 text-sm font-medium text-[#3D2E6B] transition-colors hover:bg-[#FBF9FF] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {lock === "reschedule" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Reschedule
                              </button>
                              <button
                                onClick={() => open(cancelHref, "cancel")}
                                disabled={isLocked}
                                className="inline-flex items-center gap-2 rounded-[8px] border border-red-100 bg-white px-6 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {lock === "cancel" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Cancel
                              </button>
                            </div>
                            {isLocked && (
                              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#F0EAFB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {lock === "cancel" ? "Cancellation in progress" : "Reschedule in progress"} · finish in the other tab
                              </p>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0EAFB] px-6 py-4">
            <p className="text-xs text-[#7E6BAF]">
              Showing <span className="font-semibold text-[#3D2E6B]">{pageStart + 1}–{Math.min(pageStart + pageSize, list.length)}</span> of <span className="font-semibold text-[#3D2E6B]">{list.length}</span>
            </p>
            <div className="inline-flex items-center gap-1">
              <button
                onClick={() => { setPage((p) => Math.max(1, p - 1)); setExpanded(null); }}
                disabled={currentPage === 1}
                className="inline-flex h-8 items-center rounded-[8px] border border-[#EAE7F5] bg-white px-3 text-xs font-medium text-[#3D2E6B] transition hover:bg-[#FBF9FF] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => { setPage(n); setExpanded(null); }}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 text-xs font-semibold transition ${
                    n === currentPage
                      ? "border-[#5B4796] bg-[#5B4796] text-white"
                      : "border-[#EAE7F5] bg-white text-[#3D2E6B] hover:bg-[#FBF9FF]"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setExpanded(null); }}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 items-center rounded-[8px] border border-[#EAE7F5] bg-white px-3 text-xs font-medium text-[#3D2E6B] transition hover:bg-[#FBF9FF] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
          </>
        )}
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize text-[#3D2E6B]">{value}</p>
    </div>
  );
}

function ApptShimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[8px] bg-[#EAE7F5] ${className}`} />;
}

function AppointmentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
            <ApptShimmer className="h-3 w-20" />
            <ApptShimmer className="mt-3 h-8 w-16" />
            <ApptShimmer className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <section className="overflow-hidden rounded-[12px] border border-[#EAE7F5] bg-white shadow-sm">
        <div className="p-6">
          <ApptShimmer className="h-5 w-32" />
          <ApptShimmer className="mt-2 h-3 w-56" />
          <ApptShimmer className="mt-6 h-9 w-72" />
        </div>
        <ul className="border-t border-[#F0EAFB]">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-6 border-b border-[#F0EAFB] p-6 last:border-b-0">
              <ApptShimmer className="h-16 w-16" />
              <div className="flex-1 space-y-2">
                <ApptShimmer className="h-4 w-48" />
                <ApptShimmer className="h-3 w-36" />
              </div>
              <ApptShimmer className="h-9 w-24" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#A89BD0]">
        {label}
      </p>
      <p className="text-4xl font-semibold text-[#3D2E6B]">{value}</p>
      {hint && <p className="mt-2 text-xs text-[#7E6BAF]">{hint}</p>}
    </div>
  );
}

/* ---------- Payments & Payouts ---------- */

export function PaymentsPayoutsSection() {
  // Dev-only: in production, the provider region is detected from IP.
  // PH → Xendit. Everywhere else → Stripe. We expose a tiny dev switch so
  // engineers can preview both states without spoofing geo.
  const [devRegion, setDevRegion] = useState<"INTL" | "PH">("INTL");
  const provider = devRegion === "PH" ? "xendit" : "stripe";
  const [status, setStatus] = useState<"not_connected" | "connected">("not_connected");
  const [connecting, setConnecting] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [redirecting, setRedirecting] = useState<null | "dashboard" | "switch">(null);

  const handleManageAction = (action: "dashboard" | "switch") => {
    setManageOpen(false);
    setRedirecting(action);
    // Simulated handoff — in production this opens the provider's hosted page.
    setTimeout(() => {
      setRedirecting(null);
      if (action === "switch") setStatus("not_connected");
    }, 1200);
  };

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setStatus("connected");
      setConnecting(false);
    }, 1400);
  };

  // Reset when switching regions for clean preview.
  const switchRegion = (r: "INTL" | "PH") => {
    setDevRegion(r);
    setStatus("not_connected");
  };

  const brand =
    provider === "stripe"
      ? {
          name: "Stripe",
          label: "stripe",
          gradient: "from-[#635BFF] to-[#3F37C9]",
          shadow: "shadow-[#635BFF]/25",
          regionCopy: "International providers",
        }
      : {
          name: "Xendit",
          label: "xendit",
          gradient: "from-[#00B8A9] to-[#007A6E]",
          shadow: "shadow-[#00B8A9]/25",
          regionCopy: "Philippines providers",
        };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Available balance" value="$1,240.00" hint="Next payout Jul 1" />
        <Stat label="This month" value="$3,180.00" hint="18 sessions completed" />
        <Stat label="Lifetime earnings" value="$12,840.00" />
      </div>

      {/* ---------------- Payout account ---------------- */}
      <div className="relative rounded-[28px] border border-[#EEE7FA] bg-gradient-to-br from-white via-[#FAF7FF] to-[#F3ECFB] p-7 shadow-[0_24px_60px_-32px_rgba(61,46,107,0.35)]">
        {/* Decorative orb (clipped to card) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-[#C9BEE4]/40 to-transparent blur-2xl" />
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">
              Payout account
            </p>
            <h3 className="mt-1 text-xl font-semibold text-[#3D2E6B]">
              Get paid, effortlessly
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#5E4F8A]">
              Lubin collects every client payment and routes your earnings to your connected account on a rolling schedule.
            </p>
          </div>

          {/* Dev-only region toggle */}
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">
              Dev preview
            </span>
            <div className="inline-flex rounded-full border border-[#EEE7FA] bg-white p-0.5">
              {(["INTL", "PH"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRegion(r)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                    devRegion === r
                      ? "bg-[#3D2E6B] text-white"
                      : "text-[#7E6BAF] hover:text-[#3D2E6B]"
                  }`}
                >
                  {r === "INTL" ? "Stripe (intl)" : "Xendit (PH)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detected region pill */}
        <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-[#EEE7FA] bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#7E6BAF] backdrop-blur">
          <Globe className="h-3 w-3" />
          Detected region · <span className="text-[#3D2E6B]">{brand.regionCopy}</span>
          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#7E6BAF]" />
        </div>

        {/* Provider card */}
        <div className="relative mt-5">
          {status === "connected" ? (
            <div className={`relative rounded-[22px] border border-[#E5DCF5] bg-white/80 p-5 backdrop-blur ${manageOpen ? "z-50" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${brand.gradient} text-white shadow-md ${brand.shadow}`}>
                    <span className="text-[11px] font-extrabold tracking-tight">{brand.label}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#3D2E6B]">{brand.name} account connected</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EFE8FB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3D2E6B]">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#7E6BAF]">
                      {provider === "stripe" ? "acct_•••• 8421 · Direct deposit" : "•••• 4421 · BPI · Instant transfer"}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[#5E4F8A]">
                      Lubin holds client payments and releases your earnings to this account on a rolling schedule.
                    </p>
                  </div>
                </div>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setManageOpen((v) => !v)}
                    disabled={!!redirecting}
                    className="inline-flex items-center gap-1 rounded-full border border-[#EEE7FA] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D2E6B] hover:bg-[#F8F5FF] disabled:opacity-60"
                  >
                    {redirecting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Opening {brand.name}…
                      </>
                    ) : (
                      <>
                        Manage
                        <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                  {manageOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-[60]"
                        onClick={() => setManageOpen(false)}
                      />
                      <div className="absolute right-0 z-[70] mt-2 w-64 overflow-hidden rounded-2xl border border-[#EEE7FA] bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(61,46,107,0.35)]">
                        <button
                          onClick={() => handleManageAction("dashboard")}
                          className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#F8F5FF]"
                        >
                          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[#7E6BAF]" />
                          <div>
                            <p className="text-xs font-semibold text-[#3D2E6B]">
                              Open {brand.name} dashboard
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug text-[#7E6BAF]">
                              Update payout details & banking
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => handleManageAction("switch")}
                          className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#F8F5FF]"
                        >
                          <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-[#7E6BAF]" />
                          <div>
                            <p className="text-xs font-semibold text-[#3D2E6B]">
                              Connect a different account
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug text-[#7E6BAF]">
                              Replace via {brand.name} onboarding
                            </p>
                          </div>
                        </button>
                        <div className="my-1 h-px bg-[#EEE7FA]" />
                        <button
                          onClick={() => handleManageAction("switch")}
                          className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-rose-50"
                        >
                          <Link2Off className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                          <div>
                            <p className="text-xs font-semibold text-rose-600">Disconnect</p>
                            <p className="mt-0.5 text-[11px] leading-snug text-[#7E6BAF]">
                              Pause payouts until reconnected
                            </p>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] border border-[#EEE7FA] bg-white/80 p-6 backdrop-blur">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${brand.gradient} text-white shadow-md ${brand.shadow}`}>
                  <span className="text-[12px] font-extrabold tracking-tight">{brand.label}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-[#3D2E6B]">
                    Connect {brand.name} to receive payouts
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-[#5E4F8A]">
                    {provider === "stripe"
                      ? "Lubin partners with Stripe to securely deliver your earnings. No Stripe account yet? We'll walk you through creating one in a few minutes."
                      : "Lubin partners with Xendit to send peso payouts straight to your local bank or e-wallet. No Xendit account yet? We'll guide you through setup."}
                  </p>

                  <ul className="mt-4 grid gap-2 text-xs text-[#5E4F8A] sm:grid-cols-2">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      Clients pay Lubin — you never handle card details
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      Earnings released on a rolling schedule
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      Secure, bank-level encryption end to end
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {provider === "stripe" ? "Supports 40+ countries & USD payouts" : "Supports PHP, GCash, Maya & local banks"}
                    </li>
                  </ul>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="inline-flex items-center gap-2 rounded-full bg-[#3D2E6B] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(61,46,107,0.55)] transition hover:bg-[#2A1F4F] disabled:opacity-70"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Opening {brand.name}…
                        </>
                      ) : (
                        <>
                          Connect {brand.name} account
                          <ExternalLink className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="text-sm font-semibold text-[#7E6BAF] hover:text-[#3D2E6B] disabled:opacity-50"
                    >
                      Don't have one? Register through Lubin →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative mt-4 flex items-start gap-2 rounded-xl bg-[#F8F5FF]/80 px-4 py-3 text-[11px] leading-relaxed text-[#5E4F8A] backdrop-blur">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7E6BAF]" />
          <span>
            Payouts are processed by Lubin. {brand.name} is used only as the destination for your earnings — Lubin remains the merchant of record for all client transactions.
          </span>
        </div>
      </div>

      <SectionCard
        title="Recent transactions"
      >
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