import { useEffect, useState } from "react";
import { FEE_LABEL } from "@/lib/prescription/payment";

type Method = "gcash" | "maya" | "card";
type Phase = "form" | "paying" | "success" | "failed";

const METHODS: { key: Method; label: string }[] = [
  { key: "gcash", label: "GCash" },
  { key: "maya", label: "Maya" },
  { key: "card", label: "Card" },
];

/** Design-only payment sheet. Slides up from the bottom on phones, centred on
 *  larger screens. No real payment happens. */
export default function PrescriptionPaySheet({
  open,
  reference,
  downloadHref,
  onClose,
  onPaid,
}: {
  open: boolean;
  reference: string;
  downloadHref: string;
  onClose: () => void;
  onPaid: (promo: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [method, setMethod] = useState<Method>("gcash");
  const [phase, setPhase] = useState<Phase>("form");
  const [simulateFail, setSimulateFail] = useState(false);

  useEffect(() => {
    if (open) {
      setCode("");
      setPromo(false);
      setPromoError("");
      setPhase("form");
      setSimulateFail(false);
    }
  }, [open]);

  if (!open) return null;

  const free = promo;
  const pay = () => {
    setPhase("paying");
    window.setTimeout(() => {
      if (simulateFail && !free) {
        setPhase("failed");
      } else {
        setPhase("success");
        onPaid(free);
      }
    }, 1600);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#2A2050]/40 sm:items-center sm:p-6"
      onClick={() => phase !== "paying" && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Prescription fee"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] animate-in slide-in-from-bottom-8 rounded-t-3xl bg-white p-6 shadow-2xl duration-300 sm:rounded-3xl sm:p-7"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#E2D6F5] sm:hidden" />

        {phase === "paying" ? (
          <div className="py-10 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-[#E2D6F5] border-t-[#7E6BAF]" />
            <p className="mt-4 text-[15px] font-semibold text-[#3D2E6B]">Confirming your payment…</p>
            <p className="mt-1 text-[13px] text-[#6F6889]">Please keep this window open.</p>
          </div>
        ) : phase === "success" ? (
          <div className="py-4 text-center">
            <h3 className="font-display text-2xl font-semibold text-[#3D2E6B]">
              Paid. Your prescription is ready.
            </h3>
            <p className="mt-2 text-[13.5px] text-[#6F6889]">
              {reference} is now in My prescriptions.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <a
                href={downloadHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex justify-center rounded-xl bg-[#7E6BAF] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#3D2E6B]"
              >
                Download PDF
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#A89BD0] bg-white px-5 py-2.5 text-sm font-bold text-[#3D2E6B] hover:bg-[#EAE7F5]"
              >
                Done
              </button>
            </div>
          </div>
        ) : phase === "failed" ? (
          <div className="py-4 text-center">
            <h3 className="font-display text-2xl font-semibold text-[#3D2E6B]">
              Payment didn't go through.
            </h3>
            <p className="mt-2 text-[13.5px] text-[#6F6889]">You weren't charged.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  setSimulateFail(false);
                  setPhase("form");
                }}
                className="rounded-xl bg-[#7E6BAF] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#3D2E6B]"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#A89BD0] bg-white px-5 py-2.5 text-sm font-bold text-[#3D2E6B] hover:bg-[#EAE7F5]"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-display text-2xl font-semibold text-[#3D2E6B]">Prescription fee</h3>
                <p className="mt-0.5 font-body text-[11px] font-semibold tracking-wide text-[#7E6BAF] tabular-nums">{reference}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-[#6F6889] hover:bg-[#F4F1FA]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#EAE7F5] bg-[#FBF9FF] px-4 py-3.5">
              <span className="text-[14px] text-[#6F6889]">Amount</span>
              <span className="text-[15px] font-bold text-[#3D2E6B]">
                {free ? (
                  <>
                    <span className="mr-2 text-[#9C93B8] line-through">{FEE_LABEL}</span>₱0
                  </>
                ) : (
                  `${FEE_LABEL} (all-in)`
                )}
              </span>
            </div>

            <label className="mt-5 block text-[12px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
              Promo code
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                value={code}
                disabled={promo}
                onChange={(e) => {
                  setCode(e.target.value);
                  setPromoError("");
                }}
                placeholder="Enter code"
                className="min-w-0 flex-1 rounded-xl border border-[#DCD4F0] bg-white px-4 py-2.5 text-sm uppercase text-[#3D2E6B] placeholder:normal-case placeholder:text-[#9C93B8] focus:border-[#7E6BAF] focus:outline-none disabled:bg-[#F4F1FA]"
              />
              <button
                type="button"
                disabled={promo}
                onClick={() => {
                  if (code.trim().length >= 3) setPromo(true);
                  else setPromoError("Enter a valid promo code.");
                }}
                className="shrink-0 rounded-xl border border-[#A89BD0] bg-white px-4 py-2.5 text-sm font-bold text-[#3D2E6B] hover:bg-[#EAE7F5] disabled:opacity-50"
              >
                Apply
              </button>
            </div>
            {promo ? (
              <p className="mt-1.5 text-[12.5px] font-semibold text-[#2F6B4A]">Promo applied · ₱0</p>
            ) : promoError ? (
              <p className="mt-1.5 text-[12.5px] text-[#A14343]">{promoError}</p>
            ) : null}

            {!free && (
              <>
                <p className="mt-5 text-[12px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                  Payment method
                </p>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMethod(m.key)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                        method === m.key
                          ? "border-[#7E6BAF] bg-[#EDE6FA] text-[#3D2E6B]"
                          : "border-[#DCD4F0] bg-white text-[#5B4B8A] hover:bg-[#F4F1FA]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={pay}
              className="mt-6 w-full rounded-xl bg-[#7E6BAF] px-5 py-3 text-[15px] font-bold text-white shadow-sm hover:bg-[#3D2E6B]"
            >
              {free ? "Get prescription" : `Pay ${FEE_LABEL}`}
            </button>
            <p className="mt-3 text-center text-[12px] leading-relaxed text-[#6F6889]">
              You only pay because a doctor issued your prescription. Payment is handled securely by
              our payment partner.
            </p>
            {!free && (
              <label className="mt-3 flex items-center justify-center gap-2 text-[11.5px] text-[#9C93B8]">
                <input
                  type="checkbox"
                  checked={simulateFail}
                  onChange={(e) => setSimulateFail(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#7E6BAF]"
                />
                Demo: simulate a failed payment
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
}
