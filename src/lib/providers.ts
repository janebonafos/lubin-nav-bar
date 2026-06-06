export type Service = {
  id: string;
  title: string;
  description: string;
  sessionType: "One on One Session" | "Group Session" | "Couples Session";
  duration: string;
  price: number;
};

export type Provider = {
  id: string;
  name: string;
  title: string;
  practice: "Psychologist" | "Counselling" | "Therapist";
  tags: string[];
  bio: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  initials: string;
  verified?: boolean;
  expertise?: string;
  experience: number;
  languages: string[];
  services?: Service[];
};

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
    initials: "MS",
    verified: true,
    expertise: "Expert in Anxiety, Trauma & CBT",
    experience: 12,
    languages: ["English", "Filipino"],
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
    initials: "JR",
    verified: true,
    expertise: "Expert in Relationships & LGBTQ+ Support",
    experience: 9,
    languages: ["English", "Filipino"],
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
    initials: "AL",
    expertise: "Expert in Burnout & Mindfulness-Based Therapy",
    experience: 7,
    languages: ["English"],
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
  },
  {
    id: "5",
    name: "Bea Gonzales, RGC",
    title: "Guidance Counsellor",
    practice: "Counselling",
    tags: ["Students", "Career", "Anxiety"],
    bio: "Supportive counselling for students and early-career professionals navigating overwhelm and direction.",
    location: "Pasig City",
    rating: 4.6,
    reviews: 41,
    price: 1400,
    initials: "BG",
    expertise: "Expert in Student & Career Counselling",
    experience: 5,
    languages: ["English", "Filipino"],
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
  },
];

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
    },
    {
      titleSuffix: "Deep-Dive Therapy",
      description: (focus: string) =>
        `An in-depth therapy session for those navigating ${focus.toLowerCase()}. The provider creates a safe, judgment-free space to unpack what's coming up and work through it at your own pace.`,
      sessionType: "One on One Session" as const,
      duration: "1 hour 30 minutes",
    },
    {
      titleSuffix: "Support Session",
      description: (focus: string) =>
        `A supportive check-in around ${focus.toLowerCase()}. Useful for building on previous work, navigating a current challenge, or maintaining momentum between deeper sessions.`,
      sessionType: "One on One Session" as const,
      duration: "45 minutes",
    },
  ];
  return base.map((focus, i) => {
    const t = templates[i % templates.length];
    return {
      id: `${p.id}-s${i + 1}`,
      title: `${focus} ${t.titleSuffix}`,
      description: t.description(focus),
      sessionType: t.sessionType,
      duration: t.duration,
      price: i === 0 ? p.price : Math.round(p.price * (i === 1 ? 1.35 : 0.7)),
    };
  });
}

export function getProviderById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}