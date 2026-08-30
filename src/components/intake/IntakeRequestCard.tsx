import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";


import {
  applyAllPrefill,
  buildIntakeProgress,
  measuresFor,
  setAnswer,
  subscribeIntake,
  toggleSkip,
  type IntakeProgress,
} from "@/lib/intake/store";
import { ASSESSMENTS_BY_SLUG } from "@/lib/patterns/assessments";
import { getLatestAttempt } from "@/lib/patterns/storage";

/**
 * The client-facing session prep card. Optional by design: it leads with what
 * is already filled in from the Health Passport, explains what the client gets
 * out of it, and can always be closed.
 *
 * Props:
 * - phase: "before" (ahead of the session) or "live" (session is happening or
 *   just wrapped up) — in "live" the client can still fill this in so the
 *   provider can capture it during the conversation.
 */

export default function IntakeRequestCard({
  appointmentId,
  providerName,
  sessionLabel,
  variant = "card",
  defaultOpen = false,
  phase = "before",
}: {
  appointmentId: string;
  providerName: string;
  sessionLabel?: string;
  variant?: "card" | "inline";
  defaultOpen?: boolean;
  phase?: "before" | "live";
}) {

  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);
  // One section open at a time so the form never feels like a wall of fields.
  const [openSection, setOpenSection] = useState<string | null>(null);

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

  const firstName = providerName.replace(/^(Dr\.|Coach|Ms\.|Mr\.)\s+/i, "").split(" ")[0];
  const providerLabel = /^(Dr\.|Coach)/i.test(providerName)
    ? `${providerName.split(" ")[0]} ${firstName}`
    : firstName;

  const highlight = !progress.complete;
  const shell = [
    "rounded-[12px] p-5",
    variant === "inline" ? "bg-[#FBF9FF]" : "bg-white shadow-[0_8px_24px_-12px_rgba(61,46,107,0.10)]",
    highlight
      ? "border border-[#D8C7F0] ring-1 ring-[#EAE7F5] border-l-4 border-l-[#7E6BAF]"
      : "border border-[#D8C7F0]",
  ].join(" ");

  return (
    <section className={shell}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
            {progress.complete
              ? "Intake form · shared with your provider"
              : phase === "live"
                ? `Intake form · session in progress · about ${progress.minutes} min`
                : `Intake form · before your session · about ${progress.minutes} min`}
          </p>
          <h3 className="mt-1 text-base font-semibold text-[#3D2E6B]">
            {progress.complete
              ? `${providerLabel} has what they need`
              : phase === "live"
                ? `You can still share this with ${providerLabel}`
                : `Your intake form for ${providerLabel}`}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#7E6BAF]">
            {progress.complete
              ? `Your intake details are with ${providerLabel}${sessionLabel ? ` for ${sessionLabel}` : ""}. You can update them any time before you meet.`
              : phase === "live"
                ? `Your session is underway. If you didn't get to this beforehand, you can fill it in now — ${providerLabel} sees your answers straight away and can go through them with you.`
                : `These are the details every clinician records before a first session — your name and date of birth, how to reach you, who to contact in an emergency, and what brings you in. It takes about ${progress.minutes} minutes, and your session can then focus on you instead of paperwork.`}
          </p>

          {progress.answered > 0 && !progress.complete && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#7E6BAF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7E6BAF] ring-4 ring-[#7E6BAF]/10" /> {progress.answered} of {progress.total} already filled in
            </p>
          )}
          {progress.answered === 0 && progress.prefilled > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F0EAFB] px-2.5 py-1 text-[11px] font-semibold text-[#7E6BAF]">
              {progress.prefilled} answer
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
            <>Fill in my intake form</>
          )}
        </button>
        {!open && progress.prefilled > 0 && (
          <button
            onClick={() => {
              applyAllPrefill(appointmentId, providerName);
              setOpen(true);
              toast.success(
                `${progress.prefilled} answer${progress.prefilled === 1 ? "" : "s"} added from your Health Passport`,
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#D8C7F0] bg-white px-4 py-2 text-sm font-medium text-[#3D2E6B] transition hover:bg-[#FBF9FF]"
          >
            Use my Health Passport
          </button>
        )}
      </div>

      {open && (
        <div className="mt-5 border-t border-[#EAE7F5] pt-4">
          {/* Section steps — answer in any order, tap a header to open it. */}
          <div className="space-y-2">
            {progress.templates.map((template, idx) => {
              const fields = progress.fields.filter((f) => f.template.id === template.id);
              const done = fields.filter((f) => f.answered || f.skipped).length;
              const complete = fields.length > 0 && done === fields.length;
              const isOpen = openSection === template.id;
              return (
                <div
                  key={template.id}
                  className={`overflow-hidden rounded-[10px] border transition ${
                    isOpen ? "border-[#D8C7F0] bg-white" : "border-[#EAE7F5] bg-[#FDFCFF]"
                  }`}
                >
                  <button
                    onClick={() => setOpenSection(isOpen ? null : template.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#FBF9FF]"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        complete
                          ? "bg-[#F0EAFB] text-[#7E6BAF] ring-4 ring-[#7E6BAF]/10"
                          : "bg-[#F0EAFB] text-[#7E6BAF]"
                      }`}
                    >
                      {complete ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#3D2E6B]">
                        {template.label}
                      </span>
                      {!isOpen && (
                        <span className="block text-xs text-[#7E6BAF]">
                          {complete
                            ? "Done"
                            : done > 0
                              ? `${done} of ${fields.length} answered`
                              : `About ${template.minutes} min`}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#A89BD0] transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#EAE7F5] px-4 py-4">
                      <p className="text-xs leading-relaxed text-[#7E6BAF]">{template.why}</p>
                      <div className="mt-3 space-y-4">
                        {fields.map((state) => (
                          <FieldRow
                            key={state.field.id}
                            appointmentId={appointmentId}
                            state={state}
                          />
                        ))}
                      </div>
                      {idx < progress.templates.length - 1 && (
                        <button
                          onClick={() => setOpenSection(progress.templates[idx + 1].id)}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-[12px] bg-[#3D2E6B] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2C2B4B]"
                        >
                          Next: {progress.templates[idx + 1].label}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <MeasuresBlock providerName={providerName} providerLabel={providerLabel} />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setOpen(false);
                toast.success(
                  progress.complete
                    ? `Everything is shared with ${providerLabel}`
                    : `Saved — ${progress.answered} of ${progress.total} shared with ${providerLabel}`,
                );
              }}
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

/**
 * The standard check-ins this provider tracks (CORE-10, PHQ-9, WSAS…). Ones
 * Lubin runs as guided checks link straight through and score into the Health
 * Passport; the rest are simply flagged as something the clinician will cover.
 */
function MeasuresBlock({
  providerName,
  providerLabel,
}: {
  providerName: string;
  providerLabel: string;
}) {
  const measures = measuresFor(providerName);
  if (measures.length === 0) return null;

  const inApp = measures.filter((m) => m.slug);
  const inSession = measures.filter((m) => !m.slug);

  return (
    <div className="rounded-[10px] border border-[#EAE7F5] bg-white p-4">
      <p className="text-sm font-semibold text-[#3D2E6B]">
        A few short check-ins
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-[#7E6BAF]">
        {providerLabel} tracks progress with the same short questionnaires used
        across the field. Completely optional before you meet — they take a
        minute or two each, and your scores stay in your Health Passport.
      </p>

      {inApp.length > 0 && (
        <ul className="mt-3 space-y-2">
          {inApp.map((m) => {
            const assessment = m.slug ? ASSESSMENTS_BY_SLUG[m.slug] : undefined;
            const done = assessment ? getLatestAttempt(assessment.id) : null;
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[#EAE7F5] bg-[#FDFCFF] p-3"
              >
                <div className="min-w-[200px] flex-1">
                  <p className="text-sm font-medium text-[#3D2E6B]">
                    {assessment?.name ?? m.code}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#7E6BAF]">
                    {m.clientBlurb}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                    {m.code} · {m.items} questions · about {m.minutes} min
                  </p>
                </div>
                {done ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#7E6BAF]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7E6BAF] ring-4 ring-[#7E6BAF]/10" /> Already done
                  </span>
                ) : (
                  <Link
                    to="/self-discovery/$slug"
                    params={{ slug: m.slug! }}
                    className="rounded-[12px] border border-[#D8C7F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D2E6B] transition hover:bg-[#F0EAFB]"
                  >
                    Take it now
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {inSession.length > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-[#7E6BAF]">
          {providerLabel} may also go through{" "}
          {inSession.map((m) => m.code).join(", ")} with you during the session —
          nothing to do beforehand.
        </p>
      )}
    </div>
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
  const [savedAt, setSavedAt] = useState(0);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(state.answer);
  }, [state.answer]);

  const commit = (value: string) => {
    setDraft(value);
    setAnswer(appointmentId, field.id, value);
    setDirty(false);
    setSavedAt(Date.now());
  };

  // Autosave shortly after typing stops, so nothing depends on losing focus.
  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => {
      setAnswer(appointmentId, field.id, draft);
      setDirty(false);
      setSavedAt(Date.now());
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty]);

  const onType = (value: string) => {
    setDraft(value);
    setDirty(true);
  };

  const status = dirty
    ? { text: "Saving…", tone: "text-[#A89BD0]" }
    : savedAt
      ? { text: "Saved", tone: "text-[#2D8E69]" }
      : state.answered
        ? { text: "Shared with your provider", tone: "text-[#2D8E69]" }
        : null;

  return (
    <div className={state.skipped ? "opacity-90" : ""}>
      <div className="flex items-start justify-between gap-3">
        <label className="block text-sm font-medium text-[#3D2E6B]">{field.label}</label>
        {status && (
          <span className={`shrink-0 text-[11px] font-semibold ${status.tone}`}>
            {status.text}
          </span>
        )}
      </div>
      {field.help && <p className="mt-0.5 text-xs text-[#7E6BAF]">{field.help}</p>}

      {state.prefill && !state.answered && (
        <div className="mt-2 rounded-[8px] border border-[#D8C7F0] bg-[#FBF9FF] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
            From your Health Passport · {state.prefill.source}
          </p>
          <p className="mt-1 text-sm text-[#3D2E6B]">{state.prefill.value}</p>
          <button
            onClick={() => {
              commit(state.prefill!.value);
              toast.success("Added to your intake form");
            }}
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
            onChange={(e) => {
              commit(e.target.checked ? "acknowledged" : "");
              toast.success(e.target.checked ? "Saved" : "Removed");
            }}
            className="mt-0.5 h-4 w-4 rounded border-[#D8C7F0] accent-[#7E6BAF]"
          />
          <span>Yes, I've read it</span>
        </label>
      ) : field.type === "choice" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => (
            <button
              key={opt}
              onClick={() => {
                const next = draft === opt ? "" : opt;
                commit(next);
                toast.success(next ? `Saved: ${next}` : "Answer cleared");
              }}
              className={`rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition ${
                draft === opt
                  ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                  : "border-[#D8C7F0] bg-white text-[#3D2E6B] hover:bg-[#F0EAFB]"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : field.type === "short-text" ||
        field.type === "date" ||
        field.type === "tel" ||
        field.type === "email" ? (
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
          value={draft}
          onChange={(e) => onType(e.target.value)}
          onBlur={() => dirty && commit(draft)}
          placeholder={field.placeholder}
          className="mt-2 w-full rounded-[8px] border border-[#EAE7F5] bg-white px-3 py-2 text-sm text-[#3D2E6B] outline-none transition placeholder:text-[#A89BD0] focus:border-[#A89BD0]"
        />
      ) : (
        <div className="mt-2">
          {/* One-tap starters — fills the box so most people never type at all. */}
          {field.suggestions && field.suggestions.length > 0 && !state.prefill && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {field.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    commit(s);
                    toast.success("Saved — tap the text to fine-tune it");
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    draft === s
                      ? "border-[#7E6BAF] bg-[#7E6BAF] text-white"
                      : "border-[#D8C7F0] bg-[#FBF9FF] text-[#3D2E6B] hover:bg-[#F0EAFB]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={draft}
            onChange={(e) => onType(e.target.value)}
            onBlur={() => dirty && commit(draft)}
            rows={2}
            placeholder={field.placeholder}
            className="w-full rounded-[8px] border border-[#EAE7F5] bg-white px-3 py-2 text-sm leading-relaxed text-[#3D2E6B] outline-none transition placeholder:text-[#A89BD0] focus:border-[#A89BD0]"
          />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            toggleSkip(appointmentId, field.id);
            setSavedAt(Date.now());
            setDirty(false);
            toast.success(
              state.skipped
                ? "Cleared — you can write your own answer"
                : "Noted — your provider will bring this up in the session",
            );
          }}
          className="text-xs font-medium text-[#7E6BAF] underline-offset-4 transition hover:text-[#3D2E6B] hover:underline"
        >
          {state.skipped
            ? "Actually, I'll answer this"
            : "I'd rather talk about this in person"}
        </button>
        {state.skipped && (
          <span className="inline-flex items-center rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8A5A12]">
            Will discuss in session
          </span>
        )}
        {state.fromPassport && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F0EAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
            <Sparkles className="h-3 w-3" /> From Health Passport
          </span>
        )}
      </div>
    </div>
  );
}

