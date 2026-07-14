export type Service = {
  id: string;
  title: string;
  description: string;
  sessionType: "One on One Session" | "Group Session" | "Couples Session";
  duration: string;
  price: number;
  format: "Individual" | "Group" | "Both";
  schedule: string;
  minParticipants?: number;
  currentParticipants?: number;
  maxParticipants?: number;
};

export type SocialLink = {
  label: string;
  url: string;
};

export type Reference = {
  title: string;
  url?: string;
  description?: string;
  year?: string;
};

export type Provider = {
  id: string;
  name: string;
  title: string;
  practice: "Psychologist" | "Counselling" | "Therapist";
  tags: string[];
  bio: string;
  location: string;
  rating?: number;
  reviews?: number;
  price: number;
  currency: "PHP" | "USD";
  paymentGateway: "stripe" | "xendit";
  initials: string;
  verified?: boolean;
  expertise?: string;
  experience: number;
  languages: string[];
  services?: Service[];
  sessionModes: ("Online" | "In-person")[];
  availableDays: ("M" | "T" | "W" | "Th" | "F" | "S" | "Su")[];
  availableHours: string;
  availablePeriods: ("AM" | "PM")[];
  licenseNumber?: string;
  licenseBoard?: string;
  licenseVerifiedOn?: string;
  modalities?: string[];
  cancellationPolicy?: string;
  nextAvailable?: string;
  socialLinks?: SocialLink[];
  references?: Reference[];
};

export function currencySymbol(currency: Provider["currency"]) {
  return currency === "USD" ? "$" : "₱";
}

export function paymentGatewayName(gateway: Provider["paymentGateway"]) {
  return gateway === "stripe" ? "Stripe" : "Xendit";
}

