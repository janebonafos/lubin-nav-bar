import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, FileText, Calendar, Clock, User, Video, BadgeDollarSign } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { buildIntakeProgress, subscribeIntake } from "@/lib/intake/store";
import type { IntakeFieldState } from "@/lib/intake/store";

type Filter = "all" | "answered" | "open";

type SessionSummary = {
  client: string;
  when: string;
  duration: string;
  type: string;
  mode: string;
  status: string;
  amount?: string;
  paymentStatus?: string;
};

/**
 * Provider-side read of what the client shared ahead of the session.
 *
 * The inline card is intentionally compact so it never pushes the session
 * summary off-screen. The full intake form opens in a side drawer where the
 * provider can review answers, filter by shared/open items, and see the
 * session summary at a glance.
 */
export default function ProviderIntakeAnswers({
  appointmentId,
  providerName,
  clientName,
  summary,
}: {
  appointmentId: string;
  providerName: string;
  clientName?: string;
  summary?: SessionSummary;
}) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-[calc(100vh-88px)] flex-col">
            {/* Session summary */}
            {summary && (
              <div className="border-b border-[#F0EAFB] bg-[#FBF9FF] p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                  Session summary
                </p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <SummaryItem icon={User} label="Client" value={summary.client} />
                  <SummaryItem icon={Calendar} label="When" value={summary.when} />
                  <SummaryItem icon={Clock} label="Duration" value={summary.duration} />
                  <SummaryItem icon={Video} label="Mode" value={summary.mode} />
                  <SummaryItem icon={FileText} label="Type" value={summary.type} />
                  <SummaryItem
                    icon={BadgeDollarSign}
                    label="Amount"
                    value={summary.amount ?? "—"}
                  />
                </div>
              </div>
            )}

            {/* Filter tabs */}
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

            {/* Scrollable form content */}
            <div className="flex-1 overflow-y-auto p-5">
              {groups.length === 0 ? (
                <p className="text-sm text-[#7E6BAF]">
                  {filter === "answered"
                    ? `${first} hasn't shared anything yet — answers appear here live.`
                    : filter === "open"
                      ? "Nothing outstanding — everything has been shared."
                      : "No questions on this form."}
                </p>
              ) : (
                <div className="space-y-4">
                  {groups.map(([section, fields]) => {
                    const collapsed = collapsedGroups.has(section);
                    return (
                      <div key={section} className="rounded-[10px] border border-[#EAE7F5] bg-white">
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
                          <dl className="divide-y divide-[#F0EAFB]">
                            {fields.map((f) => (
                              <div
                                key={f.field.id}
                                className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:gap-4"
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
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A89BD0]" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">{label}</p>
        <p className="text-sm font-medium text-[#3D2E6B]">{value}</p>
      </div>
    </div>
  );
}
