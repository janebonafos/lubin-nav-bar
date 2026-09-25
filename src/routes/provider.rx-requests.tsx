import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  FilePenLine,
  Lightbulb,
  MessageSquare,
  Pill,
  RotateCcw,
  Send,
  ShieldAlert,
  Signpost,
  Sparkles,
  X,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import {
  CHAT_RX_REQUESTS,
  DRAFT_FIELD_LABELS,
  emptyResponse,
  loadResponses,
  resetResponses,
  responseStatus,
  saveResponse,
  subscribeResponses,
  type ChatRxRequest,
  type ChatRxResponse,
  type ChatRxStatus,
  type DraftFields,
  type NextStepKind,
} from "@/lib/prescription/chatRequests";
import { MEDICATION_CATALOGUE } from "@/lib/prescription/catalogue";
import { loadIdentity } from "@/lib/prescription/credentials";

export const Route = createFileRoute("/provider/rx-requests")({
  head: () => ({
    meta: [
      { title: "Prescription requests from chat — Lubin" },
      {
        name: "description",
        content:
          "Review prescription and renewal requests clients sent through Lubin chat, then respond with questions, a prescription, or advice.",
      },
      { property: "og:title", content: "Prescription requests from chat — Lubin" },
      {
        property: "og:description",
        content: "Provider review queue for chat-originated prescription requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RxRequestsPage,
});

const fmt = (t: number) =>
  new Date(t).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

const STATUS_STYLE: Record<ChatRxStatus, string> = {
  New: "bg-[#EDE6FA] text-[#3D2E6B]",
  Draft: "bg-[#F4F1FA] text-[#7E6BAF] border border-dashed border-[#C9B8EA]",
  Sent: "bg-[#E4F0FB] text-[#1F4F7A]",
  "Waiting for patient": "bg-[#FFF3DC] text-[#7A5410]",
  Signed: "bg-[#E6F4EA] text-[#1F6B3A]",
  Delivered: "bg-[#1F6B3A] text-white",
};

function useResponses() {
  const [all, setAll] = useState<Record<string, ChatRxResponse>>({});
  useEffect(() => {
    const sync = () => setAll(loadResponses());
    sync();
    return subscribeResponses(sync);
  }, []);
  return all;
}

function RxRequestsPage() {
  const all = useResponses();
  const [selected, setSelected] = useState(CHAT_RX_REQUESTS[0].id);
  const req = CHAT_RX_REQUESTS.find((r) => r.id === selected)!;

  return (
    <div className="min-h-screen bg-[#F0EAFB]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <Link
          to="/provider/appointments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#7E6BAF] hover:text-[#3D2E6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Appointments
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D2E6B] text-white">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-[#3D2E6B] sm:text-3xl">
                Prescription requests from chat
              </h1>
              <p className="mt-1 text-sm text-[#7E6BAF]">
                Clients asked for these through Lubin chat. Prescriptions you write during an
                appointment stay in that appointment.
              </p>
            </div>
          </div>
          <button
            onClick={resetResponses}
            className="self-start rounded-[10px] border border-[#D8C7F0] bg-white px-3 py-2 text-xs font-semibold text-[#7E6BAF] hover:bg-[#FBF9FF]"
          >
            Reset demo
          </button>
        </div>
        <p className="mt-3 rounded-xl border border-[#D8C7F0] bg-white/70 px-4 py-2 text-xs text-[#7E6BAF]">
          Prototype with fictional patients. Nothing is prescribed, sent, or delivered.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-[#7E6BAF]">
              Review queue · {CHAT_RX_REQUESTS.length}
            </p>
            {CHAT_RX_REQUESTS.map((r) => {
              const st = responseStatus(all[r.id] ?? emptyResponse());
              const active = r.id === selected;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-[#3D2E6B] bg-white shadow-sm"
                      : "border-[#E2D6F5] bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[#3D2E6B]">{r.patient.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[st]}`}>
                      {st}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#3D2E6B]/80">
                    {r.kind === "renewal" ? "Renewal" : "New request"} · {r.requestedMedication}
                  </p>
                  <p className="mt-1 text-xs text-[#7E6BAF]">Received {fmt(r.receivedAt)}</p>
                </button>
              );
            })}
          </aside>
          <ReviewPanel key={req.id} req={req} saved={all[req.id]} />
        </div>
      </main>
    </div>
  );
}

function Card({ title, icon, children, tone }: { title: string; icon: React.ReactNode; children: React.ReactNode; tone?: "ai" }) {
  return (
    <section
      className={`rounded-2xl border p-5 ${
        tone === "ai" ? "border-[#C9B8EA] bg-[#F7F3FE]" : "border-[#E2D6F5] bg-white"
      }`}
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#3D2E6B]">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function ReviewPanel({ req, saved }: { req: ChatRxRequest; saved?: ChatRxResponse }) {
  const r = saved ?? emptyResponse();
  const [showChat, setShowChat] = useState(false);
  const update = (patch: (x: ChatRxResponse) => ChatRxResponse) =>
    saveResponse(req.id, patch(structuredClone(r)));
  const status = responseStatus(r);
  const locked = !!r.draft.signedAt;

  return (
    <div className="space-y-4">
      {/* Patient */}
      <section className="rounded-2xl border border-[#E2D6F5] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EDE6FA] px-2.5 py-1 text-[11px] font-semibold text-[#3D2E6B]">
              <MessageSquare className="h-3 w-3" /> From chat request ·{" "}
              {req.kind === "renewal" ? "Renewal" : "New prescription"}
            </span>
            <h2 className="mt-2 text-xl font-bold text-[#3D2E6B]">{req.patient.name}</h2>
            <p className="text-sm text-[#7E6BAF]">
              Born {req.patient.dob} · {req.patient.ageYears} yrs · {req.patient.sex}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>{status}</span>
        </div>
        <div className="mt-3">
          {req.patient.verification ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1F6B3A]">
              <BadgeCheck className="h-4 w-4" /> Identity verified · {req.patient.verification.method} ·{" "}
              {fmt(req.patient.verification.at)}
            </p>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7A5410]">
              <ShieldAlert className="h-4 w-4" /> Identity not verified
            </p>
          )}
        </div>
      </section>

      {/* Summary */}
      <Card title="AI-generated summary" icon={<Sparkles className="h-4 w-4 text-[#7E6BAF]" />} tone="ai">
        <p className="text-sm leading-relaxed text-[#3D2E6B]">{req.chatSummary}</p>
        <button
          onClick={() => setShowChat((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#3D2E6B] underline-offset-2 hover:underline"
        >
          {showChat ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showChat ? "Hide conversation" : "View relevant conversation"}
        </button>
        {showChat && (
          <div className="mt-3 space-y-2 rounded-xl bg-white p-3">
            {req.conversation.map((m, i) => (
              <div key={i} className={`flex ${m.from === "client" ? "justify-end" : ""}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.from === "client" ? "bg-[#3D2E6B] text-white" : "bg-[#F4F1FA] text-[#3D2E6B]"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase opacity-70">
                    {m.from === "client" ? req.patient.name : "Lubin assistant"}
                  </p>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Intake answers" icon={<FilePenLine className="h-4 w-4 text-[#7E6BAF]" />}>
          <dl className="space-y-2 text-sm">
            {req.intake.map((x) => (
              <div key={x.q}>
                <dt className="text-xs text-[#7E6BAF]">{x.q}</dt>
                <dd className="text-[#3D2E6B]">{x.a}</dd>
              </div>
            ))}
          </dl>
          {req.currentMedications.length > 0 && (
            <div className="mt-3 border-t border-[#EFE8FA] pt-3">
              <p className="text-xs text-[#7E6BAF]">Current medications (from Health Passport)</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[#3D2E6B]">
                {req.currentMedications.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <Card title="Allergies" icon={<AlertTriangle className="h-4 w-4 text-[#7E6BAF]" />}>
          {req.allergyState === "not-documented" ? (
            <p className="rounded-xl bg-[#FFF3DC] px-3 py-2 text-sm text-[#7A5410]">
              Not documented — do not assume none. Ask the patient before prescribing.
            </p>
          ) : req.allergyState === "none-known" ? (
            <p className="text-sm text-[#3D2E6B]">Patient reports no known allergies.</p>
          ) : (
            <ul className="space-y-2">
              {req.allergies.map((a) => (
                <li key={a.id} className="rounded-xl border border-[#EFE8FA] p-3 text-sm">
                  <p className="font-semibold text-[#3D2E6B]">{a.name}</p>
                  <p className="text-[#3D2E6B]/80">
                    Reaction: {a.reaction ?? "not recorded"} · {a.severity ?? "severity unknown"}
                  </p>
                  <p className="mt-1 text-xs text-[#7E6BAF]">
                    {a.reviewStatus === "clinician-reviewed" ? "Reviewed by a clinician" : "Patient-reported · not yet reviewed"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="AI considerations" icon={<Lightbulb className="h-4 w-4 text-[#7E6BAF]" />} tone="ai">
        <p className="mb-2 text-xs text-[#7E6BAF]">Read-only. Nothing here changes the prescription.</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[#3D2E6B]">
          {req.ai.reasoning.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[#7A5410]">Check before deciding</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#7A5410]">
          {req.ai.missing.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </Card>

      {/* Response */}
      <section className="rounded-2xl border-2 border-[#3D2E6B] bg-white p-5">
        <h3 className="text-lg font-bold text-[#3D2E6B]">Response to patient</h3>
        <p className="text-sm text-[#7E6BAF]">Use any combination. Each part is sent to {req.patient.name} separately.</p>
        <div className="mt-4 space-y-3">
          <QuestionsSection req={req} r={r} update={update} locked={locked} />
          <DraftSection req={req} r={r} update={update} />
          <AdviceSection r={r} update={update} />
          <NextStepSection r={r} update={update} locked={locked} />
        </div>
      </section>
    </div>
  );
}

type Upd = (patch: (x: ChatRxResponse) => ChatRxResponse) => void;

function Section({
  icon,
  title,
  badge,
  open,
  onToggle,
  addLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E2D6F5]">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#3D2E6B]">
          {icon} {title} {badge}
        </div>
        <button onClick={onToggle} className="text-xs font-semibold text-[#3D2E6B] hover:underline">
          {open ? "Close" : addLabel}
        </button>
      </div>
      {open && <div className="border-t border-[#EFE8FA] px-4 py-4">{children}</div>}
    </div>
  );
}

const Pill_ = ({ children, cls }: { children: React.ReactNode; cls: string }) => (
  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>
);
const btn = "inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${btn} bg-[#3D2E6B] text-white hover:bg-[#2E2254]`;
const secondary = `${btn} border border-[#D8C7F0] bg-white text-[#3D2E6B] hover:bg-[#FBF9FF]`;
const input = "w-full rounded-[10px] border border-[#D8C7F0] bg-white px-3 py-2 text-sm text-[#3D2E6B] focus:border-[#3D2E6B] focus:outline-none disabled:bg-[#F7F4FC]";

function QuestionsSection({ req, r, update, locked }: { req: ChatRxRequest; r: ChatRxResponse; update: Upd; locked: boolean }) {
  const q = r.questions;
  const badge = q.sentAt ? (
    q.reply ? <Pill_ cls="bg-[#E6F4EA] text-[#1F6B3A]">Patient replied</Pill_> : <Pill_ cls="bg-[#FFF3DC] text-[#7A5410]">Waiting for patient</Pill_>
  ) : q.text.trim() ? (
    <Pill_ cls="bg-[#F4F1FA] text-[#7E6BAF]">Draft · not sent</Pill_>
  ) : null;
  return (
    <Section
      icon={<CircleHelp className="h-4 w-4" />}
      title="Questions for the patient"
      badge={badge}
      open={q.open}
      onToggle={() => update((x) => ({ ...x, questions: { ...x.questions, open: !x.questions.open } }))}
      addLabel={q.text || q.sentAt ? "Open" : "Add questions"}
    >
      <textarea
        rows={3}
        disabled={!!q.sentAt || locked}
        value={q.text}
        placeholder="e.g. When did you last see a doctor about this medicine?"
        onChange={(e) => update((x) => ({ ...x, questions: { ...x.questions, text: e.target.value } }))}
        className={input}
      />
      {q.sentAt ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs text-[#7E6BAF]">Sent {fmt(q.sentAt)} · replies return to this review.</p>
          {q.reply ? (
            <div className="rounded-xl bg-[#F4F1FA] p-3">
              <p className="text-[10px] font-semibold uppercase text-[#7E6BAF]">{req.patient.name} · {fmt(q.reply.at)}</p>
              <p className="text-[#3D2E6B]">{q.reply.text}</p>
            </div>
          ) : (
            <button
              className={secondary}
              onClick={() =>
                update((x) => ({
                  ...x,
                  questions: {
                    ...x.questions,
                    reply: {
                      text:
                        req.allergyState === "not-documented"
                          ? "No allergies that I know of. I drink a beer on weekends, no snoring that I know."
                          : "My last video check-in with Dr. Reyes was in June.",
                      at: Date.now(),
                    },
                  },
                }))
              }
            >
              Simulate patient reply (demo)
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            className={primary}
            disabled={!q.text.trim() || locked}
            onClick={() => update((x) => (x.questions.sentAt ? x : { ...x, questions: { ...x.questions, sentAt: Date.now() } }))}
          >
            <Send className="h-4 w-4" /> Send questions
          </button>
          {q.text && (
            <button className={secondary} onClick={() => update((x) => ({ ...x, questions: { open: false, text: "" } }))}>
              Remove
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

const REQUIRED: (keyof DraftFields)[] = Object.keys(DRAFT_FIELD_LABELS) as (keyof DraftFields)[];

function DraftSection({ req, r, update }: { req: ChatRxRequest; r: ChatRxResponse; update: Upd }) {
  const d = r.draft;
  const f = d.fields;
  const signed = !!d.signedAt;
  const [confirming, setConfirming] = useState(false);
  const cat = MEDICATION_CATALOGUE.find((c) => c.name === f.medicine);
  const missing = REQUIRED.filter((k) => !f[k].trim());
  const unsentQuestions = !!r.questions.text.trim() && !r.questions.sentAt;
  const setField = (k: keyof DraftFields, v: string) =>
    update((x) => ({ ...x, draft: { ...x.draft, fields: { ...x.draft.fields, [k]: v } } }));

  const sugFill = useMemo(() => {
    const s = req.suggestion ?? {};
    return (Object.keys(s) as (keyof DraftFields)[]).filter((k) => s[k] && !f[k].trim());
  }, [req.suggestion, f]);

  const applySuggestion = () =>
    update((x) => {
      const before = { ...x.draft.fields };
      const next = { ...before };
      sugFill.forEach((k) => (next[k] = req.suggestion![k]!));
      return { ...x, draft: { ...x.draft, fields: next, aiFilled: { fields: sugFill, before } } };
    });

  const deliver = () => {
    update((x) => ({ ...x, draft: { ...x.draft, delivery: "delivering" } }));
    setTimeout(() => {
      const cur = loadResponses()[req.id] ?? r;
      const fail = req.failFirstDelivery && cur.draft.deliveryAttempts === 0;
      saveResponse(req.id, {
        ...cur,
        draft: {
          ...cur.draft,
          delivery: fail ? "failed" : "delivered",
          deliveryAttempts: cur.draft.deliveryAttempts + 1,
          deliveredAt: fail ? undefined : Date.now(),
        },
      });
    }, 900);
  };

  const badge = d.delivery === "delivered" ? (
    <Pill_ cls="bg-[#1F6B3A] text-white">Delivered to patient</Pill_>
  ) : signed ? (
    <Pill_ cls="bg-[#E6F4EA] text-[#1F6B3A]">Signed · not yet delivered</Pill_>
  ) : Object.values(f).some((v) => v.trim()) ? (
    <Pill_ cls="bg-[#F4F1FA] text-[#7E6BAF]">Draft</Pill_>
  ) : null;

  const identity = typeof window !== "undefined" ? loadIdentity() : null;
  const licence = req.country === "PH" ? identity?.prcNumber : identity?.licenseNumber;

  return (
    <Section
      icon={<Pill className="h-4 w-4" />}
      title="Prescription draft"
      badge={badge}
      open={d.open}
      onToggle={() => update((x) => ({ ...x, draft: { ...x.draft, open: !x.draft.open } }))}
      addLabel={badge ? "Open" : "Add prescription"}
    >
      {!signed && req.suggestion && (sugFill.length > 0 || d.aiFilled) && (
        <div className="mb-4 rounded-xl border border-[#C9B8EA] bg-[#F7F3FE] p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-[#3D2E6B]">
            <Sparkles className="h-4 w-4" /> AI suggestion: {req.suggestion.medicine} {req.suggestion.strength}
          </p>
          {sugFill.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-[#7E6BAF]">
                Will fill only empty fields: {sugFill.map((k) => DRAFT_FIELD_LABELS[k]).join(", ")}. Nothing you typed is overwritten.
              </p>
              <button className={`${secondary} mt-2`} onClick={applySuggestion}>
                Add to empty fields
              </button>
            </>
          ) : (
            <p className="mt-1 text-xs text-[#7E6BAF]">Added to: {d.aiFilled!.fields.map((k) => DRAFT_FIELD_LABELS[k]).join(", ")}.</p>
          )}
          {d.aiFilled && (
            <button
              className="mt-2 ml-2 inline-flex items-center gap-1 text-xs font-semibold text-[#3D2E6B] hover:underline"
              onClick={() => update((x) => ({ ...x, draft: { ...x.draft, fields: x.draft.aiFilled!.before, aiFilled: undefined } }))}
            >
              <RotateCcw className="h-3 w-3" /> Undo
            </button>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Medicine">
          <select disabled={signed} value={f.medicine} onChange={(e) => setField("medicine", e.target.value)} className={input}>
            <option value="">Choose from catalogue</option>
            {MEDICATION_CATALOGUE.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Strength & form">
          <select disabled={signed || !cat} value={f.strength} onChange={(e) => setField("strength", e.target.value)} className={input}>
            <option value="">{cat ? "Choose" : "Choose a medicine first"}</option>
            {(cat?.forms ?? (f.strength ? [f.strength] : [])).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        {(["dose", "route", "frequency", "duration", "quantity"] as const).map((k) => (
          <Field key={k} label={DRAFT_FIELD_LABELS[k]}>
            <input disabled={signed} value={f[k]} onChange={(e) => setField(k, e.target.value)} className={input} />
          </Field>
        ))}
      </div>
      <div className="mt-3 grid gap-3">
        <Field label="Assessment">
          <textarea rows={2} disabled={signed} value={f.assessment} onChange={(e) => setField("assessment", e.target.value)} className={input} />
        </Field>
        <Field label="Follow-up plan">
          <textarea rows={2} disabled={signed} value={f.followUp} onChange={(e) => setField("followUp", e.target.value)} className={input} />
        </Field>
      </div>

      {!signed && (
        <div className="mt-4 space-y-2">
          {missing.length > 0 && (
            <p className="text-xs text-[#7A5410]">Still needed to sign: {missing.map((k) => DRAFT_FIELD_LABELS[k]).join(", ")}</p>
          )}
          {unsentQuestions && (
            <p className="text-xs text-[#7A5410]">You have unsent questions. Send or remove them before signing.</p>
          )}
          <button className={primary} disabled={missing.length > 0 || unsentQuestions} onClick={() => setConfirming(true)}>
            <FilePenLine className="h-4 w-4" /> Review and sign
          </button>
        </div>
      )}

      {confirming && !signed && (
        <SignConfirm
          req={req}
          f={f}
          prescriber={identity?.fullName || ""}
          licence={licence || ""}
          clinic={identity?.clinicName || ""}
          onCancel={() => setConfirming(false)}
          onSign={() => {
            setConfirming(false);
            update((x) => (x.draft.signedAt ? x : { ...x, draft: { ...x.draft, signedAt: Date.now() } }));
          }}
        />
      )}

      {signed && (
        <div className="mt-4 space-y-2 rounded-xl bg-[#F4F9F5] p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-[#1F6B3A]">
            <Check className="h-4 w-4" /> Signed {fmt(d.signedAt!)}
          </p>
          {d.delivery === "delivered" ? (
            <p className="text-[#1F6B3A]">Delivered to {req.patient.name} {fmt(d.deliveredAt!)}</p>
          ) : d.delivery === "failed" ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[#9B2C2C]">Delivery failed. The signed prescription is safe; the patient hasn't received it.</p>
              <button className={secondary} onClick={deliver}>
                <RotateCcw className="h-4 w-4" /> Retry delivery
              </button>
            </div>
          ) : (
            <button className={primary} disabled={d.delivery === "delivering"} onClick={deliver}>
              <Send className="h-4 w-4" /> {d.delivery === "delivering" ? "Delivering…" : "Deliver to patient"}
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#7E6BAF]">{label}</span>
      {children}
    </label>
  );
}

function SignConfirm({
  req,
  f,
  prescriber,
  licence,
  clinic,
  onCancel,
  onSign,
}: {
  req: ChatRxRequest;
  f: DraftFields;
  prescriber: string;
  licence: string;
  clinic: string;
  onCancel: () => void;
  onSign: () => void;
}) {
  const [ok, setOk] = useState(false);
  const empty = <span className="italic text-[#9B2C2C]">Not on file</span>;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1333]/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-[#3D2E6B]">Confirm and sign</h4>
          <button onClick={onCancel} aria-label="Close">
            <X className="h-5 w-5 text-[#7E6BAF]" />
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-[#E2D6F5] p-4 text-sm text-[#3D2E6B]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7E6BAF]">Prescription preview · from chat request</p>
          <p className="mt-2 font-semibold">{prescriber || empty}</p>
          <p className="text-xs">{req.country === "PH" ? "PRC no." : "Licence no."} {licence || empty}</p>
          <p className="text-xs">{clinic || empty}</p>
          <hr className="my-3 border-[#EFE8FA]" />
          <p>Patient: {req.patient.name} · {req.patient.ageYears} yrs · {req.patient.sex}</p>
          <p className="mt-2 font-semibold">{f.medicine} {f.strength}</p>
          <p>{f.dose}, {f.route}, {f.frequency} for {f.duration} · Qty {f.quantity}</p>
          <p className="mt-2 text-xs text-[#7E6BAF]">Assessment: {f.assessment}</p>
          <p className="text-xs text-[#7E6BAF]">Follow-up: {f.followUp}</p>
        </div>
        {(!prescriber || !licence) && (
          <p className="mt-3 text-xs text-[#9B2C2C]">
            Your prescriber details are incomplete. Add them in prescribing verification before signing.
          </p>
        )}
        <label className="mt-4 flex items-start gap-2 text-sm text-[#3D2E6B]">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1" />
          I reviewed this request and the patient's information, and I take responsibility for this prescription.
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button className={secondary} onClick={onCancel}>Cancel</button>
          <button className={primary} disabled={!ok || !prescriber || !licence} onClick={onSign}>
            Sign prescription
          </button>
        </div>
      </div>
    </div>
  );
}

function AdviceSection({ r, update }: { r: ChatRxResponse; update: Upd }) {
  const a = r.advice;
  return (
    <Section
      icon={<Lightbulb className="h-4 w-4" />}
      title="Advice and next steps"
      badge={a.sentAt ? <Pill_ cls="bg-[#E4F0FB] text-[#1F4F7A]">Sent</Pill_> : a.text.trim() ? <Pill_ cls="bg-[#F4F1FA] text-[#7E6BAF]">Draft · not sent</Pill_> : null}
      open={a.open}
      onToggle={() => update((x) => ({ ...x, advice: { ...x.advice, open: !x.advice.open } }))}
      addLabel={a.text ? "Open" : "Add advice"}
    >
      <textarea
        rows={3}
        disabled={!!a.sentAt}
        value={a.text}
        placeholder="e.g. Avoid coffee after noon and keep a regular wake-up time."
        onChange={(e) => update((x) => ({ ...x, advice: { ...x.advice, text: e.target.value } }))}
        className={input}
      />
      {a.sentAt ? (
        <p className="mt-2 text-xs text-[#7E6BAF]">Sent {fmt(a.sentAt)}</p>
      ) : (
        <button
          className={`${primary} mt-3`}
          disabled={!a.text.trim()}
          onClick={() => update((x) => (x.advice.sentAt ? x : { ...x, advice: { ...x.advice, sentAt: Date.now() } }))}
        >
          <Send className="h-4 w-4" /> Send advice
        </button>
      )}
    </Section>
  );
}

const NEXT: Record<NextStepKind, string> = {
  consultation: "Book a consultation",
  referral: "Referral to another provider",
  other: "Other care",
};

function NextStepSection({ r, update, locked }: { r: ChatRxResponse; update: Upd; locked: boolean }) {
  const n = r.nextStep;
  return (
    <Section
      icon={<Signpost className="h-4 w-4" />}
      title="Recommend another next step"
      badge={n.sentAt ? <Pill_ cls="bg-[#E4F0FB] text-[#1F4F7A]">Sent · no prescription</Pill_> : null}
      open={n.open}
      onToggle={() => update((x) => ({ ...x, nextStep: { ...x.nextStep, open: !x.nextStep.open } }))}
      addLabel="Recommend instead"
    >
      <p className="mb-3 text-xs text-[#7E6BAF]">A non-prescribing path. The patient is told no prescription was issued from this request.</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(NEXT) as NextStepKind[]).map((k) => (
          <button
            key={k}
            disabled={!!n.sentAt}
            onClick={() => update((x) => ({ ...x, nextStep: { ...x.nextStep, kind: k } }))}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              n.kind === k ? "border-[#3D2E6B] bg-[#3D2E6B] text-white" : "border-[#D8C7F0] text-[#3D2E6B]"
            }`}
          >
            {NEXT[k]}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        disabled={!!n.sentAt}
        value={n.note}
        placeholder="Why, and what the patient should do next"
        onChange={(e) => update((x) => ({ ...x, nextStep: { ...x.nextStep, note: e.target.value } }))}
        className={`${input} mt-3`}
      />
      {n.sentAt ? (
        <p className="mt-2 text-xs text-[#7E6BAF]">Sent {fmt(n.sentAt)} · {NEXT[n.kind]}</p>
      ) : locked ? (
        <p className="mt-2 text-xs text-[#7E6BAF]">A prescription was already signed for this request.</p>
      ) : (
        <button
          className={`${primary} mt-3`}
          disabled={!n.note.trim()}
          onClick={() => update((x) => (x.nextStep.sentAt ? x : { ...x, nextStep: { ...x.nextStep, sentAt: Date.now() } }))}
        >
          <Send className="h-4 w-4" /> Send recommendation
        </button>
      )}
    </Section>
  );
}
