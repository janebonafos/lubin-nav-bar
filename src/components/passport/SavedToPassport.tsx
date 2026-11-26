import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  Lightbulb,
  MessageCircle,
  Pin,
  Search,
  StickyNote,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [query, setQuery] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const refresh = () => setItems(loadSavedItems());
    refresh();
    return subscribeSavedItems(refresh);
  }, []);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = items.filter((item) =>
      (filter === "all" || item.kind === filter) &&
      (!pinnedOnly || item.pinned) &&
      (!term || [item.title, item.summary, item.source, ...(item.highlights ?? [])].join(" ").toLowerCase().includes(term))
    );
    return [...list].sort((a, b) => b.savedAt - a.savedAt);
  }, [items, filter, query, pinnedOnly]);

  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = useMemo(() => shown.slice((currentPage - 1) * pageSize, currentPage * pageSize), [shown, currentPage]);
  const changePage = (next: number) => {
    setPage(next);
    setOpenId(null);
    document.getElementById("saved-memories-list")?.scrollIntoView({ block: "start" });
  };

  const groups = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    const recent = visible.filter((i) => i.savedAt >= weekAgo);
    const earlier = visible.filter((i) => i.savedAt < weekAgo);
    const range = (list: SavedItem[]) => {
      const first = list[0];
      const last = list.at(-1);
      return first && last ? `${when(last.savedAt)} – ${when(first.savedAt)}` : "";
    };
    return [
      { label: "This week", items: recent, range: range(recent) },
      { label: "Earlier", items: earlier, range: range(earlier) },
    ].filter((g) => g.items.length > 0);
  }, [visible]);

  return (
    <section id="saved-memories-list" aria-label="Lubin Saved Memories" className="scroll-mt-24 rounded-[2rem] bg-card p-6 shadow-sm ring-1 ring-brand-purple/10 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-purple/60">Lubin &amp; you</div>
          <h3 className="font-display text-2xl text-brand-purple-dark">Lubin Saved Memories</h3>
          <p className="mt-1 max-w-md text-sm text-brand-purple-dark/65">
            Meaningful conversations, calming techniques and personal reflections you asked Lubin to keep. Scores, medications and documents stay in their own tabs.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setAdding(true)}
          className="h-auto rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-brand-purple-deep"
        >
          <BookmarkPlus className="h-4 w-4" /> Save a memory
        </Button>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="absolute left-3 top-3 h-4 w-4 text-brand-purple/60" />
          <Input aria-label="Search memories" placeholder="Search memories" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); setOpenId(null); }} className="h-10 rounded-xl border-brand-purple/20 pl-9 pr-9 text-brand-purple-dark" />
          {query && <Button variant="ghost" size="icon-sm" aria-label="Clear memory search" onClick={() => { setQuery(""); setPage(1); }} className="absolute right-1 top-1 text-brand-purple-dark"><X /></Button>}
        </div>
        <Button variant="outline" aria-pressed={pinnedOnly} onClick={() => { setPinnedOnly(!pinnedOnly); setPage(1); setOpenId(null); }} className={`h-10 shrink-0 rounded-xl border-brand-purple/20 ${pinnedOnly ? "bg-brand-purple text-primary-foreground hover:bg-brand-purple-deep hover:text-primary-foreground" : "text-brand-purple-dark"}`}><Pin /> Pinned</Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist">
        {(["all", ...KINDS] as const).map((k) => {
          const active = filter === k;
          const count = k === "all" ? items.length : items.filter((i) => i.kind === k).length;
          return (
            <Button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setFilter(k); setPage(1); setOpenId(null); }}
              variant="ghost"
              className={`h-auto rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-brand-purple text-primary-foreground hover:bg-brand-purple-deep hover:text-primary-foreground"
                  : "bg-brand-lavender/60 text-brand-purple-dark hover:bg-brand-lavender"
              }`}
            >
              {k === "all" ? "All memories" : SAVED_KIND_LABELS[k]} <span className="opacity-70">{count}</span>
            </Button>
          );
        })}
      </div>

      {shown.length === 0 && (
        <p className="mt-6 py-8 text-center text-sm text-brand-purple-dark/60">
          {items.length === 0 ? "No memories yet. When something in a chat feels worth keeping, ask Lubin to save it." : "No memories match your search or filters."}
        </p>
      )}
      {groups.map((group) => (
      <div key={group.label} className="mt-7">
        <h4 className="font-display text-lg text-brand-purple-dark">{group.label}</h4>
        <p className="text-xs text-brand-purple-dark/50">{group.range}</p>
      <ul className="relative mt-4 space-y-3 pl-6 before:absolute before:bottom-4 before:left-[5px] before:top-4 before:w-px before:bg-brand-purple/25">
        {group.items.map((item) => {
          const Icon = ICONS[item.kind];
          const open = openId === item.id;
          return (
            <li key={item.id} className="relative">
              <span aria-hidden className="absolute -left-6 top-6 h-[11px] w-[11px] rounded-full border-2 border-brand-purple/50 bg-card" />
              <div className="rounded-2xl bg-card p-4 ring-1 ring-brand-purple/10 transition-shadow hover:shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-lavender text-brand-purple-dark">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <button type="button" onClick={() => setOpenId(open ? null : item.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg italic text-brand-purple-dark">“{item.title}”</span>
                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-lavender px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-purple">
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-sm text-brand-purple-dark/70 ${open ? "" : "line-clamp-1"}`}>{item.summary}</p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-brand-purple-dark/50">
                    {SAVED_KIND_SINGULAR[item.kind]} <span className="font-normal normal-case tracking-normal">· {item.source} · {when(item.savedAt)}</span>
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
              </div>
            </li>
          );
        })}
      </ul>
      </div>
      ))}

      {shown.length > 0 && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-brand-purple/10 pt-4">
        <p role="status" className="text-xs text-brand-purple-dark/65">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, shown.length)} of {shown.length} memories</p>
        {pages > 1 && <nav aria-label="Memory pages" className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" aria-label="Previous memories" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)} className="border-brand-purple/20 text-brand-purple-dark"><ChevronLeft /></Button>
          <span className="min-w-16 text-center text-xs text-brand-purple-dark">{currentPage} / {pages}</span>
          <Button variant="outline" size="icon-sm" aria-label="Next memories" disabled={currentPage === pages} onClick={() => changePage(currentPage + 1)} className="border-brand-purple/20 text-brand-purple-dark"><ChevronRight /></Button>
        </nav>}
      </div>}

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
