import { createFileRoute, Link } from "@tanstack/react-router";
import Navbar from "@/components/Navbar";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Lubin" },
      {
        name: "description",
        content:
          "How Lubin collects, uses, and protects your mental wellness information.",
      },
      { property: "og:title", content: "Privacy Policy — Lubin" },
      {
        property: "og:description",
        content:
          "Your data is yours. Learn how Lubin handles your information.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#3D2E6B]/80">
            Your trust is the foundation of Lubin. This policy explains what
            we collect, how we use it, and the choices you have. It is
            maintained by Lubin and reflects what is visible in the app today.
          </p>

          <Section title="1. Information we collect">
            <ul className="ml-5 list-disc space-y-1.5">
              <li>
                Account info from your connected sign-in (Google, Facebook,
                LinkedIn): name, email, profile photo.
              </li>
              <li>
                Profile info you provide: mobile number, photo updates,
                preferences.
              </li>
              <li>
                Wellness activity you create: check-ins, self-discovery
                results, chat conversations, shared summaries.
              </li>
              <li>
                Usage and device data needed to operate the service securely.
              </li>
            </ul>
          </Section>

          <Section title="2. How we use your information">
            To deliver check-ins and assessments, surface relevant providers,
            personalize your experience, secure your account, and communicate
            important updates.
          </Section>

          <Section title="3. Sharing">
            We only share information with providers you choose to connect
            with — and only the items you explicitly include in your shared
            summary. We do not sell your personal data.
          </Section>

          <Section title="4. Data security">
            Connections are encrypted in transit. Access to your wellness data
            is restricted to you and the providers you authorize.
          </Section>

          <Section title="5. Your choices">
            <ul className="ml-5 list-disc space-y-1.5">
              <li>
                Update your profile any time from{" "}
                <Link
                  to="/profile"
                  className="font-semibold text-[#7E6BAF] underline hover:text-[#3D2E6B]"
                >
                  My profile
                </Link>
                .
              </li>
              <li>
                Manage which social account is connected for sign-in from your
                profile.
              </li>
              <li>
                Request a copy or deletion of your data by emailing us.
              </li>
            </ul>
          </Section>

          <Section title="6. Children">
            Lubin is intended for users 18 and older, or 13–17 with
            parental/guardian consent.
          </Section>

          <Section title="7. Changes">
            We'll let you know about meaningful changes through the app or
            your registered email.
          </Section>

          <Section title="8. Contact">
            Privacy questions? Email{" "}
            <a
              href="mailto:privacy@lubin.ph"
              className="font-semibold text-[#7E6BAF] underline hover:text-[#3D2E6B]"
            >
              privacy@lubin.ph
            </a>
            .
          </Section>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[#EEE9F8] pt-6 text-sm">
            <Link
              to="/terms"
              className="font-semibold text-[#7E6BAF] hover:text-[#3D2E6B]"
            >
              Read our Terms &amp; Conditions →
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
      <div className="mt-2 text-[14.5px] leading-relaxed text-[#3D2E6B]/80">
        {children}
      </div>
    </section>
  );
}