import { useState } from "react";
import { Link } from "@tanstack/react-router";
import lubinLogo from "@/assets/lubin-logo.svg";

interface NavLinkItem {
  label: string;
  href: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "FAQs", href: "/faqs" },
  { label: "Pricing", href: "/pricing" },
  { label: "My Health Passport", href: "/my-health-passport" },
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

export default function Navbar() {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 w-full px-4 pt-4"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/40 bg-white/70 px-5 py-3 shadow-[0_8px_32px_0_rgba(126,107,175,0.10)] backdrop-blur-xl md:px-8"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center" aria-label="Lubin home">
          <img src={lubinLogo} alt="Lubin" className="h-7 w-auto" />
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="group relative inline-flex items-center text-sm font-medium text-brand-purple-dark/80 no-underline transition-colors hover:text-brand-purple-dark"
              >
                <span>{link.label}</span>
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-brand-purple-accent/40 transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <a
          href="/find-provider"
          className="hidden md:inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-purple-accent to-brand-purple px-6 py-2.5 text-sm font-semibold tracking-wide text-white shadow-[0_4px_15px_rgba(124,58,237,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] active:scale-95"
        >
          Find Service Provider
        </a>

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
              <a
                href="/find-provider"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-purple-accent to-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(124,58,237,0.3)]"
              >
                Find Service Provider
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}