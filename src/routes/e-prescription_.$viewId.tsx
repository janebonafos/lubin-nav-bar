import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { EPrescriptionDocument } from "@/components/appointment/EPrescriptionDocument";
import { loadPrescription, type Prescription, type RxCountry } from "@/lib/prescription/store";
import { loadIdentity, type PrescriberIdentity } from "@/lib/prescription/credentials";
import {
  findSignedPrescription,
  prescriptionFromSignedDocument,
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";
import { readPrescriptionView } from "@/lib/prescription/viewHandoff";
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
  component: EPrescriptionViewPage,
});

/** Opaque prescription view. The URL carries only a random id — every patient,
 *  medication and prescription value is read from local prototype state. */
function EPrescriptionViewPage() {
  const { viewId } = Route.useParams();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [identity, setIdentity] = useState<PrescriberIdentity | null>(null);
  const [record, setRecord] = useState<SignedPrescriptionDocument | null>(null);
  const [country, setCountry] = useState<RxCountry>("PH");
  const [clientName, setClientName] = useState<string | undefined>();
  const [providerName, setProviderName] = useState<string | undefined>();
  const [draft, setDraft] = useState(false);
  const [missing, setMissing] = useState(false);
  const verification = useVerifiedPrescribing(providerName);
  const verified = verification.data;

  useEffect(() => {
    const view = readPrescriptionView(viewId);
    const signed =
      view?.document ??
      (view?.docId ? findSignedPrescription(view.docId) : findSignedPrescription(viewId)) ??
      null;

    setCountry(view?.country ?? signed?.country ?? "PH");
    setClientName(signed?.patientName ?? view?.clientName);
    setProviderName(signed?.signedBy ?? view?.providerName);
    setDraft(signed ? false : Boolean(view?.draft));
    setRecord(signed);

    if (signed) {
      setRx(prescriptionFromSignedDocument(signed));
      setIdentity(signed.identity);
      return;
    }
    if (!view?.appointmentId) {
      setMissing(true);
      return;
    }
    setRx(loadPrescription(view.appointmentId));
    setIdentity(loadIdentity(view.providerName));
  }, [viewId]);

  if (missing) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3F0FA] px-6">
        <p className="text-[13.5px] text-[#6F6889]">
          This prescription link is no longer available. Open it again from the prescription record.
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
        country={record?.country ?? country}
        clientName={clientName}
        providerName={providerName}
        identity={record ? record.identity : applyVerifiedRecord(identity, verified).identity}
        draft={record ? false : draft}
        document={record}
      />
    </main>
  );
}
