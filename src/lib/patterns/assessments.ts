import type { Assessment, AnswerOption } from "./types";
import { warmBand } from "./scoring";

// ============================================================
// Shared option presets
// ============================================================

const FREQ_0_3: AnswerOption[] = [
  { label: "😌  Not at all", value: 0 },
  { label: "🙂  Several days", value: 1 },
  { label: "😐  More than half the days", value: 2 },
  { label: "😣  Nearly every day", value: 3 },
];

const FREQ_0_4_NEVER: AnswerOption[] = [
  { label: "😌  Never", value: 0 },
  { label: "🙂  Almost never", value: 1 },
  { label: "😐  Sometimes", value: 2 },
  { label: "😟  Fairly often", value: 3 },
  { label: "😣  Very often", value: 4 },
];

const FREQ_0_4_NEVER_REVERSED: AnswerOption[] = [
  { label: "😌  Never", value: 4 },
  { label: "🙂  Almost never", value: 3 },
  { label: "😐  Sometimes", value: 2 },
  { label: "😟  Fairly often", value: 1 },
  { label: "😣  Very often", value: 0 },
];

const WHO5_OPTIONS: AnswerOption[] = [
  { label: "🌧️  At no time", value: 0 },
  { label: "☁️  Some of the time", value: 1 },
  { label: "🌥️  Less than half of the time", value: 2 },
  { label: "⛅  More than half of the time", value: 3 },
  { label: "☀️  Most of the time", value: 4 },
  { label: "🌟  All of the time", value: 5 },
];

const SLEEP_REST_OPTIONS: AnswerOption[] = [
  { label: "😴  Almost never", value: 0 },
  { label: "🌙  Rarely", value: 1 },
  { label: "🌗  Sometimes", value: 2 },
  { label: "🌒  Often", value: 3 },
  { label: "🥱  Almost always", value: 4 },
];

const PCL5_OPTIONS: AnswerOption[] = [
  { label: "😌  Not at all", value: 0 },
  { label: "🙂  A little bit", value: 1 },
  { label: "😐  Moderately", value: 2 },
  { label: "😟  Quite a bit", value: 3 },
  { label: "😣  Extremely", value: 4 },
];

const OCIR_OPTIONS: AnswerOption[] = [
  { label: "😌  Not at all", value: 0 },
  { label: "🙂  A little", value: 1 },
  { label: "😐  Moderately", value: 2 },
  { label: "😟  A lot", value: 3 },
  { label: "😣  Extremely", value: 4 },
];

const ASRS_OPTIONS: AnswerOption[] = [
  { label: "😌  Never", value: 0 },
  { label: "🙂  Rarely", value: 1 },
  { label: "😐  Sometimes", value: 2 },
  { label: "😟  Often", value: 3 },
  { label: "😣  Very often", value: 4 },
];

const SPIN_OPTIONS: AnswerOption[] = [
  { label: "😌  Not at all", value: 0 },
  { label: "🙂  A little bit", value: 1 },
  { label: "😐  Somewhat", value: 2 },
  { label: "😟  Very much", value: 3 },
  { label: "😣  Extremely", value: 4 },
];

const PDSS_OPTIONS: AnswerOption[] = [
  { label: "😌  None", value: 0 },
  { label: "🙂  Mild", value: 1 },
  { label: "😐  Moderate", value: 2 },
  { label: "😟  Severe", value: 3 },
  { label: "😣  Extreme", value: 4 },
];

const YES_NO: AnswerOption[] = [
  { label: "✖️  No", value: 0 },
  { label: "✔️  Yes", value: 1 },
];

// ============================================================
// PHQ-9 — Mood Check
// ============================================================

const phq9: Assessment = {
  id: "phq-9",
  slug: "mood-check",
  name: "Mood Check",
  clinicalName: "PHQ-9",
  group: "core",
  blurb: "A gentle look at how your mood has been over the past two weeks.",
  introWhat:
    "This check looks at how your mood has been over the past two weeks — sleep, energy, appetite, and how you've felt about yourself.",
  introWhy:
    "Noticing these patterns can help you understand what kind of care or rest your mind might be asking for.",
  estMinutes: 3,
  lowerIsBetter: true,
  maxScore: 27,
  softSettleThreshold: 0.55,
  questions: [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
    "Trouble concentrating on things, such as reading the newspaper or watching television",
    "Moving or speaking so slowly that other people could have noticed — or the opposite, being so fidgety or restless that you have been moving around a lot more than usual",
    "Thoughts that you would be better off dead, or of hurting yourself in some way",
  ].map((text) => ({ text, options: FREQ_0_3 })),
  summarize: (score) => warmBand(score, 27, true),
};

