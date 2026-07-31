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

function buildDemoSnapshot(): SummaryData {
  const attempts: Attempt[] = [
    {
      id: "demo-phq9-1",
      assessmentId: "phq-9",
      assessmentName: "Mood Check",
      score: 16,
      summary: "Mood has felt heavy most days over the past two weeks.",
      takenAt: Date.now() - 34 * DAY,
      answers: [2, 2, 2, 2, 2, 2, 2, 1, 1],
    },
    {
      id: "demo-phq9-2",
      assessmentId: "phq-9",
      assessmentName: "Mood Check",
      score: 12,
      summary: "Still low, though a few lighter days are showing up.",
      takenAt: Date.now() - 17 * DAY,
      answers: [2, 2, 1, 2, 1, 2, 1, 1, 0],
    },
    {
      id: "demo-gad7-1",
      assessmentId: "gad-7",
      assessmentName: "Worry Check",
      score: 11,
      summary: "Worry has been showing up regularly through the week.",
      takenAt: Date.now() - 16 * DAY,
      answers: [2, 2, 2, 1, 2, 1, 1],
    },
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
      "Mood has been low but is trending slightly lighter. Sleep and work pressure come up most often, and short walks or talking to a friend appear to help.",
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
