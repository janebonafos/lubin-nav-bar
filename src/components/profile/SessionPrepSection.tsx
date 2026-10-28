import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ClipboardList,
  ListChecks,
  Check,
  Eye,
  Plus,
  Trash2,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientFormPreview from "@/components/profile/ClientFormPreview";
import StandardMeasuresPanel from "@/components/profile/StandardMeasuresPanel";

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
  const [openGroups, setOpenGroups] = useState<string[]>(["Client identification"]);
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
        : { templateIds: [] },
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
    <div className="space-y-5 text-brand-purple-dark">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-lavender pb-5">
        <div>
          <p className="text-lg font-semibold">Your client form</p>
          <p className="mt-1 text-sm text-muted-foreground">{request.templateIds.length} sections · {questionCount} questions</p>
        </div>
        <div className="flex items-center gap-3">
          <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5" />{saved ? "Saved" : "All changes saved"}</span>
          <Button onClick={() => setPreviewOpen(true)} className="bg-brand-purple-dark text-primary-foreground hover:bg-brand-purple-deep hover:text-primary-foreground"><Eye /> Preview client form</Button>
        </div>
      </div>
      <Tabs defaultValue="sections">
        <TabsList className="h-auto max-w-full flex-wrap justify-start bg-brand-lavender p-1">
          <TabsTrigger value="sections" className="gap-2 px-4 py-2 text-brand-purple-dark"><ClipboardList className="h-4 w-4" /> Form sections</TabsTrigger>
          <TabsTrigger value="measures" className="gap-2 px-4 py-2 text-brand-purple-dark"><ListChecks className="h-4 w-4" /> Standard measures</TabsTrigger>
        </TabsList>
        <TabsContent value="sections" className="mt-5">
          <div className="space-y-3">
            {INTAKE_GROUPS.map((group: IntakeGroup) => {
              const items = ALL_TEMPLATES.filter((t) => t.group === group);
              if (items.length === 0) return null;
              const expanded = openGroups.includes(group);
              const selected = items.filter((t) => request.templateIds.includes(t.id)).length;
              return (
                <section key={group} className="overflow-hidden rounded-lg border border-brand-lavender bg-background">
                  <Button variant="ghost" aria-expanded={expanded} aria-controls={`intake-${group.replaceAll(" ", "-")}`} onClick={() => setOpenGroups((groups) => expanded ? groups.filter((g) => g !== group) : [...groups, group])} className="h-auto w-full justify-between gap-3 rounded-none px-5 py-4 text-left text-brand-purple-dark hover:bg-brand-lavender/40">
                    <span className="min-w-0 whitespace-normal text-sm font-semibold">{group}</span>
                    <span className="flex shrink-0 items-center gap-3"><span className="text-xs font-normal text-muted-foreground">{selected} of {items.length} on</span><ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} /></span>
                  </Button>
                  {expanded && <ul id={`intake-${group.replaceAll(" ", "-")}`} className="divide-y divide-brand-lavender border-t border-brand-lavender">
                    {items.map((t) => {
                      const on = request.templateIds.includes(t.id);
                      const total = fieldsOf(t.id).length;
                      const active = activeCountOf(t.id);
                      return (
                        <li key={t.id} className="flex items-center gap-3 px-5 py-4">
                          <Switch id={`section-${t.id}`} aria-label={`Include ${t.label}`} checked={on} onCheckedChange={() => toggle(t.id)} className="data-[state=checked]:bg-brand-purple-dark" />
                          <div className="min-w-0 flex-1">
                            <label htmlFor={`section-${t.id}`} className="cursor-pointer text-sm font-medium">{t.label}</label>
                            <p className="mt-1 text-xs text-muted-foreground">{on ? active : total} questions · {t.minutes} min</p>
                          </div>
                          <Button variant="ghost" size="sm" aria-label={`Edit questions for ${t.label}`} disabled={!on} onClick={() => { setEditing(t.id); setDraft(""); }} className="shrink-0 text-brand-purple-dark">Edit <ChevronDown className="-rotate-90" /></Button>
                        </li>
                      );
                    })}
                  </ul>}
                </section>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="measures" className="mt-5"><StandardMeasuresPanel providerName={providerName} /></TabsContent>
      </Tabs>

      <Sheet open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {editingTemplate && editing && (
            <>
              <SheetHeader>
                <SheetTitle className="text-brand-purple-dark">
                  {editingTemplate.label}
                </SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  Untick anything you don't need, or add your own question. Changes
                  save as you go and apply to every client form.
                </SheetDescription>
              </SheetHeader>

              <ul className="mt-6 divide-y divide-brand-lavender rounded-lg border border-brand-lavender">
                {fieldsOf(editing).map((f) => {
                  const fieldOn = !excluded.includes(f.id);
                  return (
                    <li key={f.id} className="flex items-start gap-2 px-3 py-3">
                      <label className="flex flex-1 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={fieldOn}
                          onChange={() => toggleField(f.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-lavender accent-brand-purple-dark"
                        />
                        <span className="min-w-0">
                          <span
                            className={`block text-sm leading-snug ${
                              fieldOn
                                ? "font-medium text-brand-purple-dark"
                                : "text-muted-foreground line-through"
                            }`}
                          >
                            {f.label}
                          </span>
                          {f.help && (
                            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                              {f.help}
                            </span>
                          )}
                          {customIds.has(f.id) && (
                            <span className="mt-1 inline-block rounded-full bg-brand-lavender/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-purple-dark">
                              Your question
                            </span>
                          )}
                        </span>
                      </label>
                      {customIds.has(f.id) && (
                        <Button
                          onClick={() => {
                            removeCustomField(providerName, editing, f.id);
                            toast.success("Question removed");
                          }}
                          aria-label="Remove question"
                          className="mt-0.5 rounded-lg p-1.5 text-muted-foreground transition hover:bg-brand-lavender/50 hover:text-brand-purple-dark"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>

              {activeCountOf(editing) === 0 && (
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Every question here is off, so this section won't be shown to
                  clients.
                </p>
              )}

              <div className="mt-6 rounded-lg border border-brand-lavender p-3">
                <p className="text-xs font-semibold text-brand-purple-dark">
                  Add your own question
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
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
                    className="min-w-0 flex-1 rounded-lg border border-brand-lavender px-3 py-2 text-sm text-brand-purple-dark outline-none focus:border-brand-purple-dark"
                  />
                  <Button
                    onClick={addQuestion}
                    disabled={!draft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple-dark px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-brand-purple-deep disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => {
                  setPreviewSection(editing);
                  setPreviewOpen(true);
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-lavender bg-background px-3 py-2 text-xs font-semibold text-brand-purple-dark transition hover:bg-brand-lavender/50"
              >
                <Eye className="h-3.5 w-3.5" /> Preview this section as a client
              </Button>
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
          className="w-full overflow-y-auto bg-background sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle className="text-brand-purple-dark">
              How clients will see this
            </SheetTitle>
            <SheetDescription className="text-muted-foreground">
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

