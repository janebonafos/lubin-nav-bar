import { useEffect, useMemo, useState } from "react";
import { Check, Star } from "lucide-react";

import {
  ALL_TEMPLATES,
  getProviderRequest,
  saveProviderRequest,
  subscribeIntake,
  type ProviderRequest,
} from "@/lib/intake/store";

/**
 * Provider-side: choose which prep templates clients are invited to fill in
 * before a session. Nothing here blocks a booking — it only shapes an optional
 * invitation the client sees where they already are.
 */
export default function SessionPrepSection({
  providerName = "You",
}: {
  providerName?: string;
}) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const toggle = (id: string) => {
    const on = request.templateIds.includes(id);
    update({
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
      templateIds: request.templateIds,
      importantIds: request.importantIds.includes(id)
        ? request.importantIds.filter((t) => t !== id)
        : [...request.importantIds, id],
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#3D2E6B]">Session prep requests</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#7E6BAF]">
          Pick what you'd like clients to share before you meet. Clients see one short,
          optional card — prefilled from their Health Passport where possible — on their
          booking confirmation, their appointment and in their Health Passport. It never
          blocks booking or joining, and anything left open shows up in your session view
          so you can ask it live.
        </p>
        {saved && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E6F8F1] px-2.5 py-1 text-[11px] font-semibold text-[#2D8E69]">
            <Check className="h-3 w-3" /> Saved
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-[12px] border border-[#EAE7F5] bg-white shadow-sm">
        <div className="border-b border-[#F0EAFB] p-6">
          <p className="text-sm font-semibold text-[#3D2E6B]">Prep template library</p>
          <p className="mt-1 text-xs text-[#7E6BAF]">
            {request.templateIds.length} selected · shown to clients as one card
          </p>
        </div>
        <ul>
          {ALL_TEMPLATES.map((t, idx) => {
            const on = request.templateIds.includes(t.id);
            const important = request.importantIds.includes(t.id);
            return (
              <li
                key={t.id}
                className={`flex flex-wrap items-start gap-4 p-6 ${
                  idx !== ALL_TEMPLATES.length - 1 ? "border-b border-[#F0EAFB]" : ""
                } ${on ? "bg-[#FBF9FF]" : ""}`}
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
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                      {t.fields.length} question{t.fields.length === 1 ? "" : "s"} · about{" "}
                      {t.minutes} min
                    </span>
                  </span>
                </label>
                <button
                  disabled={!on}
                  onClick={() => toggleImportant(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    important
                      ? "border-[#5B4796] bg-[#5B4796] text-white"
                      : "border-[#D8C7F0] bg-white text-[#3D2E6B] hover:bg-[#F0EAFB]"
                  }`}
                >
                  <Star className="h-3.5 w-3.5" />
                  {important ? "Most useful" : "Mark most useful"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
