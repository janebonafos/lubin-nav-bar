import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  PhoneCall,
  MessageCircleHeart,
  MessageCircle,
  Globe2,
  Globe,
  Hospital,
  MonitorSmartphone,
  Compass,
  HandCoins,
  LifeBuoy,
  HeartHandshake,
  Sparkles,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Support resources — Lubin" },
      {
        name: "description",
        content:
          "You're not alone. Hotlines, text lines, and therapist directories — anytime help for the Philippines and US.",
      },
      { property: "og:title", content: "Support resources — Lubin" },
      {
        property: "og:description",
        content:
          "Hotlines, text lines, and therapist directories — anytime help for the Philippines and US.",
      },
    ],
  }),
  component: ResourcesPage,
});

type Row = {
  icon: LucideIcon;
  title: string;
  detail: string;
  note?: string;
  href: string;
};

function RegionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#9183B5]">
      {children}
    </p>
  );
}

function ResourceRow({ icon: Icon, title, detail, note, href }: Row) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 no-underline outline-none transition-all duration-150 hover:bg-[#F7F3FE] hover:scale-[0.99] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#7E6BAF]/50"
    >
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#F1ECFA] text-[#7E6BAF]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[#3F3560]">{title}</p>
        <p className="text-[13px] text-[#5C5470]">{detail}</p>
        {note && <p className="mt-0.5 text-[12px] text-[#9892A8]">{note}</p>}
      </div>
      <ChevronRight className="h-4 w-4 flex-none text-[#9892A8]" />
    </a>
  );
}

