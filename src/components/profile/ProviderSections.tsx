import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PrescribingVerificationCard } from "@/components/profile/PrescribingVerificationCard";
import AppointmentMessageThread from "@/components/messages/AppointmentMessageThread";
import ProviderIntakeAnswers from "@/components/intake/ProviderIntakeAnswers";
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
  ListOrdered,
  Bold,
  AlertTriangle,
  Loader2,
  Building2,
  ExternalLink,
  Globe,
  CheckCircle2,
  Info,
  ArrowLeftRight,
  Link2Off,
  Paperclip,
  Lock,
  Link2,
  BookOpen,
  Target,
  Eye,
  Banknote,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ---------- shared shells ---------- */

/** Strips list markers and bold markers so a line can be used as a plain label. */
function stripMarks(line: string) {
  return line
    .replace(/^[\s•\-\d.\)]+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

/** Renders **bold** segments as real bold text instead of raw asterisks. */
function InlineRich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part) ? (
          <strong key={i} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Row({
  label,
  value,
  sub,
  muted,
  bold,
}: {
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#A89BD0]">
        {label}
      </span>
      <div className="text-right">
        <p className={`${bold ? "text-base font-bold" : "text-sm font-semibold"} ${muted ? "text-[#7E6BAF]" : "text-[#3D2E6B]"}`}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-[#A89BD0]">{sub}</p>}
      </div>
    </div>
  );
}

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
  return Stat_inner({ label, value, hint });
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold text-[#3D2E6B] ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function Stat_inner({ label, value, hint }: { label: string; value: string; hint?: string }) {
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
    setWeek((w) => {
      const existing = w[day].intervals;
      // Merge with any existing interval that overlaps or touches [start, end].
      let mergedStart = start;
      let mergedEnd = end;
      const untouched: Interval[] = [];
      let mergedId: string | null = null;
      for (const iv of existing) {
        const overlaps =
          toMinutes(iv.start) <= toMinutes(mergedEnd) &&
          toMinutes(iv.end) >= toMinutes(mergedStart);
        if (overlaps) {
          mergedStart =
            toMinutes(iv.start) < toMinutes(mergedStart) ? iv.start : mergedStart;
          mergedEnd =
            toMinutes(iv.end) > toMinutes(mergedEnd) ? iv.end : mergedEnd;
          if (!mergedId) mergedId = iv.id;
        } else {
          untouched.push(iv);
        }
      }
      const merged: Interval = {
        id: mergedId ?? genId(),
        start: mergedStart,
        end: mergedEnd,
      };
      const next = [...untouched, merged].sort(
        (a, b) => toMinutes(a.start) - toMinutes(b.start),
      );
      return {
        ...w,
        [day]: { enabled: true, intervals: next },
      };
    });

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

        <div className="mt-4 space-y-2">
          {!provider && (
            <p className="text-[12px] leading-relaxed text-[#7E6BAF]">
              <span className="font-semibold text-[#5E4A8C]">Note:</span> If you don't connect a calendar, your profile and availability won't be visible to clients on the platform.{" "}
              <Link to="/faqs" className="font-semibold text-[#5E4A8C] underline-offset-2 hover:underline">
                Learn more
              </Link>
            </p>
          )}
          <p className="text-[12px] leading-relaxed text-[#7E6BAF]">
            <span className="font-semibold text-[#5E4A8C]">Note:</span> If you disconnect this calendar and connect a different one, bookings previously synced to your old calendar will not be copied to the new calendar.
          </p>
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

          <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#F7F2FE] px-3 py-2 text-[12px] text-[#7E6BAF]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Services with no availability are hidden from your clients until you add a schedule.</span>
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
          <p className="mr-auto flex items-center gap-1.5 text-xs font-medium text-[#3D2E6B]">
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
  const [tab, setTab] = useState<"all" | "upcoming" | "session_review" | "completed" | "cancelled">("all");
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
    status: "upcoming" | "session_review" | "completed" | "cancelled";
    notes?: string;
    amount: string;
    paymentStatus: "Paid" | "Pending" | "Refunded" | "Failed";
    promoCode?: string;
    prescriptionEligible?: boolean;
    outcome?:
      | "completed"
      | "client_no_show"
      | "provider_no_show"
      | "cancelled"
      | "rescheduled";
    attachments?: { name: string; size: string; title?: string; description?: string }[];
    payoutStatus?: "pending_review" | "in_review" | "approved" | "paid";
    publishedFollowUp?: { at: number; by?: string };
    followUp?: {
      summary?: string;
      homework?: string;
      resources?: { label: string; url: string }[];
      nextFocus?: string;
    };
  };

  const seed: Appt[] = [
    { id: "u1", client: "Anna Reyes", day: "TODAY", date: "27", month: "JUN", time: "2:00 PM", timezone: "PHT (GMT+8)", duration: "50 min", type: "Therapy", sessionFormat: "Individual", mode: "Video", status: "upcoming", notes: "Follow-up on sleep journaling exercise from last session.", amount: "₱2,500", paymentStatus: "Paid" },
    { id: "u2", client: "Jordan Lee", day: "TMRW", date: "28", month: "JUN", time: "10:30 AM", timezone: "PHT (GMT+8)", duration: "30 min", type: "Consultation", sessionFormat: "Individual", mode: "Video", status: "upcoming", notes: "Intake consultation — review intake form prior to call.", amount: "₱1,200", paymentStatus: "Paid", promoCode: "WELCOME10" },
    { id: "u3", client: "Sam Cruz", day: "FRI", date: "28", month: "JUN", time: "4:00 PM", timezone: "PHT (GMT+8)", duration: "50 min", type: "Group therapy", sessionFormat: "Group", mode: "Video", status: "upcoming", amount: "₱1,500", paymentStatus: "Pending" },
    {
      id: "c1", client: "Anna Reyes", day: "WED", date: "19", month: "JUN", time: "2:00 PM", timezone: "PHT (GMT+8)", duration: "50 min", type: "Therapy", sessionFormat: "Individual", mode: "Video", status: "completed",
      notes: "Discussed boundary-setting at work. Homework: daily wins journal.",
      amount: "₱2,500", paymentStatus: "Paid",
      attachments: [{ name: "session-19-jun-worksheet.pdf", size: "212 KB", title: "Boundary-setting worksheet", description: "Printable worksheet from today's session — fill out before our next call." }],
      payoutStatus: "approved",
      followUp: {
        summary: "We explored how after-hours messages and overflowing meetings have been wearing you down, and practiced a kinder script for saying no when something isn't urgent.",
        homework: "• Keep a daily wins journal — 3 entries each evening.\n• Practice the decline script aloud twice this week.\n• Track your mood (1–10) before and after work for 7 days.",
        resources: [
          { label: "Setting boundaries at work (article)", url: "https://www.mindful.org/" },
          { label: "4-7-8 breathing — guided video", url: "https://www.youtube.com/" },
        ],
        nextFocus: "Review journal entries, refine the decline script, and start a short evening wind-down routine.",
      },
    },
    {
      id: "c2", client: "Maya Singh", day: "TUE", date: "18", month: "JUN", time: "9:00 AM", timezone: "PHT (GMT+8)", duration: "50 min", type: "Therapy", sessionFormat: "Individual", mode: "In-person", status: "session_review",
      amount: "₱2,500", paymentStatus: "Paid", promoCode: "SUMMER20",
      payoutStatus: "in_review",
    },
    {
      id: "c3", client: "Daniel Ortiz", day: "MON", date: "17", month: "JUN", time: "3:30 PM", timezone: "PHT (GMT+8)", duration: "30 min", type: "Psychiatry follow-up (medication review)", sessionFormat: "Individual", mode: "Video", status: "completed",
      notes: "Reviewed tolerability of current SSRI. Sleep improving, mild morning nausea.",
      amount: "₱3,200", paymentStatus: "Paid",
      prescriptionEligible: true,
      payoutStatus: "pending_review",
      outcome: "completed",
      followUp: {
        summary: "We reviewed how the current medication has been working over the last four weeks and agreed to continue at the same dose while we watch the morning nausea.",
        nextFocus: "Recheck sleep, appetite and side effects at the next review.",
      },
    },
    {
      id: "c4", client: "Anna Reyes", day: "THU", date: "27", month: "AUG", time: "5:00 PM", timezone: "PHT (GMT+8)", duration: "30 min", type: "Psychiatry consultation (post-assessment review)", sessionFormat: "Individual", mode: "Video", status: "session_review",
      notes: "Booked straight after her self-discovery assessment — PHQ-9 moderate, GAD-7 moderate. First psychiatric consultation, no current medication.",
      amount: "₱3,200", paymentStatus: "Paid",
      prescriptionEligible: true,
      payoutStatus: "pending_review",
      outcome: "completed",
    },
    {
      id: "c5", client: "Sofia Chen", day: "FRI", date: "29", month: "AUG", time: "10:00 AM", timezone: "PHT (GMT+8)", duration: "30 min", type: "Psychiatry consultation (post-assessment review)", sessionFormat: "Individual", mode: "Video", status: "session_review",
      notes: "Post-assessment session review — GAD-7 severe, PHQ-9 moderate-severe. Discussed medication options and safety plan.",
      amount: "₱3,200", paymentStatus: "Paid",
      prescriptionEligible: true,
      payoutStatus: "pending_review",
      outcome: "completed",
    },
    {
      id: "c6", client: "Ethan Ramos", day: "SAT", date: "30", month: "AUG", time: "2:00 PM", timezone: "PHT (GMT+8)", duration: "30 min", type: "Psychiatry consultation (post-assessment review)", sessionFormat: "Individual", mode: "Video", status: "session_review",
      notes: "Post-assessment session review — PHQ-9 moderate, GAD-7 moderate. First psychiatric consultation, no current medication. Patient is open to starting treatment if clinically indicated.",
      amount: "₱3,200", paymentStatus: "Paid",
      prescriptionEligible: true,
      payoutStatus: "pending_review",
      outcome: "completed",
    },
    {
      id: "c7", client: "Anna Reyes", day: "SUN", date: "29", month: "AUG", time: "11:00 AM", timezone: "PHT (GMT+8)", duration: "30 min", type: "Psychiatry follow-up (medication review)", sessionFormat: "Individual", mode: "Video", status: "completed",
      notes: "Reviewed mood, sleep and anxiety. Agreed to start an SSRI with a review in four weeks.",
      amount: "₱3,200", paymentStatus: "Paid",
      prescriptionEligible: true,
      payoutStatus: "approved",
      outcome: "completed",
      followUp: {
        summary: "We agreed to start a daily medication and review how you're doing in four weeks. Your prescription is in your prescriptions tab.",
        nextFocus: "Check tolerability, sleep and mood at the four-week review.",
      },
    },
    {
      id: "c8", client: "Miguel Santos", day: "SUN", date: "30", month: "AUG", time: "4:00 PM", timezone: "PHT (GMT+8)", duration: "30 min", type: "Psychiatry consultation (medication review)", sessionFormat: "Individual", mode: "Video", status: "completed",
      notes: "Discussed low mood and poor sleep over the past two months. No current medication. Agreed to consider starting treatment.",
      amount: "₱3,200", paymentStatus: "Paid",
      prescriptionEligible: true,
      payoutStatus: "approved",
      outcome: "completed",
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

  // Work saved on the appointment detail page (notes, shared summary, outcome,
  // completion) lives in localStorage. Re-hydrate on mount so coming back to
  // this list always shows the current status, not the seeded one.
  useEffect(() => {
    const hydrate = () =>
      setAll((list) =>
        list.map((a) => {
          try {
            const raw = window.localStorage.getItem(`lubin:appt-details:${a.id}`);
            if (!raw) return a;
            const stored = JSON.parse(raw) as Partial<Appt>;
            return { ...a, ...stored, id: a.id };
          } catch {
            return a;
          }
        }),
      );
    hydrate();
    const onFocus = () => hydrate();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
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
      } else if (evt.type === "appt-updated") {
        setAll((list) =>
          list.map((a) =>
            a.id === evt.id ? ({ ...a, ...(evt.patch as Partial<Appt>) }) : a,
          ),
        );
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
    session_review: all.filter((a) => a.status === "session_review").length,
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
    session_review: "bg-amber-100 text-amber-700",
    completed: "bg-[#E6F8F1] text-[#2D8E69]",
    cancelled: "bg-rose-100 text-rose-700",
  } as const;

  // The pill reflects the recorded outcome, so an item inside the Completed tab
  // never reads as "confirmed".
  const OUTCOME_LABEL: Record<NonNullable<Appt["outcome"]>, string> = {
    completed: "completed",
    client_no_show: "client no-show",
    provider_no_show: "provider no-show",
    cancelled: "cancelled",
    rescheduled: "rescheduled",
  };
  const statusLabel = (a: Appt) => {
    if (a.status === "session_review") return "session review";
    if (a.status === "completed" && a.outcome) return OUTCOME_LABEL[a.outcome];
    return a.status;
  };
  const statusTone = (a: Appt) =>
    a.status === "completed" && a.outcome && a.outcome !== "completed"
      ? statusStyle.cancelled
      : statusStyle[a.status];

  if (loading) {
    return <AppointmentsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Upcoming"
          value={String(counts.upcoming)}
          hint={`${counts.all} total booking${counts.all === 1 ? "" : "s"}`}
        />
        <StatCard label="Session review" value={String(counts.session_review)} hint="Pending close-out" />
        <StatCard label="Completed" value={String(counts.completed)} hint="Closed appointments" />
        <StatCard
          label="No-shows"
          value={String(
            all.filter(
              (a) => a.outcome === "client_no_show" || a.outcome === "provider_no_show",
            ).length,
          )}
          hint="Recorded at close-out"
        />
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
          {(["all", "upcoming", "session_review", "completed", "cancelled"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); setExpanded(null); }}
              className={`inline-flex items-center gap-2 rounded-[8px] px-4 py-1.5 text-sm font-medium transition ${
                tab === t
                  ? "bg-[#5B4796] text-white"
                  : "text-[#3D2E6B] hover:bg-[#A89BD0]/20"
              }`}
            >
              {t === "session_review" ? "session review" : t.replace("_", " ")}
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
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusTone(a)}`}>
                        {statusLabel(a)}
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
                  {a.status === "completed" || a.status === "session_review" ? (
                    <button
                      onClick={() => {
                        try {
                          window.localStorage.setItem(
                            `lubin:appt-details:${a.id}`,
                            JSON.stringify(a),
                          );
                        } catch {
                          /* noop */
                        }
                        let payload = "";
                        try {
                          payload = btoa(
                            unescape(encodeURIComponent(JSON.stringify(a))),
                          );
                        } catch {
                          /* noop */
                        }
                        window.open(
                          `/appointment/details?id=${encodeURIComponent(a.id)}${
                            payload ? `&d=${payload}` : ""
                          }`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                      className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#EAE7F5] px-4 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-white"
                    >
                      Details
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  ) : (
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
                  )}
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
                      <DetailItem label="Status" value={a.status === "session_review" ? "Session review" : a.status} />
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
                    <div className="space-y-4">
                    <ProviderIntakeAnswers
                      appointmentId={a.id}
                      providerName="You"
                      clientName={a.client}
                    />

                    {(a.status === "completed" || a.status === "session_review" || a.notes) && (
                      <ApptNotesBlock
                        appt={a}
                        onChange={(patch) =>
                          setAll((list) => list.map((x) => (x.id === a.id ? { ...x, ...patch } : x)))
                        }
                      />
                    )}
                    {(a.status === "completed" || a.status === "session_review") && (
                      <ApptPayoutStatus status={a.payoutStatus ?? "pending_review"} />
                    )}
                    {a.status === "upcoming" && (
                      <AppointmentMessageThread
                        appointmentId={a.id}
                        role="provider"
                        selfName="You"
                        otherName={a.client}
                      />
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
                        const openWorkspace = () => {
                          if (isLocked) return;
                          try {
                            window.localStorage.setItem("lubin.role", "provider");
                            window.localStorage.setItem("lubin.userRole", "provider");
                            window.localStorage.setItem(
                              `lubin:appt-details:${a.id}`,
                              JSON.stringify(a),
                            );
                            window.dispatchEvent(new Event("lubin:auth-change"));
                          } catch {
                            /* noop */
                          }
                          let payload = "";
                          try {
                            payload = btoa(
                              unescape(encodeURIComponent(JSON.stringify(a))),
                            );
                          } catch {
                            /* noop */
                          }
                          window.open(
                            `/appointment/details?id=${encodeURIComponent(a.id)}${
                              payload ? `&d=${payload}` : ""
                            }`,
                            "_blank",
                            "noopener,noreferrer",
                          );
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
                                onClick={openWorkspace}
                                disabled={isLocked}
                                className="rounded-[8px] border border-[#CDBFEC] bg-[#F4EEFE] px-6 py-2.5 text-sm font-medium text-[#3D2E6B] transition-colors hover:bg-[#EBE2FB] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Fill out session form
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

export function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize text-[#3D2E6B]">{value}</p>
    </div>
  );
}

export type ApptLite = {
  id: string;
  status: "upcoming" | "session_review" | "completed" | "cancelled";
  outcome?:
    | "completed"
    | "client_no_show"
    | "provider_no_show"
    | "cancelled"
    | "rescheduled";
  prescriptionEligible?: boolean;
  notes?: string;
  attachments?: {
    name: string;
    size: string;
    title?: string;
    description?: string;
    linkedTo?: string;
  }[];
  payoutStatus?: "pending_review" | "in_review" | "approved" | "paid";
  /** When the appointment was closed out — starts the 24h edit window. */
  closedAt?: number;
  followUp?: {
    summary?: string;
    homework?: string;
    resources?: { label: string; url: string; description?: string; linkedTo?: string }[];
    nextFocus?: string;
  };
  publishedFollowUp?: {
    at: number;
    by?: string;
  };
};

export function ApptNotesBlock({
  appt,
  onChange,
  variant = "all",
  clientName,
  providerName,
  sessionDateLabel,
  onPublishConfirmed,
  onPrivateNotesSaved,
  onFollowUpSaved,
  onFollowUpShared,
  prescriptionContext = "none",
}: {
  appt: ApptLite;
  onChange: (patch: Partial<ApptLite>) => void;
  variant?: "all" | "private" | "followup";
  clientName?: string;
  providerName?: string;
  sessionDateLabel?: string;
  onPublishConfirmed?: (confirmed: boolean) => void;
  onPrivateNotesSaved?: (saved: boolean) => void;
  onFollowUpSaved?: (saved: boolean) => void;
  onFollowUpShared?: () => void;
  /** "none" = no prescription for this appointment, "pending" = prescription step still open, "issued" = signed. */
  prescriptionContext?: "none" | "pending" | "issued";
}) {

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(appt.notes ?? "");
  const isCompleted = appt.status === "completed";
  const showFollowup = variant !== "private";
  const showPrivate = variant !== "followup";
  const isPublished = !!appt.publishedFollowUp;
  const [publishPreview, setPublishPreview] = useState(false);
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(true);
  const [privateNotesOpen, setPrivateNotesOpen] = useState(true);

  const clientLabel = (clientName || (appt as ApptLite & { client?: string }).client || "your client").split(" ")[0];
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docError, setDocError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client follow-up local form state
  const followUp = appt.followUp ?? {};
  const [fuSummary, setFuSummary] = useState(followUp.summary ?? "");
  const [fuHomework, setFuHomework] = useState(followUp.homework ?? "");
  const [fuNextFocus, setFuNextFocus] = useState(followUp.nextFocus ?? "");
  const [fuDirty, setFuDirty] = useState(false);
  const [resLabel, setResLabel] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [resDescription, setResDescription] = useState("");
  const [resLinkedTo, setResLinkedTo] = useState("");
  const [resError, setResError] = useState<string | null>(null);
  const [attachLinkedTo, setAttachLinkedTo] = useState("");
  const [showAttachForm, setShowAttachForm] = useState(false);
  const [showResForm, setShowResForm] = useState(false);
  const [showSupporting, setShowSupporting] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  // Fields the provider has explicitly reopened for editing after sharing.
  const [editFields, setEditFields] = useState<Record<string, boolean>>({});
  const [publishedSnapshot, setPublishedSnapshot] = useState<string | null>(null);
  const [updatingShared, setUpdatingShared] = useState(false);
  const [sharedUpdatedAt, setSharedUpdatedAt] = useState<number | null>(null);

  const currentSnapshot = JSON.stringify({
    s: fuSummary.trim(),
    h: fuHomework.trim(),
    n: fuNextFocus.trim(),
    r: followUp.resources ?? [],
    a: (appt.attachments ?? []).map((f) => `${f.name}|${f.title ?? ""}|${f.linkedTo ?? ""}`),
  });
  // Only offer an update once something actually changed since the last share.
  const hasUnsharedChanges = isPublished && publishedSnapshot !== null && publishedSnapshot !== currentSnapshot;

  const openEdit = (key: string) => setEditFields((p) => ({ ...p, [key]: true }));
  const isFieldLocked = (key: string, value: string) =>
    isPublished && !editFields[key] && value.trim().length > 0;
  const isReopened = (key: string) => !!editFields[key];
  const fieldClass = (key: string) =>
    `w-full rounded-[10px] border p-3 text-sm leading-relaxed text-[#3D2E6B] outline-none placeholder:text-[#A89BD0] ${
      isReopened(key)
        ? "border-[#7E6BAF] bg-white shadow-[0_0_0_3px_rgba(126,107,175,0.15)]"
        : "border-[#E5DCF5] bg-[#FBF9FF] focus:border-[#7E6BAF]"
    }`;
  const closeEdit = (key: string) =>
    setEditFields((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });

  useEffect(() => {
    setFuSummary(appt.followUp?.summary ?? "");
    setFuHomework(appt.followUp?.homework ?? "");
    setFuNextFocus(appt.followUp?.nextFocus ?? "");
    setFuDirty(false);
    setEditFields({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt.id]);

  // Capture what was shared, so later edits can be detected.
  useEffect(() => {
    if (!isPublished) {
      setPublishedSnapshot(null);
      return;
    }
    setPublishedSnapshot(currentSnapshot);
    setPublishConfirmed(false);
    setEditFields({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt.id, isPublished, appt.publishedFollowUp?.at]);

  // Any change after sharing invalidates the previous confirmation.
  useEffect(() => {
    if (hasUnsharedChanges) {
      setPublishConfirmed(false);
      onPublishConfirmed?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsharedChanges]);

  const saveFollowUp = () => {
    onChange({
      followUp: {
        ...followUp,
        summary: fuSummary.trim() || undefined,
        homework: fuHomework.trim() || undefined,
        nextFocus: fuNextFocus.trim() || undefined,
      },
    });
    setFuDirty(false);
  };

  // Auto-save the client-facing draft shortly after the provider stops typing.
  useEffect(() => {
    if (!fuDirty) return;
    const t = setTimeout(() => {
      saveFollowUp();
      setDraftSavedAt(Date.now());
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuDirty, fuSummary, fuHomework, fuNextFocus]);

  const addResource = () => {
    if (!resLabel.trim() || !resUrl.trim()) {
      setResError("Add both a label and a link.");
      return;
    }
    try {
      // Allow http(s) only; accept bare domains by prepending https://
      const normalized = /^https?:\/\//i.test(resUrl.trim())
        ? resUrl.trim()
        : `https://${resUrl.trim()}`;
      // eslint-disable-next-line no-new
      new URL(normalized);
      onChange({
        followUp: {
          ...followUp,
          resources: [
            ...(followUp.resources ?? []),
            {
              label: resLabel.trim(),
              url: normalized,
              description: resDescription.trim() || undefined,
              linkedTo: resLinkedTo.trim() || undefined,
            },
          ],
        },
      });
      setResLabel("");
      setResUrl("");
      setResDescription("");
      setResLinkedTo("");
      setResError(null);
      setShowResForm(false);
    } catch {
      setResError("That doesn't look like a valid link.");
    }
  };

  const removeResource = (idx: number) => {
    const next = (followUp.resources ?? []).filter((_, i) => i !== idx);
    onChange({ followUp: { ...followUp, resources: next } });
  };

  const handleUpload = (files: FileList | null) => {
    if (!files || !files.length) return;
    if (!docTitle.trim()) {
      setDocError("Add a title so your client knows what this is.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const f = files[0];
    const item = {
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`,
      title: docTitle.trim(),
      description: docDescription.trim() || undefined,
      linkedTo: attachLinkedTo.trim() || undefined,
    };
    onChange({ attachments: [...(appt.attachments ?? []), item] });
    setDocTitle("");
    setDocDescription("");
    setAttachLinkedTo("");
    setDocError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowAttachForm(false);
  };

  const removeAttachment = (idx: number) => {
    const next = (appt.attachments ?? []).filter((_, i) => i !== idx);
    onChange({ attachments: next });
  };

  // Parse the "Agreed next steps" textarea into individual step labels so
  // attachments and resources can be linked to a specific one via a dropdown.
  const nextStepOptions = fuHomework
    .split(/\r?\n/)
    .map((l) => stripMarks(l))
    .filter(Boolean);

  const homeworkRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="space-y-6">
      {/* ============ Client Follow-up (visible to client) ============ */}
      {showFollowup && (
        <div className="overflow-hidden rounded-[20px] border border-[#EEE6FA] bg-white shadow-[0_10px_30px_-18px_rgba(61,46,107,0.25)]">
          <button
            type="button"
            onClick={() => setFollowUpOpen((v) => !v)}
            aria-expanded={followUpOpen}
            className="flex w-full items-center justify-between gap-3 border-b border-[#F0EAFB] bg-gradient-to-r from-[#F7F1FF] to-[#EFE6FB] px-4 py-3 text-left"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#3D2E6B]">
                Session summary {clientLabel !== "your client" ? `for ${clientLabel}` : ""}
              </p>
              <p className="text-[11px] text-[#7E6BAF]">
                Nothing here is shared until you mark it as done below.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isPublished
                    ? "bg-[#3D2E6B] text-white"
                    : "bg-white/80 text-[#3D2E6B]"
                }`}
              >
                {isPublished ? "Done" : "Draft · Not shared"}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#7E6BAF] transition-transform ${followUpOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {followUpOpen && (
            <div className="space-y-4 p-4">
            <p className="text-[12px] leading-snug text-[#7E6BAF]">
              Only include what will be helpful for {clientLabel}. Optional
              sections can be left empty.
            </p>

            <p className="border-b border-[#F0EAFB] pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
              What to include
            </p>

            {/* Session recap */}
            <div>
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#3D2E6B]">
                Session recap
                <span className="rounded-full bg-[#EFE8FB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3D2E6B]">
                  Required to share
                </span>
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-[#7E6BAF]">
                Write a short, client-friendly recap of what you explored together.
              </p>
              {isFieldLocked("summary", fuSummary) ? (
                <div className="mt-2 rounded-[10px] border border-[#E5DCF5] bg-[#FBF9FF] p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#3D2E6B]">{fuSummary}</p>
                  <button
                    type="button"
                    onClick={() => openEdit("summary")}
                    className="mt-2 rounded-[8px] border border-[#D6CCEC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3D2E6B] hover:bg-[#F4EEFC]"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <textarea
                    value={fuSummary}
                    autoFocus={isReopened("summary")}
                    onChange={(e) => {
                      setFuSummary(e.target.value);
                      setFuDirty(true);
                    }}
                    rows={4}
                    placeholder="A short, client-friendly recap of what you explored together."
                    className={fieldClass("summary")}
                  />
                  {isReopened("summary") && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#5B4796]">Editing</span>
                      <button
                        type="button"
                        onClick={() => closeEdit("summary")}
                        className="rounded-[8px] bg-[#3D2E6B] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#2F2354]"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )}
              {fuSummary.trim() && (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B4796]">
                  Written by provider
                </p>
              )}
            </div>

            {/* Agreed next steps */}
            <div>
              <label className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                Agreed next steps
                <span className="font-normal normal-case tracking-normal text-[#A89BD0]">
                  Optional
                </span>
              </label>
              {isFieldLocked("homework", fuHomework) ? (
                <div className="mt-1.5 rounded-[10px] border border-[#E5DCF5] bg-[#FBF9FF] p-3">
                  <div className="space-y-1 text-sm leading-relaxed text-[#3D2E6B]">
                    {fuHomework.split(/\r?\n/).map((line, i) => (
                      <p key={i}>
                        <InlineRich text={line} />
                      </p>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit("homework")}
                    className="mt-2 rounded-[8px] border border-[#D6CCEC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3D2E6B] hover:bg-[#F4EEFC]"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="mt-1.5">
                  <div className="mb-1.5 inline-flex items-center gap-0.5 rounded-[8px] border border-[#E5DCF5] bg-white p-0.5">
                    {(
                      [
                        { key: "bold", label: "Bold", Icon: Bold },
                        { key: "bullet", label: "Bulleted list", Icon: List },
                        { key: "number", label: "Numbered list", Icon: ListOrdered },
                      ] as const
                    ).map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        title={label}
                        aria-label={label}
                        onClick={() => {
                          const el = homeworkRef.current;
                          const value = fuHomework;
                          const start = el?.selectionStart ?? value.length;
                          const end = el?.selectionEnd ?? start;
                          let next = value;
                          let caret = end;
                          if (key === "bold") {
                            const sel = value.slice(start, end) || "bold text";
                            next = `${value.slice(0, start)}**${sel}**${value.slice(end)}`;
                            caret = start + sel.length + 4;
                          } else {
                            const lineStart = value.lastIndexOf("\n", start - 1) + 1;
                            const lineEndIdx = value.indexOf("\n", end);
                            const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
                            const block = value.slice(lineStart, lineEnd);
                            const lines = block.length ? block.split("\n") : [""];
                            const marked = lines
                              .map((line, i) => {
                                const bare = line.replace(/^\s*(?:•\s+|\d+\.\s+)/, "");
                                return key === "bullet" ? `• ${bare}` : `${i + 1}. ${bare}`;
                              })
                              .join("\n");
                            next = value.slice(0, lineStart) + marked + value.slice(lineEnd);
                            caret = lineStart + marked.length;
                          }
                          setFuHomework(next);
                          setFuDirty(true);
                          requestAnimationFrame(() => {
                            const node = homeworkRef.current;
                            if (node) {
                              node.focus();
                              node.selectionStart = node.selectionEnd = caret;
                            }
                          });
                        }}
                        className="rounded-[6px] p-1.5 text-[#5B4796] hover:bg-[#F4EEFC]"
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                  <textarea
                    ref={homeworkRef}
                    value={fuHomework}
                    autoFocus={isReopened("homework")}
                    onChange={(e) => { setFuHomework(e.target.value); setFuDirty(true); }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" || e.shiftKey) return;
                      const el = e.currentTarget;
                      const start = el.selectionStart ?? 0;
                      const end = el.selectionEnd ?? start;
                      const before = el.value.slice(0, start);
                      const currentLine = before.split(/\r?\n/).pop() ?? "";
                      const bulletMatch = /^\s*•\s+/.exec(currentLine);
                      const numberMatch = /^\s*(\d+)\.\s+/.exec(currentLine);
                      if (!bulletMatch && !numberMatch) return;
                      // Pressing Enter on an empty list item clears it instead of adding another.
                      if (/^\s*(?:•|\d+\.)\s*$/.test(currentLine)) {
                        e.preventDefault();
                        const next =
                          before.slice(0, before.length - currentLine.length) +
                          el.value.slice(end);
                        setFuHomework(next);
                        setFuDirty(true);
                        return;
                      }
                      e.preventDefault();
                      const insert = numberMatch
                        ? `\n${Number(numberMatch[1]) + 1}. `
                        : "\n• ";
                      const next = before + insert + el.value.slice(end);
                      setFuHomework(next);
                      setFuDirty(true);
                      requestAnimationFrame(() => {
                        const node = homeworkRef.current;
                        if (node) {
                          const pos = start + insert.length;
                          node.selectionStart = node.selectionEnd = pos;
                        }
                      });
                    }}
                    rows={4}
                    placeholder={"• Practice breathing for 10 minutes daily\n• Complete the boundary-setting worksheet\n• Track your mood for one week"}
                    className={fieldClass("homework")}
                  />
                  {isReopened("homework") && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#5B4796]">Editing</span>
                      <button
                        type="button"
                        onClick={() => closeEdit("homework")}
                        className="rounded-[8px] bg-[#3D2E6B] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#2F2354]"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )}
              <p className="mt-1 text-[11px] italic text-[#A89BD0]">
                Write one step per line. You can link a resource or attachment
                to a specific step below.
              </p>
              {fuHomework.includes("**") && (
                <p className="mt-1 text-[11px] text-[#7E6BAF]">
                  The <span className="font-mono">**</span> marks won’t appear to{" "}
                  {clientLabel} — that text shows as{" "}
                  <strong className="font-bold">bold</strong>.
                </p>
              )}
            </div>

            {/* Supporting information (collapsed by default) */}
            <div className="rounded-[12px] border border-[#EEE6FA] bg-white">
              <button
                type="button"
                onClick={() => setShowSupporting((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#3D2E6B]">
                    Add files, links, or take-home notes
                  </span>
                  {!showSupporting && (
                    <span className="mt-0.5 block text-[11px] text-[#A89BD0]">
                      {[
                        (appt.attachments ?? []).length === 0
                          ? "No files"
                          : `${(appt.attachments ?? []).length} file${(appt.attachments ?? []).length === 1 ? "" : "s"}`,
                        (followUp.resources ?? []).length === 0
                          ? "No links"
                          : `${(followUp.resources ?? []).length} link${(followUp.resources ?? []).length === 1 ? "" : "s"}`,
                        fuNextFocus.trim()
                          ? "Take-home notes added"
                          : "No take-home notes",
                      ].join(" · ")}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#A89BD0] transition-transform ${showSupporting ? "rotate-180" : ""}`}
                />
              </button>

              {showSupporting && (
              <div className="space-y-4 border-t border-[#F0EAFB] p-3">
                <p className="text-xs leading-relaxed text-[#7E6BAF]">
                  Share files, web links, or a short note {clientLabel} can use between sessions or on their own. Everything here is optional.
                </p>
            {/* Files to share */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                  Files to share
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#A89BD0]">
                    {(appt.attachments ?? []).length} file{(appt.attachments ?? []).length === 1 ? "" : "s"}
                  </span>
                  {!showAttachForm && (
                    <button
                      type="button"
                      onClick={() => setShowAttachForm(true)}
                      className="inline-flex items-center gap-1 rounded-[8px] border border-[#D6CCEC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3D2E6B] hover:bg-[#F4EEFC]"
                    >
                      <Plus className="h-3 w-3" /> Add file
                    </button>
                  )}
                </div>
              </div>

              <ul className="mt-1.5 space-y-2">
                {(appt.attachments ?? []).map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-[10px] border border-[#F0EAFB] bg-[#FBF9FF] px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#3D2E6B]">{f.title || f.name}</p>
                        {f.description && (
                          <p className="mt-0.5 text-xs leading-relaxed text-[#5B4796]">{f.description}</p>
                        )}
                        <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-[#A89BD0]">
                          {f.name} · {f.size}
                        </p>
                        {f.linkedTo && (
                          <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wider text-[#5B4796]">
                            For next step: {f.linkedTo}
                          </p>
                        )}
                    </div>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="shrink-0 text-[#A89BD0] hover:text-[#3D2E6B]"
                      aria-label="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              {showAttachForm && (
              <div className="mt-2.5 rounded-[12px] border border-dashed border-[#CDBFEC] bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Share a new document</p>
                <p className="mt-0.5 text-[11px] text-[#A89BD0]">PDF, DOCX, JPG, PNG, slides, care plans, meditation guides…</p>
                <div className="mt-2 space-y-2">
                  <input
                    value={docTitle}
                    onChange={(e) => { setDocTitle(e.target.value); if (docError) setDocError(null); }}
                    placeholder="Document title (e.g. CBT worksheet)"
                    className="w-full rounded-[8px] border border-[#E5DCF5] bg-[#FBF9FF] px-3 py-2 text-sm text-[#3D2E6B] outline-none placeholder:text-[#A89BD0] focus:border-[#7E6BAF]"
                  />
                  <textarea
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    rows={2}
                    placeholder="Short description so your client knows what this is for (optional)"
                    className="w-full rounded-[8px] border border-[#E5DCF5] bg-[#FBF9FF] px-3 py-2 text-sm text-[#3D2E6B] outline-none placeholder:text-[#A89BD0] focus:border-[#7E6BAF]"
                  />
                  <select
                    value={attachLinkedTo}
                    onChange={(e) => setAttachLinkedTo(e.target.value)}
                    disabled={nextStepOptions.length === 0}
                    className="w-full rounded-[8px] border border-[#E5DCF5] bg-[#FBF9FF] px-3 py-2 text-sm text-[#3D2E6B] outline-none focus:border-[#7E6BAF] disabled:opacity-60"
                  >
                    <option value="">
                      {nextStepOptions.length === 0
                        ? "Add an agreed next step above to link this file"
                        : "Not linked to a next step"}
                    </option>
                    {nextStepOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {docError && <p className="text-[11px] font-medium text-rose-600">{docError}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#3D2E6B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2C2B4B]">
                      <Upload className="h-3.5 w-3.5" />
                      Choose file & upload
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple={false}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx,.txt"
                        className="hidden"
                        onChange={(e) => handleUpload(e.target.files)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowAttachForm(false); setDocTitle(""); setDocDescription(""); setAttachLinkedTo(""); setDocError(null); }}
                      className="text-[11px] font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Helpful links */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                  Helpful links
                </label>
                {!showResForm && (
                  <button
                    type="button"
                    onClick={() => setShowResForm(true)}
                    className="inline-flex items-center gap-1 rounded-[8px] border border-[#D6CCEC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3D2E6B] hover:bg-[#F4EEFC]"
                  >
                    <Plus className="h-3 w-3" /> Add link
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-[#A89BD0]">
                Add any web link {clientLabel} may find useful: videos, articles, worksheets, apps, or files stored online.
              </p>

              <ul className="mt-2 space-y-2">
                {(followUp.resources ?? []).length === 0 && (
                  <li className="rounded-[10px] border border-dashed border-[#E5DCF5] bg-[#FBF9FF] px-3 py-3 text-center text-xs italic text-[#A89BD0]">
                    No links shared yet.
                  </li>
                )}
                {(followUp.resources ?? []).map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-[10px] border border-[#F0EAFB] bg-[#FBF9FF] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#3D2E6B]">{r.label}</p>
                        {r.description && (
                          <p className="mt-0.5 text-xs leading-relaxed text-[#5B4796]">{r.description}</p>
                        )}
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-[11px] text-[#5B4796] hover:text-[#3D2E6B] hover:underline"
                        >
                          {r.url}
                        </a>
                        {r.linkedTo && (
                          <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wider text-[#5B4796]">
                            For next step: {r.linkedTo}
                          </p>
                        )}
                    </div>
                    <button
                      onClick={() => removeResource(i)}
                      className="shrink-0 text-[#A89BD0] hover:text-[#3D2E6B]"
                      aria-label="Remove resource"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              {showResForm && (
              <div className="mt-2 space-y-2 rounded-[12px] border border-dashed border-[#CDBFEC] bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={resLabel}
                    onChange={(e) => { setResLabel(e.target.value); if (resError) setResError(null); }}
                    placeholder="Title (e.g. Breathing exercise video)"
                    className="w-full rounded-[8px] border border-[#E5DCF5] bg-[#FBF9FF] px-3 py-2 text-sm text-[#3D2E6B] outline-none placeholder:text-[#A89BD0] focus:border-[#7E6BAF]"
                  />
                  <input
                    value={resUrl}
                    onChange={(e) => { setResUrl(e.target.value); if (resError) setResError(null); }}
                    placeholder="https://…"
                    className="w-full rounded-[8px] border border-[#E5DCF5] bg-[#FBF9FF] px-3 py-2 text-sm text-[#3D2E6B] outline-none placeholder:text-[#A89BD0] focus:border-[#7E6BAF]"
                  />
                </div>
                <textarea
                  value={resDescription}
                  onChange={(e) => setResDescription(e.target.value)}
                  rows={2}
                  placeholder="Short description of what this link is for (optional)"
                  className="w-full rounded-[8px] border border-[#E5DCF5] bg-[#FBF9FF] px-3 py-2 text-sm text-[#3D2E6B] outline-none placeholder:text-[#A89BD0] focus:border-[#7E6BAF]"
                />
                <select
                  value={resLinkedTo}
                  onChange={(e) => setResLinkedTo(e.target.value)}
                  disabled={nextStepOptions.length === 0}
                  className="w-full rounded-[8px] border border-[#E5DCF5] bg-[#FBF9FF] px-3 py-2 text-sm text-[#3D2E6B] outline-none focus:border-[#7E6BAF] disabled:opacity-60"
                >
                  <option value="">
                    {nextStepOptions.length === 0
                      ? "Add an agreed next step above to link this resource"
                      : "Not linked to a next step"}
                  </option>
                  {nextStepOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {resError && (
                  <p className="text-[11px] font-medium text-rose-600">{resError}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={addResource}
                    className="inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-[#3D2E6B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2C2B4B]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add link
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowResForm(false); setResLabel(""); setResUrl(""); setResDescription(""); setResLinkedTo(""); setResError(null); }}
                    className="text-[11px] font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              )}
            </div>

            {/* Take-home notes */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                <CalendarClock className="h-3 w-3" /> Take-home notes
                <span className="font-normal normal-case tracking-normal text-[#A89BD0]">(optional)</span>
              </label>
              {isFieldLocked("nextFocus", fuNextFocus) ? (
                <div className="mt-1.5 rounded-[10px] border border-[#E5DCF5] bg-[#FBF9FF] p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#3D2E6B]">{fuNextFocus}</p>
                  <button
                    type="button"
                    onClick={() => openEdit("nextFocus")}
                    className="mt-2 rounded-[8px] border border-[#D6CCEC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3D2E6B] hover:bg-[#F4EEFC]"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="mt-1.5">
                  <textarea
                    value={fuNextFocus}
                    autoFocus={isReopened("nextFocus")}
                    onChange={(e) => { setFuNextFocus(e.target.value); setFuDirty(true); }}
                    rows={2}
                    placeholder={`What ${clientLabel} can practice or review between sessions.`}
                    className={fieldClass("nextFocus")}
                  />
                  {isReopened("nextFocus") && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#5B4796]">Editing</span>
                      <button
                        type="button"
                        onClick={() => closeEdit("nextFocus")}
                        className="rounded-[8px] bg-[#3D2E6B] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#2F2354]"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
              </div>
              )}
            </div>

            {/* Autosave status */}
            <div className="flex items-center justify-end gap-2 border-t border-[#F0EAFB] pt-3">
              <span className="text-[11px] font-medium text-[#A89BD0]">
                {fuDirty ? "Saving…" : draftSavedAt ? "Draft saved" : "Draft saved automatically"}
              </span>
            </div>

            {/* ================= Preview & share ================= */}
            <div className="mt-2 rounded-[14px] border border-[#E5DCF5] bg-[#FBF9FF] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                    Final step
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[#3D2E6B]">
                    {prescriptionContext === "none"
                      ? "Preview before sharing"
                      : "Preview the written summary"}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-[#5A4A8A]">
                    Only the information above is shared with {clientLabel}. Private notes stay here
                    and are never included.
                    {prescriptionContext !== "none" && (
                      <>
                        {" "}
                        The prescription is a separate document —{" "}
                        {prescriptionContext === "issued"
                          ? `${clientLabel} already received it when you signed it.`
                          : `${clientLabel} receives it when you sign it in the prescription step.`}
                      </>
                    )}
                  </p>
                </div>
                {isPublished && appt.publishedFollowUp && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-[#EFE8FB] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#3D2E6B]">
                    Done · {new Date(appt.publishedFollowUp.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {new Date(appt.publishedFollowUp.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{appt.publishedFollowUp.by ? ` · by ${appt.publishedFollowUp.by}` : ""}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setPublishPreview((p) => !p)}
                  className="rounded-[8px] border border-[#D6CCEC] bg-white px-3 py-1.5 text-xs font-semibold text-[#5A4A8A] hover:bg-[#F4EEFC]"
                >
                  {publishPreview
                    ? "Hide preview"
                    : prescriptionContext === "none"
                      ? `Preview as ${clientLabel}`
                      : `Preview summary as ${clientLabel}`}
                </button>
              </div>
              {publishPreview && (
                <PublishPreviewCard
                  clientLabel={clientLabel}
                  providerName={providerName}
                  publishedAt={appt.publishedFollowUp?.at}
                  sessionDateLabel={sessionDateLabel}
                  summary={fuSummary}
                  homework={fuHomework}
                  nextFocus={fuNextFocus}
                  resources={followUp.resources ?? []}
                  attachments={appt.attachments ?? []}
                />
              )}
              {isPublished ? (
                hasUnsharedChanges ? (
                  <div className="mt-3 rounded-[10px] border border-[#E5DCF5] bg-white px-3 py-2.5">
                    <p className="text-[12px] leading-snug text-[#5A4A8A]">
                      You changed this summary after sharing it. {clientLabel} keeps seeing the
                      previous version until you update it.
                    </p>
                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        disabled={updatingShared}
                        onClick={() => {
                          if (updatingShared) return;
                          setUpdatingShared(true);
                          saveFollowUp();
                          window.setTimeout(() => {
                            onChange({
                              publishedFollowUp: {
                                at: Date.now(),
                                by: providerName?.trim() || appt.publishedFollowUp?.by,
                              },
                            });
                            setEditFields({});
                            setUpdatingShared(false);
                            setSharedUpdatedAt(Date.now());
                          }, 700);
                        }}
                        className="inline-flex items-center gap-2 rounded-[8px] bg-[#3D2E6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2F2354] disabled:cursor-not-allowed disabled:bg-[#C9BEE4]"
                      >
                        {updatingShared && <Loader2 className="h-4 w-4 animate-spin" />}
                        {updatingShared ? "Updating…" : "Update summary"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 rounded-[10px] border border-[#E5DCF5] bg-white px-3 py-2.5 text-[12px] leading-snug text-[#5A4A8A]">
                    {sharedUpdatedAt
                      ? `Update shared with ${clientLabel}. No further action needed.`
                      : `${clientLabel} already has this summary. Use Edit above if you need to change something, then update it.`}
                  </p>
                )
              ) : (
                <>
                  <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[#E5DCF5] bg-white px-3 py-2.5 text-[12px] leading-snug text-[#3D2E6B]">
                    <input
                      type="checkbox"
                      checked={publishConfirmed}
                      onChange={(e) => {
                        setPublishConfirmed(e.target.checked);
                        onPublishConfirmed?.(e.target.checked);
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-[#D6CCEC] text-[#7E6BAF] focus:ring-[#7E6BAF]"
                    />
                    <span>
                      I reviewed this summary and confirm it is appropriate to share with{" "}
                      {clientLabel}
                      {prescriptionContext === "none"
                        ? "."
                        : ". This does not sign or send the prescription."}
                    </span>
                  </label>
                </>
              )}
            </div>

            {/* Draft and share actions below the preview box */}
            {!isPublished && (
              <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                <p className="text-[11px] text-[#A89BD0] sm:mr-auto">
                  Saving keeps a private draft. Nothing reaches {clientLabel}
                  {" "}until you share it.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    saveFollowUp();
                    setDraftSavedAt(Date.now());
                    setEditFields({});
                    onFollowUpSaved?.(true);
                  }}
                  className="rounded-[8px] border border-[#D6CCEC] bg-white px-4 py-2 text-sm font-semibold text-[#3D2E6B] hover:bg-[#F4EEFC]"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={!publishConfirmed || updatingShared || !fuSummary.trim()}
                  onClick={() => {
                    if (updatingShared) return;
                    setUpdatingShared(true);
                    saveFollowUp();
                    window.setTimeout(() => {
                      onChange({
                        publishedFollowUp: {
                          at: Date.now(),
                          by: providerName?.trim() || undefined,
                        },
                      });
                      setEditFields({});
                      setUpdatingShared(false);
                      onFollowUpShared?.();
                    }, 700);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#3D2E6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2F2354] disabled:cursor-not-allowed disabled:bg-[#C9BEE4] disabled:hover:bg-[#C9BEE4]"
                >
                  {updatingShared && <Loader2 className="h-4 w-4 animate-spin" />}
                  {updatingShared
                    ? "Sharing…"
                    : prescriptionContext === "none"
                      ? `Review and share with ${clientLabel}`
                      : `Share summary with ${clientLabel}`}
                </button>
              </div>
            )}

          </div>
          )}

        </div>

      )}

      {/* ============ Private Notes (provider only) ============ */}

      {showPrivate && (
      <div className="overflow-hidden rounded-[20px] border border-[#EEE6FA] bg-white shadow-[0_10px_30px_-18px_rgba(61,46,107,0.25)]">
        <button
          type="button"
          onClick={() => setPrivateNotesOpen((v) => !v)}
          aria-expanded={privateNotesOpen}
          className="flex w-full items-center justify-between gap-3 border-b border-[#F0EAFB] bg-gradient-to-r from-[#F7F1FF] to-[#EFE6FB] px-4 py-3 text-left"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <Lock className="h-3 w-3 shrink-0 text-[#A89BD0]" />
            <div>
              <p className="text-sm font-bold text-[#3D2E6B]">
                Private clinician notes
              </p>
              <p className="text-[11px] text-[#7E6BAF]">
                Only visible to you · never shared with {clientLabel}.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                appt.notes
                  ? "bg-[#3D2E6B] text-white"
                  : "bg-white/80 text-[#3D2E6B]"
              }`}
            >
              {appt.notes ? "Saved" : "Empty"}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[#7E6BAF] transition-transform ${privateNotesOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {privateNotesOpen && (
        <div className="p-5">
          <p className="text-[11px] italic text-[#A89BD0]">
            Capture presenting concerns, observations, plan items, and reflections.
            Never sent to {clientLabel}.
          </p>
          {!editing ? (
            <div className="mt-2 rounded-[10px] border border-[#E5DCF5] bg-[#FBF9FF] p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#3D2E6B]">
                {appt.notes || <span className="text-[#A89BD0] italic">No private notes yet. Capture observations, reflections, or things to revisit next time.</span>}
              </p>
              <button
                onClick={() => { setDraft(appt.notes ?? ""); setEditing(true); onPrivateNotesSaved?.(false); }}
                className="mt-2 rounded-[8px] border border-[#D6CCEC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3D2E6B] hover:bg-[#F4EEFC]"
              >
                {appt.notes ? "Edit" : "Add clinical notes"}
              </button>

            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                className="w-full rounded-[10px] border border-[#E5DCF5] bg-[#FBF9FF] p-3 text-sm text-[#3D2E6B] outline-none placeholder:text-[#A89BD0] focus:border-[#7E6BAF]"
                placeholder={"Session observations, progress notes, clinical/coaching reflections, follow-up reminders, treatment considerations, topics to revisit…"}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setEditing(false); setDraft(appt.notes ?? ""); }}
                  className="rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
                >
                  Cancel
                </button>
                {draft.trim() !== (appt.notes ?? "").trim() && draft.trim().length > 0 && (
                  <button
                    onClick={() => { onChange({ notes: draft.trim() || undefined }); setEditing(false); onPrivateNotesSaved?.(true); }}
                    className="rounded-[8px] bg-[#3D2E6B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2C2B4B]"
                  >
                    Save notes
                  </button>
                )}

              </div>
            </div>
          )}
        </div>
        )}
      </div>
      )}


    </div>
  );
}

function PreviewLine({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value?: string;
  multiline?: boolean;
}) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">{label}</p>
      <p className={`mt-0.5 text-[13px] leading-relaxed text-[#3D2E6B] ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function inferFileType(name: string): string {
  const ext = name.split(".").pop()?.toUpperCase();
  if (!ext || ext === name.toUpperCase()) return "File";
  return `${ext} file`;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function inferLinkType(url: string): string {
  const d = domainOf(url).toLowerCase();
  if (d.includes("youtube") || d.includes("youtu.be")) return "Video";
  if (d.includes("spotify") || d.includes("podcast")) return "Podcast";
  if (d.includes("drive.google") || d.includes("docs.google")) return "Google Drive";
  if (d.includes("medium") || d.includes("substack")) return "Article";
  return "Link";
}

function PublishPreviewCard({
  clientLabel,
  providerName,
  publishedAt,
  sessionDateLabel,
  summary,
  homework,
  nextFocus,
  resources,
  attachments,
}: {
  clientLabel: string;
  providerName?: string;
  publishedAt?: number;
  sessionDateLabel?: string;
  summary: string;
  homework: string;
  nextFocus: string;
  resources: { label: string; url: string; description?: string; linkedTo?: string }[];
  attachments: { name: string; size: string; title?: string; description?: string; linkedTo?: string }[];
}) {
  const providedBy = providerName?.trim() || "your provider";
  const steps = homework
    .split(/\r?\n/)
    .map((l) => stripMarks(l))
    .filter(Boolean);
  const linkedRes = (label: string) =>
    resources.filter((r) => r.linkedTo === label);
  const linkedAtt = (label: string) =>
    attachments.filter((a) => a.linkedTo === label);
  const unlinkedRes = resources.filter(
    (r) => !r.linkedTo || !steps.includes(r.linkedTo),
  );
  const unlinkedAtt = attachments.filter(
    (a) => !a.linkedTo || !steps.includes(a.linkedTo),
  );
  return (
    <div className="mt-3 overflow-hidden rounded-[14px] border border-[#EAE2F6] bg-white">
      <div className="border-b border-[#F0EAFB] bg-gradient-to-r from-[#F7F1FF] to-[#EFE6FB] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
          Preview as {clientLabel}
        </p>
        <p className="mt-1 text-[15px] font-semibold text-[#2C2B4B]">
          Your session follow-up
        </p>
        <p className="mt-0.5 text-[12px] text-[#5B4796]">
          Prepared by {providedBy}
          {sessionDateLabel ? ` after your session on ${sessionDateLabel}` : ""}.
        </p>
        {!publishedAt && (
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
            Not yet shared
          </p>
        )}
      </div>
      <div className="space-y-4 p-4 text-sm text-[#3D2E6B]">
        <PreviewLine label="Session recap" value={summary} multiline />

        {steps.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
              Agreed next steps
            </p>
            <ol className="mt-1.5 space-y-3">
              {steps.map((step, idx) => {
                const rs = linkedRes(step);
                const as = linkedAtt(step);
                return (
                  <li key={idx} className="rounded-[10px] border border-[#F0EAFB] bg-[#FBF9FF] px-3 py-2.5">
                    <p className="text-[13px] font-semibold text-[#3D2E6B]">
                      {idx + 1}. <InlineRich text={step} />
                    </p>
                    {(rs.length > 0 || as.length > 0) && (
                      <ul className="mt-2 space-y-2">
                        {as.map((a, i) => (
                          <li key={`a-${i}`} className="flex items-start justify-between gap-3 rounded-[8px] border border-[#EAE2F6] bg-white px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-semibold text-[#3D2E6B]">{a.title || a.name}</p>
                              <p className="text-[10px] uppercase tracking-wider text-[#A89BD0]">{inferFileType(a.name)} · {a.size}</p>
                              {a.description && <p className="mt-0.5 text-[11px] text-[#5B4796]">{a.description}</p>}
                            </div>
                            <button type="button" className="shrink-0 rounded-[8px] bg-[#3D2E6B] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#2C2B4B]">Download</button>
                          </li>
                        ))}
                        {rs.map((r, i) => (
                          <li key={`r-${i}`} className="flex items-start justify-between gap-3 rounded-[8px] border border-[#EAE2F6] bg-white px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-semibold text-[#3D2E6B]">{r.label}</p>
                              <p className="text-[10px] uppercase tracking-wider text-[#A89BD0]">{inferLinkType(r.url)} · {domainOf(r.url)}</p>
                              {r.description && <p className="mt-0.5 text-[11px] text-[#5B4796]">{r.description}</p>}
                            </div>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-[8px] bg-[#3D2E6B] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#2C2B4B]">Open</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <PreviewLine label="Take-home notes" value={nextFocus} multiline />

        {unlinkedRes.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
              Recommended resources
            </p>
            <ul className="mt-1.5 space-y-2">
              {unlinkedRes.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-[10px] border border-[#F0EAFB] bg-[#FBF9FF] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#3D2E6B]">{r.label}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-[#A89BD0]">
                      {inferLinkType(r.url)} · {domainOf(r.url)}
                    </p>
                    {r.description && (
                      <p className="mt-1 text-[12px] leading-relaxed text-[#5B4796]">{r.description}</p>
                    )}
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-[8px] bg-[#3D2E6B] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2C2B4B]"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {unlinkedAtt.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
              Attachments
            </p>
            <ul className="mt-1.5 space-y-2">
              {unlinkedAtt.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-[10px] border border-[#F0EAFB] bg-[#FBF9FF] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#3D2E6B]">{a.title || a.name}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-[#A89BD0]">
                      {inferFileType(a.name)} · {a.size}
                    </p>
                    {a.description && (
                      <p className="mt-1 text-[12px] leading-relaxed text-[#5B4796]">{a.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-[8px] bg-[#3D2E6B] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2C2B4B]"
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {publishedAt && (
          <div className="border-t border-[#F0EAFB] pt-3 text-[11px] text-[#7E6BAF]">
            <p className="font-semibold text-[#3D2E6B]">
              Reviewed and shared by {providedBy} on{" "}
              {new Date(publishedAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              at{" "}
              {new Date(publishedAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ApptPayoutStatus({
  status,
}: {
  status: NonNullable<ApptLite["payoutStatus"]>;
}) {
  const map = {
    pending_review: {
      label: "Payout for approval",
      desc: "Submitted to the Lubin team for review. Your payout is approved once the review is completed.",
      tone: "bg-[#FDF3E7] text-[#8A5A1A] border-[#F6E0BD]",
      icon: <CalendarClock className="h-3.5 w-3.5" />,
    },
    in_review: {
      label: "In review by Lubin",
      desc: "Our team is verifying this session. No action needed from you.",
      tone: "bg-[#EFE8FB] text-[#3D2E6B] border-[#D7C9F2]",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    approved: {
      label: "Payout approved",
      desc: "Reviewed by the Lubin team. Earnings will be released on your next payout cycle.",
      tone: "bg-[#E8F1FB] text-[#1F3D72] border-[#C9D9F2]",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
    },
    paid: {
      label: "Paid out",
      desc: "Earnings for this session have been released to your connected account.",
      tone: "bg-[#EFE8FB] text-[#3D2E6B] border-[#D7C9F2]",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
  } as const;
  const m = map[status];
  return (
    <div className="flex items-start justify-between gap-3 rounded-[20px] border border-[#EEE6FA] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(61,46,107,0.25)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F4EEFE] text-[#5B4796]">
          <Wallet className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">Payout review</p>
          <p className="mt-1 text-sm font-semibold text-[#3D2E6B]">{m.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#7E6BAF]">{m.desc}</p>
        </div>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${m.tone}`}>
        {m.icon}
        {m.label}
      </span>
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
  const [payoutState, setPayoutState] = useState<"idle" | "processing" | "sent">("idle");
  const [composerOpen, setComposerOpen] = useState(false);
  const [balance, setBalance] = useState<number>(1240);
  const [amount, setAmount] = useState<string>("1240.00");
  type Txn = {
    id: string;
    client: string;
    date: string;
    amount: string;
    kind: "earning" | "payout";
    method?: string;
    reference?: string;
    note?: string;
    status?: "completed" | "processing" | "pending";
    gross?: string;
    fee?: string;
  };
  const [transactions, setTransactions] = useState<Txn[]>([
    { id: "t1", client: "Anna Reyes", date: "Jun 24", amount: "+$108.00", gross: "$120.00", fee: "$12.00", kind: "earning", method: "Card · Visa •••• 4242", reference: "SES-10241", note: "60-min individual session", status: "completed" },
    { id: "t2", client: "Jordan Lee", date: "Jun 23", amount: "+$54.00", gross: "$60.00", fee: "$6.00", kind: "earning", method: "Card · Mastercard •••• 7781", reference: "SES-10238", note: "30-min check-in", status: "completed" },
    { id: "t3", client: "Payout to BPI", date: "Jun 21", amount: "-$838.00", gross: "$840.00", fee: "$2.00", kind: "payout", method: "BPI •••• 1122", reference: "LBN-77210621", note: "Weekly earnings withdrawal", status: "completed" },
    { id: "t4", client: "Sam Cruz", date: "Jun 19", amount: "+$108.00", gross: "$120.00", fee: "$12.00", kind: "earning", method: "Card · Visa •••• 1198", reference: "SES-10229", note: "60-min individual session", status: "completed" },
  ]);
  const [openTxn, setOpenTxn] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(0);
  const TX_PER_PAGE = 5;

  const amountNum = Number(amount) || 0;
  // Lubin platform fee — covers processing, compliance, and Trust & Safety review.
  const FEE_RATE = 0.1;
  const fee = +(amountNum * FEE_RATE).toFixed(2);
  const arrival = Math.max(0, amountNum - fee);
  const belowMin = amountNum < 50;
  const overBalance = amountNum > balance;

  const openComposer = () => {
    if (status !== "connected") return;
    setAmount(balance.toFixed(2));
    setPayoutState("idle");
    setComposerOpen(true);
  };

  const confirmPayout = () => {
    if (belowMin || overBalance || payoutState !== "idle") return;
    setPayoutState("processing");
    setTimeout(() => {
      const sent = amountNum;
      setBalance((b) => Math.max(0, +(b - sent).toFixed(2)));
      const today = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
      setTransactions((prev) => [
        {
          id: `t${Date.now()}`,
          client: `Payout to ${brand.name}`,
          date: today,
          amount: `-$${sent.toFixed(2)}`,
          gross: `$${sent.toFixed(2)}`,
          fee: `$${fee.toFixed(2)}`,
          kind: "payout",
          method: `${brand.name} •••• 4242`,
          reference: `LBN-${Date.now().toString().slice(-8)}`,
          note: "Withdrawal from Lubin Wallet",
          status: "processing",
        },
        ...prev,
      ]);
      setPayoutState("sent");
    }, 1400);
  };

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
        <Stat label="Available balance" value={`$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} hint="Approved by Lubin · ready to withdraw" />
        <Stat label="Pending review" value="$420.00" hint="3 sessions under Lubin review" />
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

      {/* ---------------- Payout schedule & request ---------------- */}
      <div className="relative overflow-hidden rounded-[32px] border border-[#E8DFF6] bg-gradient-to-br from-[#4A3A7A] via-[#5B4892] to-[#9A88C9] p-8 text-white shadow-[0_30px_70px_-30px_rgba(61,46,107,0.55)] md:p-10">
        {/* Dot grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(#7E6BAF 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#7E6BAF] opacity-30 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#7E6BAF] opacity-20 blur-[100px]" />
        {/* Top highlight */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur">
              Lubin Wallet
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9BEE4]">
              Available to withdraw
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif-display text-[64px] font-normal leading-none tracking-tight text-white">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xl font-medium text-[#C9BEE4]/70">USD</span>
            </div>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-white/70">
              <ShieldCheck className="h-4 w-4 text-[#C9BEE4]" />
              Reviewed and approved by Lubin · ready for instant withdrawal
            </p>
          </div>

          <button
            onClick={() => {
              if (status !== "connected") {
                handleConnect();
                return;
              }
              openComposer();
            }}
            disabled={connecting || (status === "connected" && balance < 50)}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#3D2E6B] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-white/85 disabled:hover:scale-100"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting…
              </>
            ) : status !== "connected" ? (
              `Connect ${brand.name} account`
            ) : (
              "Withdraw now"
            )}
          </button>
        </div>

        {/* Sub-stats grid */}
        <div className="relative mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Pending review", value: "$420.00", icon: <Loader2 className="h-3.5 w-3.5" /> },
            { label: "Destination", value: brand.name, icon: <Building2 className="h-3.5 w-3.5" /> },
          ].map((s) => (
            <div
              key={s.label}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9BEE4]">
                {s.label}
              </div>
              <p className="text-xl font-semibold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {status !== "connected" && (
          <div className="relative mt-5 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs text-white/85 backdrop-blur">
            <AlertCircle className="h-3.5 w-3.5" />
            Connect a {brand.name} account above to enable withdrawals.
          </div>
        )}
      </div>

      {/* How it works — outside the dark card, lighter */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { n: "01", title: "Session completed", desc: "You mark the appointment as done with notes." },
          { n: "02", title: "Lubin reviews", desc: "Our team verifies the session before releasing funds." },
          { n: "03", title: "Withdraw in Lubin", desc: "Process payouts here — no Stripe redirects needed." },
        ].map((step) => (
          <div key={step.n} className="rounded-2xl border border-[#EEE7FA] bg-white p-4 shadow-[0_6px_16px_-12px_rgba(61,46,107,0.25)]">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A89BD0]">{step.n}</span>
            <p className="mt-3 text-sm font-semibold text-[#3D2E6B]">{step.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#7E6BAF]">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Platform fee disclosure */}
      <div className="rounded-2xl border border-[#EEE7FA] bg-white p-5 shadow-[0_6px_16px_-12px_rgba(61,46,107,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A89BD0]">
              Service fee
            </span>
            <p className="mt-2 text-[15px] font-semibold text-[#3D2E6B]">
              Lubin retains a 10% service fee from each completed session.
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-[#F4EEFE] px-3 py-1 text-[10.5px] font-semibold tracking-wide text-[#3D2E6B] sm:inline-flex">
            Transparent pricing
          </span>
        </div>
        <div className="mt-4 grid gap-x-6 gap-y-2 text-[12.5px] leading-relaxed text-[#5A4A8A] sm:grid-cols-2">
          <p>• Secure payment processing and settlement</p>
          <p>• Trust &amp; Safety review of each session</p>
          <p>• Payouts to your connected bank account</p>
          <p>• Client support and dispute resolution</p>
        </div>
        <p className="mt-4 border-t border-[#F1ECFB] pt-3 text-[12px] leading-relaxed text-[#7E6BAF]">
          The fee is deducted automatically at the time of withdrawal. You will see the gross amount, the 10% deduction, and your net transfer before confirming any payout. No setup costs, no monthly charges.
        </p>
      </div>

      {/* ----- In-app Withdraw Composer ----- */}
      {composerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1330]/60 p-4 backdrop-blur-sm"
          onClick={() => payoutState !== "processing" && setComposerOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#EEE7FA] bg-white shadow-[0_40px_80px_-30px_rgba(61,46,107,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            {payoutState !== "sent" ? (
              <>
                <div className="relative overflow-hidden bg-gradient-to-br from-[#3D2E6B] to-[#5B4796] p-6 text-white">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">Withdraw</p>
                      <h3 className="mt-1 text-xl font-bold">Process payout</h3>
                      <p className="mt-1 text-xs text-white/70">Securely processed by Lubin · settled to {brand.name}.</p>
                    </div>
                    <button
                      onClick={() => setComposerOpen(false)}
                      disabled={payoutState === "processing"}
                      className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">Amount</label>
                    <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-[#E8DFF6] bg-[#FBF9FF] px-4 py-3 focus-within:border-[#3D2E6B]">
                      <span className="text-2xl font-bold text-[#7E6BAF]">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={payoutState === "processing"}
                        className="w-full bg-transparent text-2xl font-bold text-[#3D2E6B] outline-none placeholder:text-[#C9BEE4]"
                      />
                      <button
                        onClick={() => setAmount(balance.toFixed(2))}
                        disabled={payoutState === "processing"}
                        className="rounded-full bg-[#F4EEFE] px-3 py-1 text-[11px] font-semibold text-[#3D2E6B] transition hover:bg-[#E8DFF6]"
                      >
                        Max
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#7E6BAF]">
                      <span>Available: ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      {belowMin && <span className="font-semibold text-[#B7472A]">Minimum $50.00</span>}
                      {overBalance && <span className="font-semibold text-[#B7472A]">Exceeds balance</span>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EEE7FA] bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">Destination</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${brand.gradient} text-white`}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#3D2E6B]">{brand.name} · •••• 4242</p>
                        <p className="text-[11px] text-[#7E6BAF]">Bank account · USD</p>
                      </div>
                      <span className="rounded-full bg-[#F4EEFE] px-2 py-0.5 text-[10px] font-bold text-[#3D2E6B]">Verified</span>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-2xl bg-[#FBF9FF] p-4 text-[12px]">
                    <Row label="Amount" value={`$${amountNum.toFixed(2)}`} />
                    <Row label="Lubin platform fee (10%)" value={`-$${fee.toFixed(2)}`} sub="Covers processing, compliance & Trust & Safety review" />
                    <div className="my-2 border-t border-dashed border-[#E8DFF6]" />
                    <Row label="You'll receive" value={`$${arrival.toFixed(2)}`} bold />
                    <Row label="Arrives" value="1–2 business days" muted />
                  </div>

                  <button
                    onClick={confirmPayout}
                    disabled={belowMin || overBalance || payoutState === "processing"}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#3D2E6B] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)] transition hover:bg-[#2A1F4F] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {payoutState === "processing" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing payout…
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Confirm withdrawal · ${amountNum.toFixed(2)}
                      </>
                    )}
                  </button>

                  <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[#7E6BAF]">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                    Processed inside Lubin with end-to-end encryption. You won't be redirected to {brand.name}.
                  </p>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#3D2E6B] to-[#5B4796] text-white shadow-[0_12px_28px_-10px_rgba(61,46,107,0.6)]">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-[#3D2E6B]">Payout on the way</h3>
                <p className="mt-2 text-sm text-[#7E6BAF]">
                  ${amountNum.toFixed(2)} is being sent to your {brand.name} account. Expect arrival in 1–2 business days.
                </p>
                <div className="mt-5 rounded-2xl border border-[#EEE7FA] bg-[#FBF9FF] p-4 text-left text-[12px]">
                  <Row label="Reference" value={`LBN-${Date.now().toString().slice(-8)}`} />
                  <Row label="Amount" value={`$${amountNum.toFixed(2)}`} />
                  <Row label="Destination" value={`${brand.name} •••• 4242`} muted />
                </div>
                <button
                  onClick={() => {
                    setComposerOpen(false);
                    setPayoutState("idle");
                  }}
                  className="mt-5 w-full rounded-full bg-[#3D2E6B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2A1F4F]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <SectionCard
        title="Recent transactions"
      >
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5DCF5] bg-[#FBF9FF] px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <CircleDot className="h-5 w-5 text-[#A89BD0]" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#3D2E6B]">No transactions yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#7E6BAF]">
              Once your first session is completed and approved by Lubin, your earnings and payouts will appear here.
            </p>
          </div>
        ) : (
          (() => {
            const totalPages = Math.max(1, Math.ceil(transactions.length / TX_PER_PAGE));
            const page = Math.min(txPage, totalPages - 1);
            const start = page * TX_PER_PAGE;
            const pageItems = transactions.slice(start, start + TX_PER_PAGE);
            return (
              <>
                <div className="space-y-2">
                  {pageItems.map((t) => {
                    const isOpen = openTxn === t.id;
                    return (
                      <div
                        key={t.id}
                        className={`overflow-hidden rounded-xl border bg-white/60 transition-colors ${
                          isOpen ? "border-[#C9BEE4] bg-white" : "border-[#EEE7FA] hover:border-[#D9CEF0]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenTxn(isOpen ? null : t.id)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <CircleDot className="h-3.5 w-3.5 text-[#A89BD0]" />
                            <div>
                              <p className="text-sm font-medium text-[#3D2E6B]">{t.client}</p>
                              <p className="text-xs text-[#7E6BAF]">{t.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p
                              className={`text-sm font-semibold ${
                                t.kind === "payout" ? "text-[#7E6BAF]" : "text-[#3D2E6B]"
                              }`}
                            >
                              {t.amount}
                            </p>
                            <ChevronDown
                              className={`h-4 w-4 text-[#A89BD0] transition-transform ${isOpen ? "rotate-180" : ""}`}
                            />
                          </div>
                        </button>
                        {isOpen && (
                          <div className="border-t border-[#EEE7FA] bg-[#FBF9FF] px-4 py-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <DetailRow label="Type" value={t.kind === "payout" ? "Payout" : "Earning"} />
                              <DetailRow label="Status" value={(t.status ?? "completed").replace(/^./, (c) => c.toUpperCase())} />
                              <DetailRow label={t.kind === "payout" ? "Withdrawal amount" : "Session amount"} value={t.gross ?? t.amount} />
                              <DetailRow label="Lubin platform fee" value={t.fee ?? "$0.00"} />
                              <DetailRow label={t.kind === "payout" ? "Net transferred" : "Net to wallet"} value={t.amount} />
                              <DetailRow label="Date" value={t.date} />
                              {t.method && <DetailRow label={t.kind === "payout" ? "Destination" : "Payout method"} value={t.method} />}
                              {t.reference && <DetailRow label="Reference" value={t.reference} mono />}
                            </div>
                            {t.note && (
                              <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-[#5E4F8A]">
                                {t.note}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-[#7E6BAF]">
                      Showing {start + 1}–{Math.min(start + TX_PER_PAGE, transactions.length)} of {transactions.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#EEE7FA] bg-white text-[#3D2E6B] transition hover:bg-[#F4EEFE] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setTxPage(i)}
                          className={`h-8 min-w-8 rounded-full px-2.5 text-xs font-semibold transition ${
                            i === page
                              ? "bg-[#3D2E6B] text-white"
                              : "border border-[#EEE7FA] bg-white text-[#7E6BAF] hover:text-[#3D2E6B]"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setTxPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#EEE7FA] bg-white text-[#3D2E6B] transition hover:bg-[#F4EEFE] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()
        )}
      </SectionCard>
    </div>
  );
}

/* ---------- Verification ---------- */

export function VerificationSection() {
  type DocStatus = "Uploaded" | "Needed" | "Optional" | "Rejected";
  type DocItem = {
    id: string;
    name: string;
    hint: string;
    status: DocStatus;
    meta: string;
    examples?: string[];
    adminNote?: string;
    file?: { name: string; size: number; uploadedAt: string };
  };
  const initialDocs: DocItem[] = [
    {
      id: "gov-id",
      name: "Government-issued ID",
      hint: "Passport or driver's license",
      status: "Uploaded",
      meta: "Verified · Jun 24",
      file: { name: "passport-scan.pdf", size: 1_240_000, uploadedAt: "Jun 24" },
    },
    {
      id: "license",
      name: "Professional license or certificate",
      hint: "Upload required · PDF, JPG",
      status: "Rejected",
      meta: "",
      adminNote:
        "The uploaded file is blurry and the expiration date isn't readable. Please re-upload a clear, full-page scan showing your full name, license number, and expiration date.",
      examples: [
        "Professional License",
        "Board Certificate",
        "Coaching Certification",
        "Accreditation",
        "Training Certificate",
      ],
      file: { name: "license-old.jpg", size: 480_000, uploadedAt: "Jun 22" },
    },
    {
      id: "selfie",
      name: "Selfie",
      hint: "A clear, well-lit photo of your face",
      status: "Needed",
      meta: "",
    },
    {
      id: "selfie-id",
      name: "Selfie with ID",
      hint: "Hold your government-issued ID next to your face",
      status: "Needed",
      meta: "",
    },
    {
      id: "diploma",
      name: "Diploma or training certificate",
      hint: "Upload required · PDF, JPG",
      status: "Needed",
      meta: "",
    },
  ];
  const [documents, setDocuments] = useState<DocItem[]>(initialDocs);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [preview, setPreview] = useState<DocItem | null>(null);
  const [devVerified, setDevVerified] = useState(false);

  const displayedDocuments: DocItem[] = devVerified
    ? documents.map((d) => ({
        ...d,
        status: "Uploaded" as DocStatus,
        meta: "Verified · Jun 26",
        adminNote: undefined,
        file: d.file ?? { name: `${d.id}.pdf`, size: 980_000, uploadedAt: "Jun 26" },
      }))
    : documents;

  const formatSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  const triggerUpload = (id: string) => fileInputs.current[id]?.click();

  const onFile = (id: string, files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "Uploaded",
              meta: `Uploaded · ${today}`,
              adminNote: undefined,
              file: { name: f.name, size: f.size, uploadedAt: today },
            }
          : d
      )
    );
  };

  const verifiedCount = displayedDocuments.filter((d) => d.status === "Uploaded").length;
  const requiredCount = displayedDocuments.filter((d) => d.status !== "Optional").length;
  const percent = requiredCount === 0 ? 0 : Math.round((verifiedCount / requiredCount) * 100);
  const dash = 226.19;
  const dashOffset = dash - (dash * percent) / 100;

  const checks = [
    {
      title: "Credential check",
      body: "Comparison against professional licensing registries.",
    },
    {
      title: "Identity audit",
      body: "Cross-referencing government IDs and professional history.",
    },
    {
      title: "Trust & Safety Review",
      body: "Quiet review of disciplinary records and complaints.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Dev preview toggle */}
      <div className="flex items-center justify-between rounded-xl border border-dashed border-[#C9BEE4] bg-[#F8F7FF] px-4 py-2.5 text-xs">
        <span className="font-semibold uppercase tracking-[0.18em] text-[#7E6BAF]">
          Dev preview · {devVerified ? "Verified state" : "In review state"}
        </span>
        <button
          onClick={() => setDevVerified((v) => !v)}
          className="rounded-full bg-[#3D2E6B] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#2C2B4B]"
        >
          {devVerified ? "Show in-review" : "Show verified"}
        </button>
      </div>

      {/* Verification status banner */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2C2B4B] via-[#3D2E6B] to-[#7E6BAF] p-8 shadow-[0_24px_60px_-20px_rgba(61,46,107,0.45)]">
        <div className="pointer-events-none absolute -top-12 -right-12 h-64 w-64 rounded-full bg-[#C9BEE4]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#7E6BAF]/40 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-md">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#EFE8FB] backdrop-blur-md">
              Status · {devVerified ? "Verified" : "In review"}
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
              Provider verification
            </h2>
            <p className="text-sm text-[#D9CFEC]">
              {devVerified
                ? "You're fully verified on Lubin. Your profile now shows a verified badge to clients."
                : "We're reviewing your credentials to maintain the highest standard of care on Lubin. Usually 2–3 business days."}
            </p>
          </div>
          <div className="flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl">
            <div className="relative flex items-center justify-center">
              <svg width="80" height="80" className="-rotate-90">
                <circle cx="40" cy="40" r="36" stroke="rgba(255,255,255,0.18)" strokeWidth="4" fill="transparent" />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="white"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={dash}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute text-lg font-semibold text-white">{percent}%</span>
            </div>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.15em] text-[#D9CFEC]">
              {verifiedCount} of {requiredCount}
            </span>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-8 md:grid-cols-5">
        {/* Documents */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex h-9 items-center justify-between">
            <h3 className="text-lg font-semibold text-[#3D2E6B]">Document checklist</h3>
            <span className="text-xs font-medium text-[#7E6BAF]">
              {verifiedCount} of {requiredCount} required
            </span>
          </div>

          {displayedDocuments.map((d) => {
            const isUploaded = d.status === "Uploaded";
            const isRejected = d.status === "Rejected";
            return (
              <div
                key={d.name}
                className={
                  isUploaded
                    ? "group relative flex flex-col gap-4 rounded-2xl border border-[#EFE8FB] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                    : isRejected
                    ? "group relative flex flex-col gap-5 rounded-2xl border border-[#EFE8FB] bg-white p-6 shadow-sm"
                    : "group rounded-2xl border-2 border-dashed border-[#EFE8FB] bg-[#F8F7FF]/60 p-6 transition-all hover:border-[#7E6BAF]/50"
                }
              >
                <input
                  ref={(el) => {
                    fileInputs.current[d.id] = el;
                  }}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    onFile(d.id, e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-3">
                    <div className="space-y-1">
                      <h4 className="flex items-center gap-2 text-lg font-semibold leading-tight text-[#3D2E6B]">
                        <span>{d.name}</span>
                        {isUploaded && (
                          <span
                            title="Verified"
                            className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center bg-[#7E6BAF] text-white shadow-[0_2px_6px_-1px_rgba(126,107,175,0.5)]"
                            style={{ clipPath: "polygon(50% 0%, 65% 10%, 85% 15%, 90% 35%, 100% 50%, 90% 65%, 85% 85%, 65% 90%, 50% 100%, 35% 90%, 15% 85%, 10% 65%, 0% 50%, 10% 35%, 15% 15%, 35% 10%)" }}
                          >
                            <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20" />
                            <svg className="relative z-10 h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                      </h4>
                      {isUploaded ? (
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <span className="font-medium text-[#7E6BAF]">Verified</span>
                          <span className="text-xs text-[#7E6BAF]/50">•</span>
                          <span className="text-[#7E6BAF]/70">
                            {d.meta.replace(/^Verified\s*·\s*/, "").replace(/^Uploaded\s*·\s*/, "")}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-[#7E6BAF]">
                          {isRejected ? "Action needed • please re-upload" : d.hint}
                        </p>
                      )}
                    </div>
                    {!isUploaded && "examples" in d && d.examples && d.examples.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {d.examples.map((ex) => (
                          <span
                            key={ex}
                            className="rounded-md bg-[#EFE8FB] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]"
                          >
                            {ex}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isUploaded ? (
                    <button
                      type="button"
                      onClick={() => setPreview(d)}
                      className="shrink-0 text-sm font-semibold text-[#3D2E6B] hover:underline"
                    >
                      View
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerUpload(d.id)}
                      className="shrink-0 whitespace-nowrap rounded-xl bg-[#3D2E6B] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2D2250]"
                    >
                      {isRejected ? "Re-upload" : "Upload"}
                    </button>
                  )}
                </div>
                {isUploaded && d.file && (
                  <div className="inline-flex items-center gap-3 self-start rounded-xl bg-[#F4EEFB] px-4 py-2.5">
                    <svg className="h-4 w-4 text-[#3D2E6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-[#3D2E6B]">{d.file.name}</span>
                    <span className="text-xs text-[#7E6BAF]">{formatSize(d.file.size)}</span>
                    <button
                      type="button"
                      onClick={() => setPreview(d)}
                      className="ml-1 text-[10px] font-bold uppercase tracking-widest text-[#7E6BAF] hover:text-[#3D2E6B]"
                    >
                      View
                    </button>
                  </div>
                )}
                {isRejected && d.file && (
                  <div className="flex items-center justify-between rounded-xl border border-[#EFE8FB] bg-white px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <svg className="h-4 w-4 text-[#7E6BAF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-[#3D2E6B]">{d.file.name}</span>
                      <span className="text-xs uppercase tracking-tighter text-[#7E6BAF]">{formatSize(d.file.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreview(d)}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#7E6BAF] hover:text-[#3D2E6B]"
                    >
                      View
                    </button>
                  </div>
                )}
                {isRejected && d.adminNote && (
                  <div className="rounded-r-xl border-l-4 border-[#7E6BAF] bg-[#F4EEFB] p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#7E6BAF]">
                      Note from Lubin admin
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[#3D2E6B]">
                      {d.adminNote}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* What gets verified */}
        <div className="md:col-span-2">
          <div className="flex h-9 items-center gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[#3D2E6B]">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="#7E6BAF">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              What gets verified
            </h3>
          </div>
          <div className="mt-4">
            <ul className="space-y-6">
              {checks.map((c, i) => (
                <li key={c.title} className="flex gap-5">
                  <span className="w-8 shrink-0 pt-1 text-base font-semibold tabular-nums tracking-tight text-[#7E6BAF]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[#2A1F4D]">{c.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#5B4B85]">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#7E6BAF]">
              Secure &amp; encrypted processing
            </p>
          </div>
        </div>
      </div>
      <PrescribingVerificationCard />
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1F4D]/60 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EFE8FB] px-6 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7E6BAF]">Document preview</p>
                <h3 className="mt-1 text-base font-semibold text-[#3D2E6B]">{preview.name}</h3>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="rounded-full p-1.5 text-[#7E6BAF] hover:bg-[#F4EEFB]"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="flex aspect-[4/3] items-center justify-center bg-[#F9F7FC]">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <svg width="28" height="28" viewBox="0 0 20 20" fill="#7E6BAF"><path d="M4 4a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" opacity=".3"/><path d="M11 2v4a1 1 0 001 1h4" stroke="#7E6BAF" strokeWidth="1.5" fill="none"/></svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-[#3D2E6B]">{preview.file?.name ?? "No file"}</p>
                {preview.file && (
                  <p className="mt-1 text-xs text-[#7E6BAF]">
                    {formatSize(preview.file.size)} · Uploaded {preview.file.uploadedAt}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[#EFE8FB] px-6 py-4">
              <button
                onClick={() => setPreview(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[#3D2E6B] hover:bg-[#F4EEFB]"
              >
                Close
              </button>
              {preview.status !== "Uploaded" && (
                <button
                  onClick={() => {
                    const id = preview.id;
                    setPreview(null);
                    setTimeout(() => triggerUpload(id), 50);
                  }}
                  className="rounded-xl bg-[#3D2E6B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2D2250]"
                >
                  Replace file
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}