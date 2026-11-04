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

export type DoctorSpecialtyId =
  | "gp"
  | "internal"
  | "pediatrics"
  | "obgyn"
  | "dermatology"
  | "cardiology"
  | "neurology";

export type DoctorSpecialty = { id: DoctorSpecialtyId; label: string };

export const DOCTOR_SPECIALTIES: DoctorSpecialty[] = [
  { id: "gp", label: "General practice & family medicine" },
  { id: "internal", label: "Internal medicine" },
  { id: "pediatrics", label: "Pediatrics" },
  { id: "obgyn", label: "OB-GYN" },
  { id: "dermatology", label: "Dermatology" },
  { id: "cardiology", label: "Cardiology" },
  { id: "neurology", label: "Neurology" },
];

export type Provider = {
  id: string;
  name: string;
  title: string;
  practice: "Psychologist" | "Counselling" | "Therapist" | "Psychiatrist" | "Doctor";
  /** Doctors only — the specialization shown when browsing by doctor type. */
  specialty?: DoctorSpecialty;
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
    currency: "PHP",
    paymentGateway: "xendit",
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
    currency: "PHP",
    paymentGateway: "xendit",
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
    currency: "PHP",
    paymentGateway: "xendit",
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
  // ——— Psychiatrists (fictional demo profiles) ———
  {
    id: "7",
    name: "Dr. Angela Villaraza",
    title: "Psychiatrist, MD",
    practice: "Psychiatrist",
    tags: ["Anxiety", "Depression", "Medication management"],
    bio: "Psychiatric assessment, diagnosis, and medication management for adults. Collaborates with your therapist when you have one.",
    location: "Quezon City, Metro Manila",
    rating: 4.8,
    reviews: 74,
    price: 3500,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "AV",
    verified: true,
    expertise: "Adult psychiatry, mood & anxiety disorders",
    experience: 15,
    languages: ["English", "Filipino"],
    sessionModes: ["Online", "In-person"],
    availableDays: ["M", "W", "F"],
    availableHours: "1pm – 6pm",
    availablePeriods: ["PM"],
    licenseNumber: "PRC #0188421",
    licenseBoard: "PRC Board of Medicine — Psychiatry",
    licenseVerifiedOn: "Feb 2025",
    nextAvailable: "Wed, 2:00 PM",
  },
  {
    id: "8",
    name: "Dr. Ferdinand Ocampo",
    title: "Psychiatrist, MD",
    practice: "Psychiatrist",
    tags: ["Mood", "Sleep", "Bipolar"],
    bio: "Focus on mood disorders, sleep problems, and long-term medication planning. Plain-language explanations of every option.",
    location: "Makati City, Metro Manila",
    rating: 4.7,
    reviews: 51,
    price: 3800,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "FO",
    verified: true,
    expertise: "Mood disorders & sleep medicine",
    experience: 18,
    languages: ["English", "Filipino"],
    sessionModes: ["In-person"],
    availableDays: ["T", "Th"],
    availableHours: "9am – 2pm",
    availablePeriods: ["AM"],
    licenseNumber: "PRC #0152907",
    licenseBoard: "PRC Board of Medicine — Psychiatry",
    licenseVerifiedOn: "Jan 2025",
    nextAvailable: "Thu, 9:30 AM",
  },
  {
    id: "9",
    name: "Dr. Liza Bautista",
    title: "Child & Adolescent Psychiatrist, MD",
    practice: "Psychiatrist",
    tags: ["Teens", "ADHD", "Anxiety"],
    bio: "Psychiatric care for children and teens — ADHD, anxiety, school stress — with parents kept in the loop at every step.",
    location: "Taguig City, Metro Manila",
    rating: 4.9,
    reviews: 38,
    price: 3200,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "LB",
    verified: true,
    expertise: "Child & adolescent psychiatry, ADHD",
    experience: 13,
    languages: ["English", "Filipino"],
    sessionModes: ["Online", "In-person"],
    availableDays: ["M", "T", "W", "Th", "F"],
    availableHours: "10am – 4pm",
    availablePeriods: ["AM", "PM"],
    licenseNumber: "PRC #0201338",
    licenseBoard: "PRC Board of Medicine — Psychiatry",
    licenseVerifiedOn: "Mar 2025",
    nextAvailable: "Tomorrow, 10:00 AM",
  },
  // ——— Doctors by specialization (fictional demo profiles) ———
  {
    id: "10",
    name: "Dr. Rafael Domingo",
    title: "General Practitioner, MD",
    practice: "Doctor",
    specialty: { id: "gp", label: "General practice & family medicine" },
    tags: ["Check-ups", "Chronic conditions", "Preventive care"],
    bio: "First stop for everyday health concerns, annual check-ups, and referrals to the right specialist when you need one.",
    location: "Pasig City, Metro Manila",
    rating: 4.8,
    reviews: 96,
    price: 1500,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "RD",
    verified: true,
    expertise: "Family medicine & preventive care",
    experience: 14,
    languages: ["English", "Filipino"],
    sessionModes: ["Online", "In-person"],
    availableDays: ["M", "T", "W", "Th", "F"],
    availableHours: "8am – 5pm",
    availablePeriods: ["AM", "PM"],
    licenseNumber: "PRC #0121774",
    licenseBoard: "PRC Board of Medicine",
    licenseVerifiedOn: "Feb 2025",
    nextAvailable: "Tomorrow, 8:30 AM",
  },
  {
    id: "11",
    name: "Dr. Imelda Ferrer",
    title: "Internal Medicine Physician, MD",
    practice: "Doctor",
    specialty: { id: "internal", label: "Internal medicine" },
    tags: ["Chronic conditions", "Diabetes", "Heart & blood pressure"],
    bio: "Care for diabetes, hypertension, and other long-term conditions in adults — regular reviews and clear treatment plans.",
    location: "Makati City, Metro Manila",
    rating: 4.7,
    reviews: 63,
    price: 2000,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "IF",
    verified: true,
    expertise: "Diabetes & hypertension management",
    experience: 16,
    languages: ["English", "Filipino"],
    sessionModes: ["In-person"],
    availableDays: ["M", "W", "F"],
    availableHours: "9am – 1pm",
    availablePeriods: ["AM"],
    licenseNumber: "PRC #0110459",
    licenseBoard: "PRC Board of Medicine — Internal Medicine",
    licenseVerifiedOn: "Jan 2025",
    nextAvailable: "Fri, 9:00 AM",
  },
  {
    id: "12",
    name: "Dr. Paolo Rivera",
    title: "Pediatrician, MD",
    practice: "Doctor",
    specialty: { id: "pediatrics", label: "Pediatrics" },
    tags: ["Child & family health", "Check-ups", "Vaccines"],
    bio: "Well-child visits, vaccinations, and sick-child consults from newborn through the teen years.",
    location: "Taguig City, Metro Manila",
    rating: 4.9,
    reviews: 87,
    price: 1800,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "PR",
    verified: true,
    expertise: "Newborn & child health, immunization",
    experience: 12,
    languages: ["English", "Filipino"],
    sessionModes: ["Online", "In-person"],
    availableDays: ["M", "T", "W", "Th", "F", "S"],
    availableHours: "9am – 4pm",
    availablePeriods: ["AM", "PM"],
    licenseNumber: "PRC #0133820",
    licenseBoard: "PRC Board of Medicine — Pediatrics",
    licenseVerifiedOn: "Mar 2025",
    nextAvailable: "Tomorrow, 9:00 AM",
  },
  {
    id: "13",
    name: "Dr. Grace Tolentino",
    title: "OB-GYN, MD",
    practice: "Doctor",
    specialty: { id: "obgyn", label: "OB-GYN" },
    tags: ["Women's health", "Prenatal", "Check-ups"],
    bio: "Women's health across every stage — well-woman exams, prenatal visits, and honest guidance on contraception and menopause.",
    location: "Mandaluyong City, Metro Manila",
    rating: 4.8,
    reviews: 71,
    price: 2200,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "GT",
    verified: true,
    expertise: "Prenatal care & women's health",
    experience: 15,
    languages: ["English", "Filipino"],
    sessionModes: ["In-person"],
    availableDays: ["T", "Th", "S"],
    availableHours: "10am – 3pm",
    availablePeriods: ["AM", "PM"],
    licenseNumber: "PRC #0119306",
    licenseBoard: "PRC Board of Medicine — OB-GYN",
    licenseVerifiedOn: "Feb 2025",
    nextAvailable: "Sat, 10:00 AM",
  },
  {
    id: "14",
    name: "Dr. Neil Sarmiento",
    title: "Dermatologist, MD",
    practice: "Doctor",
    specialty: { id: "dermatology", label: "Dermatology" },
    tags: ["Skin & allergies", "Acne", "Eczema"],
    bio: "Medical dermatology for acne, eczema, hair and nail concerns — evidence-based treatment without the hard sell.",
    location: "Quezon City, Metro Manila",
    rating: 4.6,
    reviews: 44,
    price: 1900,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "NS",
    verified: true,
    expertise: "Medical dermatology & allergy skin care",
    experience: 9,
    languages: ["English", "Filipino"],
    sessionModes: ["Online", "In-person"],
    availableDays: ["W", "F", "S"],
    availableHours: "1pm – 6pm",
    availablePeriods: ["PM"],
    licenseNumber: "PRC #0146512",
    licenseBoard: "PRC Board of Medicine — Dermatology",
    licenseVerifiedOn: "Dec 2024",
    nextAvailable: "Wed, 1:30 PM",
  },
  {
    id: "15",
    name: "Dr. Emelita Cruz",
    title: "Cardiologist, MD",
    practice: "Doctor",
    specialty: { id: "cardiology", label: "Cardiology" },
    tags: ["Heart & blood pressure", "Chronic conditions", "Chest pain"],
    bio: "Heart health reviews, blood pressure management, and follow-up after cardiac events. Referrals accepted from any doctor on Lubin.",
    location: "Manila City, Metro Manila",
    rating: 4.8,
    reviews: 58,
    price: 2800,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "EC",
    verified: true,
    expertise: "Hypertension & cardiac follow-up care",
    experience: 20,
    languages: ["English", "Filipino"],
    sessionModes: ["In-person"],
    availableDays: ["M", "Th"],
    availableHours: "9am – 12pm",
    availablePeriods: ["AM"],
    licenseNumber: "PRC #0098117",
    licenseBoard: "PRC Board of Medicine — Cardiology",
    licenseVerifiedOn: "Jan 2025",
    nextAvailable: "Mon, 9:00 AM",
  },
  {
    id: "16",
    name: "Dr. Victor Alcantara",
    title: "Neurologist, MD",
    practice: "Doctor",
    specialty: { id: "neurology", label: "Neurology" },
    tags: ["Headaches & migraine", "Pain & injury", "Sleep & fatigue"],
    bio: "Assessment and long-term care for migraines, dizziness, nerve pain, and other nerve-related conditions.",
    location: "Pasig City, Metro Manila",
    rating: 4.7,
    reviews: 35,
    price: 3000,
    currency: "PHP",
    paymentGateway: "xendit",
    initials: "VA",
    verified: true,
    expertise: "Migraine & neurologic pain management",
    experience: 17,
    languages: ["English", "Filipino"],
    sessionModes: ["Online", "In-person"],
    availableDays: ["T", "F"],
    availableHours: "2pm – 6pm",
    availablePeriods: ["PM"],
    licenseNumber: "PRC #0104463",
    licenseBoard: "PRC Board of Medicine — Neurology",
    licenseVerifiedOn: "Feb 2025",
    nextAvailable: "Fri, 2:00 PM",
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
 * The provider who hosts Lubin's free 30-minute intro consultation.
 * The navbar CTA and result pages point here.
 */
export const FREE_CONSULT_PROVIDER_ID = "1";
export const FREE_CONSULT_SERVICE_ID = "free-consult-30";

export function freeConsultService(p: Provider): Service {
  const days = compactDays(p.availableDays.map((d) => dayLabels[d]));
  return {
    id: FREE_CONSULT_SERVICE_ID,
    title: "Free 30-Minute Consultation",
    description:
      "A no-cost, no-commitment 30-minute conversation with a verified mental health professional. Talk through what's going on, ask questions, and find out what kind of support fits you — you decide what happens next.",
    sessionType: "One on One Session",
    duration: "30 minutes",
    price: 0,
    format: "Individual",
    schedule: `${days} · ${p.availableHours}`,
  };
}

/**
 * Build a default set of services for a provider based on their specialties.
 * Used as a fallback when a provider hasn't authored explicit services yet.
 */
export function getServicesForProvider(p: Provider): Service[] {
  const free = p.id === FREE_CONSULT_PROVIDER_ID ? [freeConsultService(p)] : [];
  if (p.services && p.services.length) return [...free, ...p.services];

  const base = p.tags.slice(0, 3);
  const therapyTemplates = [
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
  const doctorTemplates = [
    {
      titleSuffix: "Consultation",
      description: (focus: string) =>
        `A one-on-one consultation about ${focus.toLowerCase()}. The doctor reviews your concerns, works out what's going on, and lays out next steps — tests, treatment, or a referral if you need one.`,
      sessionType: "One on One Session" as const,
      duration: "30 minutes",
      format: "Individual" as const,
    },
    {
      titleSuffix: "Follow-up Visit",
      description: (focus: string) =>
        `A follow-up visit to review how ${focus.toLowerCase()} is going, adjust treatment, and answer the questions that came up since your last visit.`,
      sessionType: "One on One Session" as const,
      duration: "20 minutes",
      format: "Individual" as const,
    },
    {
      titleSuffix: "Full Check-up",
      description: (focus: string) =>
        `A longer visit covering ${focus.toLowerCase()} and your overall health — history, screening, and a practical plan you can actually follow.`,
      sessionType: "One on One Session" as const,
      duration: "1 hour",
      format: "Individual" as const,
    },
  ];
  const templates =
    p.practice === "Doctor" || p.practice === "Psychiatrist" ? doctorTemplates : therapyTemplates;
  const allDays = p.availableDays.map((d) => dayLabels[d]);
  const compacted = compactDays(allDays);
  const scheduleVariants = [
    `${compacted} · ${p.availableHours}`,
    `${compacted} · ${p.availableHours}`,
    `${compacted} · ${p.availableHours}`,
  ];
  return [...free, ...base.map((focus, i) => {
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
  })];
}


export function getProviderById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}