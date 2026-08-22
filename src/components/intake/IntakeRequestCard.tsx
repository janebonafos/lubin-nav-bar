import { useEffect, useMemo, useState } from "react";
import { Check, ChevronUp, Sparkles } from "lucide-react";

import {
  applyAllPrefill,
  buildIntakeProgress,
  dismissRequest,
  setAnswer,
  subscribeIntake,
  toggleSkip,
  type IntakeProgress,
} from "@/lib/intake/store";

/**
 * The client-facing session prep card. Optional by design: it leads with what
 * is already filled in from the Health Passport, explains what the client gets
 * out of it, and can always be closed.
 *
 * Props:
 * - allowDismiss: lets the client close the card (default true). Set to false
 *   when you want the card to stay visible on important pages.
 * - showPreview: renders a short "what we're asking" preview so the client
 *   knows what topics are covered before expanding the form.
 */

export default function IntakeRequestCard({
  appointmentId,
  providerName,
  sessionLabel,
  variant = "card",
  defaultOpen = false,
  allowDismiss = true,
  showPreview = false,
}: {
  appointmentId: string;
  providerName: string;
  sessionLabel?: string;
  variant?: "card" | "inline";
  defaultOpen?: boolean;
  allowDismiss?: boolean;
  showPreview?: boolean;
}) {

  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return subscribeIntake(() => setTick((t) => t + 1));
  }, []);

  const progress: IntakeProgress | null = useMemo(
    () => (mounted ? buildIntakeProgress(appointmentId, providerName) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appointmentId, providerName, mounted, tick],
  );

  if (!progress || progress.total === 0) return null;
  if (!open && progress.response.dismissedAt && !progress.importantOpen) return null;

  const firstName = providerName.replace(/^(Dr\.|Coach|Ms\.|Mr\.)\s+/i, "").split(" ")[0];
  const providerLabel = /^(Dr\.|Coach)/i.test(providerName)
    ? `${providerName.split(" ")[0]} ${firstName}`
    : firstName;

  const shell =
    variant === "inline"
      ? "rounded-[12px] border border-[#D8C7F0] bg-[#FBF9FF] p-5"
      : "rounded-[12px] border border-[#D8C7F0] bg-white p-5 shadow-[0_8px_24px_-12px_rgba(61,46,107,0.10)]";

  return (
    <section className={shell}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
            Optional · about {progress.minutes} min
          </p>
          <h3 className="mt-1 text-base font-semibold text-[#3D2E6B]">
            {progress.complete
              ? `${providerLabel} has what they need`
              : `Help ${providerLabel} prepare for your session`}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#7E6BAF]">
            {progress.complete
              ? `Your notes are with ${providerLabel}${sessionLabel ? ` for ${sessionLabel}` : ""}. You can update them any time before you meet.`
              : `So your session can focus on what you actually came for, ${providerLabel} would like a quick picture of your goals, recent changes, and anything relevant to your care. It's only about ${progress.minutes} minutes — and you can skip anything you'd rather talk about in person.`}
          </p>
          {showPreview && !progress.complete && progress.templates.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {progress.templates.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center rounded-full border border-[#D8C7F0] bg-[#F5F0FB] px-2.5 py-1 text-[11px] font-medium text-[#5B4796]"
                >
                  {t.label}
                </span>
              ))}
            </div>
          )}

          {progress.answered > 0 && !progress.complete && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#E6F8F1] px-2.5 py-1 text-[11px] font-semibold text-[#2D8E69]">
              <Check className="h-3 w-3" /> {progress.answered} of {progress.total} already
              filled in
            </p>
          )}
          {progress.answered === 0 && progress.prefilled > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F0EAFB] px-2.5 py-1 text-[11px] font-semibold text-[#5B4796]">
              <Sparkles className="h-3 w-3" /> {progress.prefilled} answer
              {progress.prefilled === 1 ? "" : "s"} ready from your Health Passport
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#3D2E6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2C2B4B]"
        >
          {open ? (
            <>
              Hide <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : progress.complete ? (
            <>Review what you shared</>
          ) : progress.answered > 0 ? (
            <>Continue</>
          ) : (
            <>Prepare for my session</>
          )}
        </button>
        {!open && progress.prefilled > 0 && (
          <button
            onClick={() => {
              applyAllPrefill(appointmentId, providerName);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#D8C7F0] bg-white px-4 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-[#FBF9FF]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#7E6BAF]" /> Use my Health Passport
          </button>
        )}
        {allowDismiss && !open && !progress.complete && (
          <button
            onClick={() => dismissRequest(appointmentId)}
            className="text-sm font-medium text-[#7E6BAF] underline-offset-4 transition hover:text-[#3D2E6B] hover:underline"
          >
            Not now
          </button>
        )}
      </div>

      {open && (
        <div className="mt-5 space-y-4 border-t border-[#EAE7F5] pt-5">
          {progress.templates.map((template) => (
            <div key={template.id} className="rounded-[10px] border border-[#EAE7F5] bg-white p-4">
              <p className="text-sm font-semibold text-[#3D2E6B]">{template.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#7E6BAF]">{template.why}</p>
              <div className="mt-4 space-y-4">
                {progress.fields
                  .filter((f) => f.template.id === template.id)
                  .map((state) => (
                    <FieldRow
                      key={state.field.id}
                      appointmentId={appointmentId}
                      state={state}
                    />
                  ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setOpen(false)}
              className="rounded-[12px] bg-[#3D2E6B] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2C2B4B]"
            >
              Done for now
            </button>
            <p className="text-xs text-[#7E6BAF]">
              Saved as you type — you can come back and change anything.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function FieldRow({
  appointmentId,
  state,
}: {
  appointmentId: string;
  state: import("@/lib/intake/store").IntakeFieldState;
}) {
  const { field } = state;
  const [draft, setDraft] = useState(state.answer);

  useEffect(() => {
    setDraft(state.answer);
  }, [state.answer]);

  const commit = (value: string) => {
    setDraft(value);
    setAnswer(appointmentId, field.id, value);
  };

  return (
    <div className={state.skipped && !state.answered ? "opacity-60" : ""}>
      <label className="block text-sm font-medium text-[#3D2E6B]">{field.label}</label>
      {field.help && <p className="mt-0.5 text-xs text-[#7E6BAF]">{field.help}</p>}

      {state.prefill && !state.answered && (
        <div className="mt-2 rounded-[8px] border border-[#D8C7F0] bg-[#FBF9FF] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
            From your Health Passport · {state.prefill.source}
          </p>
          <p className="mt-1 text-sm text-[#3D2E6B]">{state.prefill.value}</p>
          <button
            onClick={() => commit(state.prefill!.value)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-[12px] border border-[#D8C7F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D2E6B] transition hover:bg-[#F0EAFB]"
          >
            <Check className="h-3 w-3" /> Looks right — use this
          </button>
        </div>
      )}

      {field.type === "ack" ? (
        <label className="mt-2 flex items-start gap-2 text-sm text-[#3D2E6B]">
          <input
            type="checkbox"
            checked={draft === "acknowledged"}
            onChange={(e) => commit(e.target.checked ? "acknowledged" : "")}
            className="mt-0.5 h-4 w-4 rounded border-[#D8C7F0] accent-[#5B4796]"
          />
          <span>Yes, I've read it</span>
        </label>
      ) : field.type === "choice" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => (
            <button
              key={opt}
              onClick={() => commit(draft === opt ? "" : opt)}
              className={`rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition ${
                draft === opt
                  ? "border-[#5B4796] bg-[#5B4796] text-white"
                  : "border-[#D8C7F0] bg-white text-[#3D2E6B] hover:bg-[#F0EAFB]"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : field.type === "short-text" ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          placeholder={field.placeholder}
          className="mt-2 w-full rounded-[8px] border border-[#EAE7F5] bg-white px-3 py-2 text-sm text-[#3D2E6B] outline-none transition placeholder:text-[#A89BD0] focus:border-[#A89BD0]"
        />
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          rows={3}
          placeholder={field.placeholder}
          className="mt-2 w-full rounded-[8px] border border-[#EAE7F5] bg-white px-3 py-2 text-sm leading-relaxed text-[#3D2E6B] outline-none transition placeholder:text-[#A89BD0] focus:border-[#A89BD0]"
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          onClick={() => toggleSkip(appointmentId, field.id)}
          className="text-xs font-medium text-[#7E6BAF] underline-offset-4 transition hover:text-[#3D2E6B] hover:underline"
        >
          {state.skipped
            ? "Actually, I'll answer this"
            : "I'd rather talk about this in person"}
        </button>
        {state.fromPassport && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F0EAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5B4796]">
            <Sparkles className="h-3 w-3" /> From Health Passport
          </span>
        )}
      </div>
    </div>
  );
}