function SectionCard({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-[#EDE7F6] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(126,107,175,0.05)] ${
        accent ? "border-l-[3px] border-l-[#7E6BAF]" : ""
      }`}
    >
      {children}
    </section>
  );
}

function ResourcesPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF]">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        {/* Back */}
        <Link
          to="/my-health-passport"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#7E6BAF] no-underline transition hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back
        </Link>

        {/* Header */}
        <header className="mt-4 rounded-3xl border border-[#EDE7F6] bg-[#EFE9FB] p-8 shadow-[0_10px_30px_-18px_rgba(126,107,175,0.05)]">
          <h1 className="text-[34px] sm:text-[40px] font-bold leading-[1.1] tracking-tight text-[#3F3560]">
            You don't have to face this alone.
          </h1>
          <p className="mt-4 text-[15px] sm:text-[16px] leading-relaxed text-[#5C5470]">
            Whatever brought you here — help is available right now. These
            resources are free, confidential, and available any time.
          </p>
        </header>

        {/* Talk to someone now */}
        <div className="mt-5">
          <SectionCard accent>
            <h2 className="text-[16px] font-semibold text-[#3F3560]">
              Talk to someone now
            </h2>
            <p className="mt-1 text-[13.5px] text-[#6B6480]">
              Free, confidential, available 24/7
            </p>

            <RegionLabel>Philippines</RegionLabel>
            <div className="space-y-1">
              <ResourceRow
                icon={Phone}
                title="NCMH Crisis Hotline"
                detail="1553"
                note="Toll-free • 24/7"
                href="tel:1553"
              />
              <ResourceRow
                icon={Phone}
                title="In Touch Crisis Line"
                detail="(02) 8893-7603 • 0917-800-1123"
                note="24/7 • free & confidential"
                href="tel:+6328937603"
              />
            </div>

            <RegionLabel>United States</RegionLabel>
            <div className="space-y-1">
              <ResourceRow
                icon={Phone}
                title="988 Suicide & Crisis Lifeline"
                detail="Call or text 988"
                note="24/7"
                href="tel:988"
              />
              <ResourceRow
                icon={Phone}
                title="Crisis Text Line"
                detail="Text HOME to 741741"
                href="sms:741741?body=HOME"
              />
            </div>
          </SectionCard>
        </div>

        {/* Prefer to text or go online */}
        <div className="mt-5">
          <SectionCard>
            <h2 className="text-[16px] font-semibold text-[#3F3560]">
              Prefer to text or go online?
            </h2>
            <div className="mt-3 space-y-1">
              <ResourceRow
                icon={MessageCircle}
                title="Crisis Text Line"
                detail="Text HOME to 741741"
                note="US & PH"
                href="sms:741741?body=HOME"
              />
              <ResourceRow
                icon={Globe}
                title="Befrienders Worldwide"
                detail="befrienders.org"
                note="Global directory of local centers"
                href="https://befrienders.org"
              />
              <ResourceRow
                icon={Globe}
                title="IASP Crisis Centres"
                detail="iasp.info/resources/Crisis_Centres"
                note="International"
                href="https://www.iasp.info/resources/Crisis_Centres"
              />
            </div>
          </SectionCard>
        </div>

        {/* Finding a therapist */}
        <div className="mt-5">
          <SectionCard>
            <h2 className="text-[16px] font-semibold text-[#3F3560]">
              Finding a therapist or counselor
            </h2>
            <p className="mt-1 text-[13.5px] text-[#6B6480]">
              Professional support can make a real difference — here's where to start
            </p>

            <RegionLabel>Philippines</RegionLabel>
            <div className="space-y-1">
              <ResourceRow
                icon={Hospital}
                title="Philippine Mental Health Association"
                detail="pmha.org.ph"
                note="Counseling and programs nationwide"
                href="https://pmha.org.ph"
              />
              <ResourceRow
                icon={MonitorSmartphone}
                title="MindNation"
                detail="mindnation.com"
                note="Online therapy and mental health support"
                href="https://www.mindnation.com"
              />
              <ResourceRow
                icon={Compass}
                title="DOH Mental Health Program"
                detail="doh.gov.ph/mental-health"
                note="Government-run mental health services"
                href="https://doh.gov.ph/program/mental-health"
              />
            </div>

            <RegionLabel>United States</RegionLabel>
            <div className="space-y-1">
              <ResourceRow
                icon={Compass}
                title="Psychology Today Therapist Finder"
                detail="psychologytoday.com/us/therapists"
                note="Search by location, insurance, and specialty"
                href="https://www.psychologytoday.com/us/therapists"
              />
              <ResourceRow
                icon={PhoneCall}
                title="SAMHSA Helpline"
                detail="1-800-662-4357"
                note="Free, confidential treatment referrals"
                href="tel:18006624357"
              />
              <ResourceRow
                icon={HandCoins}
                title="Open Path Collective"
                detail="openpathcollective.org"
                note="Affordable sessions $30–$80"
                href="https://openpathcollective.org"
              />
              <ResourceRow
                icon={LifeBuoy}
                title="NAMI Helpline"
                detail="nami.org"
                note="Call 1-800-950-6264 for support and referrals"
                href="https://nami.org"
              />
            </div>
          </SectionCard>
        </div>

        {/* Worried about someone */}
        <div className="mt-5">
          <section className="rounded-2xl border border-[#F5E4A1] bg-[#FEF3C7] p-6 shadow-[0_10px_30px_-18px_rgba(126,107,175,0.05)]">
            <h2 className="text-[16px] font-semibold text-[#7A5A2C]">
              Worried about someone?
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#7A5A2C]">
              If someone you care about seems to be struggling, you don't have to
              handle it alone either.
            </p>

            <div className="mt-5 space-y-4">
              {[
                {
                  t: "Talk to them directly",
                  d: "Let them know you've noticed and you care. Sometimes just being asked is enough.",
                },
                {
                  t: "Encourage professional support",
                  d: "You can't force someone to get help, but you can gently suggest it and offer to help them find it.",
                },
                {
                  t: "Take care of yourself too",
                  d: "Supporting someone with mental health struggles can be hard. Your wellbeing matters too.",
                },
              ].map((tip) => (
                <div key={tip.t}>
                  <p className="text-[14px] font-semibold text-[#7A5A2C]">
                    {tip.t}
                  </p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-[#8A6A3C]">
                    {tip.d}
                  </p>
                </div>
              ))}
            </div>

            <a
              href="#talk-to-someone"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#7A5A2C] px-5 py-2.5 text-[13.5px] font-semibold text-[#FEF3C7] no-underline transition hover:-translate-y-0.5 hover:bg-[#6A4A1C]"
            >
              <HeartHandshake className="h-4 w-4" strokeWidth={2} />
              Find support for yourself
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </a>
          </section>
        </div>

        {/* A note from Lubin */}
        <div className="mt-5">
          <section className="rounded-2xl border border-[#EDE7F6] bg-[#F1ECFA] p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#7E6BAF]" strokeWidth={2} />
              <h2 className="text-[16px] font-semibold text-[#4A3A7A]">
                A note from Lubin
              </h2>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-[#4A3A7A]">
              Reaching out takes courage — and it's one of the kindest things you
              can do for yourself. Whatever you're feeling is valid, and there are
              people ready to listen, without judgment, whenever you're ready.
            </p>
          </section>
        </div>

        {/* Footer disclaimer */}
        <p className="mt-6 px-2 text-center text-[12px] leading-relaxed text-[#9892A8]">
          Lubin is not a crisis service or a replacement for professional care.
          If you're in immediate danger, please call your local emergency number.
        </p>
      </div>
    </div>
  );
}
