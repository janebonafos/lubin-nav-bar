import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Search } from "lucide-react";
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
        : { templateIds: [], importantIds: [], measureIds: [] },
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
        : `${measure?.code} added — ${CADENCE_LABEL[measure!.cadence].toLowerCase()}`,
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
    <section className="overflow-hidden rounded-[12px] border border-[#EAE7F5] bg-white shadow-sm">
      <div className="border-b border-[#F0EAFB] p-6">
        <h3 className="text-base font-semibold text-[#3D2E6B]">
          Standard measures
        </h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#7E6BAF]">
          The questionnaires used across the field for intake and outcome
          tracking. Anything Lubin already runs as a guided check is completed by
          the client in a tap and scored into their Health Passport; the rest sit
          in your session view to record as you go.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#7E6BAF]">
            {chosen.length} measure{chosen.length === 1 ? "" : "s"} ·{" "}
            {inApp} completed in-app by clients
          </p>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#D8C7F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D2E6B] transition hover:bg-[#F0EAFB]"
          >
            <Eye className="h-3.5 w-3.5" /> Choose measures
          </button>
        </div>
      </div>

      {chosen.length === 0 ? (
        <p className="p-6 text-sm text-[#7E6BAF]">
          No measures selected yet. CORE-10, PHQ-9, GAD-7 and WSAS are the usual
          starting set.
        </p>
      ) : (
        <ul className="divide-y divide-[#F0EAFB]">
          {chosen.map((m) => (
            <li key={m.id} className="flex flex-wrap items-start gap-3 p-6">
              <div className="min-w-[240px] flex-1">
                <p className="text-sm font-semibold text-[#3D2E6B]">
                  {m.code}{" "}
                  <span className="font-normal text-[#7E6BAF]">· {m.name}</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#7E6BAF]">
                  {m.use}
                </p>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                  {m.items} items · about {m.minutes} min ·{" "}
                  {CADENCE_LABEL[m.cadence]} ·{" "}
                  {m.slug ? "Client completes in Lubin" : "Recorded in session"}
                </p>
                {m.licence && (
                  <p className="mt-1 text-[11px] text-[#8A5A12]">{m.licence}</p>
                )}
              </div>
              <button
                onClick={() => toggle(m.id)}
                className="rounded-[12px] border border-[#D8C7F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D2E6B] transition hover:bg-[#F0EAFB]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="text-[#3D2E6B]">Standard measures</SheetTitle>
            <SheetDescription className="text-[#7E6BAF]">
              Grouped by what they tell you. Notes show where each one is
              standard practice, so you can match your accreditation or funder
              requirements.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex items-center gap-2 rounded-[12px] border border-[#D8C7F0] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[#A89BD0]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search CORE-10, WSAS, trauma…"
              className="min-w-0 flex-1 text-sm text-[#3D2E6B] outline-none placeholder:text-[#A89BD0]"
            />
          </div>

          <div className="mt-4 space-y-5">
            {MEASURE_PURPOSES.map((purpose) => {
              const items = matches(purpose);
              if (items.length === 0) return null;
              return (
                <div key={purpose}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                    {purpose}
                  </p>
                  <ul className="mt-2 divide-y divide-[#F6F2FE] rounded-[12px] border border-[#F0EAFB]">
                    {items.map((m) => {
                      const on = selected.includes(m.id);
                      return (
                        <li key={m.id} className="px-3 py-3">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggle(m.id)}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D8C7F0] accent-[#5B4796]"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-[#3D2E6B]">
                                {m.code}
                              </span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-[#7E6BAF]">
                                {m.name} — {m.use}
                              </span>
                              <span className="mt-1 block text-[11px] leading-relaxed text-[#A89BD0]">
                                {m.standard}
                              </span>
                              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <Tag>{m.items} items</Tag>
                                <Tag>about {m.minutes} min</Tag>
                                <Tag>{CADENCE_LABEL[m.cadence]}</Tag>
                                {m.slug ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F8F1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2D8E69]">
                                    <Check className="h-3 w-3" /> In Lubin
                                  </span>
                                ) : (
                                  <Tag>Recorded in session</Tag>
                                )}
                              </span>
                              {m.licence && (
                                <span className="mt-1.5 block text-[11px] text-[#8A5A12]">
                                  {m.licence}
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F0EAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5B4796]">
      {children}
    </span>
  );
}