// ============================================================
// GAD-7 — Anxiety Check
// ============================================================

const gad7: Assessment = {
  id: "gad-7",
  slug: "anxiety-check",
  name: "Anxiety Check",
  clinicalName: "GAD-7",
  group: "core",
  blurb: "How worry and nervousness have shown up for you recently.",
  introWhat:
    "Seven questions about worry, restlessness, and unease over the past two weeks.",
  introWhy:
    "Anxiety often shows up quietly. Naming it can be the first step toward gentler days.",
  estMinutes: 2,
  lowerIsBetter: true,
  maxScore: 21,
  softSettleThreshold: 0.55,
  questions: [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it's hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid as if something awful might happen",
  ].map((text) => ({ text, options: FREQ_0_3 })),
  summarize: (score) => warmBand(score, 21, true),
};

// ============================================================
// WHO-5 — Wellbeing Check (higher = better)
// ============================================================

const who5: Assessment = {
  id: "who-5",
  slug: "wellbeing-check",
  name: "Wellbeing Check",
  clinicalName: "WHO-5",
  group: "core",
  blurb: "A short, hopeful read on how present and rested you've felt.",
  introWhat:
    "Five questions about how you've felt over the past two weeks — calm, energy, interest, and rest.",
  introWhy:
    "Wellbeing isn't only the absence of struggle. This helps you see what's already going well.",
  estMinutes: 2,
  lowerIsBetter: false,
  maxScore: 25,
  questions: [
    "I have felt cheerful and in good spirits",
    "I have felt calm and relaxed",
    "I have felt active and vigorous",
    "I woke up feeling fresh and rested",
    "My daily life has been filled with things that interest me",
  ].map((text) => ({ text, options: WHO5_OPTIONS })),
  summarize: (score) => warmBand(score, 25, false),
};

// ============================================================
// PSS-10 — Stress Check (items 4,5,7,8 reverse-keyed via reversed option values)
// ============================================================

const pss10: Assessment = {
  id: "pss-10",
  slug: "stress-check",
  name: "Stress Check",
  clinicalName: "PSS-10",
  group: "core",
  blurb: "How pressed, stretched, or in control life has felt this past month.",
  introWhat:
    "Ten questions about how unpredictable, overloaded, or in control life has felt in the past month.",
  introWhy:
    "Stress is the body's response to demand. Spotting where it's piling up is the first step to easing it.",
  estMinutes: 3,
  lowerIsBetter: true,
  maxScore: 40,
  softSettleThreshold: 0.6,
  questions: [
    { text: "In the last month, how often have you been upset because of something that happened unexpectedly?", options: FREQ_0_4_NEVER },
    { text: "In the last month, how often have you felt that you were unable to control the important things in your life?", options: FREQ_0_4_NEVER },
    { text: "In the last month, how often have you felt nervous and stressed?", options: FREQ_0_4_NEVER },
    { text: "In the last month, how often have you felt confident about your ability to handle your personal problems?", options: FREQ_0_4_NEVER_REVERSED },
    { text: "In the last month, how often have you felt that things were going your way?", options: FREQ_0_4_NEVER_REVERSED },
    { text: "In the last month, how often have you found that you could not cope with all the things you had to do?", options: FREQ_0_4_NEVER },
    { text: "In the last month, how often have you been able to control irritations in your life?", options: FREQ_0_4_NEVER_REVERSED },
    { text: "In the last month, how often have you felt that you were on top of things?", options: FREQ_0_4_NEVER_REVERSED },
    { text: "In the last month, how often have you been angered because of things that were outside of your control?", options: FREQ_0_4_NEVER },
    { text: "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?", options: FREQ_0_4_NEVER },
  ],
  summarize: (score) => warmBand(score, 40, true),
};

// ============================================================
// Sleep & Rest Check (custom, higher = better)
// ============================================================