export const PROVIDERS: Provider[] = [
  {
    id: "1",
    name: "Dr. Maria Santos",
    title: "Clinical Psychologist, PhD",
    practice: "Psychologist",
    tags: ["Anxiety", "Depression", "CBT", "Trauma"],
    bio: "Compassionate, evidence-based care for adults navigating anxiety, grief, and life transitions. Sessions in English & Filipino.",
    location: "Makati City, Metro Manila",
    rating: 4.9,
    reviews: 128,
    price: 2500,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "MS",
    verified: true,
    expertise: "Expert in Anxiety, Trauma & CBT",
    experience: 12,
    languages: ["English", "Filipino"],
    sessionModes: ["Online", "In-person"],
    availableDays: ["M", "T", "W", "Th", "F"],
    availableHours: "9am – 5pm",
    availablePeriods: ["AM", "PM"],
    licenseNumber: "PRC #0012458",
    licenseBoard: "PRC Board of Psychology",
    licenseVerifiedOn: "Mar 2025",
    modalities: ["Cognitive Behavioral Therapy (CBT)", "EMDR", "Acceptance & Commitment Therapy"],
    cancellationPolicy: "Free cancellation up to 24 hours before your session. Late cancellations are charged 50% of the session fee.",
    nextAvailable: "Tomorrow, 10:30 AM",
    socialLinks: [
      { label: "Website", url: "https://mariasantos-psych.com" },
      { label: "LinkedIn", url: "https://linkedin.com/in/maria-santos-phd" },
      { label: "Instagram", url: "https://instagram.com/dr.mariasantos" },
      { label: "Facebook", url: "https://facebook.com/mariasantospsych" },
    ],
    references: [
      { title: "Cultural Adaptations of CBT in Southeast Asia", year: "2022", description: "Published in the Asian Journal of Psychiatry" },
      { title: "Trauma-Informed Care: A Philippine Framework", year: "2020", description: "Co-authored chapter in Oxford Handbook of Global Mental Health" },
    ],
  },
  {
    id: "2",
    name: "Joshua Reyes, RPsy",
    title: "Licensed Counsellor",
    practice: "Counselling",
    tags: ["Couples", "Relationships", "LGBTQ+", "Stress"],
    bio: "Warm, non-judgmental space for couples and individuals working through relationships and self-identity.",
    location: "Quezon City, Metro Manila",
    rating: 4.8,
    reviews: 92,
    price: 1800,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "JR",
    verified: true,
    expertise: "Expert in Relationships & LGBTQ+ Support",
    experience: 9,
    languages: ["English", "Filipino"],
    sessionModes: ["Online", "In-person"],
    availableDays: ["T", "W", "Th", "S"],
    availableHours: "1pm – 8pm",
    availablePeriods: ["PM"],
    licenseNumber: "PRC #0019822",
    licenseBoard: "PRC Board of Psychology (RPsy)",
    licenseVerifiedOn: "Jan 2025",
    modalities: ["Emotionally Focused Therapy", "Gottman Method", "Narrative Therapy"],
    cancellationPolicy: "Free cancellation up to 24 hours before your session. Late cancellations are charged 50% of the session fee.",
    nextAvailable: "Thu, 2:00 PM",
    socialLinks: [
      { label: "Website", url: "https://joshuareyes-counselling.ph" },
      { label: "Twitter", url: "https://twitter.com/joshuareyes" },
      { label: "YouTube", url: "https://youtube.com/@joshuareyescounselling" },
    ],
    references: [
      { title: "Narrative Therapy with LGBTQ+ Youth in Manila", year: "2021", description: "Published in the Philippine Journal of Psychology" },
    ],
  },
  {
    id: "3",
    name: "Anna Lim, MA",
    title: "Psychotherapist",
    practice: "Therapist",
    tags: ["Burnout", "Mindfulness", "ACT", "Young adults"],
    bio: "Helping young professionals build resilience and reconnect with what matters through mindfulness-based therapy.",
    location: "BGC, Taguig",
    rating: 4.9,
    reviews: 74,
    price: 3200,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "AL",
    expertise: "Expert in Burnout & Mindfulness-Based Therapy",
    experience: 7,
    languages: ["English"],
    sessionModes: ["Online"],
    availableDays: ["M", "W", "F"],
    availableHours: "8am – 12pm",
    availablePeriods: ["AM"],
    licenseNumber: "Pending verification",
    licenseBoard: "Psychological Association of the Philippines",
    modalities: ["Acceptance & Commitment Therapy (ACT)", "Mindfulness-Based Stress Reduction"],
    cancellationPolicy: "Free cancellation up to 24 hours before your session. Late cancellations are charged 50% of the session fee.",
    nextAvailable: "Mon, 9:00 AM",
    references: [
      { title: "Mindfulness for Burnout: A Workplace Intervention Study", year: "2023", description: "Presented at the ASEAN Mental Health Summit" },
    ],
  },
  {
    id: "4",
    name: "Dr. Paolo Cruz",
    title: "Clinical Psychologist",
    practice: "Psychologist",
    tags: ["OCD", "Anxiety", "Teens", "Family"],
    bio: "Specialized in OCD and anxiety disorders for teens and adults. Tele-sessions available nationwide.",
    location: "Cebu City",
    rating: 4.7,
    reviews: 58,
    price: 2800,
    initials: "PC",
    verified: true,
    expertise: "Expert in OCD, Anxiety & Family Therapy",
    experience: 14,
    languages: ["English", "Filipino", "Cebuano"],
    sessionModes: ["Online", "In-person"],
    availableDays: ["M", "T", "W", "Th", "F", "S"],
    availableHours: "10am – 7pm",
    availablePeriods: ["AM", "PM"],
    licenseNumber: "PRC #0008741",
    licenseBoard: "PRC Board of Psychology",
    licenseVerifiedOn: "Feb 2025",
    modalities: ["Exposure & Response Prevention (ERP)", "Cognitive Behavioral Therapy", "Family Systems Therapy"],
    cancellationPolicy: "Free cancellation up to 24 hours before your session. Late cancellations are charged 50% of the session fee.",
    nextAvailable: "Today, 4:30 PM",
    socialLinks: [
      { label: "Website", url: "https://paolocruz-psych.com" },
      { label: "LinkedIn", url: "https://linkedin.com/in/paolo-cruz-phd" },
      { label: "TikTok", url: "https://tiktok.com/@drpaolocruz" },
      { label: "Instagram", url: "https://instagram.com/dr.paolocruz" },
    ],
    references: [
      { title: "ERP Protocols for OCD in Filipino Adolescents", year: "2019", description: "Published in the Journal of Child Psychology and Psychiatry" },
      { title: "Family-Based CBT: A Cebu Practice Model", year: "2021", description: "Published in the Philippine Journal of Psychology" },
    ],
  },
  {
    id: "5",
    name: "Bea Gonzales, RGC",
    title: "Guidance Counsellor",
    practice: "Counselling",
    tags: ["Students", "Career", "Anxiety"],
    bio: "Supportive counselling for students and early-career professionals navigating overwhelm and direction.",
    location: "Pasig City",
    price: 1400,
    initials: "BG",
    expertise: "Expert in Student & Career Counselling",
    experience: 5,
    languages: ["English", "Filipino"],
    sessionModes: ["Online"],
    availableDays: ["M", "T", "Th", "F"],
    availableHours: "2pm – 6pm",
    availablePeriods: ["PM"],
    licenseNumber: "PRC #0024109",
    licenseBoard: "PRC Board of Guidance & Counselling (RGC)",
    licenseVerifiedOn: "Apr 2025",
    modalities: ["Solution-Focused Brief Therapy", "Motivational Interviewing"],
    cancellationPolicy: "Free cancellation up to 24 hours before your session. Late cancellations are charged 50% of the session fee.",
    nextAvailable: "Tomorrow, 3:00 PM",
    socialLinks: [
      { label: "LinkedIn", url: "https://linkedin.com/in/bea-gonzales-rgc" },
    ],
  },
  {
    id: "6",
    name: "Miguel Tan, LPT",
    title: "Somatic Therapist",
    practice: "Therapist",
    tags: ["Trauma", "Somatic", "PTSD", "Grief"],
    bio: "Body-centered therapy for trauma recovery and emotional regulation. In-person and online sessions.",
    location: "Davao City",
    rating: 4.9,
    reviews: 63,
    price: 6500,
    initials: "MT",
    verified: true,
    expertise: "Expert in Somatic & Trauma-Focused Therapy",
    experience: 11,
    languages: ["English", "Filipino"],
    sessionModes: ["Online", "In-person"],
    availableDays: ["T", "Th", "S", "Su"],
    availableHours: "9am – 1pm",
    availablePeriods: ["AM"],
    licenseNumber: "LPT #45128",
    licenseBoard: "Professional Regulation Commission",
    licenseVerifiedOn: "Dec 2024",
    modalities: ["Somatic Experiencing", "Sensorimotor Psychotherapy", "Internal Family Systems"],
    cancellationPolicy: "Free cancellation up to 24 hours before your session. Late cancellations are charged 50% of the session fee.",
    nextAvailable: "Sat, 10:00 AM",
    socialLinks: [
      { label: "Website", url: "https://migueltan-somatic.ph" },
    ],
    references: [
      { title: "Somatic Approaches to Trauma Recovery in Post-Typhoon Communities", year: "2022", description: "Published in the International Journal of Disaster Risk Reduction" },
    ],
  },
];

