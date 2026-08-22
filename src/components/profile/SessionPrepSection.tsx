import { useEffect, useMemo, useState } from "react";
import { Check, Star } from "lucide-react";

import {
  ALL_TEMPLATES,
  getProviderRequest,
  saveProviderRequest,
  subscribeIntake,
  type ProviderRequest,
} from "@/lib/intake/store";
import { INTAKE_GROUPS, type IntakeGroup } from "@/lib/intake/templates";

/**
 * Provider-side: build the client intake form — the standard details clinicians
 * collect before a first session (identification, contact and emergency
 * details, reason for care, clinical background, consent and billing).
 * Nothing here blocks a booking; it shapes one short form the client sees where
 * they already are, prefilled from their Health Passport where possible.
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

  const excluded = request.excludedFieldIds ?? [];

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

  const questionCount = ALL_TEMPLATES.filter((t) =>
    request.templateIds.includes(t.id),
  ).reduce(
    (sum, t) => sum + t.fields.filter((f) => !excluded.includes(f.id)).length,
    0,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[12px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#3D2E6B]">Client intake form</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#7E6BAF]">
          Choose the intake details you need before you meet — the same things
          normally recorded at a first therapy, psychology or psychiatric visit:
          the client's full name and date of birth, contact and emergency
          details, what brings them in, medication and history, plus consent and
          billing. Clients see it as one short form, prefilled from their Health
          Passport where possible. It never blocks booking or joining, and
          anything left open shows up in your session view so you can ask it live.
        </p>
        {saved && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E6F8F1] px-2.5 py-1 text-[11px] font-semibold text-[#2D8E69]">
            <Check className="h-3 w-3" /> Saved
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-[12px] border border-[#EAE7F5] bg-white shadow-sm">
        <div className="border-b border-[#F0EAFB] p-6">
          <p className="text-sm font-semibold text-[#3D2E6B]">Intake sections</p>
          <p className="mt-1 text-xs text-[#7E6BAF]">
            {request.templateIds.length} section
            {request.templateIds.length === 1 ? "" : "s"} · {questionCount} question
            {questionCount === 1 ? "" : "s"} · shown to clients as one form
          </p>
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
                  const activeCount = t.fields.filter(
                    (f) => !excluded.includes(f.id),
                  ).length;
                  return (
                    <li
                      key={t.id}
                      className={`p-6 ${
                        idx !== items.length - 1 ? "border-b border-[#F0EAFB]" : ""
                      } ${on ? "bg-[#FDFCFF]" : ""}`}
                    >
                      <div className="flex flex-wrap items-start gap-4">
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
                              {on ? activeCount : t.fields.length} of {t.fields.length}{" "}
                              question{t.fields.length === 1 ? "" : "s"} · about{" "}
                              {t.minutes} min
                            </span>
                          </span>
                        </label>
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

                      {on && (
                        <div className="mt-4 rounded-[12px] border border-[#F0EAFB] bg-white">
                          <p className="border-b border-[#F0EAFB] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                            Questions the client will see — untick anything you
                            don't need
                          </p>
                          <ul className="divide-y divide-[#F6F2FE]">
                            {t.fields.map((f) => {
                              const fieldOn = !excluded.includes(f.id);
                              return (
                                <li key={f.id}>
                                  <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-[#FBF9FF]">
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
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                          {activeCount === 0 && (
                            <p className="border-t border-[#F0EAFB] px-4 py-2.5 text-xs text-[#8A5A12]">
                              Every question here is off, so this section won't be
                              shown to clients.
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
