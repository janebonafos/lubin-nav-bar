// Optional health details in the Health Passport, framed as building a health
// ID card: as the client fills sections in, the card on the left fills in live
// so progress is obvious at a glance. Nothing here is required and nothing is
// shared until they book someone and say yes. When the account was created on
// someone's behalf (guardian), copy adapts to name the person.
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  HeartPulse,
  Lock,
  Mail,
  PhoneCall,
  Stethoscope,
  User,
} from "lucide-react";
import {
  HEALTH_DETAIL_GROUPS,
  groupFilledCount,
  healthDetailsProgress,
  loadHealthDetails,
  setHealthDetail,
  subscribeHealthDetails,
  type HealthDetailField,
  type HealthDetails,
} from "@/lib/intake/healthDetails";
import { loadProxySignup, proxyFirstName } from "@/lib/proxySignup";

const GROUP_ICON: Record<string, typeof User> = {
  "about-you": User,
  "reach-you": Mail,
  "safety-net": PhoneCall,
  health: HeartPulse,
  care: Stethoscope,
};

const GROUP_BLURB: Record<string, string> = {
  "about-you": "Name, birthday, pronouns",
  "reach-you": "Phone, email, where you are",
  "safety-net": "One person, used only in an emergency",
  health: "Allergies, current meds, anything relevant",
  care: "Any care you already have",
};

function ageFrom(dob: string): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? String(age) : null;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/* ---------------------------------- card ---------------------------------- */

function CardLine({ label, value }: { label: string; value?: string }) {
  const filled = Boolean(value && value.trim());
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{label}</p>
      {filled ? (
        <p className="mt-0.5 truncate text-[13px] font-medium text-white">{value}</p>
      ) : (
        <span className="mt-1.5 block h-[7px] w-full max-w-[110px] rounded-full bg-white/15" />
      )}
    </div>
  );
}

