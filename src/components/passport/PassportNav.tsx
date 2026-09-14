import {
  FolderOpen,
  HeartPulse,
  IdCard,
  Pill,
  Share2,
  Stethoscope,
} from "lucide-react";

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
  icon: typeof IdCard;
}[] = [
  { id: "overview", label: "Overview & health card", short: "Overview", icon: IdCard },
  { id: "visits", label: "Visits", short: "Visits", icon: Stethoscope },
  { id: "medications", label: "Medications", short: "Meds", icon: Pill },
  { id: "records", label: "Records", short: "Records", icon: FolderOpen },
  { id: "wellbeing", label: "Wellbeing", short: "Wellbeing", icon: HeartPulse },
  { id: "sharing", label: "Sharing", short: "Sharing", icon: Share2 },
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
      <div className="flex min-w-max gap-2 rounded-2xl border border-brand-purple/15 bg-white/70 p-1.5 backdrop-blur-sm sm:min-w-0">
        {PASSPORT_AREAS.map(({ id, label, short, icon: Icon }) => {
          const active = area === id;
          const badge = badges?.[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[12px] px-3 py-2 text-[13px] font-semibold transition ${
                active
                  ? "bg-[#5B4A93] text-white shadow-sm"
                  : "text-brand-purple-dark/65 hover:bg-brand-purple/10 hover:text-brand-purple-dark"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
              {badge > 0 && (
                <span
                  className={`ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    active ? "bg-white text-[#5B4A93]" : "bg-brand-purple text-white"
                  }`}
                >
                  {badge}
                </span>
              )}
              {badge === 0 && dots?.[id] && (
                <span
                  aria-hidden
                  className={`ml-0.5 inline-block h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-brand-purple"}`}
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
    <div className="mt-4 flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={`inline-flex h-8 items-center rounded-[12px] px-3 text-[12.5px] font-semibold transition ${
              active
                ? "bg-[#5B4A93] text-white shadow-sm"
                : "border border-brand-purple/20 bg-white text-brand-purple-dark/70 hover:bg-brand-purple/10"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
