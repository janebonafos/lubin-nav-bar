import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Eye,
  Globe,
  Languages,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import {
  DEFAULT_PROVIDER_PROFILE,
  type ProviderProfile,
} from "@/components/profile/ProviderProfileSection";

export const Route = createFileRoute("/profile/preview")({
  component: ProfilePreviewPage,
  head: () => ({
    meta: [
      { title: "Preview your profile — Lubin" },
      { name: "description", content: "See how clients view your provider profile." },
    ],
  }),
});

const STORAGE_KEY = "lubin.providerProfile.v1";

function ProfilePreviewPage() {
  const [data, setData] = useState<ProviderProfile>(DEFAULT_PROVIDER_PROFILE);
  const [fullName, setFullName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...DEFAULT_PROVIDER_PROFILE, ...JSON.parse(raw) });
    } catch { /* noop */ }
    setFullName(window.localStorage.getItem("lubin.userName") || "");
    setAvatar(window.localStorage.getItem("lubin.userAvatar"));
  }, []);

  const currency = data.region === "PH" ? { symbol: "₱", code: "PHP" } : { symbol: "$", code: "USD" };
  const fmtPrice = (n: number) =>
    n > 0 ? `${currency.symbol}${Math.round(n).toLocaleString()} ${currency.code}` : "Contact for rate";

  const initials =
    (fullName || "Y")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "Y";

  const sessions = [
    {
      id: "primary",
      name: data.primarySession.name,
      lengthMin: data.primarySession.lengthMin,
      rate: data.primarySession.rate,
      sessionType: "individual" as const,
      video: data.primarySession.video,
    },
    ...data.extraSessions.map((s) => ({
      id: s.id,
      name: s.name,
      lengthMin: s.lengthMin,
      rate: s.rate,
      sessionType: s.sessionType,
      video: true,
      minParticipants: s.minParticipants,
      maxParticipants: s.maxParticipants,
    })),
  ];

  return (
    <div className="min-h-screen bg-[#F9F8FF]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Preview banner */}
      <div className="sticky top-0 z-20 border-b border-[#E5DEF2] bg-[#3D2E6B] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <Eye className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Preview mode</span>
            <span className="hidden text-[12px] text-white/70 sm:inline">
              This is how clients see your profile.
            </span>
          </div>
          <button
            onClick={() => window.close()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Close preview
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Hero */}
        <section className="overflow-hidden rounded-[28px] border border-[#EAE7F5] bg-white shadow-sm">
          <div className="relative h-32 bg-gradient-to-br from-[#7E6BAF] via-[#6F5DA0] to-[#3D2E6B]">
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative px-8 pb-8 sm:px-10">
            <div className="-mt-12 flex items-end gap-5">
              <div className="h-24 w-24 overflow-hidden rounded-[22px] border-4 border-white bg-gradient-to-br from-[#D9CEF0] to-[#9A8BC4] shadow-lg sm:h-28 sm:w-28">
                {avatar ? (
                  <img src={avatar} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-white">
                    {initials}
                  </div>
                )}
              </div>
              <div className="pb-2">
                {data.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                )}
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#2A2550] sm:text-4xl">
                  {fullName || "Your name"}
                </h1>
                <p className="mt-1 text-[14px] font-medium text-[#7E6BAF]">{data.profession}</p>
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-[#3D2E6B]">
              {data.headline}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[#7E6BAF]">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> {data.yearsBand}
              </span>
              <span aria-hidden className="h-3 w-px bg-[#E5DEF2]" />
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5" />
                {data.languages.length ? data.languages.join(", ") : "Languages not set"}
              </span>
              <span aria-hidden className="h-3 w-px bg-[#E5DEF2]" />
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> {data.region === "PH" ? "Philippines" : "United States"}
              </span>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left: about + focus */}
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-[20px] border border-[#EAE7F5] bg-white p-7 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">About</p>
              <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-[#3D2E6B]">
                {data.bio}
              </p>
            </section>

            <section className="rounded-[20px] border border-[#EAE7F5] bg-white p-7 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">Focus areas</p>
              {data.focusAreas.length === 0 ? (
                <p className="mt-3 text-[13px] italic text-[#A89BD0]">No focus areas set yet</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.focusAreas.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-[#F0EAFB] px-3 py-1.5 text-[12.5px] font-semibold text-[#5E4A8C]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[20px] border border-[#EAE7F5] bg-white p-7 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">Sessions &amp; rates</p>
              <ul className="mt-4 divide-y divide-[#F0EAFB]">
                {sessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-[14.5px] font-semibold text-[#2A2550]">{s.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#7E6BAF]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {s.lengthMin} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Video className="h-3 w-3" /> Online
                        </span>
                        <span className="rounded-full bg-[#F0EAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7E6BAF]">
                          {s.sessionType === "group" ? "Group" : "Individual"}
                        </span>
                        {s.sessionType === "group" && s.minParticipants && s.maxParticipants && (
                          <span className="text-[11px]">
                            {s.minParticipants}–{s.maxParticipants} participants
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-bold text-[#2A2550]">{fmtPrice(s.rate)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Right: booking sidebar */}
          <aside className="space-y-6">
            <section className="rounded-[20px] border border-[#EAE7F5] bg-white p-6 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A89BD0]">Availability</p>
              <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-[#F0EAFB]/50 p-3.5">
                <CalendarDays className="mt-0.5 h-4 w-4 text-[#7E6BAF]" />
                <div className="text-[12.5px] text-[#3D2E6B]">
                  <p className="font-semibold">
                    {data.availabilityDays.length ? data.availabilityDays.join(", ") : "Schedule not set"}
                  </p>
                  <p className="text-[#7E6BAF]">
                    {data.availabilityStart} – {data.availabilityEnd}
                  </p>
                </div>
              </div>
              <button
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-xl bg-[#3D2E6B] py-3 text-[13px] font-semibold text-white opacity-90"
              >
                Book a session
              </button>
              <button
                disabled
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#EAE7F5] py-3 text-[13px] font-semibold text-[#3D2E6B] opacity-90"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Message
              </button>
              <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-[#A89BD0]">
                Buttons disabled in preview
              </p>
            </section>
          </aside>
        </div>

        <footer className="mt-10 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#A89BD0]">
          <span>Lubin</span>
          <span className="h-1 w-1 rounded-full bg-[#A89BD0]/40" />
          <span>Client preview</span>
        </footer>
      </main>
    </div>
  );
}