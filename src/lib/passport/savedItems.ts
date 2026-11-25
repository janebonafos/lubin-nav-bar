// Prototype-only: "Lubin Saved Memories" — personal, non-clinical moments a person
// asked Lubin to keep. Scores, prescriptions and documents live in their own
// Passport tabs; a memory may link there via `related`. Browser-local.
export type SavedKind = "chat" | "tip" | "support" | "note";

export type RelatedTab = "progress" | "medications" | "records" | "visits";

export type SavedItem = {
  id: string;
  kind: SavedKind;
  title: string;
  summary: string;
  source: string;
  savedAt: number;
  pinned?: boolean;
  highlights?: string[];
  related?: { tab: RelatedTab; label: string };
};

export const SAVED_KIND_LABELS: Record<SavedKind, string> = {
  chat: "Chat moments",
  tip: "Helpful tips",
  support: "Support contacts",
  note: "Notes to self",
};

export const SAVED_KIND_SINGULAR: Record<SavedKind, string> = {
  chat: "Chat moment",
  tip: "Helpful tip",
  support: "Support contact",
  note: "Note to self",
};

const KEY = "lubin.passport.memories.v1";
const EVENT = "lubin:passport:saved";
const day = 86_400_000;

export function sampleSavedItems(now = Date.now()): SavedItem[] {
  return [
    {
      id: "m-chat-1",
      kind: "chat",
      title: "Sunday nights feel heavier",
      summary: "You noticed stress builds before the work week, and that naming it helped it feel smaller.",
      source: "Chat with Lubin",
      savedAt: now - day,
      pinned: true,
      highlights: ["Stress peaks on Sunday evenings", "Naming the feeling made it easier", "Worth mentioning at your next visit"],
      related: { tab: "progress", label: "See your mood check in Progress" },
    },
    {
      id: "m-tip-1",
      kind: "tip",
      title: "4-7-8 breathing before bed",
      summary: "Breathe in for 4, hold for 7, out for 8. Repeat four times when your mind won't settle.",
      source: "Tip from Lubin",
      savedAt: now - 3 * day,
    },
    {
      id: "m-tip-2",
      kind: "tip",
      title: "Take your morning dose with breakfast",
      summary: "Lubin suggested eating something first, since the nausea eased on days you did.",
      source: "Tip from Lubin",
      savedAt: now - 5 * day,
      related: { tab: "medications", label: "View your medications" },
    },
    {
      id: "m-support-1",
      kind: "support",
      title: "Sleep support near you",
      summary: "A list of providers who help with trouble falling asleep, saved for when you're ready.",
      source: "Find support",
      savedAt: now - 8 * day,
    },
    {
      id: "m-note-1",
      kind: "note",
      title: "Question for Dr. Reyes",
      summary: "Can I take my medication at night instead of the morning?",
      source: "Written by you",
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
