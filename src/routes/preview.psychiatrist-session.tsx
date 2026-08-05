import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { demoPrescription } from "@/lib/prescription/demo";
import { savePrescription } from "@/lib/prescription/store";

export const Route = createFileRoute("/preview/psychiatrist-session")({
  component: PreviewPsychiatristSession,
  head: () => ({
    meta: [
      { title: "Preview: psychiatrist session workspace — Lubin" },
      {
        name: "description",
        content:
          "Open a demo psychiatry appointment to review the prescriber version of the Lubin session workspace.",
      },
      {
        property: "og:title",
        content: "Preview: psychiatrist session workspace — Lubin",
      },
      {
        property: "og:description",
        content:
          "Demo view of the prescriber session workspace, including Step 4 prescription tools.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const DEMO_ID = "demo-psych-1";

function PreviewPsychiatristSession() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Demo only: unlock prescriber tools for this browser.
      window.localStorage.setItem(
        "lubin.providerProfile.v1",
        JSON.stringify({
          name: "Dr. Maria Santos",
          displayName: "Dr. Maria Santos",
          profession: "Psychiatrist",
          credentialsVerified: true,
          prescribingCredentialsVerified: true,
          prescribingJurisdictions: ["PH", "US"],
        }),
      );

      const now = new Date(Date.now() - 60 * 60 * 1000);
      const appt = {
        id: DEMO_ID,
        status: "upcoming",
        client: "Anna Reyes",
        day: now.toLocaleDateString("en-US", { weekday: "short" }),
        date: String(now.getDate()),
        month: now.toLocaleDateString("en-US", { month: "short" }),
        time: now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        duration: "45 min",
        type: "Psychiatric consultation",
        sessionFormat: "Individual",
        mode: "Video",
        amount: "₱2,500",
        paymentStatus: "Paid",
        prescriptionEligible: true,
      };

      // Seed an empty prescription with demo patient info, but no AI suggestions
      // until the provider clicks "See AI suggestion".
      savePrescription(demoPrescription(DEMO_ID, false));

      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(appt))));
      navigate({
        to: "/appointment/details",
        search: { id: DEMO_ID, d: encoded },
        replace: true,
      });
    } catch {
      setError("This preview needs browser storage to be enabled.");
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF9FF] px-6">
      <div className="text-center">
        {!error ? (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#6E4FD3]" />
            <h1 className="mt-4 text-lg font-semibold text-[#2C2B4B]">
              Opening the prescriber session workspace
            </h1>
            <p className="mt-1 text-sm text-[#7E6BAF]">
              Setting up a demo psychiatry appointment…
            </p>
          </>
        ) : (
          <p className="text-sm text-[#7E6BAF]">{error}</p>
        )}
      </div>
    </div>
  );
}