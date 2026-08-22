import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  ALL_TEMPLATES,
  addCustomField,
  allFieldsFor,
  getProviderRequest,
  removeCustomField,
  saveProviderRequest,
  subscribeIntake,
  type ProviderRequest,
} from "@/lib/intake/store";
import {
  INTAKE_GROUPS,
  templateById,
  type IntakeGroup,
} from "@/lib/intake/templates";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ClientFormPreview from "@/components/profile/ClientFormPreview";

/**
 * Provider-side: build the client intake form — the standard details clinicians
 * collect before a first session (identification, contact and emergency
 * details, reason for care, clinical background, consent and billing).
 * Sections are picked here; the exact questions in a section — including any the
 * provider writes themselves — are edited in a side drawer to keep this list short.
 */
export default function SessionPrepSection({
  providerName = "You",
}: {
  providerName?: string;
}) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSection, setPreviewSection] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return subscribeIntake(() => setTick((t) => t + 1));
  }, []);

  const request: ProviderRequest = useMemo(
    () =>
      mounted
        ? getProviderRequest(providerName)
        : { templateIds: [], importantIds: [] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [providerName, mounted, tick],
  );

  const update = (next: ProviderRequest) => {
    saveProviderRequest(providerName, next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const excluded = request.excludedFieldIds ?? [];

  const fieldsOf = (templateId: string) => {
    const template = templateById(templateId);
    return template ? allFieldsFor(template, request) : [];
  };

  const activeCountOf = (templateId: string) =>
    fieldsOf(templateId).filter((f) => !excluded.includes(f.id)).length;

  const toggle = (id: string) => {
    const on = request.templateIds.includes(id);
    update({
      ...request,
      templateIds: on
        ? request.templateIds.filter((t) => t !== id)
        : [...request.templateIds, id],
      importantIds: on
        ? request.importantIds.filter((t) => t !== id)
        : request.importantIds,
    });
  };

  const toggleImportant = (id: string) => {
    update({
      ...request,
      importantIds: request.importantIds.includes(id)
        ? request.importantIds.filter((t) => t !== id)
        : [...request.importantIds, id],
    });
  };

  const toggleField = (fieldId: string) => {
    update({
      ...request,
      excludedFieldIds: excluded.includes(fieldId)
        ? excluded.filter((f) => f !== fieldId)
        : [...excluded, fieldId],
    });
  };

  const questionCount = request.templateIds.reduce(
    (sum, id) => sum + activeCountOf(id),
    0,
  );

  const editingTemplate = editing ? templateById(editing) : undefined;
  const customIds = new Set(
    (editing ? request.customFields?.[editing] ?? [] : []).map((f) => f.id),
  );

  const addQuestion = () => {
    if (!editing || !draft.trim()) return;
    addCustomField(providerName, editing, draft);
    setDraft("");
    toast.success("Question added to this section");
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[12px] border border-[#EAE7F5] bg-white shadow-sm">
        <div className="border-b border-[#F0EAFB] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-2xl text-sm leading-relaxed text-[#7E6BAF]">
              Clients see everything you tick below as one short form, prefilled
              from their Health Passport where possible. It never blocks booking
              or joining, and anything left open shows up in your session view so
              you can ask it live.
            </p>
            {saved && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F8F1] px-2.5 py-1 text-[11px] font-semibold text-[#2D8E69]">
                <Check className="h-3 w-3" /> Saved
              </p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#7E6BAF]">
              {request.templateIds.length} section
              {request.templateIds.length === 1 ? "" : "s"} · {questionCount} question
              {questionCount === 1 ? "" : "s"} · shown to clients as one form
            </p>
            <button
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#D8C7F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D2E6B] transition hover:bg-[#F0EAFB]"
            >
              <Eye className="h-3.5 w-3.5" /> Preview client form
            </button>
          </div>
        </div>


        {INTAKE_GROUPS.map((group: IntakeGroup) => {
          const items = ALL_TEMPLATES.filter((t) => t.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="border-b border-[#F0EAFB] last:border-b-0">
              <p className="bg-[#FBF9FF] px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                {group}
              </p>
              <ul>
                {items.map((t, idx) => {
                  const on = request.templateIds.includes(t.id);
                  const important = request.importantIds.includes(t.id);
                  const total = fieldsOf(t.id).length;
                  const active = activeCountOf(t.id);
                  return (
                    <li
                      key={t.id}
                      className={`flex flex-wrap items-start gap-3 p-6 ${
                        idx !== items.length - 1 ? "border-b border-[#F0EAFB]" : ""
                      } ${on ? "bg-[#FDFCFF]" : ""}`}
                    >
                      <label className="flex flex-1 min-w-[240px] items-start gap-3">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(t.id)}
                          className="mt-1 h-4 w-4 rounded border-[#D8C7F0] accent-[#5B4796]"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-[#3D2E6B]">
                            {t.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-[#7E6BAF]">
                            {t.why}
                          </span>
                          <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                            {on ? `${active} of ${total}` : total} question
                            {total === 1 ? "" : "s"} · about {t.minutes} min
                          </span>
                        </span>
                      </label>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          disabled={!on}
                          onClick={() => {
                            setEditing(t.id);
                            setDraft("");
                          }}
                          className="rounded-[12px] border border-[#D8C7F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D2E6B] transition hover:bg-[#F0EAFB] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Edit questions
                        </button>
                        <button
                          disabled={!on}
                          onClick={() => toggleImportant(t.id)}
                          className={`inline-flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            important
                              ? "border-[#5B4796] bg-[#5B4796] text-white"
                              : "border-[#D8C7F0] bg-white text-[#3D2E6B] hover:bg-[#F0EAFB]"
                          }`}
                        >
                          <Star className="h-3.5 w-3.5" />
                          {important ? "Priority" : "Mark as priority"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <Sheet open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {editingTemplate && editing && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[#3D2E6B]">
                  {editingTemplate.label}
                </SheetTitle>
                <SheetDescription className="text-[#7E6BAF]">
                  Untick anything you don't need, or add your own question. Changes
                  save as you go and apply to every client form.
                </SheetDescription>
              </SheetHeader>

              <ul className="mt-6 divide-y divide-[#F6F2FE] rounded-[12px] border border-[#F0EAFB]">
                {fieldsOf(editing).map((f) => {
                  const fieldOn = !excluded.includes(f.id);
                  return (
                    <li key={f.id} className="flex items-start gap-2 px-3 py-3">
                      <label className="flex flex-1 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={fieldOn}
                          onChange={() => toggleField(f.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D8C7F0] accent-[#5B4796]"
                        />
                        <span className="min-w-0">
                          <span
                            className={`block text-sm leading-snug ${
                              fieldOn
                                ? "font-medium text-[#3D2E6B]"
                                : "text-[#A89BD0] line-through"
                            }`}
                          >
                            {f.label}
                          </span>
                          {f.help && (
                            <span className="mt-0.5 block text-xs leading-relaxed text-[#7E6BAF]">
                              {f.help}
                            </span>
                          )}
                          {customIds.has(f.id) && (
                            <span className="mt-1 inline-block rounded-full bg-[#F0EAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5B4796]">
                              Your question
                            </span>
                          )}
                        </span>
                      </label>
                      {customIds.has(f.id) && (
                        <button
                          onClick={() => {
                            removeCustomField(providerName, editing, f.id);
                            toast.success("Question removed");
                          }}
                          aria-label="Remove question"
                          className="mt-0.5 rounded-[12px] p-1.5 text-[#A89BD0] transition hover:bg-[#F0EAFB] hover:text-[#5B4796]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              {activeCountOf(editing) === 0 && (
                <p className="mt-3 rounded-[12px] bg-[#FFF4E5] px-3 py-2 text-xs text-[#8A5A12]">
                  Every question here is off, so this section won't be shown to
                  clients.
                </p>
              )}

              <div className="mt-6 rounded-[12px] border border-[#F0EAFB] p-3">
                <p className="text-xs font-semibold text-[#3D2E6B]">
                  Add your own question
                </p>
                <p className="mt-0.5 text-xs text-[#7E6BAF]">
                  Clients answer it in their own words, and can say they'd rather
                  talk it through in session.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addQuestion();
                    }}
                    placeholder="e.g. Have you used our platform before?"
                    className="min-w-0 flex-1 rounded-[12px] border border-[#D8C7F0] px-3 py-2 text-sm text-[#3D2E6B] outline-none focus:border-[#5B4796]"
                  />
                  <button
                    onClick={addQuestion}
                    disabled={!draft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#5B4796] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4A3A7D] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setPreviewSection(editing);
                  setPreviewOpen(true);
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-[#D8C7F0] bg-white px-3 py-2 text-xs font-semibold text-[#3D2E6B] transition hover:bg-[#F0EAFB]"
              >
                <Eye className="h-3.5 w-3.5" /> Preview this section as a client
              </button>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o) setPreviewSection(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto bg-[#FDFCFF] sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle className="text-[#3D2E6B]">
              How clients will see this
            </SheetTitle>
            <SheetDescription className="text-[#7E6BAF]">
              Exactly the questions, wording and order your clients get after
              booking. Nothing here is editable or saved.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <ClientFormPreview
              request={request}
              providerLabel={providerName}
              templateId={previewSection ?? undefined}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

