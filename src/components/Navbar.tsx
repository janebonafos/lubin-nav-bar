import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Sparkles,
  ArrowRight,
  Waves,
  BookOpen,
  LifeBuoy,
  HelpCircle,
  Users,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import lubinLogo from "@/assets/lubin-logo.svg";
import AuthModal, { type AuthMode } from "@/components/AuthModal";

interface NavLinkItem {
  label: string;
  href: string;
  dropdown?: "mega" | "simple";
  simpleItems?: { label: string; href: string }[];
}

const NAV_LINKS: NavLinkItem[] = [
  { label: "How It Works", href: "/how-it-works", dropdown: "mega" },
  { label: "About", href: "/about" },
  { label: "Resources", href: "/resources" },
  { label: "My Health Passport", href: "/my-health-passport" },
  {
    label: "Help",
    href: "/help",
    dropdown: "simple",
    simpleItems: [
      { label: "Support center", href: "/help/support" },
      { label: "Contact", href: "/help/contact" },
    ],
  },
];

type DropdownItem = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
};

const HOW_IT_WORKS_COLUMNS: { heading: string; items: DropdownItem[] }[] = [
  {
    heading: "Track Your Mood",
    items: [
      {
        icon: CalendarCheck,
        title: "Daily check-ins",
        description: "Log your feelings and spot trends over time.",
        href: "/how-it-works/check-ins",
      },
      {
        icon: Sparkles,
        title: "Personal insights",
        description: "Get tailored feedback to understand your patterns.",
        href: "/how-it-works/insights",
      },
      {
        icon: ArrowRight,
        title: "Next steps",
        description: "Discover resources and actions that fit your needs.",
        href: "/how-it-works/next-steps",
      },
    ],
  },
  {
    heading: "Find Support",
    items: [
      {
        icon: Waves,
        title: "Guided exercises",
        description: "Access calming activities and mindfulness tools.",
        href: "/how-it-works/exercises",
      },
      {
        icon: BookOpen,
        title: "Resource library",
        description: "Browse articles and expert advice for self-care.",
        href: "/how-it-works/library",
      },
      {
        icon: LifeBuoy,
        title: "Crisis help",
        description: "Connect with helplines and urgent support options.",
        href: "/how-it-works/crisis",
      },
    ],
  },
  {
    heading: "Explore More",
    items: [
      {
        icon: HelpCircle,
        title: "FAQs",
        description: "Answers to common mental health questions.",
        href: "/faqs",
      },
      {
        icon: Users,
        title: "Community",
        description: "Join safe spaces for sharing and support.",
        href: "/community",
      },
      {
        icon: ShieldCheck,
        title: "Privacy",
        description: "Learn how your data stays secure and private.",
        href: "/privacy",
      },
    ],
  },
];

function HamburgerIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}

