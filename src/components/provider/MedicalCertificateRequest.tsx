import { useState } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const REASONS = [
  "Sick leave from work",
  "Absence from school",
  "Fit to work / return to work",
  "Fit for travel",
  "Sports or physical activity clearance",
  "Other",
];

const STORE_KEY = "lubin.med-cert-requests.v1";

type Props = { providerName: string; providerId: string; open: boolean; onOpenChange: (o: boolean) => void };

export function MedicalCertificateRequest({ providerName, providerId, open, onOpenChange }: Props) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sent, setSent] = useState(false);

  const canSubmit = reason && details.trim().length >= 10;

  const submit = () => {
    try {
      const list = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      list.push({ id: `mc-${Date.now()}`, providerId, reason, details, from, to, status: "pending", createdAt: new Date().toISOString() });
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch {}
    setSent(true);
  };

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) { setSent(false); setReason(""); setDetails(""); setFrom(""); setTo(""); }
  };

  const field = "w-full rounded-xl border border-[#E4E0F5] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg rounded-3xl">
        {sent ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
            <h3 className="text-xl font-bold text-[#2C2B4B]">Request sent</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              {providerName} will review your request. They may ask you to book a short consultation before issuing the certificate. You'll get a notification in Lubin once it's ready.
            </p>
            <button onClick={() => close(false)} className="mt-6 rounded-xl bg-brand-purple px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-purple-deep">
              Done
            </button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-[#2C2B4B]">
                <FileText className="h-5 w-5 text-brand-purple" /> Request a medical certificate
              </DialogTitle>
              <DialogDescription>Tell {providerName} what the certificate is for.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">What is it for?</label>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={
                        "rounded-[12px] border px-3 py-1.5 text-[13px] font-medium transition " +
                        (reason === r
                          ? "border-brand-purple bg-brand-purple text-white hover:bg-brand-purple-deep"
                          : "border-[#E4E0F5] bg-white text-slate-600 hover:border-brand-purple/50")
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Reason and symptoms</label>
                <textarea
                  rows={4}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="e.g. I had a fever and cough since Monday and couldn't go to work."
                  className={field}
                />
                <p className="mt-1 text-xs text-slate-400">At least 10 characters.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">From <span className="font-normal text-slate-400">(optional)</span></label>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">To <span className="font-normal text-slate-400">(optional)</span></label>
                  <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={field} />
                </div>
              </div>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={submit}
                className="w-full rounded-2xl bg-brand-purple py-3.5 text-sm font-bold text-white hover:bg-brand-purple-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send request
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
