import { createFileRoute, Link } from "@tanstack/react-router";
import Navbar from "@/components/Navbar";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Lubin" },
      {
        name: "description",
        content:
          "The terms that govern your use of Lubin's mental health support, check-ins, and provider matching.",
      },
      { property: "og:title", content: "Terms & Conditions — Lubin" },
      {
        property: "og:description",
        content: "How Lubin works, your responsibilities, and ours.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#F0EAFB]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="pointer-events-none fixed -top-[10%] -right-[10%] -z-0 h-[600px] w-[600px] rounded-full bg-[#7E6BAF]/20 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-[10%] -left-[10%] -z-0 h-[600px] w-[600px] rounded-full bg-[#A89BD0]/30 blur-[120px]" />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6">
        <article className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-8 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A89BD0]">
            Last updated: June 23, 2026
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#3D2E6B]">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#3D2E6B]/80">
            Welcome to Lubin. By creating an account or using our services, you
            agree to these Terms. Please read them carefully.
          </p>

          <Section title="1. About Lubin">
            Lubin is a mental wellness companion offering self-guided
            check-ins, self-discovery tools, AI chat support, and discovery of
            licensed mental health providers in the Philippines. Lubin is not a
            substitute for emergency services or clinical care.
          </Section>

          <Section title="2. Eligibility">
            You must be at least 18 years old, or have parental/guardian
            consent if between 13 and 17. By using Lubin you confirm that the
            information you provide is accurate.
          </Section>

          <Section title="3. Not a medical service">
            Content within Lubin is for informational and supportive purposes
            only. It does not constitute medical advice, diagnosis, or
            treatment. If you are in crisis, please contact local emergency
            services or a crisis hotline immediately.
          </Section>

          <Section title="4. Your account">
            You are responsible for safeguarding your sign-in method (Google,
            Facebook, or LinkedIn) and any activity under your account. Notify
            us right away if you suspect unauthorized access.
          </Section>

          <Section title="5. Provider connections">
            Lubin helps you discover and book sessions with independent,
            licensed providers. Lubin is not a party to the
            client-practitioner relationship and is not responsible for the
            care delivered by providers.
          </Section>

          <Section title="6. Acceptable use">
            Do not misuse the service, attempt to access other users' data,
            upload harmful content, or use Lubin for unlawful purposes. We may
            suspend accounts that violate these terms.
          </Section>

          <Section title="7. Payments and refunds">
            Session fees are set by individual providers. Refunds follow the
            provider's cancellation policy as shown at checkout.
          </Section>

          <Section title="8. Changes to these terms">
            We may update these Terms from time to time. We will notify you of
            material changes via the app or your registered email.
          </Section>

          <Section title="9. Contact">
            Questions? Reach us at{" "}
            <a
              href="mailto:support@lubin.ph"
              className="font-semibold text-[#7E6BAF] underline hover:text-[#3D2E6B]"
            >
              support@lubin.ph
            </a>
            .
          </Section>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[#EEE9F8] pt-6 text-sm">
            <Link
              to="/privacy"
              className="font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
            >
              Read our Privacy Policy →
            </Link>
            <span className="text-[#A89BD0]">·</span>
            <Link
              to="/profile"
              className="font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
            >
              Back to profile
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold text-[#3D2E6B]">{title}</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#3D2E6B]/80">
        {children}
      </p>
    </section>
  );
}