const sleepRest: Assessment = {
  id: "sleep-rest",
  slug: "sleep-rest-check",
  name: "Sleep & Rest Check",
  clinicalName: "Sleep & Rest scale",
  group: "core",
  blurb: "How well your nights and downtime have been treating you.",
  introWhat:
    "Six questions about how restorative your sleep, mornings, and quiet moments have felt lately.",
  introWhy:
    "Rest is one of the most powerful things you can do for your mood. Small shifts in sleep often shift everything else.",
  estMinutes: 2,
  lowerIsBetter: false,
  maxScore: 24,
  questions: [
    "I fall asleep without much difficulty",
    "I stay asleep through the night",
    "I wake up feeling refreshed",
    "I have steady energy during the day",
    "I take moments to truly rest and pause",
    "I feel like my body is getting enough rest overall",
  ].map((text) => ({ text, options: SLEEP_REST_OPTIONS })),
  summarize: (score) => warmBand(score, 24, false),
};

// ============================================================
// PCL-5 — Stress & Difficult Experiences
// ============================================================

const pcl5: Assessment = {
  id: "pcl-5",
  slug: "difficult-experiences-check",
  name: "Stress & Difficult Experiences",
  clinicalName: "PCL-5",
  group: "emotional",
  blurb: "How difficult past experiences may still be showing up in your body and thoughts.",
  introWhat:
    "Twenty questions about how stressful or difficult experiences from your past may still be affecting you over the last month.",
  introWhy:
    "Hard experiences can leave echoes. This check helps name what may still need care — at your own pace.",
  estMinutes: 5,
  lowerIsBetter: true,
  maxScore: 80,
  softSettleThreshold: 0.55,
  questions: [
    "Repeated, disturbing, and unwanted memories of a stressful experience",
    "Repeated, disturbing dreams of a stressful experience",
    "Suddenly feeling or acting as if a stressful experience were actually happening again",
    "Feeling very upset when something reminded you of a stressful experience",
    "Having strong physical reactions when something reminded you of a stressful experience (for example, heart pounding, trouble breathing, sweating)",
    "Avoiding memories, thoughts, or feelings related to a stressful experience",
    "Avoiding external reminders of a stressful experience (for example, people, places, conversations, activities, objects, or situations)",
    "Trouble remembering important parts of a stressful experience",
    "Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)",
    "Blaming yourself or someone else for a stressful experience or what happened after it",
    "Having strong negative feelings such as fear, horror, anger, guilt, or shame",
    "Loss of interest in activities that you used to enjoy",
    "Feeling distant or cut off from other people",
    "Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)",
    "Irritable behavior, angry outbursts, or acting aggressively",
    "Taking too many risks or doing things that could cause you harm",
    "Being 'superalert' or watchful or on guard",
    "Feeling jumpy or easily startled",
    "Having difficulty concentrating",
    "Trouble falling or staying asleep",
  ].map((text) => ({ text, options: PCL5_OPTIONS })),
  summarize: (score) => warmBand(score, 80, true),
};

// ============================================================
// OCI-R — Unwanted Thoughts Check
// ============================================================

const ocir: Assessment = {
  id: "oci-r",
  slug: "unwanted-thoughts-check",
  name: "Unwanted Thoughts Check",
  clinicalName: "OCI-R",
  group: "emotional",
  blurb: "Patterns of intrusive thoughts and the rituals that try to quiet them.",
  introWhat:
    "Eighteen questions about repetitive thoughts, checking, washing, ordering, and the distress these patterns can cause.",
  introWhy:
    "Recognising these loops is the first step toward loosening their grip — kindly, and over time.",
  estMinutes: 4,
  lowerIsBetter: true,
  maxScore: 72,
  softSettleThreshold: 0.55,
  questions: [
    "I have saved up so many things that they get in the way",
    "I check things more often than necessary",
    "I get upset if objects are not arranged properly",
    "I feel compelled to count while I am doing things",
    "I find it difficult to touch an object when I know it has been touched by strangers or certain people",
    "I find it difficult to control my own thoughts",
    "I collect things I don't need",
    "I repeatedly check doors, windows, drawers, etc.",
    "I get upset if others change the way I have arranged things",
    "I feel I have to repeat certain numbers",
    "I sometimes have to wash or clean myself simply because I feel contaminated",
    "I am upset by unpleasant thoughts that come into my mind against my will",
    "I avoid throwing things away because I am afraid I might need them later",
    "I repeatedly check gas and water taps and light switches after turning them off",
    "I need things to be arranged in a particular way",
    "I feel that there are good and bad numbers",
    "I wash my hands more often and longer than necessary",
    "I frequently get nasty thoughts and have difficulty in getting rid of them",
  ].map((text) => ({ text, options: OCIR_OPTIONS })),
  summarize: (score) => warmBand(score, 72, true),
};

