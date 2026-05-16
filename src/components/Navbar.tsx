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
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white shadow-sm">
      <nav
        className="mx-auto flex h-[72px] w-full items-center justify-between px-5 md:px-16"
        aria-label="Main navigation"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {/* Left group: Logo + Desktop nav links */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center md:mr-12" aria-label="Lubin home">
            <img src={lubinLogo} alt="Lubin" className="h-7 w-auto" />
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex items-center px-1 py-1 text-[15px] font-medium tracking-normal text-brand-purple-dark no-underline transition-colors duration-200 hover:text-brand-purple-accent"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop CTA */}
        <a
          href="/find-provider"
          className="hidden md:inline-flex items-center justify-center rounded-lg bg-brand-purple-accent px-6 py-2.5 text-[15px] font-medium text-white transition-colors duration-200 hover:bg-[#6D28D9]"
        >
          Find Service Provider
        </a>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center text-brand-purple"
        >
          <HamburgerIcon open={open} className="h-7 w-7" />
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="md:hidden border-t border-[#E5E7EB] bg-white px-5 py-4"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          <ul className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block text-[15px] font-normal text-brand-purple no-underline transition-colors hover:text-brand-purple-dark"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/find-provider"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-lg border-[1.5px] border-brand-purple-accent bg-transparent px-5 py-2.5 text-[15px] font-medium text-brand-purple-accent transition-colors duration-200 hover:bg-brand-purple-accent hover:text-white"
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