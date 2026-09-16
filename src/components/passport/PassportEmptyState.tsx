/**
 * Shared empty-state design for every Health Passport tab.
 * Shows a calm, brand-aligned placeholder when a new user has no data yet.
 *
 * Usage: pass `title`, `description`, and an optional `action` (button label +
 * onClick).  Keep copy plain-language and action-oriented — tell the user
 * what will appear here and what they can do right now.
 *
 * Preview all tab empty states at once with /my-health-passport?empty=true
 */
export default function PassportEmptyState({
  eyebrow,
  title,
  description,
  action,
  secondary,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-brand-lavender/80 bg-gradient-to-b from-white to-brand-lavender/40 px-6 py-14 text-center sm:px-12 sm:py-20">
      {/* Soft decorative orb — no icon, just a quiet brand mark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-brand-purple-accent/25 blur-3xl"
      />
      <div className="relative mx-auto max-w-md">
        {/* Thin label rule + eyebrow */}
        {eyebrow && (
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-brand-purple/30" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-purple">
              {eyebrow}
            </span>
            <span className="h-px w-8 bg-brand-purple/30" />
          </div>
        )}

        <h3 className="font-display text-2xl font-semibold leading-snug text-brand-purple-dark sm:text-[28px]">
          {title}
        </h3>
        <p className="font-body mx-auto mt-3.5 max-w-md text-[14px] leading-relaxed text-brand-purple-dark/60 sm:text-[15px]">
          {description}
        </p>

        {((action ?? secondary) && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {action && (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex h-11 items-center rounded-xl bg-brand-purple px-5 text-[14px] font-semibold text-white transition hover:bg-brand-purple-dark"
              >
                {action.label}
              </button>
            )}
            {secondary && (
              <button
                type="button"
                onClick={secondary.onClick}
                className="inline-flex h-11 items-center rounded-xl border border-brand-purple/20 bg-white/80 px-5 text-[14px] font-semibold text-brand-purple-dark transition hover:bg-brand-lavender/60"
              >
                {secondary.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
