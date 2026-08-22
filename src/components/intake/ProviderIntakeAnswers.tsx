import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

import { buildIntakeProgress, subscribeIntake } from "@/lib/intake/store";

/**
 * Provider-side read of what the client shared ahead of the session, plus the
 * items still open so they can be asked in conversation.
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

  useEffect(() => {
    setMounted(true);
    return subscribeIntake(() => setTick((t) => t + 1));
  }, []);

  const progress = useMemo(
    () => (mounted ? buildIntakeProgress(appointmentId, providerName) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appointmentId, providerName, mounted, tick],
  );

  if (!progress || progress.total === 0) return null;
  const first = (clientName ?? "Your client").split(" ")[0];

  return (
    <section className="rounded-[12px] border border-[#EAE7F5] bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-5 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-[#3D2E6B]">
            Session prep from {first}
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
        <div className="space-y-3 border-t border-[#F0EAFB] p-5">
          {progress.fields.map((f) => (
            <div key={f.field.id} className="rounded-[10px] border border-[#F0EAFB] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
                {f.template.label}
              </p>
              <p className="mt-1 text-sm font-medium text-[#3D2E6B]">{f.field.label}</p>
              {f.answered ? (
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#3D2E6B]">
                  {f.field.type === "ack" ? "Acknowledged" : f.answer}
                </p>
              ) : (
                <p className="mt-1 text-sm text-[#7E6BAF]">
                  {f.skipped
                    ? `${first} would rather talk about this in the session.`
                    : "Not shared yet — worth asking during the session."}
                </p>
              )}
              {f.fromPassport && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#F0EAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5B4796]">
                  <Sparkles className="h-3 w-3" /> Confirmed from Health Passport
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
