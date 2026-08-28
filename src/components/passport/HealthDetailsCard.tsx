// Optional health details in the Health Passport. Framed as something the
// client does for themselves — never a task, never a requirement. Anything
// added here quietly prefills what a provider asks after booking. When the
// account was created on someone's behalf (guardian), copy adapts to name
// the person instead of saying "you".
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  HeartPulse,
  Lock,
  Mail,
  PhoneCall,
  Plus,
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

const GROUP_META: Record<
  string,
  { icon: typeof User; blurb: string; featured?: boolean }
> = {
  "about-you": { icon: User, blurb: "Name, birthday, pronouns — the basics you fill in every time." },
  "reach-you": { icon: Mail, blurb: "How providers send reminders and follow-ups." },
  "safety-net": {
    icon: PhoneCall,
    blurb: "Only ever used if there's a serious concern for safety.",
    featured: true,
  },
  health: {
    icon: HeartPulse,
    blurb: "Allergies, current meds and conditions — what keeps prescribing safe.",
  },
  care: { icon: Stethoscope, blurb: "Past or current care, so no one starts from zero." },
};

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
  const started = progress.filled > 0;
  const activeGroup = HEALTH_DETAIL_GROUPS.find((g) => g.id === openGroup) ?? null;

  const update = (fieldId: string, value: string) => {
    setDetails((prev) => {
      const next = { ...prev };
      if (value.trim()) next[fieldId] = value;
      else delete next[fieldId];
      return next;
    });
    setHealthDetail(fieldId, value);
  };

  const heading = proxyName
    ? `Add ${proxyName}'s details you'd rather not repeat`
    : "Add health details you'd rather not repeat";
  const intro = proxyName
    ? `Nothing here is required and nothing is shared until you book someone for ${proxyName} and say yes. Whatever you add fills in the provider's questions for you — so the session starts with what matters, not paperwork.`
    : "Nothing here is required and nothing is shared until you book someone and say yes. When you do, whatever you've added fills in their questions for you — so your session starts with what you came for, not paperwork.";

  return (
    <section className="overflow-hidden rounded-[32px] border border-brand-purple/12 bg-white shadow-[0_18px_50px_-32px_rgba(61,46,107,0.5)]">
      {/* Header */}
      <div className="flex flex-col gap-6 px-6 pt-7 sm:px-9 sm:pt-9 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-xl">
          <span className="inline-flex items-center rounded-full bg-brand-purple/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
            Optional · yours to keep
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-purple-dark sm:text-[28px]">
            {heading}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-brand-purple-dark/65">{intro}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            setOpenGroup((v) => (v ? null : HEALTH_DETAIL_GROUPS[0].id))
          }
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-brand-purple px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-12px_rgba(126,107,175,0.9)] transition hover:brightness-105"
        >
          {openGroup ? "Done for now" : started ? "Keep adding" : "Add details"}
          {openGroup ? null : <Plus className="h-4 w-4" />}
        </button>
      </div>

      {/* Bento grid */}
      <div className="grid gap-4 px-6 py-7 sm:grid-cols-2 sm:px-9 lg:grid-cols-3">
        {HEALTH_DETAIL_GROUPS.map((group, i) => {
          const meta = GROUP_META[group.id] ?? { icon: User, blurb: group.why };
          const Icon = meta.icon;
          const filled = groupFilledCount(group, details);
          const total = group.fields.length;
          const expanded = openGroup === group.id;
          const wide = i === 0 || i === 3;
          const featured = meta.featured && filled === 0;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setOpenGroup(expanded ? null : group.id)}
              className={`group relative flex flex-col justify-between rounded-3xl border p-5 text-left transition sm:p-6 ${
                wide ? "lg:col-span-2" : ""
              } ${
                featured
                  ? "border-brand-purple/60 bg-brand-purple text-white shadow-[0_16px_36px_-18px_rgba(126,107,175,0.8)]"
                  : expanded
                    ? "border-brand-purple/45 bg-[#FAF7FE] ring-2 ring-brand-purple/15"
                    : "border-brand-purple/12 bg-[#FAF7FE]/70 hover:border-brand-purple/30 hover:bg-[#FAF7FE]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                    featured
                      ? "bg-white/15 text-white"
                      : "bg-white text-brand-purple ring-1 ring-brand-purple/15"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    filled > 0
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15"
                      : featured
                        ? "bg-white/15 text-white/90"
                        : "bg-white text-brand-purple-dark/55 ring-1 ring-brand-purple/12"
                  }`}
                >
                  {filled > 0 ? `${filled}/${total} added` : featured ? "Essential" : `${total} fields`}
                </span>
              </div>
              <div className="mt-5">
                <p
                  className={`text-[15px] font-semibold ${
                    featured ? "text-white" : "text-brand-purple-dark"
                  }`}
                >
                  {group.label}
                </p>
                <p
                  className={`mt-1 text-[12.5px] leading-relaxed ${
                    featured ? "text-white/75" : "text-brand-purple-dark/55"
                  }`}
                >
                  {meta.blurb}
                </p>
              </div>
              <ChevronDown
                className={`absolute bottom-5 right-5 h-4 w-4 transition-transform ${
                  featured ? "text-white/60" : "text-brand-purple-dark/35"
                } ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          );
        })}
      </div>

      {/* Editor for the active group */}
      {activeGroup && (
        <div className="border-t border-brand-purple/10 bg-[#FAF7FE]/60 px-6 py-6 sm:px-9 sm:py-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-purple-dark">{activeGroup.label}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-brand-purple-dark/55">
                {activeGroup.why}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/15">
              {groupFilledCount(activeGroup, details)}/{activeGroup.fields.length} saved
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeGroup.fields.map((field) => (
              <div
                key={field.id}
                className={field.type === "long-text" || field.type === "choice" ? "sm:col-span-2" : ""}
              >
                <FieldInput
                  field={field}
                  value={details[field.id] ?? ""}
                  onChange={(v) => update(field.id, v)}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-brand-purple-dark/50">
            Saved as you type. Skip anything you'd rather talk through with a person.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-brand-purple/10 px-6 py-4 text-[12px] text-brand-purple-dark/60 sm:px-9">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-brand-purple" />
          Stored for {proxyName ? `${proxyName}` : "you"} only — you choose who ever sees it
        </span>
        {started && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            {progress.filled} detail{progress.filled === 1 ? "" : "s"} saved
          </span>
        )}
      </div>
    </section>
  );
}
