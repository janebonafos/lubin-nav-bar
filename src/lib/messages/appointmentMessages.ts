// Prototype-only message thread attached to an appointment.
// Stored in localStorage; every message is mirrored as a simulated email
// notification to BOTH the client and the provider, and replies always come
// back into this thread so personal email addresses are never exchanged.

export type ThreadRole = "provider" | "client";
/** Who wrote a message. "system" = automated Lubin notice (reschedule, cancel…). */
export type MessageAuthor = ThreadRole | "system";

export type AppointmentMessage = {
  id: string;
  from: MessageAuthor;
  authorName: string;
  body: string;
  at: number;
  /** Masked relay recipients notified by email for this message. */
  notified: string[];
  /** True for automated Lubin system notices. */
  system?: boolean;
};

const KEY_PREFIX = "lubin:appt-thread:";
const EVENT = "lubin:appt-thread-change";

function key(appointmentId: string) {
  return `${KEY_PREFIX}${appointmentId}`;
}

/** Masked relay address shown in the UI — never a personal inbox. */
export function relayAddress(appointmentId: string, role: ThreadRole) {
  const short = appointmentId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return `${role}-${short}@messages.lubin.care`;
}

export function getThread(appointmentId: string): AppointmentMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(appointmentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppointmentMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function sendMessage(
  appointmentId: string,
  input: { from: MessageAuthor; authorName: string; body: string; system?: boolean },
): AppointmentMessage {
  const message: AppointmentMessage = {
    id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    from: input.from,
    authorName: input.authorName,
    body: input.body.trim(),
    at: Date.now(),
    notified: [
      relayAddress(appointmentId, "client"),
      relayAddress(appointmentId, "provider"),
    ],
    ...(input.system ? { system: true } : {}),
  };
  const next = [...getThread(appointmentId), message];
  try {
    window.localStorage.setItem(key(appointmentId), JSON.stringify(next));
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(EVENT, { detail: { appointmentId } }),
    );
  } catch {
    /* noop */
  }
  return message;
}

/**
 * Automated Lubin notice posted into the thread so both parties see the same
 * change history. Mirrored by email to the client and the provider — separate
 * from the system confirmation email of the new schedule itself.
 */
export function postSystemMessage(appointmentId: string, body: string) {
  return sendMessage(appointmentId, {
    from: "system",
    authorName: "Lubin",
    body,
    system: true,
  });
}

/**
 * Prototype only: the client and provider demo lists model the same
 * real-world appointment under different ids (client "cu1" = provider "u1",
 * client "cu2" = provider "u2"). Automated trail notices are mirrored to the
 * linked thread so BOTH sides see the same reschedule / share / intake
 * history, like a real shared conversation would.
 */
const LINKED_APPOINTMENT: Record<string, string> = {
  cu1: "u1",
  u1: "cu1",
  cu2: "u2",
  u2: "cu2",
};

export function linkedAppointmentId(appointmentId: string) {
  return LINKED_APPOINTMENT[appointmentId];
}

/** Post an automated notice to the appointment AND its linked counterpart. */
export function postSystemMessageMirrored(appointmentId: string, body: string) {
  const msg = postSystemMessage(appointmentId, body);
  const linked = linkedAppointmentId(appointmentId);
  if (linked) postSystemMessage(linked, body);
  return msg;
}

