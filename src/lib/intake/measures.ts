// Standard measures library — the questionnaires clinicians actually use for
// intake and routine outcome monitoring (measurement-based care).
//
// Selection follows what is standard in practice today:
// - UK/BACP & NHS talking therapies: CORE-10, CORE-34, YP-CORE, PHQ-9, GAD-7,
//   WSAS (functioning), SDQ / RCADS for young people.
// - US measurement-based care: PHQ-9, GAD-7, PCL-5, OQ-45, ORS/SRS (PCOMS
//   feedback-informed treatment), AUDIT-C / DAST-10, C-SSRS for risk.
// - WHO / DSM-5 cross-cutting: WHODAS 2.0, WHO-5, DASS-21, K10.
// - Specialist screens in wide routine use: ISI (sleep), EPDS (perinatal).
//
// Some of these already exist as guided checks inside Lubin (Self Discovery);
// those carry a `slug` so the client can complete them in one tap and the score
// lands in their Health Passport. The rest are recorded by the clinician.

export type MeasureCadence = "intake" | "every-session" | "periodic";

export type MeasurePurpose =
  | "General distress & outcome"
  | "Depression & anxiety"
  | "Functioning & quality of life"
  | "Trauma, sleep & specialist"
  | "Alcohol & substance use"
  | "Risk"
  | "Children & young people"
  | "Session feedback";

export type StandardMeasure = {
  id: string;
  /** Clinical short name clinicians search for. */
  code: string;
  /** Full instrument name. */
  name: string;
  purpose: MeasurePurpose;
  items: number;
  minutes: number;
  cadence: MeasureCadence;
  /** Where it is standard practice — shown to the clinician, not the client. */
  standard: string;
  /** What it tells the clinician. */
  use: string;
  /** Plain-language description shown to the client. */
  clientBlurb: string;
  /** Matching in-app check, when Lubin already has it. */
  slug?: string;
  /** Licensing note the clinician should know before switching it on. */
  licence?: string;
};

