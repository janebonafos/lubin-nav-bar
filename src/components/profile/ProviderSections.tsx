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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarAvailabilitySection() {
  const [connected, setConnected] = useState(true);
  const [days, setDays] = useState<Record<string, boolean>>({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false,
  });
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  return (
    <div className="space-y-6">
      <SectionCard
        title="Connected calendar"
        description="We use this to read your busy times and avoid double-bookings."
      >
        {connected ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                <CalendarDays className="h-5 w-5 text-[#7E6BAF]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#3D2E6B]">Google Calendar</p>
                <p className="text-xs text-emerald-700">
                  <Check className="mr-1 inline h-3 w-3" /> Connected · maria.santos@gmail.com
                </p>
              </div>
            </div>
            <button
              onClick={() => setConnected(false)}
              className="text-xs font-semibold text-[#A89BD0] hover:text-red-500"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConnected(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#A89BD0] bg-white/60 px-5 py-6 text-sm font-semibold text-[#3D2E6B] transition hover:bg-[#7E6BAF]/5"
          >
            <CalendarDays className="h-4 w-4" /> Connect Google Calendar
          </button>
        )}
        <p className="mt-3 text-xs text-[#7E6BAF]">
          More calendars (Outlook, Apple, iCal) coming soon.
        </p>
      </SectionCard>

      <SectionCard
        title="Weekly availability"
        description="Pick the days and hours when clients can request a session."
        action={
          <button className="inline-flex items-center gap-1.5 rounded-full bg-[#7E6BAF] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#A89BD0]/40 hover:bg-[#3D2E6B]">
            <Check className="h-3.5 w-3.5" /> Save changes
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => {
            const on = days[d];
            return (
              <button
                key={d}
                onClick={() => setDays((p) => ({ ...p, [d]: !p[d] }))}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  on
                    ? "bg-[#7E6BAF] text-white shadow-sm"
                    : "border border-[#E3DBF5] bg-white/60 text-[#7E6BAF] hover:bg-[#7E6BAF]/10"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
              Start time
            </span>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E3DBF5] bg-white/70 px-4 py-2.5 text-sm font-medium text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
              End time
            </span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E3DBF5] bg-white/70 px-4 py-2.5 text-sm font-medium text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Session types"
        description="What clients can book with you."
        action={
          <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]">
            <Plus className="h-4 w-4" /> Add session
          </button>
        }
      >
        <div className="space-y-3">
          {[
            { name: "Initial consultation", length: "30 min", price: "$60" },
            { name: "Therapy session", length: "50 min", price: "$120" },
          ].map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-2xl border border-[#EEE7FA] bg-white/70 p-4"
            >
              <div className="flex items-center gap-3">
                <Video className="h-4 w-4 text-[#7E6BAF]" />
                <div>
                  <p className="text-sm font-semibold text-[#3D2E6B]">{s.name}</p>
                  <p className="text-xs text-[#7E6BAF]">
                    <Clock className="mr-1 inline h-3 w-3" /> {s.length} · Video
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-[#3D2E6B]">{s.price}</p>
            </div>
          ))}
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