// Demo helper: seeds a realistic "client shared their Health Passport"
// grant so providers/stakeholders can preview the shared-state design
// without needing a real client to complete the sharing flow.

import { createProviderGrant, revokeProviderGrant } from "@/lib/share/providerShareStore";
import type { SummaryData } from "@/lib/share/summary";
import type { Attempt } from "@/lib/patterns/types";

const DAY = 86_400_000;

function isoDate(offsetDays: number) {
  return new Date(Date.now() - offsetDays * DAY).toISOString().slice(0, 10);
}

/** Spread `count` scores between `from` and `to` across `spanDays`. */
function series(
  prefix: string,
  assessmentId: string,
  assessmentName: string,
  count: number,
  spanDays: number,
  from: number,
  to: number,
  itemCount: number,
  maxItem: number,
): Attempt[] {
  const out: Attempt[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 1 : i / (count - 1);
    const wobble = (i % 3) - 1;
    const score = Math.max(
      0,
      Math.round(from + (to - from) * t) + wobble,
    );
    // Distribute the total across items so per-item review stays plausible.
    const answers: number[] = [];
    let left = score;
    for (let q = 0; q < itemCount; q++) {
      const share = Math.min(maxItem, Math.round(left / (itemCount - q)));
      answers.push(share);
      left -= share;
    }
    out.push({
      id: `${prefix}-${i}`,
      assessmentId,
      assessmentName,
      score: answers.reduce((a, b) => a + b, 0),
      summary: "",
      takenAt: Date.now() - Math.round((1 - t) * spanDays) * DAY,
      answers,
    });
  }
  return out;
}

function buildDemoSnapshot(): SummaryData {
  const phq = series("demo-phq9", "phq-9", "Mood Check", 24, 300, 19, 11, 9, 3);
  // Keep an explicit safety-related response on an older PHQ-9 attempt so the
  // flag must survive pagination and the default collapsed state.
  const flagged = phq[6];
  if (flagged) flagged.answers = [...(flagged.answers ?? [])].map((v, i) => (i === 8 ? 1 : v));

  const attempts: Attempt[] = [
    ...phq,
    ...series("demo-gad7", "gad-7", "Worry Check", 14, 210, 14, 9, 7, 3),
    ...series("demo-who5", "who-5", "Wellbeing Check", 6, 160, 9, 14, 5, 5),
  ];

  const checkins = [
    { id: "d1", mood: 3, note: "Slept better after a walk.", date: isoDate(1) },
    { id: "d2", mood: 2, note: "Tense before work meetings.", date: isoDate(3) },
    { id: "d3", mood: 2, note: "Hard morning, easier evening.", date: isoDate(6) },
    { id: "d4", mood: 3, note: "Talked to a friend, felt lighter.", date: isoDate(9) },
    { id: "d5", mood: 2, note: "Low energy most of the day.", date: isoDate(13) },
  ];

  return {
    range: "30d",
    rangeLabel: "Last 30 days",
    dateSpan: `${isoDate(30)} – ${isoDate(0)}`,
    checkinsInRange: checkins,
    attemptsInRange: attempts,
    moodLabel: "Mostly low",
    stressLabel: "Elevated",
    directionLabel: "Improving",
    insight:
      "Recent check-ins suggest that mood has been mostly low but has eased slightly. Sleep and work pressure appear most often, while short walks and talking with a friend have been helpful.",
    themes: [
      { label: "Sleep", count: 6 },
      { label: "Work pressure", count: 5 },
      { label: "Relationships", count: 3 },
    ],
    support: { resourcesAccessed: 4, checkinsCompleted: checkins.length, appointmentsBooked: 1 },
    hasAnyData: true,
  };
}

export function seedDemoSharedGrant(input: {
  appointmentId: string;
  providerName: string;
  appointmentLabel: string;
}) {
  return createProviderGrant({
    appointmentId: input.appointmentId,
    providerName: input.providerName,
    appointmentLabel: input.appointmentLabel,
    includedKeys: ["summary", "checkins", "assessments", "conversations"],
    snapshot: buildDemoSnapshot(),
  });
}

export function clearDemoSharedGrant(appointmentId: string) {
  revokeProviderGrant(appointmentId);
}
