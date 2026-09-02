import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { EPrescriptionDocument } from "@/components/appointment/EPrescriptionDocument";
import { loadPrescription, type Prescription, type RxCountry } from "@/lib/prescription/store";
import { loadIdentity, type PrescriberIdentity } from "@/lib/prescription/credentials";
import {
  decodeSignedPrescription,
  findSignedPrescription,
  prescriptionFromSignedDocument,
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";
import {
  applyVerifiedRecord,
  useVerifiedPrescribing,
} from "@/lib/prescription/useVerifiedPrescribing";

export const Route = createFileRoute("/e-prescription_/$viewId")({
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
  const { appointment, country, client, provider, draft, doc, d } = Route.useSearch();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [identity, setIdentity] = useState<PrescriberIdentity | null>(null);
  const [record, setRecord] = useState<SignedPrescriptionDocument | null>(null);
  const verification = useVerifiedPrescribing(provider);
  const verified = verification.data;

  useEffect(() => {
    let signed: SignedPrescriptionDocument | null = null;
    if (doc) signed = findSignedPrescription(doc) ?? null;
    if (!signed && d) signed = decodeSignedPrescription(d);
    setRecord(signed);
    if (signed) {
      setRx(prescriptionFromSignedDocument(signed));
      setIdentity(signed.identity);
      return;
    }
    if (!appointment) return;
    setRx(loadPrescription(appointment));
    setIdentity(loadIdentity(provider));
  }, [appointment, provider, doc, d]);

  if (!appointment && !doc && !d) {
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
        country={record?.country ?? country ?? "PH"}
        clientName={record?.patientName ?? client}
        providerName={record?.signedBy ?? provider}
        identity={record ? record.identity : applyVerifiedRecord(identity, verified).identity}
        draft={record ? false : draft}
        document={record}
      />
    </main>
  );
}
