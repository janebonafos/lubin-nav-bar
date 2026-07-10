import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions — Lubin" },
      {
        name: "description",
        content:
          "Answers to common questions about Lubin for providers and clients.",
      },
      { property: "og:title", content: "Frequently Asked Questions — Lubin" },
      {
        property: "og:description",
        content:
          "Answers to common questions about Lubin for providers and clients.",
      },
    ],
  }),
  component: FAQsPage,
});

type FAQItem = {
  question: string;
  answer: string;
};

const FAQS: FAQItem[] = [
  {
    question: "Why do I need to connect a calendar?",
    answer:
      "Connecting a calendar lets clients book available slots and keeps your schedule in sync. Without a connected calendar, your profile will not be visible on the platform and clients will not be able to book appointments with you.",
  },
  {
    question: "What happens if I disconnect my calendar?",
    answer:
      "If you disconnect your calendar and connect a different one, bookings previously synced to your old calendar will not be copied to the new calendar. Your profile will also become unavailable for booking until a new calendar is connected.",
  },
  {
    question: "Is Lubin a replacement for my clinical judgment?",
    answer:
      "No. Lubin provides decision-support context and tools to streamline your workflow. It does not replace provider judgment, diagnosis, or treatment planning.",
  },
  {
    question: "Who can see my clients' information?",
    answer:
      "Clients control what they share. Providers only see assessment details when the client consents. Standard privacy and security protections apply.",
  },
];

function FAQRow({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#EDE7F6] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#7E6BAF]/50 rounded-lg"
      >
        <span className="text-[15px] font-semibold text-[#3F3560]">
          {item.question}
        </span>
        <ChevronDown
          className={`h-5 w-5 flex-none text-[#7E6BAF] transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <p className="pb-4 text-[14px] leading-relaxed text-[#5C5470]">
          {item.answer}
        </p>
      )}
    </div>
  );
}

function FAQsPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF]">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#7E6BAF] no-underline transition hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back
        </Link>

        <header className="mt-4 rounded-3xl border border-[#EDE7F6] bg-[#EFE9FB] p-8 shadow-[0_10px_30px_-18px_rgba(126,107,175,0.05)]">
          <h1 className="text-[34px] sm:text-[40px] font-bold leading-[1.1] tracking-tight text-[#3F3560]">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-[15px] sm:text-[16px] leading-relaxed text-[#5C5470]">
            Quick answers to common questions about using Lubin.
          </p>
        </header>

        <section className="mt-5 overflow-hidden rounded-2xl border border-[#EDE7F6] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(126,107,175,0.05)]">
          {FAQS.map((item) => (
            <FAQRow key={item.question} item={item} />
          ))}
        </section>
      </div>
    </div>
  );
}
