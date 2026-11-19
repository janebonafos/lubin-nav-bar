import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { canSaveInformation, hasCareConsent, PRIVACY_EVENT, storeCareConsent } from "@/lib/privacy/consent";

const DETAILS = [
  { label: "What gets saved", body: "Your chats and the health entries you add." },
  { label: "Who can see it", body: "Only you, unless you choose to share something with a provider." },
  { label: "Research and AI training", body: "Separate, optional choices in Settings → Privacy. Both start off, and saying no never limits your care." },
  { label: "Change your mind", body: "Turn saving off anytime in Settings → Privacy." },
];

export default function CareConsentCard() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const actions = useRef<Array<() => void | Promise<void>>>([]);

  const dismiss = () => {
    if (saving) return;
    actions.current = [];
    setOpen(false);
  };

  useEffect(() => {
    const request = (event: Event) => {
      const action = (event as CustomEvent<{ onSave?: () => void | Promise<void> }>).detail?.onSave;
      if (hasCareConsent()) { if (action) void action(); return; }
      if (action && !actions.current.includes(action)) actions.current.push(action);
      setOpen(true);
    };
    window.addEventListener(PRIVACY_EVENT, request);
    return () => window.removeEventListener(PRIVACY_EVENT, request);
  }, []);

  useEffect(() => {
    if (open) { setChecked(false); setExpanded(false); setError(false); }
  }, [open]);

  const save = async () => {
    if (!canSaveInformation(checked, saving)) return;
    setSaving(true);
    setError(false);
    try {
      // Brief local prototype transition; no consent or health data is sent.
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      storeCareConsent(checked);
      for (const action of actions.current) await action();
      actions.current = [];
      setOpen(false);
    } catch { setError(true); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }}
        className="z-[10001] w-[calc(100%-32px)] max-w-[480px] max-h-[calc(100dvh-32px)] gap-0 overflow-y-auto rounded-lg border-brand-purple/15 bg-card p-6 font-sans text-brand-purple-dark shadow-xl sm:p-8 [&>button:last-child]:hidden max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-8 max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom"
      >
        <div aria-hidden="true" className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-brand-purple/20" />
        <p className="text-xs font-semibold text-brand-purple">Your privacy</p>
        <DialogTitle className="mt-3 text-2xl font-semibold leading-tight tracking-normal">Keep your chats and health entries?</DialogTitle>
        <DialogDescription className="mt-3 text-sm leading-relaxed text-brand-purple-dark/75">
          Nothing is saved unless you say yes. With your OK, Lubin keeps them so your care can pick up where you left off.
        </DialogDescription>
        <div className="mt-6 grid grid-cols-[20px_minmax(0,1fr)] items-start gap-3">
          <Checkbox id="care-consent" checked={checked} disabled={saving} onCheckedChange={(value) => setChecked(value === true)} className="mt-0.5 h-5 w-5 border-brand-purple/50 data-[state=checked]:bg-brand-purple-dark" />
          <label htmlFor="care-consent" className="min-w-0 cursor-pointer text-sm leading-relaxed">
            I'm OK with Lubin saving my chats and health entries to support my care.
          </label>
        </div>
        <Button
          variant="link"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="care-consent-details"
          className="mt-2 flex h-auto justify-start p-0 pl-8 text-sm text-brand-purple-dark"
        >
          {expanded ? "Show less" : "Show more"} <ChevronDown className={expanded ? "rotate-180" : ""} />
        </Button>
        {expanded && (
          <dl id="care-consent-details" className="mt-3 space-y-2 rounded-lg bg-brand-lavender/45 p-4">
            {DETAILS.map((item) => (
              <div key={item.label} className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
                <dt className="text-xs font-semibold text-brand-purple-dark">{item.label}</dt>
                <dd className="text-sm leading-relaxed text-brand-purple-dark/75">{item.body}</dd>
              </div>
            ))}
          </dl>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-destructive">Couldn't save, try again</p>}
        <Button onClick={save} disabled={!canSaveInformation(checked, saving)} aria-busy={saving} className="mt-6 h-12 w-full whitespace-normal bg-brand-purple-dark text-sm font-semibold text-primary-foreground hover:bg-brand-purple-deep disabled:opacity-50">
          {saving && <Loader2 className="animate-spin motion-reduce:animate-none" />} {saving ? "Saving…" : "Yes, save my information"}
        </Button>
        <Button variant="link" disabled={saving} onClick={dismiss} className="mt-3 h-10 w-full whitespace-normal text-sm text-brand-purple-dark/75">Not now, keep chatting</Button>
        <p className="mt-4 text-center text-xs leading-relaxed text-brand-purple-dark/60">You can chat and get crisis help without saving.</p>
      </DialogContent>
    </Dialog>
  );
}
