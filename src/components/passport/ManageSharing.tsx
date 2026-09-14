import { useEffect, useState } from "react";
import { Clock, History, Info, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { toast } from "sonner";

import { subscribeProviderShares } from "@/lib/share/providerShareStore";
import {
  expiryText,
  formatDateTime,
  listSharedAccess,
  stopAccess,
  type SharedAccess,
} from "@/lib/share/manageSharing";

/**
 * "Manage sharing": who has access, what was shared, when it expires, stop
 * access, and the access activity — all outside the Show card → Approve access
 * flow, so nothing extra is asked at a visit.
 */
export default function ManageSharing() {
  const [items, setItems] = useState<SharedAccess[]>([]);
  const [openActivity, setOpenActivity] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState<SharedAccess | null>(null);

  useEffect(() => {
    const load = () => setItems(listSharedAccess());
    load();
    return subscribeProviderShares(load);
  }, []);

  const active = items.filter((i) => i.status === "active");
  const past = items.filter((i) => i.status !== "active");

  return (
    <section className="space-y-5" aria-label="Manage sharing">
      <div className="rounded-2xl border border-[#E3DBF5]/60 bg-white/85 p-6 shadow-md shadow-[#3D2E6B]/5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h3 className="inline-flex items-center gap-2 text-[15px] font-bold text-[#3D2E6B]">
              <Users className="h-4 w-4" /> Manage sharing
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[#6F6889]">
              Helps your clinician review your medications and health history. You can see who has
              access, what you shared, when it expires, and stop it any time — no extra steps at
              your next visit.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#FDF6E7] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B4E10]">
            <Info className="h-3.5 w-3.5" /> Simulated states
          </span>
        </div>
        <p className="mt-4 rounded-xl bg-[#F3F0FA] px-4 py-3 text-[12.5px] leading-relaxed text-[#4B4570]">
          Private conversations, journals and detailed mental-health assessment answers are never
          shared automatically. You choose those separately, each time.
        </p>
      </div>

      <Group title="Who has access now" empty="No one has access right now." items={active}>
        {(access) => (
          <AccessCard
            key={access.id}
            access={access}
            openActivity={openActivity === access.id}
            onToggleActivity={() =>
              setOpenActivity(openActivity === access.id ? null : access.id)
            }
            onStop={() => setConfirmStop(access)}
          />
        )}
      </Group>

      <Group
        title="Past sharing"
        empty="Nothing here yet."
        items={past}
      >
        {(access) => (
          <AccessCard
            key={access.id}
            access={access}
            openActivity={openActivity === access.id}
            onToggleActivity={() =>
              setOpenActivity(openActivity === access.id ? null : access.id)
            }
          />
        )}
      </Group>

      {confirmStop && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#241C42]/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h4 className="text-[16px] font-bold text-[#2C2B4B]">
              Stop {confirmStop.who}'s access?
            </h4>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6F6889]">
              They will no longer be able to open what you shared. Your own records stay exactly as
              they are, and you can share again any time.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmStop(null)}
                className="inline-flex h-10 items-center rounded-[12px] border border-[#DCD4F0] px-4 text-[13px] font-semibold text-[#5B4B8A] hover:bg-[#F6F4FC]"
              >
                Keep access
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAccess(confirmStop);
                  toast.success(`${confirmStop.who}'s access stopped`);
                  setConfirmStop(null);
                  setItems(listSharedAccess());
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-[12px] bg-[#5B4A93] px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-[#4B3D80]"
              >
                <ShieldOff className="h-4 w-4" /> Stop access
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Group({
  title,
  empty,
  items,
  children,
}: {
  title: string;
  empty: string;
  items: SharedAccess[];
  children: (access: SharedAccess) => React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/80 p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A79BC7]">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-[#6F6889]">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">{items.map((access) => children(access))}</ul>
      )}
    </div>
  );
}

function AccessCard({
  access,
  openActivity,
  onToggleActivity,
  onStop,
}: {
  access: SharedAccess;
  openActivity: boolean;
  onToggleActivity: () => void;
  onStop?: () => void;
}) {
  const tone =
    access.status === "active"
      ? "bg-[#EAF6EF] text-[#256B47]"
      : access.status === "expired"
        ? "bg-[#F3F0FA] text-[#5B4B8A]"
        : "bg-[#FBEDEF] text-[#8A2F3F]";
  return (
    <li className="rounded-2xl border border-[#E3DBF5]/70 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-bold text-[#2C2B4B]">{access.who}</p>
            {access.role ? (
              <span className="text-[12px] text-[#6F6889]">{access.role}</span>
            ) : null}
            <span
              className={`rounded-[10px] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ${tone}`}
            >
              {access.status === "active" ? "Has access" : access.status === "expired" ? "Expired" : "Stopped"}
            </span>
            {access.demo ? (
              <span className="rounded-[10px] border border-[#DCD4F0] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#8A7FB0]">
                Example
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[12.5px] text-[#6F6889]">{access.context}</p>
        </div>
        {access.status === "active" && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#DCD4F0] bg-white px-3 text-[12.5px] font-semibold text-[#5B4B8A] transition hover:bg-[#F6F4FC]"
          >
            <ShieldOff className="h-3.5 w-3.5" /> Stop access
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#FBF9FF] px-4 py-3">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#A79BC7]">
            <ShieldCheck className="h-3.5 w-3.5" /> What you shared
          </p>
          <ul className="mt-1 space-y-0.5 text-[12.5px] text-[#4B4570]">
            {access.what.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-[#FBF9FF] px-4 py-3">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#A79BC7]">
            <Clock className="h-3.5 w-3.5" /> Access window
          </p>
          <p className="mt-1 text-[12.5px] text-[#4B4570]">
            Shared {formatDateTime(access.sharedAt)}
          </p>
          <p className="text-[12.5px] text-[#4B4570]">{expiryText(access)}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleActivity}
        className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3D2E6B] hover:text-[#7E6BAF]"
      >
        <History className="h-3.5 w-3.5" />
        {openActivity ? "Hide sharing activity" : "Sharing activity"}
      </button>
      {openActivity && (
        <ul className="mt-2 space-y-1.5 border-l border-[#E3DBF5] pl-4">
          {access.activity.map((a, i) => (
            <li key={i} className="text-[12.5px] text-[#4B4570]">
              <span className="font-medium text-[#3D2E6B]">{formatDateTime(a.at)}</span> — {a.text}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