export const STANDARD_MEASURES: StandardMeasure[] = [
  // ---------- General distress & outcome ----------
  {
    id: "core-10",
    code: "CORE-10",
    name: "Clinical Outcomes in Routine Evaluation — 10 item",
    purpose: "General distress & outcome",
    items: 10,
    minutes: 2,
    cadence: "every-session",
    standard: "Standard session-by-session measure in UK talking therapies and BACP practice.",
    use: "Global psychological distress with a clinical cut-off of 11 and a reliable-change value of 6.",
    clientBlurb:
      "Ten quick questions about how you've been feeling this past week. Repeated each session so you can both see what's shifting.",
    licence: "Free for clinical use via the CORE System Trust — keep the copyright line on the form.",
  },
  {
    id: "core-34",
    code: "CORE-OM (34)",
    name: "Clinical Outcomes in Routine Evaluation — Outcome Measure",
    purpose: "General distress & outcome",
    items: 34,
    minutes: 6,
    cadence: "intake",
    standard: "The fuller intake and discharge version of CORE, used where a baseline profile is needed.",
    use: "Wellbeing, problems, functioning and risk sub-scales for a first-session baseline.",
    clientBlurb:
      "A longer set of questions at the start of care, so your clinician has a full picture to compare against later.",
    licence: "Free for clinical use via the CORE System Trust.",
  },
  {
    id: "oq-45",
    code: "OQ-45",
    name: "Outcome Questionnaire-45",
    purpose: "General distress & outcome",
    items: 45,
    minutes: 7,
    cadence: "periodic",
    standard: "Widely used US outcome tracker in measurement-based care programmes.",
    use: "Symptom distress, interpersonal relations and social role performance.",
    clientBlurb:
      "A broader check-in covering how you feel, how things are with people around you, and how work or study is going.",
    licence: "Licensed instrument — confirm your OQ Measures licence before use.",
  },

  // ---------- Depression & anxiety ----------
  {
    id: "phq-9",
    code: "PHQ-9",
    name: "Patient Health Questionnaire-9",
    purpose: "Depression & anxiety",
    items: 9,
    minutes: 3,
    cadence: "periodic",
    standard: "The depression measure in both UK talking therapies and US collaborative care minimum datasets.",
    use: "Depression severity, with item 9 as a suicidality prompt that needs follow-up.",
    clientBlurb:
      "A gentle look at how your mood has been over the past two weeks.",
    slug: "mood-check",
  },
  {
    id: "gad-7",
    code: "GAD-7",
    name: "Generalised Anxiety Disorder-7",
    purpose: "Depression & anxiety",
    items: 7,
    minutes: 2,
    cadence: "periodic",
    standard: "Paired with PHQ-9 as the standard anxiety measure in routine practice.",
    use: "Anxiety severity and change over time.",
    clientBlurb: "Seven questions about worry and unease over the past two weeks.",
    slug: "anxiety-check",
  },
  {
    id: "dass-21",
    code: "DASS-21",
    name: "Depression Anxiety Stress Scales-21",
    purpose: "Depression & anxiety",
    items: 21,
    minutes: 4,
    cadence: "intake",
    standard: "Common intake measure in Australian and Asia-Pacific practice, including PH clinics.",
    use: "Separates depression, anxiety and stress load in one pass.",
    clientBlurb:
      "Three short sets of questions covering low mood, anxiety and stress in the past week.",
  },
  {
    id: "k10",
    code: "K10",
    name: "Kessler Psychological Distress Scale",
    purpose: "Depression & anxiety",
    items: 10,
    minutes: 2,
    cadence: "intake",
    standard: "Population-standard distress screen used for referrals and service reporting.",
    use: "Non-specific distress banding for triage.",
    clientBlurb: "Ten questions about how often you've felt tense, tired or low recently.",
  },
  {
    id: "who-5",
    code: "WHO-5",
    name: "WHO-5 Wellbeing Index",
    purpose: "Depression & anxiety",
    items: 5,
    minutes: 1,
    cadence: "periodic",
    standard: "WHO-endorsed positive wellbeing measure; useful where symptom scales feel heavy.",
    use: "Wellbeing where higher scores are better — good for strengths-based reviews.",
    clientBlurb: "Five questions about the good parts of the last two weeks.",
    slug: "wellbeing-check",
  },

  // ---------- Functioning & quality of life ----------
  {
    id: "wsas",
    code: "WSAS",
    name: "Work and Social Adjustment Scale",
    purpose: "Functioning & quality of life",
    items: 5,
    minutes: 1,
    cadence: "periodic",
    standard: "Standard functioning measure alongside PHQ-9 and GAD-7 in talking therapies.",
    use: "How much symptoms interfere with work, home, social and private life.",
    clientBlurb:
      "Five questions about how much this is getting in the way of work, home life and relationships.",
  },
  {
    id: "whodas",
    code: "WHODAS 2.0",
    name: "WHO Disability Assessment Schedule 2.0 (12-item)",
    purpose: "Functioning & quality of life",
    items: 12,
    minutes: 3,
    cadence: "intake",
    standard: "The functioning measure recommended in DSM-5 assessment.",
    use: "Functioning across six life domains, comparable internationally.",
    clientBlurb:
      "Twelve questions about day-to-day activities — getting around, self-care, and taking part in things.",
  },
  {
    id: "reqol-10",
    code: "ReQoL-10",
    name: "Recovering Quality of Life — 10 item",
    purpose: "Functioning & quality of life",
    items: 10,
    minutes: 2,
    cadence: "periodic",
    standard: "Increasingly used recovery-focused quality-of-life measure in mental health services.",
    use: "Quality of life through a recovery lens rather than symptoms alone.",
    clientBlurb:
      "Ten questions about the life you want to be living, not just symptoms.",
    licence: "Free for non-commercial clinical use with registration.",
  },

  // ---------- Trauma, sleep & specialist ----------
  {
    id: "pcl-5",
    code: "PCL-5",
    name: "PTSD Checklist for DSM-5",
    purpose: "Trauma, sleep & specialist",
    items: 20,
    minutes: 5,
    cadence: "intake",
    standard: "The standard trauma symptom measure in US VA and trauma-informed practice.",
    use: "Post-traumatic stress symptoms and change during trauma-focused work.",
    clientBlurb:
      "Questions about how difficult past experiences may still be affecting you.",
    slug: "difficult-experiences-check",
  },
  {
    id: "isi",
    code: "ISI",
    name: "Insomnia Severity Index",
    purpose: "Trauma, sleep & specialist",
    items: 7,
    minutes: 2,
    cadence: "periodic",
    standard: "Standard sleep measure in CBT-I and general practice.",
    use: "Insomnia severity and treatment response.",
    clientBlurb: "A short look at how sleep and rest have been.",
    slug: "sleep-rest-check",
  },
  {
    id: "epds",
    code: "EPDS",
    name: "Edinburgh Postnatal Depression Scale",
    purpose: "Trauma, sleep & specialist",
    items: 10,
    minutes: 2,
    cadence: "intake",
    standard: "Routine perinatal screen in maternity and primary care worldwide.",
    use: "Perinatal depression, with a self-harm item requiring follow-up.",
    clientBlurb:
      "Ten questions for pregnancy or the first year after birth.",
  },

  // ---------- Alcohol & substance use ----------
  {
    id: "audit-c",
    code: "AUDIT-C",
    name: "Alcohol Use Disorders Identification Test — Consumption",
    purpose: "Alcohol & substance use",
    items: 3,
    minutes: 1,
    cadence: "intake",
    standard: "WHO-derived brief alcohol screen used routinely at intake.",
    use: "Hazardous drinking screen before prescribing or therapy planning.",
    clientBlurb: "Three questions about drinking, asked of everyone.",
    slug: "alcohol-lifestyle-check",
  },
  {
    id: "dast-10",
    code: "DAST-10",
    name: "Drug Abuse Screening Test-10",
    purpose: "Alcohol & substance use",
    items: 10,
    minutes: 2,
    cadence: "intake",
    standard: "Standard brief substance-use screen paired with AUDIT at intake.",
    use: "Non-alcohol substance use severity screen.",
    clientBlurb: "Ten yes/no questions about medication or substance use.",
  },

  // ---------- Risk ----------
  {
    id: "cssrs",
    code: "C-SSRS (Screener)",
    name: "Columbia Suicide Severity Rating Scale — screener",
    purpose: "Risk",
    items: 6,
    minutes: 2,
    cadence: "intake",
    standard: "The reference suicide-risk screen in US health systems and Joint Commission guidance.",
    use: "Structured suicide-risk screening with a defined escalation path.",
    clientBlurb:
      "A few direct questions about safety. Your clinician will go through these with you.",
    licence: "Clinician-administered — Lubin never asks these unattended.",
  },

  // ---------- Children & young people ----------
  {
    id: "yp-core",
    code: "YP-CORE",
    name: "Young Person's CORE (11-18)",
    purpose: "Children & young people",
    items: 10,
    minutes: 2,
    cadence: "every-session",
    standard: "Session-by-session measure for young people in UK services and BACP practice.",
    use: "Age-appropriate distress tracking for 11-18s.",
    clientBlurb: "Ten short questions written for young people.",
    licence: "Free via the CORE System Trust.",
  },
  {
    id: "sdq",
    code: "SDQ",
    name: "Strengths and Difficulties Questionnaire",
    purpose: "Children & young people",
    items: 25,
    minutes: 5,
    cadence: "intake",
    standard: "The most widely used child mental-health measure, with parent, teacher and self-report forms.",
    use: "Emotional, conduct, hyperactivity, peer and prosocial sub-scales.",
    clientBlurb:
      "Questions about a child or teenager's strengths and struggles, usually answered by a parent.",
  },
  {
    id: "rcads",
    code: "RCADS-25",
    name: "Revised Children's Anxiety and Depression Scale — 25 item",
    purpose: "Children & young people",
    items: 25,
    minutes: 5,
    cadence: "intake",
    standard: "Standard child anxiety and depression measure in CAMHS-style services.",
    use: "Anxiety and low-mood sub-scales for children and teens.",
    clientBlurb: "Questions about worry and mood, written for children and teens.",
  },

  // ---------- Session feedback ----------
  {
    id: "ors",
    code: "ORS",
    name: "Outcome Rating Scale (PCOMS)",
    purpose: "Session feedback",
    items: 4,
    minutes: 1,
    cadence: "every-session",
    standard: "Half of PCOMS feedback-informed treatment; four sliders at the start of each session.",
    use: "Client-rated wellbeing across personal, relational and social domains.",
    clientBlurb:
      "Four quick sliders at the start of a session about how the week has been.",
    licence: "Free for individual clinician use via registration with the ICCE.",
  },
  {
    id: "srs",
    code: "SRS",
    name: "Session Rating Scale (PCOMS)",
    purpose: "Session feedback",
    items: 4,
    minutes: 1,
    cadence: "every-session",
    standard: "The alliance half of PCOMS, completed at the end of each session.",
    use: "Alliance rupture detection — low scores predict drop-out.",
    clientBlurb:
      "Four sliders at the end of a session on how the session felt for you.",
    licence: "Free for individual clinician use via registration with the ICCE.",
  },
  {
    id: "wai-sr",
    code: "WAI-SR",
    name: "Working Alliance Inventory — Short Revised",
    purpose: "Session feedback",
    items: 12,
    minutes: 2,
    cadence: "periodic",
    standard: "Common research-grade alliance measure used periodically in practice.",
    use: "Goal, task and bond components of the therapeutic alliance.",
    clientBlurb:
      "Twelve questions about how you and your clinician are working together.",
  },
];

export const MEASURE_PURPOSES: MeasurePurpose[] = [
  "General distress & outcome",
  "Depression & anxiety",
  "Functioning & quality of life",
  "Trauma, sleep & specialist",
  "Alcohol & substance use",
  "Risk",
  "Children & young people",
  "Session feedback",
];

/** Sensible default for a new provider: the widely-expected minimum dataset. */
export const DEFAULT_MEASURE_IDS = ["core-10", "phq-9", "gad-7", "wsas"];

export function measureById(id: string): StandardMeasure | undefined {
  return STANDARD_MEASURES.find((m) => m.id === id);
}

export const CADENCE_LABEL: Record<MeasureCadence, string> = {
  intake: "At intake",
  "every-session": "Every session",
  periodic: "Every few sessions",
};
