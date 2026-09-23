import { Lock, UserRound, Users } from "lucide-react";
import { formatRegisteredAt, type PassportHolder } from "@/lib/passport/holder";

/**
 * Who this Health Passport belongs to and who manages it. Both were set at
 * registration and are shown read-only — there is no control to change or
 * re-assign them from the app.
 */
export default function PassportHolderPanel({
  holder,
  compact = false,
}: {
  holder: PassportHolder;
  compact?: boolean;
}) {
  const person = holder.firstName ?? holder.registeredName ?? "them";
  const passportName = holder.isProxy
    ? holder.legalName ?? holder.firstName ?? holder.registeredName ?? "—"
    : holder.legalName ?? "You";
  const registered = formatRegisteredAt(holder.registeredAt);
  const managedBy = holder.accountHolderName ? `You · ${holder.accountHolderName}` : "You";

  if (compact) {
    return (
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-brand-purple/15 bg-white/70 px-4 py-3 backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-purple">
          {holder.isProxy ? <Users className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
          {holder.isProxy ? `${person}'s Health Passport` : "Your Health Passport"}
        </span>
        <p className="text-[13px] text-brand-purple-dark/70">
          {holder.isProxy
            ? `Managed by you as ${person}'s ${(holder.relationshipLabel ?? "representative").toLowerCase()}.`
            : "You're the person receiving care."}
        </p>
        <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-purple-dark/50">
          <Lock className="h-3 w-3" /> Set at registration
        </span>
      </div>
    );
  }

  return (
    <section
      aria-label="Who this passport belongs to"
      className="mb-6 overflow-hidden rounded-2xl border border-brand-purple/15 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-purple/10 bg-brand-purple/[0.05] px-5 py-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-purple">
          {holder.isProxy ? <Users className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
          {holder.isProxy ? "Managing for someone" : "This is your Health Passport"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-purple-dark/70 ring-1 ring-brand-purple/15">
          <Lock className="h-3 w-3" /> Locked to this person
        </span>
      </div>

      <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <Item label="Passport belongs to" value={passportName} strong />
        <Item
          label="Managed by"
          value={holder.isProxy ? managedBy : holder.accountHolderName ? `You · ${holder.accountHolderName}` : "You"}
        />
        <Item
          label="Relationship"
          value={holder.isProxy ? `${holder.relationshipLabel ?? "Representative"} of ${person}` : "Self — the person receiving care"}
        />
        <Item
          label="Recorded"
          value={registered ? `At registration · ${registered}` : "At registration"}
        />
      </dl>

      <p className="border-t border-brand-purple/10 px-5 py-3 text-[12.5px] leading-relaxed text-brand-purple-dark/60">
        {holder.isProxy
          ? `This passport was created for ${person}, not for you. Visits, medications and records are kept in ${person}'s name, and providers see you as their ${(holder.relationshipLabel ?? "representative").toLowerCase()}. Who it belongs to and your relationship can't be changed or moved to someone else here. ${person}'s name can be corrected in "About ${person}" with a recorded reason. If it was set up for the wrong person, or ${person} wants to manage it themselves, Lubin support handles that after checking identity.`
          : "Visits, medications and records are kept in your name. Who this passport belongs to can't be changed or moved to someone else here. Your name can be corrected in \"About you\" with a recorded reason."}
      </p>
    </section>
  );
}

function Item({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple/70">{label}</dt>
      <dd
        className={`mt-1 break-words text-[13.5px] leading-snug text-brand-purple-dark ${
          strong ? "font-display text-[17px] font-semibold" : "font-medium"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
