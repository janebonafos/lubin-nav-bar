// Optional health details in the Health Passport, framed as building a health
// ID card: as the client fills sections in, the card on the left fills in live
// so progress is obvious at a glance. Nothing here is required and nothing is
// shared until they book someone and say yes. When the account was created on
// someone's behalf (guardian), copy adapts to name the person.
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Lock, Plus, X } from "lucide-react";
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

const GROUP_BLURB: Record<string, string> = {
  "about-you": "Name and date of birth",
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
  if (!parts.length) return "";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/* ---------------------------------- card ---------------------------------- */

function CardLine({ label, value }: { label: string; value?: string }) {
  const filled = Boolean(value && value.trim());
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>
      {filled ? (
        <p className="mt-0.5 truncate text-[12px] font-medium text-white/90">{value}</p>
      ) : (
        <span className="mt-1.5 block h-[6px] w-full max-w-[100px] rounded-full bg-white/10" />
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
    <div className="relative aspect-[1.58/1] w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-purple-dark via-brand-purple-dark to-brand-purple shadow-[0_28px_70px_-30px_rgba(61,46,107,0.65)]">
      {/* soft glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-purple-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-brand-purple/25 blur-3xl" />

      <div className="relative flex h-full flex-col justify-between p-6 text-white sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black italic uppercase tracking-tight">Lubin</p>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/55">
              Health Network
            </p>
          </div>
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
            <div className="h-2.5 w-2.5 rounded-full bg-white/80" />
          </div>
        </div>

        <div className="mt-auto">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">
            Cardholder
          </p>
          <h3 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {name || "Your name"}
          </h3>
          <p className="mt-1 text-[12px] text-white/55">
            {dob
              ? `${formatDob(dob)}${age ? ` · ${age} yrs` : ""}`
              : "Add the basics to start your card"}
          </p>


          <div className="mt-5 flex gap-8 border-t border-white/10 pt-4">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/40">
                Mobile
              </p>
              <p className="mt-0.5 font-mono text-[11px] tracking-wider text-white/80">
                {details["contact.phone"] || "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/40">
                Location
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] tracking-wider text-white/80">
                {details["contact.address"] || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* progress band */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
        <div
          className="h-full bg-brand-purple-accent transition-all duration-500"
          style={{ width: `${Math.max(pct, filled ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

/* --------------------------------- inputs --------------------------------- */

function parseItems(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Structured list input: suggestions first, short custom entries second. */
function TagsInput({
  field,
  value,
  onChange,
}: {
  field: HealthDetailField;
  value: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const items = parseItems(value);
  const maxItems = field.maxItems ?? 10;
  const maxItemLength = field.maxItemLength ?? 40;
  const exclusive = field.exclusiveOption;
  const exclusiveOn = Boolean(exclusive && items.length === 1 && items[0] === exclusive);
  const full = items.length >= maxItems;

  const commit = (next: string[]) => {
    const unique: string[] = [];
    next.forEach((i) => {
      const clean = i.replace(/,/g, " ").trim().slice(0, maxItemLength);
      if (clean && !unique.some((u) => u.toLowerCase() === clean.toLowerCase())) unique.push(clean);
    });
    onChange(unique.slice(0, maxItems).join(", "));
  };

  const toggle = (opt: string) => {
    if (exclusive && opt === exclusive) {
      commit(exclusiveOn ? [] : [exclusive]);
      return;
    }
    const without = items.filter((i) => i !== exclusive);
    commit(without.includes(opt) ? without.filter((i) => i !== opt) : [...without, opt]);
  };

  const addDraft = () => {
    if (!draft.trim()) return;
    commit([...items.filter((i) => i !== exclusive), draft]);
    setDraft("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(field.options ?? []).map((opt) => {
          const active = items.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-xl px-3 py-1.5 text-[13px] font-medium transition ${
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

      {/* custom entries the client added */}
      {items.some((i) => !(field.options ?? []).includes(i)) && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {items
            .filter((i) => !(field.options ?? []).includes(i))
            .map((i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-purple/10 px-3 py-1.5 text-[13px] font-medium text-brand-purple-dark"
              >
                {i}
                <button
                  type="button"
                  aria-label={`Remove ${i}`}
                  onClick={() => commit(items.filter((x) => x !== i))}
                  className="text-brand-purple-dark/40 transition hover:text-brand-purple-dark"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
        </div>
      )}

      {!exclusiveOn && !full && (
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            maxLength={maxItemLength}
            placeholder={field.placeholder ?? "Add one item"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDraft();
              }
            }}
            className="min-w-0 flex-1 rounded-xl border border-brand-purple/15 bg-white px-3.5 py-2.5 text-sm text-brand-purple-dark placeholder:text-brand-purple-dark/35 outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15"
          />
          <button
            type="button"
            onClick={addDraft}
            disabled={!draft.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-purple/10 px-3.5 py-2.5 text-[13px] font-semibold text-brand-purple transition hover:bg-brand-purple/20 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Medications kept structured: one row per medicine with a type, a name and a
 * dose, so a clinician reads discrete entries instead of a paragraph. Stored as
 * "Type — Name dose" rows joined by "; ".
 */
type MedRow = { type: string; name: string; dose: string };

function parseMeds(value: string): MedRow[] {
  return value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawType, rest] = entry.includes("—") ? entry.split("—") : ["", entry];
      const detail = (rest ?? "").trim();
      const lastSpace = detail.lastIndexOf(" ");
      const looksDosed = /\d/.test(detail.slice(lastSpace + 1));
      return {
        type: rawType.trim(),
        name: looksDosed && lastSpace > 0 ? detail.slice(0, lastSpace).trim() : detail,
        dose: looksDosed && lastSpace > 0 ? detail.slice(lastSpace + 1).trim() : "",
      };
    });
}

function serializeMeds(rows: MedRow[]): string {
  return rows
    .map((r) => {
      const detail = [r.name.trim(), r.dose.trim()].filter(Boolean).join(" ");
      const type = r.type.trim();
      if (!detail && !type) return "";
      return type ? `${type} — ${detail || "not specified"}` : detail;
    })
    .filter(Boolean)
    .join("; ");
}

function MedsInput({
  field,
  value,
  onChange,
}: {
  field: HealthDetailField;
  value: string;
  onChange: (v: string) => void;
}) {
  const none = field.exclusiveOption ?? "Nothing right now";
  const takingNone = value.trim() === none;
  const rows = takingNone ? [] : parseMeds(value);
  const types = (field.options ?? []).filter((o) => o !== none);
  const maxRows = field.maxItems ?? 10;

  const commit = (next: MedRow[]) => onChange(serializeMeds(next));
  const update = (i: number, patch: Partial<MedRow>) =>
    commit(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => {
    if (takingNone) {
      onChange(serializeMeds([{ type: "", name: "", dose: "" }]));
    } else {
      commit([...rows, { type: "", name: "", dose: "" }]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(takingNone ? "" : none)}
          className={`rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition ${
            takingNone
              ? "bg-brand-purple text-white shadow-[0_6px_16px_-8px_rgba(126,107,175,0.7)]"
              : "bg-white text-brand-purple-dark/70 ring-1 ring-brand-purple/15 hover:ring-brand-purple/35"
          }`}
        >
          {none}
        </button>
        {!takingNone && rows.length === 0 && (
          <span className="text-[12px] text-brand-purple-dark/50">
            Tap "Add a medication" to list what you take.
          </span>
        )}
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={i}
            className="rounded-2xl border border-brand-purple/12 bg-white p-3 shadow-[0_1px_2px_rgba(126,107,175,0.06)]"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-brand-purple/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <button
                type="button"
                aria-label={`Remove medication ${i + 1}`}
                onClick={() => commit(rows.filter((_, idx) => idx !== i))}
                className="shrink-0 text-brand-purple-dark/30 transition hover:text-brand-purple-dark"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                value={row.name}
                maxLength={field.maxItemLength ?? 40}
                placeholder="Medicine name"
                onChange={(e) => update(i, { name: e.target.value.replace(/[;—]/g, " ") })}
                className="w-full min-w-0 rounded-xl border border-brand-purple/15 bg-white px-3 py-2.5 text-sm font-medium text-brand-purple-dark placeholder:font-normal placeholder:text-brand-purple-dark/35 outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={row.dose}
                  maxLength={20}
                  placeholder="Dose"
                  onChange={(e) => update(i, { dose: e.target.value.replace(/[;—]/g, " ") })}
                  className="min-w-0 rounded-xl border border-brand-purple/15 bg-white px-3 py-2.5 text-sm text-brand-purple-dark placeholder:text-brand-purple-dark/35 outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15"
                />
                <select
                  value={row.type}
                  onChange={(e) => update(i, { type: e.target.value })}
                  className={`min-w-0 appearance-none rounded-xl border border-brand-purple/15 bg-white bg-[length:14px] bg-[right_0.7rem_center] bg-no-repeat px-3 py-2.5 pr-8 text-sm outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15 ${
                    row.type ? "text-brand-purple-dark" : "text-brand-purple-dark/40"
                  }`}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237E6BAF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                  }}
                >
                  <option value="">Type</option>
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}

        {rows.length < maxRows && (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-purple/10 px-3.5 py-2.5 text-[13px] font-semibold text-brand-purple transition hover:bg-brand-purple/20"
          >
            <Plus className="h-3.5 w-3.5" />
            {rows.length ? "Add another medication" : "Add a medication"}
          </button>
        )}
      </div>
    </div>
  );
}

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
    "w-full rounded-xl border border-brand-purple/15 bg-white px-3.5 py-3 text-sm text-brand-purple-dark placeholder:text-brand-purple-dark/35 outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15";

  const Wrapper: "label" | "div" =
    field.type === "tags" || field.type === "choice" || field.type === "meds" ? "div" : "label";

  return (
    <Wrapper className="block">
      <span className="mb-2 block text-[13px] font-semibold text-brand-purple-dark/85">
        {field.label}
      </span>
      {field.type === "meds" ? (
        <MedsInput field={field} value={value} onChange={onChange} />
      ) : field.type === "tags" ? (
        <TagsInput field={field} value={value} onChange={onChange} />
      ) : field.type === "long-text" ? (
        <textarea
          rows={3}
          value={value}
          maxLength={field.maxLength ?? 240}
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
                className={`rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition ${
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
      ) : field.type === "date" ? (
        <div className="relative">
          <input
            type="date"
            value={value}
            max={new Date().toISOString().slice(0, 10)}
            min="1900-01-01"
            onChange={(e) => onChange(e.target.value)}
            className={`${base} appearance-none pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-date-and-time-value]:text-left ${
              value ? "" : "text-brand-purple-dark/35"
            }`}
          />
          <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-purple/60" />
        </div>
      ) : (
        <input
          type={
            field.type === "tel" ? "tel" : field.type === "email" ? "email" : "text"
          }
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}

      {field.help && (
        <span className="mt-2 block text-[12px] leading-relaxed text-brand-purple-dark/50">
          {field.help}
        </span>
      )}
    </Wrapper>
  );
}

/* ---------------------------------- main ---------------------------------- */

export default function HealthDetailsCard({ showHeader = true }: { showHeader?: boolean }) {
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
  const whose = proxyName ? `${proxyName}'s` : "your";
  const heading = proxyName ? `${proxyName}'s health card` : "Your health card";

  return (
    <section className="w-full">
      {/* header */}
      {showHeader && (
        <div className="mb-8">
          <span className="inline-flex items-center rounded-full bg-brand-purple/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-purple">
            Optional · yours to keep
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-purple-dark">
            {heading}
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-brand-purple-dark/60">
            Fill in as much or as little as you like. Everything you add builds {whose} card — and
            fills in a provider's questions once you book and say yes.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-12">
        {/* Live card preview — compact and centered above the sections */}
        <div className="mx-auto w-full max-w-lg">
          <PassportCard
            details={details}
            filled={progress.filled}
            total={progress.total}
            ownerName={proxyName}
          />

          <div className="mt-5 rounded-2xl border border-brand-purple/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-brand-purple-dark">Privacy</span>
              <span className="rounded-full bg-brand-purple/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-purple">
                Active
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-purple-dark/55">
              Stored for {who} only. Nothing leaves the passport until you share it with a provider
              you've booked.
            </p>
          </div>
        </div>

        {/* Editable sections */}
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          {HEALTH_DETAIL_GROUPS.map((group, i) => {
            const filled = groupFilledCount(group, details);
            const total = group.fields.length;
            const complete = filled === total && total > 0;
            const open = openGroup === group.id;
            const started = filled > 0;

            return (
              <div
                key={group.id}
                className={`overflow-hidden rounded-2xl border-2 bg-white transition-all ${
                  open
                    ? "border-brand-purple/40 shadow-sm"
                    : complete
                      ? "border-brand-purple/20 bg-brand-purple/5"
                      : started
                        ? "border-brand-purple/20 hover:border-brand-purple/40"
                        : "border-transparent shadow-sm hover:border-brand-purple/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup(open ? null : group.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                >
                  <div className="flex items-center gap-5">
                    <span
                      className={`font-mono text-[15px] font-bold transition-colors ${
                        open
                          ? "text-brand-purple"
                          : complete
                            ? "text-brand-purple"
                            : started
                              ? "text-brand-purple/70"
                              : "text-brand-purple-dark/20"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h4
                        className={`text-[15px] font-bold leading-tight ${
                          open
                            ? "text-brand-purple-dark"
                            : complete
                              ? "text-brand-purple-dark"
                              : "text-brand-purple-dark"
                        }`}
                      >
                        {group.label}
                      </h4>
                      <p className="mt-0.5 text-[12.5px] text-brand-purple-dark/50">
                        {GROUP_BLURB[group.id] ?? group.why}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {complete ? (
                      <span className="rounded-full bg-brand-purple/10 px-2.5 py-1 text-[10px] font-bold uppercase text-brand-purple">
                        Complete
                      </span>
                    ) : started ? (
                      <span className="rounded-full bg-brand-purple/10 px-2.5 py-1 text-[10px] font-bold uppercase text-brand-purple">
                        {filled}/{total}
                      </span>
                    ) : (
                      <span className="rounded-full bg-brand-purple/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase text-brand-purple-dark/40">
                        Not added
                      </span>
                    )}
                    {open ? (
                      <span className="h-2 w-2 rounded-full bg-brand-purple" />
                    ) : (
                      <span className="text-[18px] font-light text-brand-purple-dark/25 transition group-hover:text-brand-purple/60">
                        →
                      </span>
                    )}
                  </div>
                </button>

                {open && (
                  <div className="border-t border-brand-purple/10 px-5 pb-6 pt-4 sm:px-6">
                    <p className="mb-5 text-[13px] leading-relaxed text-brand-purple-dark/60">
                      {group.why}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {group.fields.map((field) => (
                        <div
                          key={field.id}
                          className={
                            field.type === "long-text" ||
                            field.type === "choice" ||
                            field.type === "tags"
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
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand-purple/10 pt-4">
                      <p className="flex items-center gap-1.5 text-[12px] text-brand-purple-dark/50">
                        <Lock className="h-3 w-3" />
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
              className="mt-2 w-full rounded-2xl bg-brand-purple px-6 py-4 text-[15px] font-bold text-white shadow-[0_12px_28px_-14px_rgba(126,107,175,0.9)] transition hover:brightness-105 active:scale-[0.99]"
            >
              {progress.filled > 0 ? "Continue your health card" : "Start your health card"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
