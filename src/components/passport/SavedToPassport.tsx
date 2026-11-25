import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookmarkPlus,
  LifeBuoy,
  Lightbulb,
  MessageCircle,
  Pin,
  StickyNote,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  SAVED_KIND_LABELS,
  SAVED_KIND_SINGULAR,
  loadSavedItems,
  removeSavedItem,
  saveToPassport,
  subscribeSavedItems,
  togglePinned,
  type SavedItem,
  type SavedKind,
} from "@/lib/passport/savedItems";

const ICONS: Record<SavedKind, LucideIcon> = {
  chat: MessageCircle,
  tip: Lightbulb,
  support: LifeBuoy,
  note: StickyNote,
};

const KINDS = Object.keys(SAVED_KIND_LABELS) as SavedKind[];

function when(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SavedToPassport() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [filter, setFilter] = useState<SavedKind | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const refresh = () => setItems(loadSavedItems());
    refresh();
    return subscribeSavedItems(refresh);
  }, []);

  const shown = useMemo(() => {
    const list = filter === "all" ? items : items.filter((i) => i.kind === filter);
    return [...list].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.savedAt - a.savedAt);
  }, [items, filter]);

  return (
    <section aria-label="Lubin Saved Memories" className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-brand-purple/10 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-purple/60">Lubin &amp; you</div>
          <h3 className="font-display text-2xl text-brand-purple-dark">Lubin Saved Memories</h3>
          <p className="mt-1 max-w-md text-sm text-brand-purple-dark/65">
            Meaningful conversations, calming techniques and personal reflections you asked Lubin to keep. Scores, medications and documents stay in their own tabs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-purple-deep"
        >
          <BookmarkPlus className="h-4 w-4" /> Save a memory
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist">
        {(["all", ...KINDS] as const).map((k) => {
          const active = filter === k;
          const count = k === "all" ? items.length : items.filter((i) => i.kind === k).length;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(k)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-brand-purple text-white hover:bg-brand-purple-deep"
                  : "bg-brand-lavender/60 text-brand-purple-dark hover:bg-brand-lavender"
              }`}
            >
              {k === "all" ? "All memories" : SAVED_KIND_LABELS[k]} <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <ul className="mt-5 divide-y divide-brand-purple/10">
        {shown.length === 0 && (
          <li className="py-8 text-center text-sm text-brand-purple-dark/60">
            No memories yet. When something in a chat feels worth keeping, ask Lubin to save it.
          </li>
        )}
        {shown.map((item) => {
          const Icon = ICONS[item.kind];
          const open = openId === item.id;
          return (
            <li key={item.id} className="py-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-lavender text-brand-purple-dark">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <button type="button" onClick={() => setOpenId(open ? null : item.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-brand-purple-dark">{item.title}</span>
                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-lavender px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-purple">
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-sm text-brand-purple-dark/70 ${open ? "" : "line-clamp-1"}`}>{item.summary}</p>
                  <p className="mt-1 text-xs text-brand-purple-dark/50">
                    {SAVED_KIND_SINGULAR[item.kind]} · {item.source} · {when(item.savedAt)}
                  </p>
                </button>
              </div>
              {open && (
                <div className="ml-14 mt-3 space-y-3">
                  {item.highlights && (
                    <ul className="space-y-1.5 rounded-xl bg-brand-lavender/40 p-4 text-sm text-brand-purple-dark">
                      {item.highlights.map((h) => (
                        <li key={h} className="flex gap-2"><span className="text-brand-purple">•</span>{h}</li>
                      ))}
                    </ul>
                  )}
                  {item.related && (
                    <Link
                      to="/my-health-passport"
                      search={{ tab: item.related.tab }}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple hover:text-brand-purple-deep"
                    >
                      {item.related.label} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => togglePinned(item.id)} className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/20 px-3.5 py-1.5 text-xs font-semibold text-brand-purple-dark hover:bg-brand-lavender/60">
                      <Pin className="h-3.5 w-3.5" /> {item.pinned ? "Unpin" : "Pin for next visit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeSavedItem(item.id);
                        toast("Removed from your memories");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/20 px-3.5 py-1.5 text-xs font-semibold text-brand-purple-dark hover:bg-brand-lavender/60"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {adding && <SaveSheet onClose={() => setAdding(false)} />}
    </section>
  );
}

function SaveSheet({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<SavedKind>("note");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const ok = title.trim().length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-purple-dark/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Save a memory"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-3xl bg-white p-6 shadow-xl sm:max-w-[480px] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand-purple/60">Health Passport</div>
            <h4 className="font-display mt-1 text-xl text-brand-purple-dark">Save a memory</h4>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-brand-purple-dark/60 hover:bg-brand-lavender">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-brand-purple-dark/65">What would you like to keep?</p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {KINDS.map((k) => {
            const Icon = ICONS[k];
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[11px] font-semibold transition-colors ${
                  active ? "bg-brand-purple text-white hover:bg-brand-purple-deep" : "bg-brand-lavender/60 text-brand-purple-dark hover:bg-brand-lavender"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {SAVED_KIND_SINGULAR[k]}
              </button>
            );
          })}
        </div>
        <label className="mt-4 block text-sm font-semibold text-brand-purple-dark">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. What helped me sleep better" className="mt-1.5 w-full rounded-xl border border-brand-purple/20 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-brand-purple" />
        </label>
        <label className="mt-3 block text-sm font-semibold text-brand-purple-dark">
          Details <span className="font-normal text-brand-purple-dark/50">(optional)</span>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-brand-purple/20 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-brand-purple" />
        </label>
        <button
          type="button"
          disabled={!ok}
          onClick={() => {
            saveToPassport({ kind, title: title.trim(), summary: summary.trim() || "Saved by you", source: "Added by you" });
            toast.success("Saved to your Health Passport ✓");
            onClose();
          }}
          className="mt-5 w-full rounded-full bg-brand-purple py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-purple-deep disabled:opacity-50"
        >
          Save memory
        </button>
        <p className="mt-3 text-center text-xs text-brand-purple-dark/50">Only you can see this unless you choose to share it.</p>
      </div>
    </div>
  );
}
