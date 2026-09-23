import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, FileText, History, Lock, Paperclip, ShieldCheck, X } from "lucide-react";

import {
  differsFromRegistration,
  passportNameProblem,
  type PassportHolder,
} from "@/lib/passport/holder";
import {
  NAME_CHANGE_REASONS,
  NAME_DOCUMENT_EXAMPLES,
  NAME_HISTORY_EVENT,
  formatNameChangeDate,
  loadNameHistory,
  recordLegalName,
  type NameChange,
  type NameChangeReason,
} from "@/lib/passport/nameHistory";

const INPUT =
  "w-full rounded-xl border border-brand-purple/15 bg-white px-3.5 py-3 text-sm text-brand-purple-dark placeholder:text-brand-purple-dark/35 outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15";

function changedBy(holder: PassportHolder): string {
  return holder.isProxy && holder.relationshipLabel ? `You · ${holder.relationshipLabel}` : "You";
}

/**
 * The legal name on the passport. Free to add the first time; afterwards it is
 * read-only and can only be corrected or updated through a recorded change
 * that keeps the earlier name. The person the passport belongs to never changes.
 */
export default function PassportNameField({
  holder,
  value,
}: {
  holder: PassportHolder;
  value: string;
}) {
  const [draft, setDraft] = useState("");
  const [touched, setTouched] = useState(false);
  const [dialog, setDialog] = useState<null | { prefill: string }>(null);
  const [history, setHistory] = useState<NameChange[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const refresh = () => setHistory(loadNameHistory());
    refresh();
    window.addEventListener(NAME_HISTORY_EVENT, refresh);
    return () => window.removeEventListener(NAME_HISTORY_EVENT, refresh);
  }, []);

  const person = holder.firstName ?? "the person you care for";
  const label = holder.isProxy ? `${person}'s full legal name` : "Full legal name";
  const current = value.trim();

  if (!current) {
    const problem = draft.trim() ? passportNameProblem(draft, holder) : null;
    const mismatch = !problem && draft.trim() && differsFromRegistration(draft, holder);
    const canSave = Boolean(draft.trim()) && !problem && !mismatch;
    return (
      <div className="sm:col-span-2">
        <label className="block">
          <span className="mb-2 block text-[13px] font-semibold text-brand-purple-dark/85">
            {label}
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={draft}
              maxLength={80}
              placeholder="First, middle, last"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => setTouched(true)}
              className={INPUT}
            />
            <button
              type="button"
              disabled={!canSave}
              onClick={() => {
                recordLegalName({ to: draft, reason: "first-entry", by: changedBy(holder) });
                setDraft("");
                setTouched(false);
              }}
              className="shrink-0 rounded-xl bg-brand-purple px-4 py-3 text-[13px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save name
            </button>
          </div>
        </label>
        <p className="mt-2 text-[12px] leading-relaxed text-brand-purple-dark/55">
          {holder.isProxy
            ? `Use the name on ${person}'s birth certificate or ID — not yours. Nicknames go in Preferred name.`
            : "Use the name on your ID. Nicknames go in Preferred name."}
        </p>
        {problem && (touched || draft.trim().length > 1) && (
          <p className="mt-2 text-[12px] font-medium text-destructive">{problem}</p>
        )}
        {mismatch && holder.registeredName && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-brand-purple/20 bg-brand-lavender/60 px-3.5 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
            <div className="text-[12.5px] leading-relaxed text-brand-purple-dark/75">
              This doesn't start with <strong>{holder.registeredName}</strong>, the name you gave
              when you registered. If {holder.registeredName}'s legal name is different, add a
              reason so the clinic can match their records.
              <button
                type="button"
                onClick={() => setDialog({ prefill: draft })}
                className="mt-2 block font-semibold text-brand-purple underline-offset-2 hover:underline"
              >
                Add a reason
              </button>
            </div>
          </div>
        )}
        {dialog && (
          <NameChangeDialog
            holder={holder}
            currentName={holder.registeredName ?? ""}
            prefill={dialog.prefill}
            onClose={() => setDialog(null)}
            onDone={() => {
              setDialog(null);
              setDraft("");
            }}
          />
        )}
      </div>
    );
  }

  const latest = history[0];
  const pending = latest && latest.to === current && latest.status === "awaiting-verification";

  return (
    <div className="sm:col-span-2">
      <span className="mb-2 block text-[13px] font-semibold text-brand-purple-dark/85">{label}</span>
      <div className="rounded-xl border border-brand-purple/15 bg-brand-purple/[0.04] px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-brand-purple-dark">
              <Lock className="h-3.5 w-3.5 shrink-0 text-brand-purple/70" />
              <span className="truncate">{current}</span>
            </p>
            {holder.previousNames.length > 0 && (
              <p className="mt-1 text-[12px] text-brand-purple-dark/55">
                Previously known as {holder.previousNames.join(", ")}
              </p>
            )}
            {pending && (
              <span className="mt-2 inline-flex items-center rounded-lg bg-brand-lavender px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-purple">
                Awaiting verification at next visit
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDialog({ prefill: current })}
            className="shrink-0 rounded-xl border border-brand-purple/20 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-brand-purple-dark transition hover:border-brand-purple/40"
          >
            Correct or update name
          </button>
        </div>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-brand-purple-dark/50">
          Name changes are recorded with a reason and the earlier name is kept, so past visits,
          prescriptions and records still match{holder.isProxy ? ` ${person}` : " you"}.
        </p>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-purple underline-offset-2 hover:underline"
          >
            <History className="h-3.5 w-3.5" />
            {showHistory ? "Hide name history" : `Name history (${history.length})`}
          </button>
        )}
        {showHistory && (
          <ol className="mt-2 space-y-2 border-t border-brand-purple/10 pt-3">
            {history.map((h) => (
              <li key={h.id} className="text-[12px] leading-relaxed text-brand-purple-dark/70">
                <span className="font-semibold text-brand-purple-dark">
                  {h.from ? `${h.from} → ${h.to}` : h.to}
                </span>{" "}
                · {h.reasonLabel} · {h.by} · {formatNameChangeDate(h.at)}
                {h.documentName && (
                  <span className="ml-1 inline-flex items-center gap-1 text-brand-purple-dark/55">
                    · <FileText className="h-3 w-3" /> {h.documentName}
                  </span>
                )}
                {h.status === "awaiting-verification" && (
                  <span className="ml-1 text-brand-purple">· Awaiting verification</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      {dialog && (
        <NameChangeDialog
          holder={holder}
          currentName={current}
          prefill={dialog.prefill}
          onClose={() => setDialog(null)}
          onDone={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function NameChangeDialog({
  holder,
  currentName,
  prefill,
  onClose,
  onDone,
}: {
  holder: PassportHolder;
  currentName: string;
  prefill: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(prefill);
  const [reason, setReason] = useState<Exclude<NameChangeReason, "first-entry"> | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const person = holder.firstName ?? holder.registeredName ?? "this person";
  const problem = name.trim() ? passportNameProblem(name, holder) : "Enter the new name.";
  const unchanged = name.trim().toLowerCase() === currentName.trim().toLowerCase() && Boolean(currentName);
  const rule = NAME_CHANGE_REASONS.find((r) => r.value === reason);
  const needsDoc = Boolean(rule?.needsDocument);
  const ready = !problem && !unchanged && reason && (!needsDoc || documentName) && confirmed;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-brand-purple-dark/55 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-change-title"
        className="font-body w-full max-w-lg rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-purple/10 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple/70">
              Recorded name change
            </p>
            <h3 id="name-change-title" className="mt-1 text-[17px] font-bold text-brand-purple-dark">
              {holder.isProxy ? `Correct or update ${person}'s name` : "Correct or update your name"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[10px] p-1.5 text-brand-purple hover:bg-brand-lavender"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-brand-purple/15 bg-brand-purple/[0.04] px-4 py-3">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-purple-dark">
              <ShieldCheck className="h-4 w-4 text-brand-purple" /> How name changes work
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-brand-purple-dark/70">
              <li>
                The passport stays with {person}. Changing the name never moves it, or its visits and
                records, to anyone else.
              </li>
              <li>Every change is recorded with a reason, date and who made it.</li>
              <li>
                The earlier name is kept as "previously known as" so clinics can still match past
                records.
              </li>
              <li>A legal name change needs a supporting document.</li>
              <li>The clinic confirms identity at the next visit.</li>
            </ul>
          </div>

          {currentName && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple/70">
                {holder.legalName ? "Current name" : "Name given at registration"}
              </p>
              <p className="mt-0.5 text-[14px] font-semibold text-brand-purple-dark">{currentName}</p>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-brand-purple-dark/85">
              New full legal name
            </span>
            <input
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              className={INPUT}
            />
            {name.trim() && (problem || unchanged) && (
              <span className="mt-1.5 block text-[12px] font-medium text-destructive">
                {unchanged ? "This is the same as the current name." : problem}
              </span>
            )}
          </label>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-brand-purple-dark/85">Reason</legend>
            <div className="space-y-2">
              {NAME_CHANGE_REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setReason(r.value)}
                    className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-brand-purple bg-brand-purple/[0.06]"
                        : "border-brand-purple/15 hover:border-brand-purple/35"
                    }`}
                  >
                    <span className="block text-[13px] font-semibold text-brand-purple-dark">{r.label}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-brand-purple-dark/60">
                      {r.help}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {reason && (
            <div>
              <p className="mb-1 text-[13px] font-semibold text-brand-purple-dark/85">
                Supporting document {needsDoc ? "(required)" : "(optional)"}
              </p>
              <p className="mb-2 text-[12px] leading-relaxed text-brand-purple-dark/55">
                For example a {NAME_DOCUMENT_EXAMPLES}. Stays on this device in the prototype.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setDocumentName(e.target.files?.[0]?.name ?? null)}
              />
              {documentName ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-purple/15 px-3.5 py-2.5">
                  <span className="inline-flex min-w-0 items-center gap-2 text-[12.5px] text-brand-purple-dark">
                    <FileText className="h-4 w-4 shrink-0 text-brand-purple" />
                    <span className="truncate">{documentName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentName(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="text-[12px] font-semibold text-brand-purple-dark/60 hover:text-brand-purple-dark"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-purple/30 px-3.5 py-2.5 text-[12.5px] font-semibold text-brand-purple hover:bg-brand-lavender/60"
                >
                  <Paperclip className="h-4 w-4" /> Attach document
                </button>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-purple/15 bg-brand-purple/[0.04] p-3.5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-purple"
            />
            <span className="text-[12.5px] leading-relaxed text-brand-purple-dark/75">
              {holder.isProxy
                ? `This is still ${person} — the same person this passport was created for. I'm not replacing them with someone else.`
                : "This is still me — the same person. I'm not replacing myself with someone else."}
            </span>
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-brand-purple/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-[12px] border border-brand-purple/20 px-4 text-[13px] font-semibold text-brand-purple-dark/80 hover:bg-brand-lavender/60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              if (!reason) return;
              recordLegalName({
                to: name,
                reason,
                documentName: documentName ?? undefined,
                by: changedBy(holder),
              });
              onDone();
            }}
            className="inline-flex h-10 items-center rounded-[12px] bg-brand-purple px-5 text-[13px] font-semibold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Record name change
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
