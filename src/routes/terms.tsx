import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import Navbar from "@/components/Navbar";
import {
  Sparkles,
  UserCircle2,
  Stethoscope,
  ShieldCheck,
  HeartHandshake,
  Scale,
  CreditCard,
  RefreshCcw,
  Mail,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Lubin" },
      {
        name: "description",
        content:
          "The terms that govern your use of Lubin's mental health support, check-ins, and provider matching.",
      },
      { property: "og:title", content: "Terms & Conditions — Lubin" },
      {
        property: "og:description",
        content: "How Lubin works, your responsibilities, and ours.",
      },
    ],
  }),
  component: TermsPage,
});

type Item = {
  id: string;
  n: string;
  title: string;
  icon: React.ReactNode;
  body: React.ReactNode;
};

const ITEMS: Item[] = [
  {
    id: "about",
    n: "01",
    title: "About Lubin",
    icon: <Sparkles className="h-5 w-5" />,
    body: (
      <>
        Lubin is a mental wellness companion offering self-guided check-ins,
        self-discovery tools, AI chat support, and discovery of licensed
        mental health providers in the Philippines.{" "}
        <span className="font-semibold text-[#3D2E6B]">
          Lubin is not a substitute for emergency services or clinical care.
        </span>
      </>
    ),
  },
  {
    id: "eligibility",
    n: "02",
    title: "Eligibility",
    icon: <UserCircle2 className="h-5 w-5" />,
    body: (
      <>
        You must be at least 18 years old, or have parental/guardian consent
        if between 13 and 17. By using Lubin you confirm that the information
        you provide is accurate.
      </>
    ),
  },
  {
    id: "not-medical",
    n: "03",
    title: "Not a medical service",
    icon: <Stethoscope className="h-5 w-5" />,
    body: (
      <>
        Content within Lubin is for informational and supportive purposes
        only. It does not constitute medical advice, diagnosis, or treatment.
        If you are in crisis, please contact local emergency services or a
        crisis hotline immediately.
      </>
    ),
  },
  {
    id: "account",
    n: "04",
    title: "Your account",
    icon: <ShieldCheck className="h-5 w-5" />,
    body: (
      <>
        You are responsible for safeguarding your sign-in method (Google,
        Facebook, or LinkedIn) and any activity under your account. Notify us
        right away if you suspect unauthorized access.
      </>
    ),
  },
  {
    id: "providers",
    n: "05",
    title: "Provider connections",
    icon: <HeartHandshake className="h-5 w-5" />,
    body: (
      <>
        Lubin helps you discover and book sessions with independent, licensed
        providers. Lubin is not a party to the client-practitioner
        relationship and is not responsible for the care delivered by
        providers.
      </>
    ),
  },
  {
    id: "use",
    n: "06",
    title: "Acceptable use",
    icon: <Scale className="h-5 w-5" />,
    body: (
      <>
        Do not misuse the service, attempt to access other users' data, upload
        harmful content, or use Lubin for unlawful purposes. We may suspend
        accounts that violate these terms.
      </>
    ),
  },
  {
    id: "payments",
    n: "07",
    title: "Payments and refunds",
    icon: <CreditCard className="h-5 w-5" />,
    body: (
      <>
        Session fees are set by individual providers. Refunds follow the
        provider's cancellation policy as shown at checkout.
      </>
    ),
  },
  {
    id: "changes",
    n: "08",
    title: "Changes to these terms",
    icon: <RefreshCcw className="h-5 w-5" />,
    body: (
      <>
        We may update these Terms from time to time. We'll notify you of
        material changes via the app or your registered email.
      </>
    ),
  },
  {
    id: "contact",
    n: "09",
    title: "Contact",
    icon: <Mail className="h-5 w-5" />,
    body: (
      <>
        Questions? Reach us at{" "}
        <a
          href="mailto:support@lubin.ph"
          className="font-semibold text-[#7E6BAF] underline hover:text-[#3D2E6B]"
        >
          support@lubin.ph
        </a>
        .
      </>
    ),
  },
];

function TermsPage() {
  const [active, setActive] = useState<string>(ITEMS[0].id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );
    ITEMS.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#F0EAFB]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="pointer-events-none fixed -top-[10%] -right-[10%] -z-0 h-[600px] w-[600px] rounded-full bg-[#7E6BAF]/20 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-[10%] -left-[10%] -z-0 h-[600px] w-[600px] rounded-full bg-[#A89BD0]/30 blur-[120px]" />
      <Navbar />

      {/* Hero */}
      <header className="relative z-10 mx-auto max-w-[1200px] px-4 pt-28 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-[#E3DBF5]/60 bg-gradient-to-br from-[#3D2E6B] via-[#5A468C] to-[#7E6BAF] px-8 py-12 text-white shadow-[0_30px_60px_-30px_rgba(61,46,107,0.55)] sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-[#DDD6FE]/30 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/20 backdrop-blur">
              Legal · Last updated June 23, 2026
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
              Terms &amp; Conditions
            </h1>
            <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-white/85 sm:text-base">
              The handshake between you and Lubin. Clear, plain-language terms
              for how we support your wellness — and what we ask in return.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
              <Link
                to="/privacy"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-semibold text-[#3D2E6B] shadow-md transition hover:bg-[#F0EAFB]"
              >
                Privacy Policy <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold text-white/90 ring-1 ring-white/30 transition hover:bg-white/10"
              >
                Back to profile
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto mt-10 max-w-[1200px] px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          {/* Sticky TOC */}
          <aside className="hidden lg:block">
            <nav className="sticky top-28 rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-4 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A89BD0]">
                On this page
              </p>
              <ul className="space-y-0.5">
                {ITEMS.map((i) => (
                  <li key={i.id}>
                    <a
                      href={`#${i.id}`}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                        active === i.id
                          ? "bg-[#7E6BAF]/15 font-semibold text-[#3D2E6B]"
                          : "text-[#3D2E6B]/70 hover:bg-[#7E6BAF]/8 hover:text-[#3D2E6B]"
                      }`}
                    >
                      <span className="text-[10px] font-bold tracking-wider text-[#A89BD0]">
                        {i.n}
                      </span>
                      <span className="truncate">{i.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Sections */}
          <div className="space-y-5">
            {ITEMS.map((i) => (
              <section
                key={i.id}
                id={i.id}
                className="group scroll-mt-28 rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-7 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl transition hover:border-[#7E6BAF]/40 hover:shadow-lg sm:p-9"
              >
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DDD6FE] to-[#A89BD0] text-white shadow-inner">
                    {i.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-3">
                      <span className="text-[11px] font-bold tracking-[0.2em] text-[#A89BD0]">
                        {i.n}
                      </span>
                      <h2 className="text-xl font-bold text-[#3D2E6B] sm:text-[22px]">
                        {i.title}
                      </h2>
                    </div>
                    <p className="mt-3 text-[15px] leading-relaxed text-[#3D2E6B]/80">
                      {i.body}
                    </p>
                  </div>
                </div>
              </section>
            ))}

            <div className="rounded-2xl border border-[#E3DBF5]/60 bg-gradient-to-br from-[#F0EAFB] to-[#FBF9FF] p-7 text-center shadow-md shadow-[#3D2E6B]/5 sm:p-9">
              <p className="text-sm text-[#3D2E6B]/75">
                By continuing to use Lubin, you acknowledge these Terms.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
                <Link
                  to="/privacy"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#7E6BAF] px-4 py-2 font-semibold text-white shadow-md shadow-[#A89BD0]/40 transition hover:bg-[#3D2E6B]"
                >
                  Read Privacy Policy <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/profile"
                  className="font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
                >
                  Back to profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