export function rescheduleNotice(input: {
  byRole: ThreadRole;
  byName: string;
  previousWhen?: string;
  newWhen: string;
  timezone?: string;
  note?: string;
}) {
  const who = input.byRole === "provider" ? `${input.byName} (provider)` : input.byName;
  const lines = [
    `Appointment rescheduled by ${who}.`,
    input.previousWhen ? `Previous time: ${input.previousWhen}` : null,
    `New time: ${input.newWhen}${input.timezone ? ` (${input.timezone})` : ""}`,
    input.note ? `Note: ${input.note}` : null,
    "A confirmation email with the new schedule has been sent to both of you.",
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * Post an automated notice at most once per appointment + event key, so the
 * same milestone (intake completed, passport shared) never duplicates when a
 * component re-renders or remounts.
 */
export function postSystemMessageOnce(
  appointmentId: string,
  eventKey: string,
  body: string,
) {
  if (typeof window === "undefined") return null;
  const flag = `lubin:appt-thread-notice:${appointmentId}:${eventKey}`;
  try {
    if (window.localStorage.getItem(flag)) return null;
    window.localStorage.setItem(flag, "1");
  } catch {
    /* noop */
  }
  return postSystemMessage(appointmentId, body);
}

/** Patient shared (or updated) their Health Passport for this appointment. */
export function healthPassportSharedNotice(input: {
  patientName?: string;
  sections: string[];
  mode: "shared" | "updated";
  expiresLabel?: string;
}) {
  const who = input.patientName ?? "The patient";
  const lines = [
    input.mode === "updated"
      ? `${who} updated the Health Passport information shared for this appointment.`
      : `${who} shared their Health Passport for this appointment.`,
    input.sections.length ? `Included: ${input.sections.join(", ")}` : null,
    input.expiresLabel ? `Access ends ${input.expiresLabel}.` : null,
    "Open the appointment to view the shared summary.",
  ].filter(Boolean);
  return lines.join("\n");
}

/** Patient revoked access to a previously shared Health Passport. */
export function healthPassportRevokedNotice(patientName?: string) {
  return [
    `${patientName ?? "The patient"} turned off Health Passport sharing for this appointment.`,
    "The previously shared summary can no longer be opened.",
  ].join("\n");
}

/** Client finished the provider's session prep / intake form. */
export function intakeCompletedNotice(input: {
  patientName?: string;
  providerName: string;
  answered: number;
  total: number;
}) {
  return [
    `${input.patientName ?? "The patient"} completed the session prep form for ${input.providerName}.`,
    `${input.answered} of ${input.total} questions answered.`,
    "Both of you can view the answers on the appointment.",
  ].join("\n");
}

export function subscribeThread(appointmentId: string, handler: () => void) {
  if (typeof window === "undefined") return () => {};
  const onLocal = (e: Event) => {
    const detail = (e as CustomEvent).detail as { appointmentId?: string };
    if (!detail?.appointmentId || detail.appointmentId === appointmentId) handler();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === key(appointmentId)) handler();
  };
  window.addEventListener(EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Prototype-only demo content so the unread state is visible on first load.
 * Runs once per browser; never touches threads that already have messages.
 */
const DEMO_FLAG = "lubin:appt-thread-demo:v1";

const DEMO: Array<{
  appointmentId: string;
  from: MessageAuthor;
  authorName: string;
  body: string;
  minutesAgo: number;
}> = [
  {
    appointmentId: "cu1",
    from: "provider",
    authorName: "Dr. Camille Lazaro",
    body: "Hi Anna! Looking forward to our session today. Could you share how your sleep has been this past week?",
    minutesAgo: 90,
  },
  {
    appointmentId: "cu1",
    from: "provider",
    authorName: "Dr. Camille Lazaro",
    body: "Also, please join a few minutes early so we can start on time.",
    minutesAgo: 40,
  },
  {
    appointmentId: "cu2",
    from: "provider",
    authorName: "Coach Liam Park",
    body: "Hey! Before Monday, jot down one habit you want to work on.",
    minutesAgo: 20,
  },
];

export function seedDemoThreads() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(DEMO_FLAG)) return;
    window.localStorage.setItem(DEMO_FLAG, "1");
    const grouped = new Map<string, AppointmentMessage[]>();
    for (const item of DEMO) {
      const list = grouped.get(item.appointmentId) ?? getThread(item.appointmentId);
      list.push({
        id: `demo${item.appointmentId}${list.length}${item.minutesAgo}`,
        from: item.from,
        authorName: item.authorName,
        body: item.body,
        at: Date.now() - item.minutesAgo * 60_000,
        notified: [
          relayAddress(item.appointmentId, "client"),
          relayAddress(item.appointmentId, "provider"),
        ],
      });
      grouped.set(item.appointmentId, list);
    }
    for (const [appointmentId, list] of grouped) {
      window.localStorage.setItem(key(appointmentId), JSON.stringify(list));
      window.localStorage.removeItem(`lubin:appt-thread-seen:${appointmentId}:client`);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { appointmentId } }));
    }
  } catch {
    /* noop */
  }
}