export const dayLabels: Record<string, string> = {
  M: "Mon", T: "Tue", W: "Wed", Th: "Thu", F: "Fri", S: "Sat", Su: "Sun",
};

export function compactDays(days: string[]): string {
  if (days.length === 0) return "";
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const idx = (d: string) => order.indexOf(d);
  let groups: string[][] = [];
  let current: string[] = [days[0]];
  for (let i = 1; i < days.length; i++) {
    if (idx(days[i]) === idx(days[i - 1]) + 1) {
      current.push(days[i]);
    } else {
      groups.push(current);
      current = [days[i]];
    }
  }
  groups.push(current);
  return groups
    .map((g) => (g.length > 2 ? `${g[0]}\u2013${g[g.length - 1]}` : g.join(", ")))
    .join(", ");
}

/**
 * Build a default set of services for a provider based on their specialties.
 * Used as a fallback when a provider hasn't authored explicit services yet.
 */
export function getServicesForProvider(p: Provider): Service[] {
  if (p.services && p.services.length) return p.services;
  const base = p.tags.slice(0, 3);
  const templates = [
    {
      titleSuffix: "Consultation",
      description: (focus: string) =>
        `A focused one-on-one session exploring ${focus.toLowerCase()} concerns. The provider works with you to identify patterns, set goals, and build a personalized plan grounded in evidence-based practice.`,
      sessionType: "One on One Session" as const,
      duration: "1 hour",
      format: "Individual" as const,
    },
    {
      titleSuffix: "Deep-Dive Therapy",
      description: (focus: string) =>
        `An in-depth therapy session for those navigating ${focus.toLowerCase()}. The provider creates a safe, judgment-free space to unpack what's coming up and work through it at your own pace.`,
      sessionType: "One on One Session" as const,
      duration: "1 hour 30 minutes",
      format: "Individual" as const,
    },
    {
      titleSuffix: "Support Session",
      description: (focus: string) =>
        `A supportive check-in around ${focus.toLowerCase()}. Useful for building on previous work, navigating a current challenge, or maintaining momentum between deeper sessions.`,
      sessionType: "One on One Session" as const,
      duration: "45 minutes",
      format: "Both" as const,
    },
  ];
  const allDays = p.availableDays.map((d) => dayLabels[d]);
  const compacted = compactDays(allDays);
  const scheduleVariants = [
    `${compacted} · ${p.availableHours}`,
    `${compacted} · ${p.availableHours}`,
    `${compacted} · ${p.availableHours}`,
  ];
  return base.map((focus, i) => {
    const t = templates[i % templates.length];
    const isGroupCapable = t.format === "Both";
    return {
      id: `${p.id}-s${i + 1}`,
      title: `${focus} ${t.titleSuffix}`,
      description: t.description(focus),
      sessionType: t.sessionType,
      duration: t.duration,
      price: i === 0 ? p.price : Math.round(p.price * (i === 1 ? 1.35 : 0.7)),
      format: t.format,
      schedule: scheduleVariants[i % scheduleVariants.length],
      ...(isGroupCapable
        ? {
            minParticipants: 4,
            currentParticipants: 2,
            maxParticipants: 8,
          }
        : {}),
    };
  });
}

export function getProviderById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}