// ============================================================
// PDSS-SR — Panic & Worry Check
// ============================================================

const pdssSr: Assessment = {
  id: "pdss-sr",
  slug: "panic-worry-check",
  name: "Panic & Worry Check",
  clinicalName: "PDSS-SR",
  group: "emotional",
  blurb: "How panic, anticipation, and avoidance have been showing up.",
  introWhat:
    "Seven questions about panic episodes, anticipation, and how they may be shaping your week.",
  introWhy:
    "Panic can feel sudden and frightening — and very hard to put into words. Naming the pattern can take some of its power away.",
  estMinutes: 3,
  lowerIsBetter: true,
  maxScore: 28,
  softSettleThreshold: 0.55,
  questions: [
    "How many panic and limited-symptom attacks did you have during the week?",
    "If you had any panic attacks during the week, how distressing (uncomfortable, frightening) were they while they were happening?",
    "During the week, how much have you worried or felt anxious about when your next panic attack would occur or about fears related to the attacks (for example, that they could mean you have a physical or mental illness or could cause you embarrassment)?",
    "During the week, were there any places or situations (e.g., crowded places, lines, supermarkets, theaters, trains, buses) you avoided, or felt afraid of (uncomfortable in, wanted to avoid or leave), because of fear of having a panic attack?",
    "During the week, were there any activities (e.g., physical exertion, sexual relations, taking a hot shower or bath, drinking coffee, watching an exciting or scary movie) that you avoided, or felt afraid of (uncomfortable doing, wanted to avoid or stop), because they caused physical sensations like those you feel during panic attacks or that you were afraid might trigger a panic attack?",
    "During the week, how much did the above symptoms altogether (panic and limited-symptom attacks, worry about attacks, and fear of situations and activities because of attacks) interfere with your ability to work or carry out your responsibilities at home?",
    "During the week, how much did panic and limited-symptom attacks, worry about attacks, and fear of situations and activities because of attacks interfere with your social life?",
  ].map((text) => ({ text, options: PDSS_OPTIONS })),
  summarize: (score) => warmBand(score, 28, true),
};

// ============================================================
// SPIN — Social Comfort Check
// ============================================================

const spin: Assessment = {
  id: "spin",
  slug: "social-comfort-check",
  name: "Social Comfort Check",
  clinicalName: "SPIN",
  group: "emotional",
  blurb: "How comfortable or guarded social situations have felt recently.",
  introWhat:
    "Seventeen questions about how you feel around other people — being watched, judged, or the centre of attention.",
  introWhy:
    "Social anxiety is common and very treatable. Noticing it is already brave.",
  estMinutes: 4,
  lowerIsBetter: true,
  maxScore: 68,
  softSettleThreshold: 0.6,
  questions: [
    "I am afraid of people in authority",
    "I am bothered by blushing in front of people",
    "Parties and social events scare me",
    "I avoid talking to people I don't know",
    "Being criticized scares me a lot",
    "I avoid doing things or speaking to people for fear of embarrassment",
    "Sweating in front of people causes me distress",
    "I avoid going to parties",
    "I avoid activities in which I am the center of attention",
    "Talking to strangers scares me",
    "I avoid having to give speeches",
    "I would do anything to avoid being criticized",
    "Heart palpitations bother me when I am around people",
    "I am afraid of doing things when people might be watching",
    "Being embarrassed or looking stupid are among my worst fears",
    "I avoid speaking to anyone in authority",
    "Trembling or shaking in front of others is distressing to me",
  ].map((text) => ({ text, options: SPIN_OPTIONS })),
  summarize: (score) => warmBand(score, 68, true),
};