function SimpleDropdown({
  items,
  onClose,
}: {
  items: { label: string; href: string }[];
  onClose: () => void;
}) {
  return (
    <div
      className="absolute left-1/2 top-full z-50 mt-3 w-56 -translate-x-1/2 animate-fade-in"
      onMouseLeave={onClose}
    >
      <div className="rounded-2xl border border-brand-purple/10 bg-white p-2 shadow-[0_20px_60px_-15px_rgba(126,107,175,0.25)]">
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={onClose}
                className="block rounded-xl px-4 py-2.5 text-[14px] font-medium text-brand-purple-dark no-underline transition-colors hover:bg-brand-purple/10 hover:text-brand-purple"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HowItWorksDropdown({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute left-1/2 top-full z-50 mt-3 w-[min(1100px,calc(100vw-2rem))] -translate-x-1/2 animate-fade-in"
      onMouseLeave={onClose}
    >
      <div className="rounded-3xl border border-brand-purple/10 bg-white p-6 shadow-[0_20px_60px_-15px_rgba(126,107,175,0.25)] md:p-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {HOW_IT_WORKS_COLUMNS.map((column) => (
            <div key={column.heading} className="flex flex-col gap-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-purple-accent">
                {column.heading}
              </h3>
              <ul className="flex flex-col gap-5">
                {column.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title}>
                      <a
                        href={item.href}
                        onClick={onClose}
                        className="group flex items-start gap-3 no-underline"
                      >
                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-purple transition-transform duration-300 group-hover:scale-110" />
                        <div className="flex flex-col">
                          <span className="text-[15px] font-semibold text-brand-purple-dark transition-colors group-hover:text-brand-purple">
                            {item.title}
                          </span>
                          <span className="text-[13px] leading-snug text-brand-purple-dark/65">
                            {item.description}
                          </span>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Promo card */}
          <a
            href="/how-it-works"
            onClick={onClose}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple-dark p-6 text-white no-underline shadow-[0_8px_24px_-8px_rgba(126,107,175,0.4)] transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(126,107,175,0.55)]"
          >
            <div>
              <h4 className="text-[22px] font-semibold leading-tight">
                Your mental health, your journey
              </h4>
              <p className="mt-3 text-[13px] leading-relaxed text-white/85">
                Start tracking, gain insights, and find support—all in one place.
              </p>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
              Learn more
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState<boolean>(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const openDropdown = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(key);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 120);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 w-full px-4 pt-4"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 rounded-full border border-white/40 bg-white/70 pl-5 pr-5 py-2 shadow-[0_8px_32px_0_rgba(126,107,175,0.10)] backdrop-blur-xl md:gap-6 md:pl-8 md:pr-6 md:py-2"
      >
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center md:mr-4" aria-label="Lubin home">
          <img src={lubinLogo} alt="Lubin" className="h-6 w-auto lg:h-7" />
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex flex-1 items-center justify-center gap-6 lg:gap-8">
          {NAV_LINKS.map((link) => {
            if (!link.dropdown) {
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="group relative inline-flex items-center whitespace-nowrap text-sm font-medium text-brand-purple-dark/80 no-underline transition-colors hover:text-brand-purple-dark"
                  >
                    <span>{link.label}</span>
                    <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-brand-purple/50 transition-all duration-300 group-hover:w-full" />
                  </a>
                </li>
              );
            }
            const isOpen = openKey === link.href;
            return (
              <li
                key={link.href}
                className="relative"
                onMouseEnter={() => openDropdown(link.href)}
                onMouseLeave={scheduleClose}
              >
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : link.href)}
                  aria-expanded={isOpen}
                  className="group relative inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-brand-purple-dark/80 transition-colors hover:text-brand-purple-dark"
                >
                  <span>{link.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                  <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-brand-purple/50 transition-all duration-300 group-hover:w-full" />
                </button>
                {isOpen && link.dropdown === "mega" && (
                  <HowItWorksDropdown onClose={() => setOpenKey(null)} />
                )}
                {isOpen && link.dropdown === "simple" && link.simpleItems && (
                  <SimpleDropdown
                    items={link.simpleItems}
                    onClose={() => setOpenKey(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden md:flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => openAuth("signin")}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-brand-purple/25 bg-white/60 px-4 py-2 text-sm font-medium text-brand-purple-dark transition-all duration-300 hover:border-brand-purple/50 hover:bg-white hover:text-brand-purple"
          >
            Sign in
          </button>
          <a
            href="/find-provider"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-brand-purple/30 bg-white/60 px-4 py-2 text-sm font-medium text-brand-purple-dark transition-all duration-300 hover:border-brand-purple/60 hover:bg-white hover:text-brand-purple"
          >
            Find Service Provider
          </a>
          <Link
            to="/chat"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-brand-purple px-5 py-2 text-sm font-semibold tracking-wide text-white no-underline shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-purple-dark hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)] active:scale-95"
          >
            Talk to Lubin
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center text-brand-purple-dark"
        >
          <HamburgerIcon open={open} className="h-6 w-6" />
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden mx-auto mt-2 max-w-6xl rounded-2xl border border-white/40 bg-white/80 px-5 py-4 shadow-[0_8px_32px_0_rgba(126,107,175,0.10)] backdrop-blur-xl">
          <ul className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block text-[15px] font-medium text-brand-purple-dark/80 no-underline transition-colors hover:text-brand-purple-dark"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openAuth("signin");
                }}
                className="inline-flex w-full items-center justify-center rounded-full border border-brand-purple/25 bg-white px-5 py-2.5 text-sm font-medium text-brand-purple-dark"
              >
                Sign in
              </button>
            </li>
            <li>
              <a
                href="/find-provider"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-full border border-brand-purple/30 bg-white px-5 py-2.5 text-sm font-medium text-brand-purple-dark"
              >
                Find Service Provider
              </a>
            </li>
            <li>
              <Link
                to="/chat"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_8px_20px_-6px_rgba(126,107,175,0.55)] transition-all duration-300 hover:bg-brand-purple-dark hover:shadow-[0_12px_24px_-8px_rgba(61,46,107,0.55)]"
              >
                Talk to Lubin
              </Link>
            </li>
          </ul>
        </div>
      )}
      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
      />
    </header>
  );
}