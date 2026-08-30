import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Sparkles } from "lucide-react";
import {
  emptySoapNote,
  isSoapNoteEmpty,
  loadSoapNote,
  saveSoapNote,
  soapNoteComplete,
  soapNoteToText,
  type SoapNote,
} from "@/lib/clinical/soapNotes";

export type SoapAiContext = {
  patientContext?: { firstName?: string; age?: number; sex?: string };
  caseNotes?: string;
  presenting?: string;
  observations?: string;
  plan?: string;
  currentMedications?: { name: string; dose?: string; frequency?: string }[];
  allergies?: string;
  assessments?: { name: string; score?: number; statusLabel?: string }[];
  country?: "US" | "PH";
};

const FIELDS: {
  key: keyof Pick<SoapNote, "subjective" | "objective" | "assessment" | "plan">;
  letter: string;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "subjective",
    letter: "S",
    label: "Subjective",
    hint: "What the patient reports — concerns, duration, history, relevant negatives.",
    placeholder: "Patient reports…",
  },
  {
    key: "objective",
    letter: "O",
    label: "Objective",
    hint: "What you observed or measured — mental status, exam findings, assessment scores.",
    placeholder: "On examination…",
  },
  {
    key: "assessment",
    letter: "A",
    label: "Assessment",
    hint: "Your clinical impression and differential considerations.",
    placeholder: "Impression…",
  },
  {
    key: "plan",
    letter: "P",
    label: "Plan",
    hint: "Treatment, monitoring, counselling, safety and follow-up.",
    placeholder: "1. …",
  },
];

/**
 * SOAP note documentation with AI assistance, for prescribers only.
 * The AI drafts from supplied context; the clinician edits and owns the note.
 */
export default function SoapNotesPanel({
  recordKey,
  context,
  collapsible = true,
  defaultOpen = true,
  onChange,
}: {
  recordKey: string;
  context: SoapAiContext | (() => SoapAiContext);
  collapsible?: boolean;
  defaultOpen?: boolean;
  onChange?: (note: SoapNote) => void;
}) {
  const [note, setNote] = useState<SoapNote>(emptySoapNote());
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    const loaded = loadSoapNote(recordKey);
    setNote(loaded);
    setSavedAt(loaded.updatedAt ?? null);
    dirty.current = false;
  }, [recordKey]);

  // Auto-save shortly after typing stops.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      const saved = saveSoapNote(recordKey, note);
      setSavedAt(saved.updatedAt ?? Date.now());
      dirty.current = false;
      onChange?.(saved);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, recordKey]);

  const setField = (key: keyof SoapNote, value: string) => {
    dirty.current = true;
    setNote((p) => ({ ...p, [key]: value }));
  };

  const complete = soapNoteComplete(note);
  const empty = isSoapNoteEmpty(note);
  const status = complete ? "Complete" : empty ? "Not started" : "In progress";

  const resolvedContext = useMemo(
    () => (typeof context === "function" ? undefined : context),
    [context],
  );

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const ctx = typeof context === "function" ? context() : (resolvedContext ?? {});
      const res = await fetch("/api/generate-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ctx,
          existing: {
            subjective: note.subjective,
            objective: note.objective,
            assessment: note.assessment,
            plan: note.plan,
          },
        }),
      });
      const data = (await res.json()) as Partial<SoapNote> & { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not draft the note. Try again.");
        return;
      }
      const next: SoapNote = {
        ...note,
        subjective: data.subjective || note.subjective,
        objective: data.objective || note.objective,
        assessment: data.assessment || note.assessment,
        plan: data.plan || note.plan,
        aiAssistedAt: Date.now(),
      };
      setNote(next);
      const saved = saveSoapNote(recordKey, next);
      setSavedAt(saved.updatedAt ?? Date.now());
      dirty.current = false;
      onChange?.(saved);
      setOpen(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(soapNoteToText(note));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  const body = (
    <div className="space-y-4 p-4">
      <div className="rounded-r-xl border border-l-4 border-[#E3DBF5] border-l-[#3D2E6B] bg-white p-4">
        <p className="text-[12.5px] leading-relaxed text-[#5B4B8A]">
          Lubin can draft this note from the case details already on this page. The AI
          is assistive only — it does not diagnose or prescribe. Review and edit every
          line; the note stays yours.
        </p>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-[#3D2E6B] px-4 text-[13px] font-semibold text-white transition hover:bg-[#2A1F4D] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
      >
        <Sparkles className="h-4 w-4" />
        {loading
          ? "Drafting SOAP note…"
          : empty
            ? "Draft SOAP note with AI"
            : "Refine with AI"}
      </button>

      {error && (
        <p className="rounded-[10px] bg-[#FDF2F2] px-3 py-2 text-[12px] font-semibold text-[#9B3B33]">
          {error}
        </p>
      )}

      {FIELDS.map((f) => (
        <div key={f.key}>
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#3D2E6B]">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] bg-[#EFE8FB] text-[11px] font-bold text-[#3D2E6B]">
              {f.letter}
            </span>
            {f.label}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#7E6BAF]">{f.hint}</p>
          <textarea
            value={note[f.key]}
            onChange={(e) => setField(f.key, e.target.value)}
            rows={f.key === "plan" ? 5 : 4}
            placeholder={f.placeholder}
            className="mt-2 w-full rounded-[10px] border border-[#E5DCF5] bg-[#FBF9FF] p-3 text-sm leading-relaxed text-[#3D2E6B] outline-none transition placeholder:text-[#A89BD0] focus:border-[#7E6BAF] focus:bg-white"
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          disabled={empty}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D6CCEC] bg-white px-3 text-[12.5px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F4FB] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy note"}
        </button>
        <p className="text-[12px] text-[#7E6BAF]">
          {savedAt
            ? `Saved ${new Date(savedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
            : "Saves automatically as you type"}
          {note.aiAssistedAt ? " · AI-assisted draft, clinician reviewed" : ""}
        </p>
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <div className="overflow-hidden rounded-[20px] border border-[#EEE6FA] bg-white">
        {body}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-[#EEE6FA] bg-white shadow-[0_10px_30px_-18px_rgba(61,46,107,0.25)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 border-b border-[#F0EAFB] bg-gradient-to-r from-[#F7F1FF] to-[#EFE6FB] px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#3D2E6B]">SOAP note</p>
          <p className="text-[11px] text-[#7E6BAF]">
            Subjective · Objective · Assessment · Plan — for your clinical record
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              complete ? "bg-[#3D2E6B] text-white" : "bg-white/80 text-[#3D2E6B]"
            }`}
          >
            {status}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[#7E6BAF] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && body}
    </div>
  );
}
