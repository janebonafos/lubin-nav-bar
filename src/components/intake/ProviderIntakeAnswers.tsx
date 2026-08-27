import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

import { buildIntakeProgress, subscribeIntake } from "@/lib/intake/store";
import type { IntakeFieldState } from "@/lib/intake/store";

type Filter = "all" | "answered" | "open";

/**
 * Provider-side read of what the client shared ahead of the session, plus the
 * items still open so they can be asked in conversation. Long forms are
 * grouped by section and filterable so nothing requires endless scrolling.
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
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState<Filter>("answered");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
    const visible = progress.fields.filter((f) =>
      filter === "answered"
        ? f.answered || f.skipped
        : filter === "open"
          ? !f.answered
          : true,
    );
    const bySection = new Map<string, IntakeFieldState[]>();
    for (const f of visible) {
      const key = f.template.label;
      bySection.set(key, [...(bySection.get(key) ?? []), f]);
    }
    return [...bySection.entries()];
  }, [progress, filter]);

  if (!progress || progress.total === 0) return null;
  const first = (clientName ?? "Your client").split(" ")[0];

  const toggleGroup = (label: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "answered", label: "Shared", count: progress.answered + progress.skipped },
    { id: "open", label: "Still to ask", count: progress.open },
    { id: "all", label: "All", count: progress.total },
  ];

  return (
    <section className="rounded-[12px] border border-[#EAE7F5] bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-5 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-[#3D2E6B]">
            Intake form from {first}
          </span>
          <span className="mt-0.5 block text-xs text-[#7E6BAF]">
            {progress.answered} of {progress.total} shared
            {progress.open > 0 ? ` · ${progress.open} still open — ask in session` : " · nothing outstanding"}
            {progress.skipped > 0 ? ` · ${progress.skipped} saved for the conversation` : ""}
            {" · updates arrive here live, including during the session"}
          </span>
        </span>
        {open ? (
          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-[#A89BD0]" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[#A89BD0]" />
        )}
      </button>

      {open && (
        <div className="border-t border-[#F0EAFB]">
          {/* Filter tabs — sticky so they stay put while scrolling long forms */}
          <div className="sticky top-0 z-10 flex gap-1 border-b border-[#F0EAFB] bg-white px-5 py-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === t.id
                    ? "bg-[#3D2E6B] text-white"
                    : "bg-[#F0EAFB] text-[#5B4796] hover:bg-[#E6DCF7]"
                }`}
              >
                {t.label} · {t.count}
              </button>
            ))}
          </div>

          {groups.length === 0 ? (
            <p className="p-5 text-sm text-[#7E6BAF]">
              {filter === "answered"
                ? `${first} hasn't shared anything yet — answers appear here live.`
                : filter === "open"
                  ? "Nothing outstanding — everything has been shared."
                  : "No questions on this form."}
            </p>
          ) : (
            <div className="p-5">
              {groups.map(([section, fields]) => {
                const collapsed = collapsedGroups.has(section);
                return (
                  <div key={section} className="mb-4 last:mb-0">
                    <button
                      onClick={() => toggleGroup(section)}
                      className="flex w-full items-center justify-between gap-2 rounded-[8px] bg-[#F8F5FE] px-3 py-2 text-left"
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
                      <dl className="mt-1 divide-y divide-[#F0EAFB] rounded-[10px] border border-[#F0EAFB]">
                        {fields.map((f) => (
                          <div
                            key={f.field.id}
                            className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:gap-4"
                          >
                            <dt className="text-sm font-medium text-[#3D2E6B]">
                              {f.field.label}
                            </dt>
                            <dd className="min-w-0 text-sm leading-relaxed">
                              {f.answered ? (
                                <span className="whitespace-pre-line text-[#3D2E6B]">
                                  {f.field.type === "ack" ? "Acknowledged" : f.answer}
                                </span>
                              ) : (
                                <span className="text-[#A89BD0]">
                                  {f.skipped
                                    ? `${first} would rather talk about this in the session.`
                                    : "Not shared yet"}
                                </span>
                              )}
                              {(f.skipped || f.fromPassport) && (
                                <span className="mt-1 flex flex-wrap gap-1.5">
                                  {f.skipped && (
                                    <span className="inline-flex items-center rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8A5A12]">
                                      Talk about in session
                                    </span>
                                  )}
                                  {f.fromPassport && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F0EAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5B4796]">
                                      <Sparkles className="h-3 w-3" /> From Health Passport
                                    </span>
                                  )}
                                </span>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
