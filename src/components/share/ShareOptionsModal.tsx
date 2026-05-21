import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Link as LinkIcon,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildShareUrl,
  createShare,
  type RecipientId,
} from "@/lib/share/shareStore";
import { recipientLabel, type SummaryData } from "@/lib/share/summary";

type Mode = "menu" | "pdf" | "link" | "email";
type EmailStep = "form" | "result";

export default function ShareOptionsModal({
  open,
  onBack,
  onClose,
  includedKeys,
  recipient,
  summary,
}: {
  open: boolean;
  onBack: () => void;
  onClose: () => void;
  includedKeys: string[];
  recipient: RecipientId;
  summary: SummaryData;
}) {
  const [mode, setMode] = useState<Mode>("menu");

  useEffect(() => {
    if (open) setMode("menu");
  }, [open]);

  if (!open) return null;

  return (
    <section
      aria-label="Share options"
      className="overflow-hidden rounded-[28px] border border-[#ECE7F6] bg-white shadow-[0_24px_60px_-30px_rgba(74,62,127,0.18)]"
    >
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-[#F4F0FB] px-5 py-4 md:px-7">
          <button
            type="button"
            onClick={mode === "menu" ? onBack : () => setMode("menu")}
            className="inline-flex items-center gap-1.5 rounded-[12px] px-2 py-1 text-sm font-medium text-[#5A4A8A] hover:text-[#3D2E6B]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7E6BAF]">
            Share your summary
          </p>
        </div>

        <div className="px-5 py-6 md:px-7">
          {mode === "menu" && (
            <MenuView onPick={setMode} summary={summary} />
          )}
          {mode === "pdf" && (
            <PdfView onDone={onClose} />
          )}
          {mode === "link" && (
            <LinkView
              includedKeys={includedKeys}
              recipient={recipient}
              onDone={onClose}
            />
          )}
          {mode === "email" && (
            <EmailView
              includedKeys={includedKeys}
              recipient={recipient}
              onDone={onClose}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F4F0FB] bg-white px-5 py-3 md:px-7">
          <span className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#F4F0FB] px-3 py-1 text-[11px] font-semibold text-[#7E6BAF]">
            <CheckCircle2 className="h-3 w-3" />
            Consent confirmed
          </span>
          <p className="text-[11px] text-[#5A4A8A]">
            Your provider only sees what you selected in step 1.
          </p>
        </div>
      </div>
    </section>
  );
}

function MenuView({
  onPick,
  summary,
}: {
  onPick: (mode: Mode) => void;
  summary: SummaryData;
}) {
  void summary;
  return (
    <div>
      <h2 className="text-xl font-bold text-[#3D2E6B]">Your summary is ready</h2>
      <p className="mt-1.5 text-sm text-[#5A4A8A]">
        Choose how to get this to your provider.
      </p>

      <div className="mt-6 grid gap-3">
        <OptionCard
          icon={<Download className="h-5 w-5" />}
          title="Download as PDF"
          description="Save to your device and share directly with your provider."
          onClick={() => onPick("pdf")}
        />
        <OptionCard
          icon={<LinkIcon className="h-5 w-5" />}
          title="Generate a shareable link"
          description="A secure link your provider can open, expires in 30 days."
          onClick={() => onPick("link")}
        />
        <OptionCard
          icon={<Mail className="h-5 w-5" />}
          title="Send via email"
          description="Enter your provider's email and we'll prepare a draft."
          onClick={() => onPick("email")}
        />
      </div>
    </div>
  );
}

function OptionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-4 rounded-2xl border border-[#ECE7F6] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#7E6BAF]/40 hover:shadow-[0_18px_40px_-22px_rgba(126,107,175,0.5)]"
    >
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-[#F4F0FB] text-[#7E6BAF]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#3D2E6B]">{title}</p>
        <p className="mt-0.5 text-xs text-[#5A4A8A]">{description}</p>
      </div>
    </button>
  );
}

function PdfView({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const toastId = "share-pdf-preparing";
    toast.loading("Preparing your PDF…", { id: toastId });
    const id = window.setTimeout(() => {
      toast.success("PDF ready — opening your print dialog.", { id: toastId });
      window.print();
    }, 700);
    return () => {
      window.clearTimeout(id);
      toast.dismiss(toastId);
    };
  }, []);
  return (
    <div className="py-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[12px] bg-[#F4F0FB] text-[#7E6BAF]">
        <Download className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-[#3D2E6B]">Preparing your PDF…</h2>
      <p className="mt-2 text-sm text-[#5A4A8A]">
        Your browser's print dialog will open in a moment — choose "Save as PDF"
        to download.
      </p>
      <button
        type="button"
        onClick={onDone}
        className="mt-6 rounded-[12px] bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2 text-sm font-semibold text-white"
      >
        Done
      </button>
    </div>
  );
}

function LinkView({
  includedKeys,
  recipient,
  onDone,
}: {
  includedKeys: string[];
  recipient: RecipientId;
  onDone: () => void;
}) {
  const shareUrl = useMemo(() => {
    const created = createShare({
      pin: null,
      recipient,
      includedKeys,
    });
    return buildShareUrl(created.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <span className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#DCFCE7] px-3 py-1 text-[11px] font-semibold text-[#166534]">
        <CheckCircle2 className="h-3 w-3" />
        Link ready
      </span>

      <h2 className="mt-3 text-xl font-bold text-[#3D2E6B]">
        Your secure link is ready
      </h2>
      <p className="mt-1.5 text-sm text-[#5A4A8A]">
        Share this link with{" "}
        <strong>{recipientLabel(recipient).toLowerCase()}</strong>. The link
        expires in 30 days.
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#ECE7F6] bg-[#FAF8FD] p-2 pl-3">
        <code className="flex-1 truncate font-mono text-xs text-[#3D2E6B]">
          {shareUrl}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(shareUrl).then(
              () => toast.success("Link copied"),
              () => toast.error("Couldn't copy link"),
            );
          }}
          className="inline-flex flex-none items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_-8px_rgba(126,107,175,0.7)] transition hover:-translate-y-0.5"
        >
          <Copy className="h-3.5 w-3.5" /> Copy link
        </button>
      </div>

      <a
        href={shareUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7E6BAF] underline-offset-2 hover:underline"
      >
        Preview what your provider will see
        <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <p className="mt-5 text-xs text-[#5A4A8A]">
        Want the full details?{" "}
        <a
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#7E6BAF] underline-offset-2 hover:underline"
        >
          View our privacy policy
        </a>
      </p>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="rounded-[12px] bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(126,107,175,0.6)] transition hover:-translate-y-0.5"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function EmailView({
  includedKeys,
  recipient,
  onDone,
}: {
  includedKeys: string[];
  recipient: RecipientId;
  onDone: () => void;
}) {
  const [step, setStep] = useState<EmailStep>("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    const created = createShare({ pin: null, recipient, includedKeys });
    const url = buildShareUrl(created.token);
    const isTrusted = recipient === "trusted";
    const role =
      recipient === "therapist"
        ? "Therapist"
        : recipient === "psychiatrist"
        ? "Psychiatrist"
        : recipient === "counselor"
        ? "Counselor"
        : recipient === "doctor"
        ? "Doctor"
        : "Provider";

    const subject = isTrusted
      ? "A short note I wanted to share"
      : `Wellbeing summary for your records`;
    const body = isTrusted
      ? `Hi,\n\nI wanted to share how I have been feeling lately. You can read my summary here:\n${url}\n\nThis link expires in 30 days.\n\nThanks for being there.`
      : `Dear ${role},\n\nI use Lubin.AI to reflect on how I have been feeling. I've prepared a self-reported wellbeing summary for you:\n${url}\n\nThis link expires in 30 days. The content is voluntarily shared, self-reported, and not a clinical diagnosis.\n\nThank you.`;

    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setStep("result");
  };

  if (step === "result") {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[12px] bg-[#DCFCE7] text-[#166534]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#3D2E6B]">Email draft opened</h2>
        <p className="mt-2 text-sm text-[#5A4A8A]">
          Review the draft in your email app, then send when you're ready.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-6 rounded-[12px] bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2 text-sm font-semibold text-white"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-[#3D2E6B]">Send via email</h2>
      <p className="mt-1.5 text-sm text-[#5A4A8A]">
        We'll prepare a draft in your email app — nothing is sent automatically.
      </p>
      <label className="mt-5 block">
        <span className="text-xs font-medium text-[#5A4A8A]">Recipient email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[#ECE7F6] bg-white px-4 py-2.5 text-sm text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
          placeholder="provider@example.com"
          maxLength={254}
        />
      </label>
      {error && <p className="mt-2 text-xs font-medium text-[#B45309]">{error}</p>}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(126,107,175,0.6)] transition hover:-translate-y-0.5"
        >
          Send
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}