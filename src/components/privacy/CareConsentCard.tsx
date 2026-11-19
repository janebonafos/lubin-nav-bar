import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { canSaveInformation, hasCareConsent, PRIVACY_EVENT, storeCareConsent } from "@/lib/privacy/consent";

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
        className="z-[10001] w-[calc(100%-32px)] max-w-[480px] max-h-[calc(100dvh-32px)] gap-0 overflow-y-auto rounded-lg border-brand-purple/15 bg-card p-6 font-sans text-brand-purple-dark shadow-xl sm:p-8 [&>button:last-child]:hidden"
      >
        <p className="text-xs font-semibold text-brand-purple">Your privacy</p>
        <DialogTitle className="mt-3 text-2xl font-semibold leading-tight tracking-normal">Keep your chats and health entries?</DialogTitle>
        <DialogDescription className="mt-3 text-sm leading-relaxed text-brand-purple-dark/75">
          Lubin saves them only with your OK, so your care can pick up where you left off.
        </DialogDescription>
        <div className="mt-6 grid grid-cols-[20px_minmax(0,1fr)] items-start gap-3">
          <Checkbox id="care-consent" checked={checked} disabled={saving} onCheckedChange={(value) => setChecked(value === true)} className="mt-0.5 h-5 w-5 border-brand-purple/50 data-[state=checked]:bg-brand-purple-dark" />
          <div className="min-w-0">
            <label htmlFor="care-consent" className="cursor-pointer text-sm leading-relaxed">I consent to Lubin storing and using my health information to provide my care.</label>
            <Button variant="link" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls="care-consent-details" className="mt-1 flex h-auto justify-start p-0 text-sm text-brand-purple-dark">
              Learn more <ChevronDown className={expanded ? "rotate-180" : ""} />
            </Button>
          </div>
        </div>
        {expanded && <p id="care-consent-details" className="mt-3 text-sm leading-relaxed text-brand-purple-dark/70">This covers saving your chats and health entries to support your care. Research and AI training are separate, optional choices in Settings → Privacy. You can change your choices there later.</p>}
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