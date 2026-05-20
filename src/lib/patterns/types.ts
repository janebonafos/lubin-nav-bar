export type PatternGroup = "core" | "emotional" | "patterns" | "lifestyle";

export type AnswerOption = {
  label: string;
  value: number;
};

export type Question = {
  text: string;
  options: AnswerOption[];
};

export type Assessment = {
  id: string; // clinical id, e.g. "phq-9"
  slug: string; // url slug, e.g. "mood-check"
  name: string; // plain-language name
  clinicalName: string; // e.g. "PHQ-9"
  group: PatternGroup;
  blurb: string; // short description for catalogue card
  introWhat: string; // "what it measures"
  introWhy: string; // why it can help
  estMinutes: number;
  lowerIsBetter: boolean;
  /** Maximum possible raw score (sum of max per question). */
  maxScore: number;
  /** Threshold above which mid-assessment "soft settle" pause appears (proportion of max). */
  softSettleThreshold?: number;
  questions: Question[];
  /** Optional summary builder: takes raw score, returns warm plain-language sentence. */
  summarize: (score: number) => string;
};

export type Attempt = {
  id: string;
  assessmentId: string;
  assessmentName: string;
  score: number;
  summary: string;
  takenAt: number;
  answers: number[];
};

export type InProgress = {
  assessmentId: string;
  answers: (number | null)[];
  currentIndex: number;
  updatedAt: number;
};

export type TrendDirection = "up" | "down" | "stable" | null;