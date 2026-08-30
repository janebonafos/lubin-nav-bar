// "Someone else can manage this" — lets the passport owner invite a parent,
// adult child, partner or care coordinator, choose how much access they get,
// and switch into managing-on-behalf mode.
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  RELATIONSHIP_OPTIONS,
  ROLE_META,
  inviteCaregiver,
  loadActingAs,
  loadCaregivers,
  markCaregiverAccepted,
  revokeCaregiver,
  setActingAs,
  subscribeCaregivers,
  updateCaregiverRole,
  type Caregiver,
  type CaregiverRole,
} from "@/lib/passport/caregivers";

const inputBase =
  "w-full rounded-xl border border-brand-purple/15 bg-white px-3 py-2.5 text-sm text-brand-purple-dark placeholder:text-brand-purple-dark/35 outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CaregiverAccessCard({
  ownerLabel = "you",
}: {
  ownerLabel?: string;
}) {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [actingAs, setActing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState(RELATIONSHIP_OPTIONS[0]);
  const [role, setRole] = useState<CaregiverRole>("manage");
  const [justInvited, setJustInvited] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setCaregivers(loadCaregivers());
      setActing(loadActingAs());
    };
    refresh();
    return subscribeCaregivers(refresh);
  }, []);

  const activeCaregiver = useMemo(
    () => caregivers.find((c) => c.id === actingAs) ?? null,
    [caregivers, actingAs],
  );

  const canSubmit = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);

  function submit() {
    if (!canSubmit) return;
    const created = inviteCaregiver({ name, email, relationship, role });
    setJustInvited(created.name);
    setName("");
    setEmail("");
    setRelationship(RELATIONSHIP_OPTIONS[0]);
    setRole("manage");
    setFormOpen(false);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-brand-purple/12 bg-white shadow-[0_18px_50px_-30px_rgba(126,107,175,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 pb-5 md:px-8 md:pt-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-purple">
            <Users className="h-3 w-3" /> Shared care
          </span>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-brand-purple-dark md:text-[1.75rem]">
            Someone else can manage this passport
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-brand-purple-dark/65">
            A parent, adult child, partner or care coordinator can keep{" "}
            {ownerLabel === "you" ? "your" : `${ownerLabel}'s`} details up to date
            and answer what providers ask. You choose how much they can do, and
            you can remove access at any time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(126,107,175,0.8)]"
        >
          {formOpen ? "Close" : "Invite someone"}
          <UserPlus className="h-4 w-4" />
        </button>
      </div>

      {activeCaregiver && (
        <div className="mx-6 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-purple/20 bg-brand-purple/[0.06] px-4 py-3 md:mx-8">
          <p className="text-[13px] text-brand-purple-dark/80">
            <span className="font-semibold text-brand-purple-dark">
              {activeCaregiver.name}
            </span>{" "}
            is managing this passport on{" "}
            {ownerLabel === "you" ? "your" : `${ownerLabel}'s`} behalf. Providers
            see who filled each answer in.
          </p>
          <button
            type="button"
            onClick={() => setActingAs(null)}
            className="rounded-lg border border-brand-purple/25 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-brand-purple-dark"
          >
            Stop managing
          </button>
        </div>
      )}

      {justInvited && !formOpen && (
        <div className="mx-6 mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800 md:mx-8">
          <Mail className="h-4 w-4" />
          We emailed {justInvited} an invite. Nothing is visible to them until
          they accept.
        </div>
      )}

      {formOpen && (
        <div className="mx-6 mb-6 rounded-2xl border border-brand-purple/15 bg-[#FAF7FE] p-5 md:mx-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-brand-purple-dark/80">
                Their name
              </span>
              <input
                className={inputBase}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maria Santos"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-brand-purple-dark/80">
                Their email
              </span>
              <input
                className={inputBase}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-[13px] font-medium text-brand-purple-dark/80">
                How are they related?
              </span>
              <select
                className={inputBase}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              >
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(Object.keys(ROLE_META) as CaregiverRole[]).map((key) => {
              const meta = ROLE_META[key];
              const selected = role === key;
              const Icon = key === "manage" ? Pencil : Eye;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRole(key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-brand-purple bg-white ring-2 ring-brand-purple/20"
                      : "border-brand-purple/15 bg-white/70 hover:border-brand-purple/30"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-brand-purple-dark">
                    <Icon className="h-4 w-4 text-brand-purple" />
                    {meta.label}
                    {selected && <Check className="ml-auto h-4 w-4 text-brand-purple" />}
                  </span>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-brand-purple-dark/60">
                    {meta.blurb}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send invite <Mail className="h-4 w-4" />
            </button>
            <p className="text-[12px] text-brand-purple-dark/55">
              They'll confirm by email before they see anything.
            </p>
          </div>
        </div>
      )}

      {caregivers.length > 0 && (
        <ul className="divide-y divide-brand-purple/10 border-t border-brand-purple/10">
          {caregivers.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 px-6 py-4 md:px-8"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-[13px] font-bold text-brand-purple">
                {initials(c.name) || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-purple-dark">
                  {c.name}
                  <span className="ml-2 text-[12px] font-normal text-brand-purple-dark/50">
                    {c.relationship}
                  </span>
                </p>
                <p className="truncate text-[12.5px] text-brand-purple-dark/55">
                  {c.email}
                </p>
              </div>

              <span
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  c.status === "active"
                    ? "bg-brand-purple/10 text-brand-purple"
                    : "bg-brand-purple-dark/5 text-brand-purple-dark/60"
                }`}
              >
                {c.status === "active" ? "Access active" : "Invite sent"}
              </span>

              <select
                value={c.role}
                onChange={(e) =>
                  updateCaregiverRole(c.id, e.target.value as CaregiverRole)
                }
                className="rounded-lg border border-brand-purple/20 bg-white px-3 py-1.5 text-[12px] font-semibold text-brand-purple-dark outline-none"
              >
                <option value="view">{ROLE_META.view.label}</option>
                <option value="manage">{ROLE_META.manage.label}</option>
              </select>

              {c.status === "invited" ? (
                <button
                  type="button"
                  onClick={() => markCaregiverAccepted(c.id)}
                  className="rounded-lg border border-brand-purple/25 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-brand-purple-dark"
                >
                  Mark as accepted
                </button>
              ) : c.role === "manage" && actingAs !== c.id ? (
                <button
                  type="button"
                  onClick={() => setActingAs(c.id)}
                  className="rounded-lg border border-brand-purple/25 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-brand-purple-dark"
                >
                  Let them manage
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => revokeCaregiver(c.id)}
                aria-label={`Remove ${c.name}'s access`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-purple-dark/45 transition hover:bg-brand-purple-dark/5 hover:text-brand-purple-dark"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 border-t border-brand-purple/10 bg-[#FBF9FE] px-6 py-4 text-[12.5px] text-brand-purple-dark/60 md:px-8">
        <ShieldCheck className="h-4 w-4 text-brand-purple/70" />
        Access is per-person and reversible — removing someone ends their access
        immediately.
      </div>
    </section>
  );
}
