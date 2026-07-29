import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getConsent, setConsent, subscribeConsent, isDntDenied } from "@/lib/analytics/consent";
import { track } from "@/lib/analytics/events";

export function ConsentBanner() {
  const [state, setState] = useState<"granted" | "denied" | "unset">("unset");

  useEffect(() => {
    setState(getConsent());
    return subscribeConsent(() => setState(getConsent()));
  }, []);

  if (state !== "unset" || isDntDenied()) return null;

  const grant = () => {
    setConsent("granted");
    track("consent_changed", { granted: true });
  };
  const deny = () => {
    setConsent("denied");
  };

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      className="fixed inset-x-3 bottom-3 z-[9998] mx-auto max-w-[560px] rounded-2xl border border-[#E3DBF5] bg-white/95 p-4 shadow-lg shadow-[#3D2E6B]/10 backdrop-blur sm:inset-x-6"
    >
      <p className="text-[13.5px] leading-relaxed text-[#3D2E6B]">
        Help us improve Lubin with anonymous usage analytics? We never send your
        name, messages, mood, or clinical results.{" "}
        <Link to="/privacy" className="font-semibold text-[#7E6BAF] underline">
          Learn more
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          onClick={deny}
          className="rounded-full border border-[#E3DBF5] px-4 py-1.5 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#F4EEFC]"
        >
          No thanks
        </button>
        <button
          onClick={grant}
          className="rounded-full bg-[#7E6BAF] px-4 py-1.5 text-[13px] font-semibold text-white shadow-md shadow-[#A89BD0]/40 hover:bg-[#3D2E6B]"
        >
          Allow analytics
        </button>
      </div>
    </div>
  );
}