// ============================================================
// MDQ — Energy & Mood Patterns (symptom checklist)
// ============================================================

const mdq: Assessment = {
  id: "mdq",
  slug: "energy-mood-patterns",
  name: "Energy & Mood Patterns",
  clinicalName: "MDQ",
  group: "patterns",
  blurb: "Big swings in energy, mood, or sleep that show up at the same time.",
  introWhat:
    "Thirteen yes/no questions about times when you may have felt much more energetic, irritable, or sped-up than usual.",
  introWhy:
    "If energy and mood swing in distinct cycles, that's useful information for any clinician you talk to later.",
  estMinutes: 3,
  lowerIsBetter: true,
  maxScore: 13,
  questions: [
    "Has there ever been a period of time when you were not your usual self and… you felt so good or so hyper that other people thought you were not your normal self, or you were so hyper that you got into trouble?",
    "…you were so irritable that you shouted at people or started fights or arguments?",
    "…you felt much more self-confident than usual?",
    "…you got much less sleep than usual and found you didn't really miss it?",
    "…you were much more talkative or spoke much faster than usual?",
    "…thoughts raced through your head or you couldn't slow your mind down?",
    "…you were so easily distracted by things around you that you had trouble concentrating or staying on track?",
    "…you had much more energy than usual?",
    "…you were much more active or did many more things than usual?",
    "…you were much more social or outgoing than usual, for example, you telephoned friends in the middle of the night?",
    "…you were much more interested in sex than usual?",
    "…you did things that were unusual for you or that other people might have thought were excessive, foolish, or risky?",
    "…spending money got you or your family into trouble?",
  ].map((text) => ({ text, options: YES_NO })),
  summarize: (score) => {
    if (score <= 3) return "Energy and mood feel fairly steady right now.";
    if (score <= 6) return "Some bigger waves of energy or mood have shown up.";
    return "There are several signs of bigger swings worth talking through with someone you trust.";
  },
};

// ============================================================
// ASRS-6 — Focus & Attention (adult ADHD screener)
// ============================================================

const asrs: Assessment = {
  id: "asrs-6",
  slug: "focus-attention-check",
  name: "Focus & Attention",
  clinicalName: "ASRS (6-item screener)",
  group: "patterns",
  blurb: "How focus, restlessness, and follow-through have been lately.",
  introWhat:
    "Six questions about attention, restlessness, and finishing tasks over the past 6 months.",
  introWhy:
    "If focus is genuinely hard, knowing that can change how kindly you talk to yourself about it.",
  estMinutes: 2,
  lowerIsBetter: true,
  maxScore: 24,
  questions: [
    "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?",
    "How often do you have difficulty getting things in order when you have to do a task that requires organization?",
    "How often do you have problems remembering appointments or obligations?",
    "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?",
    "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?",
    "How often do you feel overly active and compelled to do things, like you were driven by a motor?",
  ].map((text) => ({ text, options: ASRS_OPTIONS })),
  summarize: (score) => warmBand(score, 24, true),
};

// ============================================================
// SCOFF — Eating & Body Check
// ============================================================

const scoff: Assessment = {
  id: "scoff",
  slug: "eating-body-check",
  name: "Eating & Body Check",
  clinicalName: "SCOFF",
  group: "lifestyle",
  blurb: "Five quick questions about your relationship with food and your body.",
  introWhat:
    "Five short yes/no questions about eating habits, control, and how you feel about your body.",
  introWhy:
    "Eating patterns are deeply personal. There's no judgement here — just a kind moment to check in.",
  estMinutes: 1,
  lowerIsBetter: true,
  maxScore: 5,
  questions: [
    "Do you make yourself Sick because you feel uncomfortably full?",
    "Do you worry you have lost Control over how much you eat?",
    "Have you recently lost more than One stone (about 6 kg / 14 lb) in a three-month period?",
    "Do you believe yourself to be Fat when others say you are too thin?",
    "Would you say that Food dominates your life?",
  ].map((text) => ({ text, options: YES_NO })),
  summarize: (score) => {
    if (score <= 1) return "Your relationship with food and body sounds fairly steady.";
    return "A few signs here suggest food or body image may be weighing on you — that's worth talking through with someone you trust.";
  },
};

// ============================================================
// AUDIT — Alcohol & Lifestyle Check
// ============================================================