/**
 * Demo trail notices (prototype): sample automated Lubin notices so the
 * conversation history shows what reschedules, Health Passport shares and
 * completed intake forms look like. Seeded once via its own flag, separately
 * from DEMO_FLAG, so existing browsers pick these up too.
 */
const DEMO_TRAIL_FLAG = "lubin:appt-thread-demo-trail:v2";

export function seedDemoTrailNotices() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(DEMO_TRAIL_FLAG)) return;
    window.localStorage.setItem(DEMO_TRAIL_FLAG, "1");
    const expires = new Date(Date.now() + 7 * 86_400_000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const entries: Array<{ appointmentId: string; body: string; minutesAgo: number }> = [
      {
        appointmentId: "cu1",
        minutesAgo: 60 * 6,
        body: rescheduleNotice({
          byRole: "provider",
          byName: "Dr. Camille Lazaro",
          previousWhen: "Fri, Jun 27 · 11:00 AM",
          newWhen: "Sat, Jun 28 · 3:00 PM",
          note: "Clinic schedule changed.",
        }),
      },
      {
        appointmentId: "cu1",
        minutesAgo: 60 * 3,
        body: healthPassportSharedNotice({
          patientName: "Anna Reyes",
          sections: ["Mood patterns", "Assessment results"],
          mode: "shared",
          expiresLabel: expires,
        }),
      },
      {
        appointmentId: "cu1",
        minutesAgo: 50,
        body: intakeCompletedNotice({
          patientName: "Anna Reyes",
          providerName: "Dr. Camille Lazaro",
          answered: 12,
          total: 14,
        }),
      },
      {
        appointmentId: "cu2",
        minutesAgo: 35,
        body: intakeCompletedNotice({
          patientName: "Anna Reyes",
          providerName: "Coach Liam Park",
          answered: 8,
          total: 8,
        }),
      },
      // Provider-side demo appointments (u1 = Anna Reyes, u2 = Jordan Lee).
      {
        appointmentId: "u1",
        minutesAgo: 60 * 6,
        body: rescheduleNotice({
          byRole: "provider",
          byName: "Dr. Camille Lazaro",
          previousWhen: "Fri, Jun 27 · 11:00 AM",
          newWhen: "Fri, Jun 27 · 2:00 PM",
          note: "Clinic schedule changed.",
        }),
      },
      {
        appointmentId: "u1",
        minutesAgo: 60 * 3,
        body: healthPassportSharedNotice({
          patientName: "Anna Reyes",
          sections: ["Mood patterns", "Assessment results"],
          mode: "shared",
          expiresLabel: expires,
        }),
      },
      {
        appointmentId: "u1",
        minutesAgo: 45,
        body: intakeCompletedNotice({
          patientName: "Anna Reyes",
          providerName: "Dr. Camille Lazaro",
          answered: 12,
          total: 14,
        }),
      },
      {
        appointmentId: "u2",
        minutesAgo: 30,
        body: intakeCompletedNotice({
          patientName: "Jordan Lee",
          providerName: "Dr. Camille Lazaro",
          answered: 8,
          total: 8,
        }),
      },
    ];
    const grouped = new Map<string, AppointmentMessage[]>();
    for (const item of entries) {
      const list = grouped.get(item.appointmentId) ?? getThread(item.appointmentId);
      list.push({
        id: `demotrail${item.appointmentId}${list.length}${item.minutesAgo}`,
        from: "system",
        authorName: "Lubin",
        body: item.body,
        at: Date.now() - item.minutesAgo * 60_000,
        notified: [
          relayAddress(item.appointmentId, "client"),
          relayAddress(item.appointmentId, "provider"),
        ],
        system: true,
      });
      grouped.set(item.appointmentId, list);
    }
    for (const [appointmentId, list] of grouped) {
      list.sort((a, b) => a.at - b.at);
      window.localStorage.setItem(key(appointmentId), JSON.stringify(list));
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { appointmentId } }));
    }
  } catch {
    /* noop */
  }
}

export function formatMessageTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}