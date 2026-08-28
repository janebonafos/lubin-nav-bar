// Optional health details in the Health Passport. Framed as something the
// client does for themselves — never a task, never a requirement. Anything
// added here quietly prefills what a provider asks after booking.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Check, Lock, Plus } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    setDetails(loadHealthDetails());
    return subscribeHealthDetails(() => setDetails(loadHealthDetails()));
  }, []);

  const progress = useMemo(() => healthDetailsProgress(details), [details]);
  const started = progress.filled > 0;

  const update = (fieldId: string, value: string) => {
    setDetails((prev) => {
      const next = { ...prev };
      if (value.trim()) next[fieldId] = value;
      else delete next[fieldId];
      return next;
    });
    setHealthDetail(fieldId, value);
  };

  return (
    <section className="rounded-3xl border border-brand-purple/12 bg-white/70 p-5 shadow-[0_10px_30px_-24px_rgba(61,46,107,0.45)] backdrop-blur-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
            Optional · yours to keep
          </p>
          <h2 className="mt-2 text-lg font-semibold text-brand-purple-dark">
            Add health details you'd rather not repeat
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-brand-purple-dark/65">
            Nothing here is required and nothing is shared until you book someone and say
            yes. When you do, whatever you've added fills in their questions for you — so
            your session starts with what you came for, not paperwork.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-purple px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(126,107,175,0.8)]"
        >
          {open ? "Done for now" : started ? "Keep adding" : "Add details"}
          {open ? null : <Plus className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-brand-purple-dark/60">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-brand-purple" />
          Stored for you only — you choose who ever sees it
        </span>
        {started && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-600/15">
            <Check className="h-3.5 w-3.5" />
            {progress.filled} detail{progress.filled === 1 ? "" : "s"} saved
          </span>
        )}
      </div>

      {open && (
        <div className="mt-5 space-y-3">
          {HEALTH_DETAIL_GROUPS.map((group) => {
            const filled = groupFilledCount(group, details);
            const expanded = openGroup === group.id;
            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-2xl border border-brand-purple/12 bg-white/80"
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup(expanded ? null : group.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold text-brand-purple-dark">
                      {group.label}
                      {filled > 0 && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          {filled}/{group.fields.length}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-brand-purple-dark/55">
                      {group.why}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-brand-purple-dark/40 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expanded && (
                  <div className="grid gap-4 border-t border-brand-purple/10 px-4 py-4 sm:grid-cols-2">
                    {group.fields.map((field) => (
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
                )}
              </div>
            );
          })}
          <p className="pt-1 text-[12px] leading-relaxed text-brand-purple-dark/50">
            Saved as you type. Skip anything you'd rather talk through with a person.
          </p>
        </div>
      )}
    </section>
  );
}