const AUDIT_Q1: AnswerOption[] = [
  { label: "🚫  Never", value: 0 },
  { label: "📆  Monthly or less", value: 1 },
  { label: "🗓️  2–4 times a month", value: 2 },
  { label: "📅  2–3 times a week", value: 3 },
  { label: "⏰  4 or more times a week", value: 4 },
];

const AUDIT_Q2: AnswerOption[] = [
  { label: "1 or 2", value: 0 },
  { label: "3 or 4", value: 1 },
  { label: "5 or 6", value: 2 },
  { label: "7, 8, or 9", value: 3 },
  { label: "10 or more", value: 4 },
];

const AUDIT_FREQ: AnswerOption[] = [
  { label: "🚫  Never", value: 0 },
  { label: "📆  Less than monthly", value: 1 },
  { label: "🗓️  Monthly", value: 2 },
  { label: "📅  Weekly", value: 3 },
  { label: "⏰  Daily or almost daily", value: 4 },
];

const AUDIT_LAST: AnswerOption[] = [
  { label: "✖️  No", value: 0 },
  { label: "⏳  Yes, but not in the last year", value: 2 },
  { label: "✔️  Yes, during the last year", value: 4 },
];

const audit: Assessment = {
  id: "audit",
  slug: "alcohol-lifestyle-check",
  name: "Alcohol & Lifestyle Check",
  clinicalName: "AUDIT",
  group: "lifestyle",
  blurb: "How alcohol has been fitting into your life recently.",
  introWhat:
    "Ten questions about drinking patterns and any impact on your day-to-day life over the past year.",
  introWhy:
    "There's no shame in any answer here. Honest reflection is what makes this useful.",
  estMinutes: 3,
  lowerIsBetter: true,
  maxScore: 40,
  questions: [
    { text: "How often do you have a drink containing alcohol?", options: AUDIT_Q1 },
    { text: "How many drinks containing alcohol do you have on a typical day when you are drinking?", options: AUDIT_Q2 },
    { text: "How often do you have six or more drinks on one occasion?", options: AUDIT_FREQ },
    { text: "How often during the last year have you found that you were not able to stop drinking once you had started?", options: AUDIT_FREQ },
    { text: "How often during the last year have you failed to do what was normally expected of you because of drinking?", options: AUDIT_FREQ },
    { text: "How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?", options: AUDIT_FREQ },
    { text: "How often during the last year have you had a feeling of guilt or remorse after drinking?", options: AUDIT_FREQ },
    { text: "How often during the last year have you been unable to remember what happened the night before because of your drinking?", options: AUDIT_FREQ },
    { text: "Have you or someone else been injured because of your drinking?", options: AUDIT_LAST },
    { text: "Has a relative, friend, doctor, or other health worker been concerned about your drinking or suggested you cut down?", options: AUDIT_LAST },
  ],
  summarize: (score) => warmBand(score, 40, true),
};

// ============================================================
// Export
// ============================================================

export const ASSESSMENTS: Assessment[] = [
  phq9,
  gad7,
  who5,
  pss10,
  sleepRest,
  pcl5,
  ocir,
  pdssSr,
  spin,
  mdq,
  asrs,
  scoff,
  audit,
];

export const ASSESSMENTS_BY_SLUG: Record<string, Assessment> = Object.fromEntries(
  ASSESSMENTS.map((a) => [a.slug, a]),
);

export const ASSESSMENT_IDS: string[] = ASSESSMENTS.map((a) => a.id);

export const GROUP_LABELS: Record<Assessment["group"], { title: string; subtitle: string }> = {
  core: {
    title: "Core mood & wellbeing",
    subtitle: "Start here. These five give you a steady baseline.",
  },
  emotional: {
    title: "Deeper emotional patterns",
    subtitle: "Take these only when you feel ready. They go a little deeper.",
  },
  patterns: {
    title: "Energy, focus & patterns",
    subtitle: "How your attention and energy move through your days.",
  },
  lifestyle: {
    title: "Lifestyle & body",
    subtitle: "How daily habits and the body are part of the picture.",
  },
};

/** PHQ-9 self-harm item index (0-based). Used by the crisis gate. */
export const PHQ9_SELF_HARM_INDEX = 8;