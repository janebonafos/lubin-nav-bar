import { useSyncExternalStore } from "react";

export type Interval = { id: string; start: string; end: string };
export type DayAvailability = { enabled: boolean; intervals: Interval[] };
export type WeekAvail = Record<string, DayAvailability>;

export type CalendarProvider = "google" | "outlook" | "apple" | "ical";

export type CalendarConnection = {
  provider: CalendarProvider | null;
  account: string;
};

const DEFAULT_WEEK: WeekAvail = {
  Mon: { enabled: true, intervals: [{ id: "m1", start: "09:00", end: "17:00" }] },
  Tue: { enabled: true, intervals: [{ id: "t1", start: "09:00", end: "17:00" }] },
  Wed: { enabled: true, intervals: [{ id: "w1", start: "09:00", end: "17:00" }] },
  Thu: { enabled: true, intervals: [{ id: "th1", start: "09:00", end: "17:00" }] },
  Fri: { enabled: true, intervals: [{ id: "f1", start: "09:00", end: "17:00" }] },
  Sat: { enabled: false, intervals: [] },
  Sun: { enabled: false, intervals: [] },
};

type State = {
  week: WeekAvail;
  connection: CalendarConnection;
};

let state: State = {
  week: DEFAULT_WEEK,
  connection: { provider: "google", account: "maria.santos@gmail.com" },
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const availabilityStore = {
  getState: () => state,
  setWeek(week: WeekAvail) {
    state = { ...state, week };
    emit();
  },
  setConnection(connection: CalendarConnection) {
    state = { ...state, connection };
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useAvailabilityStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    availabilityStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function formatTime12(value: string) {
  const [hStr, mStr] = value.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${period}`;
}