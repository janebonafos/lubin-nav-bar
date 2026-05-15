import { useState } from "react";
import { Link } from "@tanstack/react-router";

interface NavLinkItem {
  label: string;
  to: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: "How It Works", to: "/how-it-works" },
  { label: "FAQs", to: "/faqs" },
  { label: "Pricing", to: "/pricing" },
];

function ButterflyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 12c-1.5-3-4-5-7-5-1.7 0-3 1.3-3 3 0 3 3 6 7 7-2 0-3 1-3 2s1 2 3 2c1.5 0 2.5-1 3-2 .5 1 1.5 2 3 2 2 0 3-1 3-2s-1-2-3-2c4-1 7-4 7-7 0-1.7-1.3-3-3-3-3 0-5.5 2-7 5z" />
    </svg>
  );
}

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
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-[#E5E7EB]">
      <nav
        className="mx-auto flex h-16 w-full items-center justify-between px-5 md:px-10"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-brand-purple">
          <ButterflyIcon className="h-6 w-6" />
          <span
            className="text-xl font-semibold tracking-wide"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            LUBIN
          </span>
        </Link>

        {/* Desktop nav links */}
        <ul
          className="hidden md:flex items-center gap-10"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="text-[15px] font-normal text-brand-purple-dark no-underline transition-colors hover:text-brand-purple"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <Link
          to="/find-provider"
          className="hidden md:inline-flex items-center justify-center rounded-lg border-[1.5px] border-brand-purple-accent bg-transparent px-5 py-2.5 text-[15px] font-medium text-brand-purple-accent transition-colors duration-200 hover:bg-brand-purple-accent hover:text-white"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Find Service Provider
        </Link>

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
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="block text-[15px] font-normal text-brand-purple-dark no-underline transition-colors hover:text-brand-purple"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/find-provider"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-lg border-[1.5px] border-brand-purple-accent bg-transparent px-5 py-2.5 text-[15px] font-medium text-brand-purple-accent transition-colors duration-200 hover:bg-brand-purple-accent hover:text-white"
              >
                Find Service Provider
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}