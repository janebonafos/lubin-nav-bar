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
    <div className="rounded-[2rem] border border-dashed border-brand-purple/20 bg-white/70 px-6 py-12 text-center sm:px-10 sm:py-16">
      {eyebrow && (
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple">
          {eyebrow}
        </span>
      )}
      <h3 className="font-display mt-3 text-2xl font-semibold leading-snug text-brand-purple-dark sm:text-3xl">
        {title}
      </h3>
      <p className="font-body mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-brand-purple-dark/60 sm:text-[15px]">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
            className="inline-flex h-11 items-center rounded-xl border border-brand-purple/20 bg-white px-5 text-[14px] font-semibold text-brand-purple-dark transition hover:bg-brand-lavender/50"
          >
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}
