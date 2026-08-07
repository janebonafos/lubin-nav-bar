import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { EPrescriptionDocument } from "@/components/appointment/EPrescriptionDocument";
import { loadPrescription, type Prescription, type RxCountry } from "@/lib/prescription/store";
import { loadIdentity, type PrescriberIdentity } from "@/lib/prescription/credentials";

type Search = {
  appointment: string;
  country?: RxCountry;
  client?: string;
  provider?: string;
  draft?: boolean;
};

export const Route = createFileRoute("/e-prescription")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    appointment: String(search.appointment ?? ""),
    country: search.country === "US" ? "US" : "PH",
    client: search.client ? String(search.client) : undefined,
    provider: search.provider ? String(search.provider) : undefined,
    draft: search.draft === true || search.draft === "true",
  }),
  head: () => ({
    meta: [
      { title: "E-prescription — Lubin" },
      {
        name: "description",
        content:
          "The patient-facing copy of a Lubin e-prescription, with medication directions, prescriber details, and signature.",
      },
      { property: "og:title", content: "E-prescription — Lubin" },
      {
        property: "og:description",
        content:
          "Patient-facing Lubin e-prescription with directions, prescriber details, and signature.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EPrescriptionPage,
});

function EPrescriptionPage() {
  const { appointment, country, client, provider, draft } = Route.useSearch();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [identity, setIdentity] = useState<PrescriberIdentity | null>(null);

  useEffect(() => {
    if (!appointment) return;
    setRx(loadPrescription(appointment));
    setIdentity(loadIdentity(provider));
  }, [appointment, provider]);

  if (!appointment) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3F0FA] px-6">
        <p className="text-[13.5px] text-[#6F6889]">
          No prescription was specified for this page.
        </p>
      </main>
    );
  }

  if (!rx || !identity) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3F0FA] px-6">
        <p className="text-[13.5px] text-[#6F6889]">Loading the prescription…</p>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "Inter, sans-serif" }}>
      <EPrescriptionDocument
        rx={rx}
        country={country ?? "PH"}
        clientName={client}
        providerName={provider}
        identity={identity}
        draft={draft}
      />
    </main>
  );
}
