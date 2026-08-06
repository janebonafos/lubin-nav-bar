import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Eye } from "lucide-react";
import logo from "@/assets/lubin-logo.svg";
import type { Prescription, RxCountry } from "@/lib/prescription/store";

const JURISDICTION_LABEL: Record<RxCountry, string> = {
  US: "United States",
  PH: "Philippines",
};

/**
 * Patient-facing copy of the prescription — exactly what the client receives
 * in their Lubin account and email after the prescriber signs.
 */
export function EPrescriptionPreview({
  open,
  onOpenChange,
  rx,
  country,
  clientName,
  providerName,
  draft,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rx: Prescription;
  country: RxCountry;
  clientName?: string;
  providerName?: string;
  /** True when shown before signing, so the copy is clearly a preview. */
  draft?: boolean;
}) {
  const issued = rx.finalisedAt ? new Date(rx.finalisedAt) : new Date();
  const meds = rx.medications.filter((m) => m.name.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto border-[#E4E1EC] bg-[#F7F5FB] p-0 sm:max-w-[560px]">
        <DialogHeader className="sticky top-0 z-10 flex-row items-center gap-2 border-b border-[#E4E1EC] bg-white px-5 py-3.5 text-left">
          <Eye className="h-4 w-4 text-[#6E4FD3]" />
          <DialogTitle className="text-[13.5px] font-semibold text-[#2C2B4B]">
            What {clientName || "the client"} receives
          </DialogTitle>
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-[#D9D5E3] bg-white px-3 text-[12.5px] font-semibold text-[#3D2E6B] hover:bg-[#F7F5FB]"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </DialogHeader>

        <div className="px-5 py-4">
          {draft && (
            <p className="mb-3 rounded-lg border border-[#DCD3F5] bg-[#F1ECFD] px-3 py-2 text-[12px] leading-relaxed text-[#3D2E6B]">
              Preview only. The client receives this copy once you sign and issue the
              prescription.
            </p>
          )}

          {/* Document */}
          <article className="overflow-hidden rounded-2xl border border-[#E4E1EC] bg-white">
            <header className="flex items-center justify-between gap-3 border-b border-[#EDEBF3] px-5 py-4">
              <img src={logo} alt="Lubin" className="h-6 w-auto" />
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A7FB0]">
                  E-prescription
                </p>
                <p className="text-[12px] text-[#5A4A8A]">
                  {issued.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-[#EDEBF3] px-5 py-4 text-[12.5px] sm:grid-cols-2">
              <Line label="Patient" value={clientName || "—"} />
              <Line label="Prescriber" value={providerName || "—"} />
              <Line label="Issued in" value={JURISDICTION_LABEL[country]} />
              <Line
                label="Where to collect"
                value={rx.destination || "Given to you directly"}
              />
            </div>

            <section className="px-5 py-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A7FB0]">
                Your medication{meds.length > 1 ? "s" : ""}
              </h3>
              {meds.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-[#6F6889]">
                  No medication has been added yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-4">
                  {meds.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] p-4"
                    >
                      <p className="text-[14px] font-semibold text-[#2C2B4B]">
                        {m.name} {m.strength || m.dose}
                      </p>
                      {m.genericName && (
                        <p className="mt-0.5 text-[12px] text-[#6F6889]">
                          Generic name: {m.genericName}
                        </p>
                      )}
                      <p className="mt-2 text-[12.5px] leading-relaxed text-[#3D2E6B]">
                        <span className="font-semibold">How to take it: </span>
                        {m.instructions || "Follow your prescriber's directions."}
                      </p>
                      <dl className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
                        {m.frequency && <Line label="When" value={m.frequency} />}
                        {m.duration && <Line label="How long" value={m.duration} />}
                        {m.quantity && <Line label="Quantity" value={m.quantity} />}
                        {m.refills && <Line label="Refills" value={m.refills} />}
                      </dl>
                      {m.indication && (
                        <p className="mt-2 text-[12px] text-[#5A4A8A]">
                          Prescribed for: {m.indication}
                        </p>
                      )}
                      {m.warnings && (
                        <p className="mt-2 rounded-lg bg-[#F1ECFD] px-3 py-2 text-[12px] leading-relaxed text-[#3D2E6B]">
                          <span className="font-semibold">Good to know: </span>
                          {m.warnings}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <footer className="border-t border-[#EDEBF3] bg-[#FBFAFE] px-5 py-4">
              <p className="text-[12.5px] font-medium text-[#2C2B4B]">
                {rx.finalisedAt
                  ? `Signed by ${rx.finalisedBy || providerName || "your prescriber"} on ${issued.toLocaleString()}`
                  : "This copy is not signed yet."}
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#6F6889]">
                Take your medication exactly as written above. If something does not feel
                right, or you have questions about a dose, message your prescriber through
                Lubin. If you feel unsafe or need urgent help, contact local emergency
                services.
              </p>
            </footer>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="min-w-[92px] shrink-0 text-[#8A7FB0]">{label}</dt>
      <dd className="font-medium text-[#2C2B4B]">{value}</dd>
    </div>
  );
}