function PassportCard({
  details,
  filled,
  total,
  ownerName,
}: {
  details: HealthDetails;
  filled: number;
  total: number;
  ownerName: string | null;
}) {
  const name =
    details["identity.preferredName"] || details["identity.fullName"] || ownerName || "";
  const age = ageFrom(details["identity.dob"] ?? "");
  const pct = total ? Math.round((filled / total) * 100) : 0;

  return (
    <div className="rounded-[26px] bg-gradient-to-br from-brand-purple-dark via-brand-purple-dark to-brand-purple p-5 shadow-[0_24px_60px_-28px_rgba(61,46,107,0.75)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
            Lubin health card
          </p>
          <p className="mt-1 text-[11px] text-white/45">Yours to keep · shared only with consent</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 text-white">
          <HeartPulse className="h-4.5 w-4.5" />
        </span>
      </div>

      <div className="mt-5 flex items-center gap-3.5">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-lg font-bold text-white ring-1 ring-white/15">
          {initialsOf(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">
            {name || "Your name"}
          </p>
          <p className="mt-0.5 text-[12px] text-white/55">
            {[age ? `${age} yrs` : null, details["identity.pronouns"]]
              .filter(Boolean)
              .join(" · ") || "Add the basics to start your card"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-white/12 pt-4">
        <CardLine label="Mobile" value={details["contact.phone"]} />
        <CardLine label="Location" value={details["contact.address"]} />
        <CardLine label="Emergency contact" value={details["emergency.name"]} />
        <CardLine label="Their number" value={details["emergency.phone"]} />
        <div className="col-span-2">
          <CardLine label="Allergies" value={details["history.allergies"]} />
        </div>
        <div className="col-span-2">
          <CardLine label="Current medication" value={details["medication.list"]} />
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
          <span>Card complete</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/12">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${Math.max(pct, filled ? 4 : 0)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- inputs --------------------------------- */

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: HealthDetailField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    "w-full rounded-xl border border-brand-purple/15 bg-white px-3 py-2.5 text-sm text-brand-purple-dark placeholder:text-brand-purple-dark/35 outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15";

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-brand-purple-dark/80">
        {field.label}
        {value.trim() ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-label="Saved" />
        ) : null}
      </span>
      {field.type === "long-text" ? (
        <textarea
          rows={3}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} resize-none`}
        />
      ) : field.type === "choice" ? (
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(active ? "" : opt)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
                  active
                    ? "bg-brand-purple text-white shadow-[0_6px_16px_-8px_rgba(126,107,175,0.7)]"
                    : "bg-white text-brand-purple-dark/70 ring-1 ring-brand-purple/15 hover:ring-brand-purple/35"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          type={
            field.type === "date"
              ? "date"
              : field.type === "tel"
                ? "tel"
                : field.type === "email"
                  ? "email"
                  : "text"
          }
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}
      {field.help && (
        <span className="mt-1.5 block text-[12px] leading-relaxed text-brand-purple-dark/50">
          {field.help}
        </span>
      )}
    </label>
  );
}

/* ---------------------------------- main ---------------------------------- */

export default function HealthDetailsCard() {
  const [details, setDetails] = useState<HealthDetails>({});
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [proxyName, setProxyName] = useState<string | null>(null);

  useEffect(() => {
    setDetails(loadHealthDetails());
    setProxyName(proxyFirstName(loadProxySignup()));
    return subscribeHealthDetails(() => setDetails(loadHealthDetails()));
  }, []);

  const progress = useMemo(() => healthDetailsProgress(details), [details]);

  const update = (fieldId: string, value: string) => {
    setDetails((prev) => {
      const next = { ...prev };
      if (value.trim()) next[fieldId] = value;
      else delete next[fieldId];
      return next;
    });
    setHealthDetail(fieldId, value);
  };

  const who = proxyName ?? "you";
  const heading = proxyName ? `${proxyName}'s health card` : "Your health card";
  const intro = proxyName
    ? `Fill in as much or as little as you like. Everything you add builds ${proxyName}'s card — and fills in a provider's questions once you book and say yes.`
    : "Fill in as much or as little as you like. Everything you add builds your card — and fills in a provider's questions once you book and say yes.";

  return (
    <section className="overflow-hidden rounded-[32px] border border-brand-purple/12 bg-white shadow-[0_18px_50px_-32px_rgba(61,46,107,0.5)]">
      <div className="border-b border-brand-purple/10 px-6 pb-6 pt-7 sm:px-8">
        <span className="inline-flex items-center rounded-full bg-brand-purple/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
          Optional · yours to keep
        </span>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-purple-dark sm:text-[26px]">
          {heading}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-purple-dark/65">{intro}</p>
      </div>

      <div className="grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Live card */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <PassportCard
            details={details}
            filled={progress.filled}
            total={progress.total}
            ownerName={proxyName}
          />
          <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-brand-purple-dark/55">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-purple" />
            Stored for {who} only. Nothing leaves the passport until you share it with a provider
            you've booked.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {HEALTH_DETAIL_GROUPS.map((group, i) => {
            const Icon = GROUP_ICON[group.id] ?? User;
            const filled = groupFilledCount(group, details);
            const total = group.fields.length;
            const complete = filled === total;
            const open = openGroup === group.id;
            return (
              <div
                key={group.id}
                className={`overflow-hidden rounded-2xl border transition ${
                  open
                    ? "border-brand-purple/40 bg-[#FAF7FE] ring-1 ring-brand-purple/10"
                    : complete
                      ? "border-emerald-600/20 bg-[#F4FBF7]"
                      : "border-brand-purple/12 bg-white hover:border-brand-purple/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup(open ? null : group.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
                >
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold ${
                      complete
                        ? "bg-emerald-600 text-white"
                        : "bg-brand-purple/10 text-brand-purple"
                    }`}
                  >
                    {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14.5px] font-semibold text-brand-purple-dark">
                        {i + 1}. {group.label}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-brand-purple-dark/55">
                      {GROUP_BLURB[group.id] ?? group.why}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      complete
                        ? "bg-emerald-600/10 text-emerald-700"
                        : filled > 0
                          ? "bg-brand-purple/10 text-brand-purple"
                          : "bg-brand-purple/[0.06] text-brand-purple-dark/50"
                    }`}
                  >
                    {complete ? "Complete" : filled > 0 ? `${filled}/${total} added` : "Not added"}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-brand-purple-dark/35 transition-transform ${
                      open ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {open && (
                  <div className="border-t border-brand-purple/10 px-4 py-5 sm:px-5">
                    <p className="mb-4 text-[12.5px] leading-relaxed text-brand-purple-dark/60">
                      {group.why}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {group.fields.map((field) => (
                        <div
                          key={field.id}
                          className={
                            field.type === "long-text" || field.type === "choice"
                              ? "sm:col-span-2"
                              : ""
                          }
                        >
                          <FieldInput
                            field={field}
                            value={details[field.id] ?? ""}
                            onChange={(v) => update(field.id, v)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[12px] text-brand-purple-dark/50">
                        Saved as you type. Skip anything you'd rather say in person.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenGroup(null)}
                          className="rounded-xl px-3 py-2 text-[13px] font-semibold text-brand-purple-dark/60 transition hover:text-brand-purple-dark"
                        >
                          Close
                        </button>
                        {i < HEALTH_DETAIL_GROUPS.length - 1 && (
                          <button
                            type="button"
                            onClick={() => setOpenGroup(HEALTH_DETAIL_GROUPS[i + 1].id)}
                            className="rounded-xl bg-brand-purple px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-105"
                          >
                            Next section
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!openGroup && (
            <button
              type="button"
              onClick={() => {
                const next =
                  HEALTH_DETAIL_GROUPS.find((g) => groupFilledCount(g, details) === 0) ??
                  HEALTH_DETAIL_GROUPS[0];
                setOpenGroup(next.id);
              }}
              className="w-full rounded-2xl bg-brand-purple px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(126,107,175,0.9)] transition hover:brightness-105"
            >
              {progress.filled > 0 ? "Continue building the card" : "Start the card"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
