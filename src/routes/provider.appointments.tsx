import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock } from "lucide-react";

import Navbar from "@/components/Navbar";
import { AppointmentsSection } from "@/components/profile/ProviderSections";

export const Route = createFileRoute("/provider/appointments")({
  head: () => ({
    meta: [
      { title: "Provider appointments — Lubin" },
      {
        name: "description",
        content:
          "Review provider appointments, session details, outcomes, and follow-up workflows in Lubin.",
      },
      { property: "og:title", content: "Provider appointments — Lubin" },
      {
        property: "og:description",
        content:
          "Provider appointment workspace for reviewing sessions, recording outcomes, and managing follow-up.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProviderAppointmentsPage,
});

function ProviderAppointmentsPage() {
  useEffect(() => {
    try {
      window.localStorage.setItem("lubin.role", "provider");
      window.localStorage.setItem("lubin.userRole", "provider");
      window.dispatchEvent(new Event("lubin:auth-change"));
    } catch {
      /* noop */
    }
  }, []);

  return (
    <div
      className="min-h-screen bg-[#F0EAFB]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/provider-onboarding"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#7E6BAF] hover:text-[#3D2E6B]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Provider dashboard
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D2E6B] text-white">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-[#3D2E6B] sm:text-3xl">
                  Appointments
                </h1>
                <p className="mt-1 text-sm text-[#7E6BAF]">
                  Upcoming sessions, outcome recording, and post-appointment follow-up.
                </p>
              </div>
            </div>
          </div>
          <Link
            to="/profile"
            search={{ tab: "appointments" }}
            className="inline-flex items-center justify-center rounded-[10px] border border-[#D8C7F0] bg-white px-4 py-2 text-sm font-semibold text-[#3D2E6B] transition hover:bg-[#FBF9FF]"
          >
            Open in profile
          </Link>
        </div>
        <AppointmentsSection />
      </main>
    </div>
  );
}