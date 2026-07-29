import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import Navbar from "@/components/Navbar";
import { getConsent, setConsent, subscribeConsent, isDntDenied } from "@/lib/analytics/consent";
import { track } from "@/lib/analytics/events";
import {
  Database,
  Sparkles,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Baby,
  RefreshCcw,
  Mail,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Lubin" },
      {
        name: "description",
        content:
          "How Lubin collects, uses, and protects your mental wellness information.",
      },
      { property: "og:title", content: "Privacy Policy — Lubin" },
      {
        property: "og:description",
        content:
          "Your data is yours. Learn how Lubin handles your information.",
      },
    ],
  }),
  component: PrivacyPage,
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
    id: "collect",
    n: "01",
    title: "Information we collect",
    icon: <Database className="h-5 w-5" />,
    body: (
      <ul className="ml-5 list-disc space-y-2">
        <li>
          Account info from your connected sign-in (Google, Facebook,
          LinkedIn): name, email, profile photo.
        </li>
        <li>
          Profile info you provide: mobile number, photo updates, preferences.
        </li>
        <li>
          Wellness activity you create: check-ins, self-discovery results,
          chat conversations, shared summaries.
        </li>
        <li>
          Usage and device data needed to operate the service securely.
        </li>
      </ul>
    ),
  },
  {
    id: "use",
    n: "02",
    title: "How we use your information",
    icon: <Sparkles className="h-5 w-5" />,
    body: (
      <>
        To deliver check-ins and assessments, surface relevant providers,
        personalize your experience, secure your account, and communicate
        important updates.
      </>
    ),
  },
  {
    id: "sharing",
    n: "03",
    title: "Sharing",
    icon: <Share2 className="h-5 w-5" />,
    body: (
      <>
        We only share information with providers you choose to connect with —
        and only the items you explicitly include in your shared summary.{" "}
        <span className="font-semibold text-[#3D2E6B]">
          We do not sell your personal data.
        </span>
      </>
    ),
  },
  {
    id: "security",
    n: "04",
    title: "Data security",
    icon: <ShieldCheck className="h-5 w-5" />,
    body: (
      <>
        Connections are encrypted in transit. Access to your wellness data is
        restricted to you and the providers you authorize.
      </>
    ),
  },
  {
    id: "choices",
    n: "05",
    title: "Your choices",
    icon: <SlidersHorizontal className="h-5 w-5" />,
    body: (
      <ul className="ml-5 list-disc space-y-2">
        <li>
          Update your profile any time from{" "}
          <Link
            to="/profile"
            className="font-semibold text-[#7E6BAF] underline hover:text-[#3D2E6B]"
          >
            My profile
          </Link>
          .
        </li>
        <li>
          Manage which social account is connected for sign-in from your
          profile.
        </li>
        <li>Request a copy or deletion of your data by emailing us.</li>
      </ul>
    ),
  },
  {
    id: "children",
    n: "06",
    title: "Children",
    icon: <Baby className="h-5 w-5" />,
    body: (
      <>
        Lubin is intended for users 18 and older, or 13–17 with
        parental/guardian consent.
      </>
    ),
  },
  {
    id: "changes",
    n: "07",
    title: "Changes",
    icon: <RefreshCcw className="h-5 w-5" />,
    body: (
      <>
        We'll let you know about meaningful changes through the app or your
        registered email.
      </>
    ),
  },
  {
    id: "contact",
    n: "08",
    title: "Contact",
    icon: <Mail className="h-5 w-5" />,
    body: (
      <>
        Privacy questions? Email{" "}
        <a
          href="mailto:privacy@lubin.ph"
          className="font-semibold text-[#7E6BAF] underline hover:text-[#3D2E6B]"
        >
          privacy@lubin.ph
        </a>
        .
      </>
    ),
  },
];

function PrivacyPage() {
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

      <header className="relative z-10 mx-auto max-w-[1200px] px-4 pt-28 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-[#E3DBF5]/60 bg-gradient-to-br from-[#3D2E6B] via-[#5A468C] to-[#7E6BAF] px-8 py-12 text-white shadow-[0_30px_60px_-30px_rgba(61,46,107,0.55)] sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-[#DDD6FE]/30 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/20 backdrop-blur">
              Privacy · Last updated June 23, 2026
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-white/85 sm:text-base">
              Your trust is the foundation of Lubin. Here's what we collect,
              how we use it, and the controls you always hold.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
              <Link
                to="/terms"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-semibold text-[#3D2E6B] shadow-md transition hover:bg-[#F0EAFB]"
              >
                Terms &amp; Conditions <ArrowRight className="h-3.5 w-3.5" />
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
                    <div className="mt-3 text-[15px] leading-relaxed text-[#3D2E6B]/80">
                      {i.body}
                    </div>
                  </div>
                </div>
              </section>
            ))}

            <AnalyticsPreferences />

            <div className="rounded-2xl border border-[#E3DBF5]/60 bg-gradient-to-br from-[#F0EAFB] to-[#FBF9FF] p-7 text-center shadow-md shadow-[#3D2E6B]/5 sm:p-9">
              <p className="text-sm text-[#3D2E6B]/75">
                Your data, your call. Reach us anytime to review or remove it.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
                <Link
                  to="/terms"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#7E6BAF] px-4 py-2 font-semibold text-white shadow-md shadow-[#A89BD0]/40 transition hover:bg-[#3D2E6B]"
                >
                  Read Terms &amp; Conditions{" "}
                  <ArrowRight className="h-3.5 w-3.5" />
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
