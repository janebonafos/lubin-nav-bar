// Prototype-only webinar catalogue. Fictional demo data — no backend.

export type Webinar = {
  id: string;
  title: string;
  tagline: string;
  hostOrg: string;
  speakerName: string;
  speakerCred: string;
  dateTime: string;
  dateShort: string;
  duration: string;
  timezone: string;
  platform: string;
  meetingLink: string;
  price: number; // 0 = free seat, registration still required
  currency: "PHP" | "USD";
  seatsLeft: number;
  audience: string;
};

export const WEBINARS: Webinar[] = [
  {
    id: "be-the-bridge",
    title: "Be the Bridge: A Youth Mental & Suicide Prevention Talk",
    tagline: "A one-hour guided conversation on spotting warning signs and getting help early.",
    hostOrg: "Area One Youth Federation × Lubin",
    speakerName: "Mrs. Christine Anne M. Villamarzo",
    speakerCred: "RPsy · Guest speaker",
    dateTime: "Sunday, September 20, 2026 · 2:00–3:00 PM",
    dateShort: "Sep 20, 2026 · 2:00 PM",
    duration: "1 hour",
    timezone: "Philippine Time (PHT, GMT+8)",
    platform: "Google Meet (webinar)",
    meetingLink: "https://meet.google.com/sks-hhcc-zse",
    price: 0,
    currency: "PHP",
    seatsLeft: 46,
    audience: "Youth leaders, students, parents and educators",
  },
];

export function getWebinarById(id: string): Webinar | undefined {
  return WEBINARS.find((w) => w.id === id);
}
