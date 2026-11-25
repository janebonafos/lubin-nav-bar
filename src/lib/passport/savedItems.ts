// Prototype-only: things a person chose to keep in their Health Passport
// (chats, medications, assessments, help requests, notes). Browser-local.
export type SavedKind = "chat" | "medication" | "assessment" | "help" | "note";

export type SavedItem = {
  id: string;
  kind: SavedKind;
  title: string;
  summary: string;
  source: string;
  savedAt: number;
  pinned?: boolean;
  highlights?: string[];
};

export const SAVED_KIND_LABELS: Record<SavedKind, string> = {
  chat: "Chats",
  medication: "Medications",
  assessment: "Assessments",
  help: "Help requests",
  note: "Notes",
};

const KEY = "lubin.passport.saved.v1";
const EVENT = "lubin:passport:saved";
const day = 86_400_000;

export function sampleSavedItems(now = Date.now()): SavedItem[] {
  return [
    {
      id: "s-chat-1",
      kind: "chat",
      title: "Talking through work stress",
      summary: "You noticed stress peaks on Sunday nights and agreed to try a 10-minute wind-down before bed.",
      source: "Lubin AI chat",
      savedAt: now - day,
      pinned: true,
      highlights: ["Stress is highest before the work week", "Try a short wind-down routine", "Bring this up at your next visit"],
    },
    {
      id: "s-med-1",
      kind: "medication",
      title: "Sertraline 50 mg — started",
      summary: "Once daily in the morning. Mild nausea in week one, now easing.",
      source: "Added by you",
      savedAt: now - 3 * day,
    },
    {
      id: "s-assess-1",
      kind: "assessment",
      title: "Mood & wellbeing check",
      summary: "Score 9 of 27 · Mild. Sleep and energy were the main concerns.",
      source: "Self-check",
      savedAt: now - 5 * day,
    },
    {
      id: "s-help-1",
      kind: "help",
      title: "Asked for help with sleep",
      summary: "You asked for support finding a provider for trouble falling asleep.",
      source: "Find support",
      savedAt: now - 8 * day,
    },
    {
      id: "s-note-1",
      kind: "note",
      title: "Question for Dr. Reyes",
      summary: "Can I take my medication at night instead of the morning?",
      source: "Note to self",
      savedAt: now - 10 * day,
    },
  ];
}

export function loadSavedItems(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as SavedItem[];
  } catch {}
  const seed = sampleSavedItems();
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

function write(items: SavedItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export function saveToPassport(item: Omit<SavedItem, "id" | "savedAt">): SavedItem {
  const next: SavedItem = { ...item, id: `s-${Date.now()}`, savedAt: Date.now() };
  write([next, ...loadSavedItems()]);
  return next;
}

export function removeSavedItem(id: string) {
  write(loadSavedItems().filter((i) => i.id !== id));
}

export function togglePinned(id: string) {
  write(loadSavedItems().map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i)));
}

export function subscribeSavedItems(cb: () => void) {
  window.addEventListener(EVENT, cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}
