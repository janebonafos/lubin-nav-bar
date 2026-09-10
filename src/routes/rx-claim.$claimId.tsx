import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ExternalLink, Lock, ShieldAlert, UserRound } from "lucide-react";

import rxIcon from "@/assets/rx-icon.png.asset.json";
import {
  claimPrescription,
  findClaim,
  markClaimOpened,
  subscribeClaims,
  type PrescriptionClaim,
} from "@/lib/prescription/claim";
import { prescriptionViewHref } from "@/lib/prescription/viewHandoff";

export const Route = createFileRoute("/rx-claim/$claimId")({
  head: () => ({
    meta: [
      { title: "Open your prescription — Lubin" },
      {
        name: "description",
        content:
          "Open the prescription your prescriber signed, and keep it in your Lubin health passport.",
      },
      { property: "og:title", content: "Open your prescription — Lubin" },
      {
        property: "og:description",
        content: "Open the prescription your prescriber signed and keep it in Lubin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClaimPrescriptionPage,
});

type Relationship = "parent" | "guardian" | "carer";

const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  parent: "Parent",
  guardian: "Legal guardian",
  carer: "Carer / family member",
};

function ClaimPrescriptionPage() {
  const { claimId } = Route.useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<PrescriptionClaim | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [dob, setDob] = useState("");
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [relationship, setRelationship] = useState<Relationship | "">("");

  useEffect(() => {
    const read = () => setClaim(findClaim(claimId) ?? null);
    read();
    markClaimOpened(claimId);
    setLoaded(true);
    const readAuth = () => {
      try {
        setSignedIn(window.localStorage.getItem("lubin.signedIn") === "1");
      } catch {
        setSignedIn(false);
      }
    };
    readAuth();
    window.addEventListener("lubin:auth-change", readAuth);
    const unsubscribe = subscribeClaims(read);
    return () => {
      window.removeEventListener("lubin:auth-change", readAuth);
      unsubscribe();
    };
  }, [claimId]);

  const doc = claim?.document;
  const documentHref = useMemo(() => {
    if (!doc) return "#";
    return prescriptionViewHref({
      appointmentId: doc.appointmentId,
      country: doc.country,
      clientName: doc.patientName,
      providerName: doc.identity?.fullName,
      docId: doc.id,
      document: doc,
    });
  }, [doc]);

  if (loaded && !claim) {
    return (
      <Shell>
        <p className="text-[13.5px] leading-relaxed text-[#6F6889]">
          This prescription link is no longer available. Ask your prescriber to send it again.
        </p>
      </Shell>
    );
  }

  if (!claim || !doc) {
    return (
      <Shell>
        <p className="text-[13.5px] text-[#6F6889]">Opening your prescription…</p>
      </Shell>
    );
  }

  const claimed = claim.state === "claimed";
  const canFinish = nameConfirmed && (!forSomeoneElse || relationship !== "");

  return (
    <Shell>
      <div className="flex items-center gap-2.5">
        <img src={rxIcon.url} alt="Rx" className="h-7 w-7" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A7FB0]">
            Signed prescription
          </p>
          <h1 className="text-[19px] font-bold leading-tight text-[#3D2E6B]">
            {doc.patientName ? `For ${doc.patientName}` : "Your prescription"}
          </h1>
        </div>
      </div>

      {/* Preview — usable at a pharmacy straight away, account or not. */}
      <section className="mt-5 rounded-2xl border border-[#E3DBF5] bg-white p-5">
        <p className="font-mono text-[12px] font-semibold text-[#3D2E6B]">{doc.number}</p>
        <ul className="mt-2.5 space-y-2">
          {doc.medications.map((m, i) => (
            <li key={`${m.name}-${i}`} className="text-[13.5px] leading-snug text-[#2C2B4B]">
              <span className="font-semibold">
                {m.genericName || m.name}
                {m.strength ? ` ${m.strength}` : ""}
              </span>
              {[m.dose, m.frequency, m.duration].filter(Boolean).length > 0 ? (
                <span className="text-[#5A4A8A]">
                  {" "}
                  — {[m.dose, m.frequency, m.duration].filter(Boolean).join(", ")}
                </span>
              ) : null}
            </li>
          ))}
          {doc.medications.length === 0 && (
            <li className="text-[13px] text-[#6F6889]">See the full document for details.</li>
          )}
        </ul>
        <p className="mt-3 text-[11.5px] text-[#8A7FB0]">
          Signed {formatDateTime(doc.signedAt)}
          {doc.identity?.fullName ? ` · ${doc.identity.fullName}` : ""}
          {doc.validUntil
            ? ` · ${doc.validityLabel || "Valid until"} ${formatDate(doc.validUntil)}`
            : ""}
        </p>
        {doc.controlled && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#FDF6E7] px-2.5 py-1 text-[11px] font-semibold text-[#6B4E10]">
            <ShieldAlert className="h-3.5 w-3.5" />
            {doc.country === "PH" ? "Dangerous drug" : "Controlled substance"}
          </p>
        )}
        <a
          href={documentHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
        >
          View full prescription <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </section>

      {claimed ? (
        <section className="mt-4 rounded-2xl border border-[#CDE8D8] bg-[#F3FAF6] p-5">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2F6B4A]">
            <Check className="h-4 w-4" /> Saved to your Lubin account
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#3D6B54]">
            {claim.claimedFor
              ? `Filed under ${doc.patientName}’s record, claimed as ${RELATIONSHIP_LABEL[
                  (claim.claimedFor.relationship as Relationship) ?? "carer"
                ]}.`
              : "You’ll find it under My prescriptions any time you need it."}
          </p>
          <Link
            to="/profile"
            className="mt-3 inline-flex h-10 items-center rounded-xl border border-[#BFE0CD] bg-white px-4 text-[12.5px] font-semibold text-[#2F6B4A] transition hover:bg-[#EDF7F1]"
          >
            Go to my prescriptions
          </Link>
        </section>
      ) : !signedIn ? (
        <section className="mt-4 rounded-2xl border border-[#E3DBF5] bg-[#FBF9FF] p-5">
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[#3D2E6B]">
            <Lock className="h-4 w-4 text-[#7E6BAF]" /> Keep this prescription in your health
            passport
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#6F6889]">
            Create a free Lubin account and this prescription — plus any future ones — stays in one
            place, ready to show at a pharmacy.
          </p>
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/auth",
                search: { mode: "signup", redirect: `/rx-claim/${claimId}` },
              })
            }
            className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A]"
          >
            Create my free account
          </button>
          <p className="mt-2.5 text-[11.5px] text-[#8A7FB0]">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/auth",
                  search: { mode: "signin", redirect: `/rx-claim/${claimId}` },
                })
              }
              className="font-semibold text-[#6E4FD3] underline"
            >
              Sign in instead
            </button>
          </p>
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-[#E3DBF5] bg-white p-5">
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[#3D2E6B]">
            <UserRound className="h-4 w-4 text-[#7E6BAF]" /> Is this you?
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#6F6889]">
            One quick check so the prescription is saved to the right person.
          </p>

          <label className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] px-3.5 py-3">
            <input
              type="checkbox"
              checked={nameConfirmed}
              onChange={(e) => setNameConfirmed(e.target.checked)}
              className="mt-[3px] h-4 w-4 accent-[#6E4FD3]"
            />
            <span className="text-[12.5px] leading-snug text-[#2C2B4B]">
              The name on this prescription is{" "}
              <span className="font-semibold">{doc.patientName || "the patient"}</span> and it is
              correct.
            </span>
          </label>

          <label className="mt-3 block">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#8A7FB0]">
              Date of birth (optional)
            </span>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="mt-1.5 h-10 w-full max-w-[220px] rounded-xl border border-[#E3DBF5] bg-white px-3 text-[13px] text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
            />
          </label>

          <label className="mt-3 flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={forSomeoneElse}
              onChange={(e) => setForSomeoneElse(e.target.checked)}
              className="mt-[3px] h-4 w-4 accent-[#6E4FD3]"
            />
            <span className="text-[12.5px] leading-snug text-[#2C2B4B]">
              I’m claiming this for someone I care for
            </span>
          </label>

          {forSomeoneElse && (
            <div className="mt-2.5 rounded-xl border border-[#EDEBF3] bg-[#FBFAFE] p-3.5">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#8A7FB0]">
                You are their
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(RELATIONSHIP_LABEL) as Relationship[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRelationship(key)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${
                      relationship === key
                        ? "border-[#6E4FD3] bg-[#F6F3FE] text-[#3D2E6B]"
                        : "border-[#E3DBF5] bg-white text-[#6F6889] hover:bg-[#FAF7FE]"
                    }`}
                  >
                    {RELATIONSHIP_LABEL[key]}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-[11.5px] leading-snug text-[#6F6889]">
                The prescription is filed under {doc.patientName || "the patient"}’s record inside
                your account — never mixed into your own medication list.
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={!canFinish}
            onClick={() =>
              claimPrescription(claimId, {
                relationship: forSomeoneElse ? (relationship || "carer") : undefined,
              })
            }
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#3D2E6B] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#33265A] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Save to my Lubin account
          </button>
        </section>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen bg-[#F3F0FA] px-5 py-10"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-[560px]">{children}</div>
    </main>
  );
}

function formatDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
