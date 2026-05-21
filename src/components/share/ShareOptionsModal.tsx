import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Link as LinkIcon,
  Lock,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildShareUrl,
  createShare,
  type RecipientId,
} from "@/lib/share/shareStore";
import {
  clearSavedPin,
  getSavedPin,
  setSavedPin,
} from "@/lib/share/savedPin";
import { recipientLabel, type SummaryData } from "@/lib/share/summary";

type Mode = "menu" | "pdf" | "link" | "email";
type LinkStep = "passcode-choice" | "set-passcode" | "result";
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
        <div className="flex items-center gap-3 border-b border-[#F4F0FB] px-5 py-4 md:px-7">
          <button
            type="button"
            onClick={mode === "menu" ? onBack : () => setMode("menu")}
            aria-label="Back"
            className="rounded-full p-1.5 text-[#5A4A8A] hover:bg-[#F4F0FB] hover:text-[#3D2E6B]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F0FB] px-3 py-1 text-[11px] font-semibold text-[#7E6BAF]">
            <CheckCircle2 className="h-3 w-3" />
            Consent confirmed
          </span>
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

        <p className="border-t border-[#F4F0FB] bg-white px-5 py-3 text-center text-[11px] text-[#5A4A8A] md:px-7">
          Your provider will only see what you selected in step 1.
        </p>
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
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#F4F0FB] text-[#7E6BAF]">
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
    const t = toast.loading("Preparing your PDF…");
    const id = window.setTimeout(() => {
      toast.success("PDF ready — opening your print dialog.", { id: t });
      window.print();
    }, 700);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="py-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F4F0FB] text-[#7E6BAF]">
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
        className="mt-6 rounded-full bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2 text-sm font-semibold text-white"
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
  const [step, setStep] = useState<LinkStep>("passcode-choice");
  const [pin, setPin] = useState<string | null>(getSavedPin());
  const [shareUrl, setShareUrl] = useState<string>("");

  const finalize = (finalPin: string | null) => {
    const created = createShare({
      pin: finalPin,
      recipient,
      includedKeys,
    });
    setShareUrl(buildShareUrl(created.token));
    setStep("result");
  };

  if (step === "passcode-choice") {
    const saved = getSavedPin();
    return (
      <div>
        <h2 className="text-lg font-bold text-[#3D2E6B]">Add a passcode?</h2>
        <p className="mt-1.5 text-sm text-[#5A4A8A]">
          A short PIN keeps your link private — your provider enters it before
          viewing.
        </p>
        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => {
              if (saved) {
                setPin(saved);
                finalize(saved);
              } else {
                setStep("set-passcode");
              }
            }}
            className="flex items-start gap-3 rounded-2xl border border-[#7E6BAF]/30 bg-[#FAF8FD] p-4 text-left transition hover:border-[#7E6BAF]/60"
          >
            <Lock className="mt-0.5 h-5 w-5 flex-none text-[#7E6BAF]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#3D2E6B]">
                  Add a passcode
                </p>
                <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#166534]">
                  Recommended
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#5A4A8A]">
                {saved
                  ? `Using your saved passcode •••• — change in next step`
                  : "4-digit code provider enters before viewing."}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => finalize(null)}
            className="flex items-start gap-3 rounded-2xl border border-[#ECE7F6] bg-white p-4 text-left transition hover:border-[#B45309]/40"
          >
            <span className="mt-0.5 h-5 w-5 flex-none rounded-full bg-[#FEF3C7] text-center text-xs font-bold leading-5 text-[#B45309]">
              !
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#3D2E6B]">No passcode</p>
              <p className="mt-0.5 text-xs text-[#B45309]">
                Anyone with the link can view your summary.
              </p>
            </div>
          </button>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="mt-5 text-xs font-medium text-[#5A4A8A] hover:text-[#3D2E6B]"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (step === "set-passcode") {
    return (
      <SetPasscodeForm
        savedPin={pin}
        onCancel={() => setStep("passcode-choice")}
        onConfirm={(p, remember) => {
          if (remember) setSavedPin(p);
          else clearSavedPin();
          setPin(p);
          finalize(p);
        }}
        onSkip={() => finalize(null)}
      />
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-[#3D2E6B]">Your link is ready</h2>
      <p className="mt-1.5 text-sm text-[#5A4A8A]">
        Share this with{" "}
        <strong>{recipientLabel(recipient).toLowerCase()}</strong>. It expires in
        30 days.
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#ECE7F6] bg-[#FAF8FD] p-3">
        <code className="flex-1 truncate text-xs text-[#3D2E6B]">{shareUrl}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(shareUrl).then(
              () => toast.success("Link copied"),
              () => toast.error("Couldn't copy link"),
            );
          }}
          className="inline-flex items-center gap-1 rounded-full bg-[#7E6BAF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6A5A98]"
        >
          <Copy className="h-3.5 w-3.5" /> Copy
        </button>
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-[#ECE7F6] px-3 py-1.5 text-xs font-semibold text-[#5A4A8A] hover:text-[#3D2E6B]"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
      </div>

      {pin && (
        <p className="mt-3 text-xs text-[#5A4A8A]">
          Passcode set: <strong>••••</strong>. Share it separately with your
          provider.
        </p>
      )}

      <p className="mt-4 text-[11px] italic text-[#5A4A8A]">
        Note: this link is stored on this device only.
      </p>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2 text-sm font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function SetPasscodeForm({
  savedPin,
  onCancel,
  onConfirm,
  onSkip,
}: {
  savedPin: string | null;
  onCancel: () => void;
  onConfirm: (pin: string, remember: boolean) => void;
  onSkip: () => void;
}) {
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!/^\d{4}$/.test(pin1)) {
      setError("Passcode must be 4 digits.");
      return;
    }
    if (pin1 !== pin2) {
      setError("Passcodes don't match.");
      return;
    }
    setError(null);
    onConfirm(pin1, remember);
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-[#3D2E6B]">Set a passcode</h2>
      <p className="mt-1.5 text-sm text-[#5A4A8A]">
        Use 4 digits. Share this passcode with your provider separately from
        the link.
      </p>

      {savedPin && (
        <p className="mt-3 rounded-xl border border-[#ECE7F6] bg-[#FAF8FD] px-3 py-2 text-xs text-[#5A4A8A]">
          Using your saved passcode <strong>••••</strong>.{" "}
          <button
            type="button"
            onClick={() => {
              clearSavedPin();
              setPin1("");
              setPin2("");
            }}
            className="font-semibold text-[#7E6BAF] hover:underline"
          >
            Change
          </button>
        </p>
      )}

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-[#5A4A8A]">New passcode</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={pin1}
            onChange={(e) => setPin1(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mt-1 w-full rounded-xl border border-[#ECE7F6] bg-white px-4 py-2.5 text-center text-lg font-semibold tracking-[0.5em] text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
            placeholder="••••"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[#5A4A8A]">Confirm passcode</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mt-1 w-full rounded-xl border border-[#ECE7F6] bg-white px-4 py-2.5 text-center text-lg font-semibold tracking-[0.5em] text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
            placeholder="••••"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-[#5A4A8A]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-[#C4B5FD] text-[#7E6BAF]"
          />
          Remember this passcode on this device
        </label>
        {error && (
          <p className="text-xs font-medium text-[#B45309]">{error}</p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-[#5A4A8A] hover:text-[#3D2E6B]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-medium text-[#7E6BAF] hover:underline"
          >
            Or share without a passcode
          </button>
        </div>
        <button
          type="button"
          onClick={submit}
          className="rounded-full bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Generate link
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
    const pin = getSavedPin();
    const created = createShare({ pin, recipient, includedKeys });
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
      ? `Hi,\n\nI wanted to share how I have been feeling lately. You can read my summary here:\n${url}\n${pin ? `Passcode: ${pin}\n` : ""}\nThis link expires in 30 days.\n\nThanks for being there.`
      : `Dear ${role},\n\nI use Lubin.AI to reflect on how I have been feeling. I've prepared a self-reported wellbeing summary for you:\n${url}\n${pin ? `Passcode: ${pin}\n` : ""}\nThis link expires in 30 days. The content is voluntarily shared, self-reported, and not a clinical diagnosis.\n\nThank you.`;

    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setStep("result");
  };

  if (step === "result") {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#166534]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#3D2E6B]">Email draft opened</h2>
        <p className="mt-2 text-sm text-[#5A4A8A]">
          Review the draft in your email app, then send when you're ready.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-6 rounded-full bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2 text-sm font-semibold text-white"
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
          className="rounded-full bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Open email draft
        </button>
      </div>
    </div>
  );
}