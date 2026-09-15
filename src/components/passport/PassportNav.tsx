export type PassportArea =
  | "overview"
  | "visits"
  | "medications"
  | "records"
  | "wellbeing"
  | "sharing";

export const PASSPORT_AREAS: {
  id: PassportArea;
  label: string;
  short: string;
}[] = [
  { id: "overview", label: "Overview & health card", short: "Overview" },
  { id: "visits", label: "Visits", short: "Visits" },
  { id: "medications", label: "Medications", short: "Meds" },
  { id: "records", label: "Records", short: "Records" },
  { id: "wellbeing", label: "Wellbeing", short: "Wellbeing" },
  { id: "sharing", label: "Sharing", short: "Sharing" },
];

/**
 * One navigation for both Health Passport entry points. Six areas, scrollable
 * on small screens so nothing is crowded off the edge.
 */
export default function PassportNav({
  area,
  onChange,
  badges,
  dots,
}: {
  area: PassportArea;
  onChange: (area: PassportArea) => void;
  badges?: Partial<Record<PassportArea, number>>;
  dots?: Partial<Record<PassportArea, boolean>>;
}) {
  return (
    <nav
      aria-label="Health Passport areas"
      className="-mx-5 mt-8 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
    >
      <div className="flex min-w-max border-b border-brand-purple/15 sm:min-w-0">
        {PASSPORT_AREAS.map(({ id, label, short }) => {
          const active = area === id;
          const badge = badges?.[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? "page" : undefined}
              className={`relative inline-flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-[13px] font-semibold transition-colors ${
                active
                  ? "border-brand-purple text-brand-purple-dark"
                  : "border-transparent text-brand-purple-dark/55 hover:border-brand-purple-accent/50 hover:text-brand-purple-dark"
              }`}
            >
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
              {badge > 0 && (
                <span
                  className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand-lavender px-1.5 py-0.5 text-[10px] font-bold leading-none text-brand-purple-dark"
                >
                  {badge}
                </span>
              )}
              {badge === 0 && dots?.[id] && (
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full bg-brand-purple"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Secondary switch inside an area (for example Home / Health card). */
export function PassportSubNav<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-6 border-b border-brand-purple/10">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={`inline-flex h-10 items-center border-b-2 px-0.5 text-[12.5px] font-semibold transition-colors ${
              active
                ? "border-brand-purple text-brand-purple-dark"
                : "border-transparent text-brand-purple-dark/50 hover:text-brand-purple-dark"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
