import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
  getProviderRequest,
  saveProviderRequest,
  subscribeIntake,
  type ProviderRequest,
} from "@/lib/intake/store";
import {
  CADENCE_LABEL,
  MEASURE_PURPOSES,
  STANDARD_MEASURES,
  measureById,
  type MeasurePurpose,
} from "@/lib/intake/measures";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Provider-side picker for the standard questionnaires used at intake and for
 * routine outcome monitoring — CORE-10, PHQ-9, GAD-7, WSAS, ORS/SRS and the
 * rest of the market-standard set. Measures Lubin already runs as guided checks
 * are completed by the client in one tap; the others are recorded in session.
 */
export default function StandardMeasuresPanel({
  providerName = "You",
}: {
  providerName?: string;
}) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    return subscribeIntake(() => setTick((t) => t + 1));
  }, []);

  const request: ProviderRequest = useMemo(
    () =>
      mounted
        ? getProviderRequest(providerName)
        : { templateIds: [], measureIds: [] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [providerName, mounted, tick],
  );

  const selected = request.measureIds ?? [];

  const toggle = (id: string) => {
    const on = selected.includes(id);
    saveProviderRequest(providerName, {
      ...request,
      measureIds: on ? selected.filter((m) => m !== id) : [...selected, id],
    });
    const measure = measureById(id);
    toast.success(
      on
        ? `${measure?.code} removed`
        : `${measure?.code} added${measure ? ` — ${CADENCE_LABEL[measure.cadence].toLowerCase()}` : ""}`,
    );
  };

  const chosen = STANDARD_MEASURES.filter((m) => selected.includes(m.id));
  const inApp = chosen.filter((m) => m.slug).length;

  const matches = (purpose: MeasurePurpose) =>
    STANDARD_MEASURES.filter(
      (m) =>
        m.purpose === purpose &&
        (query.trim() === "" ||
          `${m.code} ${m.name} ${m.use}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())),
    );

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-brand-purple-dark">Selected measures</h3>
          <p className="mt-1 text-sm text-muted-foreground">Standard measures are well-known questionnaires — like PHQ-9 for mood or GAD-7 for anxiety — that track how a client is doing over time. Clients answer the in-Lubin ones on their own; the rest you fill in during the session.</p>
          <p className="mt-1 text-sm text-muted-foreground">{chosen.length} selected · {inApp} the client answers in Lubin · {chosen.length - inApp} you fill in during the session</p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)} className="border-brand-lavender text-brand-purple-dark"><Plus /> Add measures</Button>
      </div>
      {chosen.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          No measures selected yet. CORE-10, PHQ-9, GAD-7 and WSAS are the usual
          starting set.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {chosen.map((m) => (
            <li key={m.id} className="flex items-start gap-3 rounded-lg border border-brand-lavender bg-background p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-purple-dark">
                  {m.code}
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">{m.name}</span>
                </p>
                
                <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.items} items · about {m.minutes} min ·{" "}
                  {CADENCE_LABEL[m.cadence]} ·{" "}
                  {m.slug ? "Client answers this in Lubin" : "You fill this in during the session"}
                </p>
                {m.licence && (
                  <p className="mt-1 text-xs text-muted-foreground">{m.licence}</p>
                )}
              </div>
              <Button
                onClick={() => toggle(m.id)}
                aria-label={`Remove ${m.code}`} title={`Remove ${m.code}`} size="icon-sm" variant="ghost"
                className="rounded-lg border border-brand-lavender bg-background px-3 py-1.5 text-xs font-semibold text-brand-purple-dark transition hover:bg-brand-lavender/50"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-lg">
          <div className="flex-1 overflow-y-auto px-6 pt-6">
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle className="text-brand-purple-dark">Choose measures</SheetTitle>
              <SheetDescription className="text-muted-foreground">
                Tap the cards to add or remove questionnaires. Ones marked
                "Client answers in Lubin" are filled in by the client on their
                own; for the rest you type the answers during the session.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-lavender px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search measures" placeholder="Search CORE-10, WSAS, trauma…"
                className="min-w-0 flex-1 bg-transparent text-sm text-brand-purple-dark outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <Button
                  aria-label="Clear measure search" variant="ghost" size="icon-sm" onClick={() => setQuery("")}
                  className="rounded-full p-1 text-muted-foreground hover:bg-brand-lavender/50 hover:text-brand-purple-dark"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {selected.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-purple-dark">
                  Selected ({selected.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {chosen.map((m) => (
                    <Button
                      size="sm" variant="outline"
                      key={m.id}
                      onClick={() => toggle(m.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple-dark bg-brand-lavender/50 px-3 py-1 text-xs font-semibold text-brand-purple-dark transition hover:bg-brand-lavender"
                    >
                      <Check className="h-3 w-3" />
                      {m.code}
                      <X className="ml-0.5 h-3 w-3 text-muted-foreground" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-6 pb-6">
              {MEASURE_PURPOSES.map((purpose) => {
                const items = matches(purpose);
                if (items.length === 0) return null;
                const selectedInGroup = items.filter((m) =>
                  selected.includes(m.id),
                ).length;
                return (
                  <div key={purpose}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {purpose}
                      </p>
                      {selectedInGroup > 0 && (
                        <span className="text-xs font-semibold text-brand-purple-dark">
                          {selectedInGroup} selected
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {items.map((m) => {
                        const on = selected.includes(m.id);
                        return (
                          <Button
                            key={m.id}
                            onClick={() => toggle(m.id)}
                            variant="ghost" aria-pressed={on}
                            className={`group h-auto whitespace-normal flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                              on
                                ? "border-brand-purple-dark bg-brand-lavender/50 shadow-sm"
                                : "border-brand-lavender bg-background hover:border-brand-lavender hover:bg-background"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                                on
                                  ? "border-brand-purple-dark bg-brand-purple-dark text-primary-foreground"
                                  : "border-brand-lavender bg-background text-transparent group-hover:border-brand-purple-dark"
                              }`}
                            >
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="block text-sm font-semibold text-brand-purple-dark">
                                  {m.code}
                                </span>
                                {m.slug ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-lavender px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-purple-dark">
                                    <CheckCircle2 className="h-3 w-3" /> Client answers in Lubin
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-lavender/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-purple-dark">
                                    You fill in during session
                                  </span>
                                )}
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                {m.name} — {m.use}
                              </span>
                              <span className="mt-1.5 block text-[11px] leading-relaxed text-muted-foreground">
                                {m.standard}
                              </span>
                              <span className="mt-2 flex flex-wrap items-center gap-1.5">
                                <Tag>{m.items} items</Tag>
                                <Tag>about {m.minutes} min</Tag>
                                <Tag>{CADENCE_LABEL[m.cadence]}</Tag>
                              </span>
                              {m.licence && (
                                <span className="mt-2 block text-[11px] text-muted-foreground">
                                  {m.licence}
                                </span>
                              )}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-brand-lavender bg-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-brand-purple-dark">
                <span className="font-semibold">{selected.length}</span> measure
                {selected.length === 1 ? "" : "s"} selected
              </p>
              <Button
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple-dark px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-brand-purple-deep"
              >
                <Check className="h-4 w-4" /> Done
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-lavender/50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-purple-dark">
      {children}
    </span>
  );
}
