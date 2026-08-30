import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, FileText, Pencil, Plus } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  buildIntakeProgress,
  setProviderAnswer,
  subscribeIntake,
} from "@/lib/intake/store";
import type { IntakeFieldState } from "@/lib/intake/store";

/**
 * Provider-side answer editor: used when the client didn't get to the form in
 * time, so the answer can be captured live during the call.
 */
function FieldEditor({
  state,
  appointmentId,
  onDone,
}: {
  state: IntakeFieldState;
  appointmentId: string;
  onDone: () => void;
}) {
  const { field } = state;
  const [value, setValue] = useState(
    field.type === "ack" ? state.answer || "Acknowledged" : state.answer,
  );

  const save = () => {
    setProviderAnswer(appointmentId, field.id, value);
    onDone();
  };

  const inputClass =
    "w-full rounded-[10px] border border-[#D8C7F0] bg-white px-3 py-2 text-sm text-[#3D2E6B] outline-none focus:border-[#5B4796]";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[13px] font-semibold leading-tight text-[#3D2E6B]">
          {field.label}
        </label>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B4796]">
          Editing
        </span>
      </div>

      {field.type === "choice" && field.options ? (
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setValue(opt)}
              className={`rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition ${
                value === opt
                  ? "border-[#5B4796] bg-[#F0EAFB] text-[#3D2E6B]"
                  : "border-[#EAE7F5] bg-white text-[#7E6BAF] hover:bg-[#FBF9FF]"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : field.type === "long-text" ? (
        <textarea
          autoFocus
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={1000}
          placeholder={field.placeholder ?? "Type what they told you"}
          className={inputClass}
        />
      ) : field.type === "ack" ? (
        <label className="flex items-center gap-2 text-sm text-[#3D2E6B]">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setValue(e.target.checked ? "Acknowledged" : "")}
          />
          Confirmed verbally during the session
        </label>
      ) : (
        <input
          autoFocus
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
          onChange={(e) => setValue(e.target.value)}
          maxLength={200}
          placeholder={field.placeholder ?? "Type what they told you"}
          className={inputClass}
        />
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded-[10px] bg-[#5B4796] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4B3B80]"
        >
          Save answer
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-[10px] border border-[#EAE7F5] bg-white px-3 py-1.5 text-xs font-semibold text-[#7E6BAF] transition hover:bg-[#FBF9FF]"
        >
          Cancel
        </button>
        {state.answered && (
          <button
            type="button"
            onClick={() => {
              setProviderAnswer(appointmentId, field.id, "");
              onDone();
            }}
            className="text-xs font-semibold text-[#A89BD0] underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#A89BD0]">
        Saved answers are marked as recorded by you during the session.
      </p>
    </div>
  );
}

/**
 * Provider-side read of what the client shared ahead of the session.
 *
 * The inline card is intentionally compact so it never pushes the session
 * summary off-screen. The full intake form opens in a side drawer where the
 * provider can review answers grouped by section.
 */
export default function ProviderIntakeAnswers({
  appointmentId,
  providerName,
  clientName,
}: {
  appointmentId: string;
  providerName: string;
  clientName?: string;
}) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return subscribeIntake(() => setTick((t) => t + 1));
  }, []);

  const progress = useMemo(
    () => (mounted ? buildIntakeProgress(appointmentId, providerName) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appointmentId, providerName, mounted, tick],
  );

  const groups = useMemo(() => {
    if (!progress) return [];
    const bySection = new Map<string, IntakeFieldState[]>();
    for (const f of progress.fields) {
      const key = f.template.label;
      bySection.set(key, [...(bySection.get(key) ?? []), f]);
    }
    return [...bySection.entries()];
  }, [progress]);

  if (!progress || progress.total === 0) return null;
  const first = (clientName ?? "Your client").split(" ")[0];

  const toggleGroup = (label: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const answeredPct = Math.round((progress.answered / progress.total) * 100);

  return (
    <>
      {/* Inline compact card */}
      <section className="rounded-[12px] border border-[#EAE7F5] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F0EAFB] text-[#5B4796]">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#3D2E6B]">
                Intake form from {first}
              </p>
              <p className="mt-0.5 text-xs text-[#7E6BAF]">
                {progress.answered} of {progress.total} shared
                {progress.open > 0 ? ` · ${progress.open} to ask in session` : ""}
                {progress.skipped > 0 ? ` · ${progress.skipped} saved for conversation` : ""}
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-[#F0EAFB]">
                <div
                  className="h-full rounded-full bg-[#5B4796] transition-all"
                  style={{ width: `${answeredPct}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-[#D8C7F0] bg-white px-4 py-2 text-sm font-semibold text-[#3D2E6B] transition hover:bg-[#FBF9FF]"
          >
            View intake form
          </button>
        </div>
      </section>

      {/* Full intake drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full border-l-[#EAE7F5] p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b border-[#F0EAFB] p-6 text-left">
            <SheetTitle className="text-lg font-semibold text-[#3D2E6B]">
              Intake form from {first}
            </SheetTitle>
            <SheetDescription className="text-sm text-[#7E6BAF]">
              {progress.answered} of {progress.total} shared
              {progress.open > 0 ? ` · ${progress.open} still open` : ""}
              {progress.skipped > 0 ? ` · ${progress.skipped} saved for conversation` : ""}
              {" · updates arrive live"}
              <span className="mt-1 block">
                Anything still open you can fill in here as {first} tells you during
                the call.
              </span>
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-[calc(100vh-88px)] flex-col">
            {/* Scrollable form content */}
            <div className="flex-1 overflow-y-auto p-5">
              {groups.length === 0 ? (
                <p className="text-sm text-[#7E6BAF]">
                  {first} hasn't shared anything yet — answers appear here live.
                </p>
              ) : (
                <div className="space-y-4">
                  {groups.map(([section, fields]) => {
                    const collapsed = collapsedGroups.has(section);
                    return (
                      <div key={section} className="space-y-2">
                        <button
                          onClick={() => toggleGroup(section)}
                          className="flex w-full items-center justify-between gap-2 rounded-[10px] bg-[#F8F5FE] px-4 py-3 text-left"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B4796]">
                            {section}
                            <span className="ml-1.5 font-semibold normal-case tracking-normal text-[#A89BD0]">
                              {fields.filter((f) => f.answered).length}/{fields.length} shared
                            </span>
                          </span>
                          {collapsed ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#A89BD0]" />
                          ) : (
                            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#A89BD0]" />
                          )}
                        </button>

                        {!collapsed && (
                          <div className="space-y-2">
                            {fields.map((f) => {
                              const isEditing = editingField === f.field.id;
                              const statusLabel = f.skipped
                                ? "In session"
                                : "Not shared";
                              const dotColor = f.skipped
                                ? "bg-[#C8862A]"
                                : "bg-[#D9CFF5]";

                              return (
                                <div
                                  key={f.field.id}
                                  className="rounded-[12px] border border-[#EAE7F5] bg-white p-3.5 shadow-[0_1px_2px_rgba(61,46,107,0.06)] transition-all hover:border-[#D8C7F0] hover:shadow-[0_2px_6px_rgba(61,46,107,0.08)]"
                                >
                                  {isEditing ? (
                                    <FieldEditor
                                      state={f}
                                      appointmentId={appointmentId}
                                      onDone={() => setEditingField(null)}
                                    />
                                  ) : (
                                    <div className="space-y-2.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <label className="text-[13px] font-semibold leading-tight text-[#3D2E6B]">
                                          {f.field.label}
                                        </label>
                                        {f.answered ? (
                                          <button
                                            type="button"
                                            onClick={() => setEditingField(f.field.id)}
                                            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#A89BD0] transition-colors hover:text-[#5B4796]"
                                          >
                                            Edit
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                        ) : (
                                          <div className="flex shrink-0 items-center gap-1.5">
                                            <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                                              {statusLabel}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {f.answered ? (
                                        <div className="border-l-2 border-[#EAE7F5] bg-[#FBF9FF] py-1.5 pl-3 pr-2 text-[13px] leading-relaxed text-[#3D2E6B]">
                                          {f.field.type === "ack"
                                            ? "Acknowledged"
                                            : f.answer}
                                        </div>
                                      ) : f.skipped ? (
                                        <p className="text-[13px] leading-relaxed text-[#A89BD0]">
                                          {first} would rather talk about this in the
                                          session.
                                        </p>
                                      ) : (
                                        <p className="text-[13px] leading-relaxed text-[#A89BD0]">
                                          Not shared yet
                                        </p>
                                      )}

                                      {(f.skipped || f.byProvider || f.fromPassport) && (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {f.skipped && (
                                            <span className="inline-flex items-center gap-1 rounded border border-[#F0DDB8] bg-[#FFF4E5] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-[#8A5A12]">
                                              <span className="h-1 w-1 rounded-full bg-[#C8862A]" />
                                              Talk in session
                                            </span>
                                          )}
                                          {f.byProvider ? (
                                            <span className="inline-flex items-center gap-1 rounded border border-[#C7DCF5] bg-[#EAF3FF] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-[#2F5B95]">
                                              Recorded in session
                                            </span>
                                          ) : (
                                            f.fromPassport && (
                                              <span className="inline-flex items-center gap-1 rounded border border-[#D8C7F0] bg-[#F0EAFB] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-[#5B4796]">
                                                <Sparkles className="h-2.5 w-2.5" />
                                                From Health Passport
                                              </span>
                                            )
                                          )}
                                        </div>
                                      )}

                                      {!f.answered && (
                                        <button
                                          type="button"
                                          onClick={() => setEditingField(f.field.id)}
                                          className="group/btn flex w-full items-center gap-2 rounded-[10px] border border-[#EAE7F5] bg-[#FBF9FF] px-3 py-2 text-[12px] font-medium text-[#7E6BAF] transition-all hover:border-[#D8C7F0] hover:bg-[#F0EAFB] hover:text-[#5B4796]"
                                        >
                                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#EAE7F5] bg-white shadow-sm transition-all group-hover/btn:border-[#D8C7F0]">
                                            <Plus className="h-3 w-3 text-[#A89BD0] transition-colors group-hover/btn:text-[#5B4796]" />
                                          </span>
                                          Add answer
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
