import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_CHOICES, hasCareConsent, loadPrivacyChoices, PRIVACY_CHANGED, requestCareConsent, savePrivacyChoices, type PrivacyChoices } from "@/lib/privacy/consent";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/privacy")({
  head: () => ({ meta: [
    { title: "Privacy settings — Lubin" },
    { name: "description", content: "Choose how Lubin saves your health information and manage optional research and AI-training preferences." },
    { property: "og:title", content: "Privacy settings — Lubin" },
    { property: "og:description", content: "Your choices for saving health information, research and AI training." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PrivacySettings,
});

function PrivacySettings() {
  const [choices, setChoices] = useState<PrivacyChoices>(DEFAULT_CHOICES);
  const [consented, setConsented] = useState(false);
  useEffect(() => {
    setChoices(loadPrivacyChoices());
    const update = () => setConsented(hasCareConsent());
    update();
    window.addEventListener(PRIVACY_CHANGED, update);
    return () => window.removeEventListener(PRIVACY_CHANGED, update);
  }, []);
  const change = (key: keyof PrivacyChoices, value: boolean) => {
    const next = { ...choices, [key]: value };
    try { savePrivacyChoices(next); setChoices(next); }
    catch { toast.error("Couldn't save, try again"); }
  };
  return <div className="min-h-screen bg-background text-brand-purple-dark">
    <Navbar />
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-32">
      <Button asChild variant="link" className="mb-8 h-auto p-0 text-brand-purple-dark"><Link to="/profile"><ArrowLeft /> My profile</Link></Button>
      <p className="text-sm text-brand-purple">Settings</p>
      <h1 className="mt-2 text-3xl font-semibold">Privacy</h1>
      <section className="mt-8 border-b border-brand-purple/15 pb-8">
        <h2 className="text-lg font-semibold">Chats and health entries</h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-purple-dark/70">{consented ? "You've agreed to save your chats and health entries for your care." : "You haven't agreed to save your chats and health entries."}</p>
        {!consented && <Button onClick={() => requestCareConsent()} className="mt-4 bg-brand-purple-dark text-primary-foreground hover:bg-brand-purple-deep">Review saving choice</Button>}
      </section>
      <section className="pt-8">
        <h2 className="text-lg font-semibold">Optional choices</h2>
        <p className="mt-2 text-sm text-brand-purple-dark/70">Saying no never limits your care.</p>
        {([
          ["research", "Research", "Allow your information to be used for health research."],
          ["aiTraining", "AI training", "Allow your information to be used to help improve AI models."],
        ] as const).map(([key, label, description]) => <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 border-b border-brand-purple/10 py-6">
          <div className="min-w-0"><label htmlFor={key} className="font-medium">{label}</label><p className="mt-1 text-sm leading-relaxed text-brand-purple-dark/70">{description}</p></div>
          <Switch id={key} checked={choices[key]} onCheckedChange={(value) => change(key, value)} className="shrink-0 data-[state=checked]:bg-brand-purple-dark" />
        </div>)}
      </section>
    </main>
  </div>;
}