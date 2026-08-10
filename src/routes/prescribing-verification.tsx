import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  FileCheck2,
  Lock,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import {
  useVerifiedPrescribing,
  VERIFICATION_STATUS_LABEL,
  localProviderProfile,
} from "@/lib/prescription/useVerifiedPrescribing";
import {
  PRESCRIBING_PROFESSIONS,
  STEP_ORDER,
  STEP_TITLES,
  type RxJurisdiction,
  type StepId,
  type VerificationApplication,
  applicationGaps,
  canSubmit,
  completedStepCount,
  emptyApplication,
  loadApplication,
  saveApplication,
  stepComplete,
  stepGaps,
} from "@/lib/prescription/verificationApplication";

export const Route = createFileRoute("/prescribing-verification")({
  head: () => ({
    meta: [
      { title: "Prescribing verification for providers — Lubin" },
      {
        name: "description",
        content:
          "Psychiatrists and mental-health doctors verify their licence and prescribing credentials with Lubin before writing any prescription.",
      },
      { property: "og:title", content: "Prescribing verification — Lubin" },
      {
        property: "og:description",
        content:
          "Submit your licence, identity and prescribing credentials so Lubin can verify your prescribing authority.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrescribingVerificationPage,
});

const REVIEW_STEPS = [
  { label: "Submitted", note: "Lubin received your documents" },
  { label: "Documents checked", note: "Readability, names and dates" },
  { label: "Register match", note: "Checked against the issuing register" },
  { label: "Decision", note: "Prescribing opens or we tell you what is missing" },
];

function PrescribingVerificationPage() {
  const profile = localProviderProfile();
  const verification = useVerifiedPrescribing(profile.name, profile.profession);
  const record = verification.data ?? null;

  const [app, setApp] = useState<VerificationApplication>(() =>
    emptyApplication({ profession: profile.profession, fullName: profile.name }),
  );
  const [open, setOpen] = useState<StepId | null>("profession");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadApplication();
    if (saved) {
      setApp(saved);
      const next = STEP_ORDER.find((s) => !stepComplete(saved, s)) ?? null;
      setOpen(saved.submittedAt ? null : next);
    }
    setHydrated(true);
  }, []);

  const patch = (p: Partial<VerificationApplication>) =>
    setApp((cur) => {
      const next = { ...cur, ...p };
      saveApplication(next);
      return next;
    });

  const submitted = !!app.submittedAt;
  const done = completedStepCount(app);
  const gaps = useMemo(() => applicationGaps(app), [app]);

  // Lubin's record is the only thing that grants prescribing. A finished
  // submission never says "verified" on its own.
  const decided = record?.status === "verified";
  const statusLabel = decided
    ? VERIFICATION_STATUS_LABEL.verified
    : submitted
      ? "Verification in review"
      : record
        ? VERIFICATION_STATUS_LABEL[record.status]
        : "Verification not started";
  const reviewStage = decided ? 4 : submitted ? 2 : 0;

  const toggle = (id: StepId) => setOpen((cur) => (cur === id ? null : id));
  const goNext = (id: StepId) => {
    const idx = STEP_ORDER.indexOf(id);
    setOpen(STEP_ORDER[idx + 1] ?? null);
  };

  const submit = () => {
    if (!canSubmit(app)) {
      toast.error("Some required details are still missing.");
      setOpen(STEP_ORDER.find((s) => !stepComplete(app, s)) ?? null);
      return;
    }
    patch({ submittedAt: Date.now() });
    setOpen(null);
    toast.success("Sent to Lubin for verification. We usually reply within 2 business days.");
  };

  return (
    <div className="min-h-screen bg-[#FBFAFE]">
      <Navbar />
      <main className="mx-auto w-full max-w-[960px] px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
        <Link
          to="/provider/appointments"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#5A4A8A] transition hover:text-[#3D2E6B]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Appointments
        </Link>

        <header className="mt-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#8B7BC0]">
            Prescribers only
          </p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight text-[#2C2B4B] sm:text-[28px]">
            Prescribing verification
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[#5A4A8A]">
            Prescribing on Lubin stays closed until we have verified your licence, identity and
            prescribing credentials against the issuing register. A profession on your profile is
            not enough on its own. Your credential numbers stay with Lubin and are never shown to
            clients.
          </p>
        </header>

        {/* Status + review timeline */}
        <section className="mt-5 rounded-2xl border border-[#EAE2F6] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {decided ? (
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-[#3E8F6F]" />
              ) : submitted ? (
                <Clock className="mt-0.5 h-5 w-5 flex-none text-[#6E4FD3]" />
              ) : (
                <Lock className="mt-0.5 h-5 w-5 flex-none text-[#6E4FD3]" />
              )}
              <div>
                <h2 className="text-[15px] font-semibold text-[#2C2B4B]">{statusLabel}</h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#5A4A8A]">
                  {decided
                    ? `Prescribing is open for ${record?.jurisdictions.join(" and ") || "no country yet"}. Your practice and credential details are filled in automatically when you write a prescription.`
                    : submitted
                      ? "We are checking your documents. You can keep documenting sessions and recording that no prescription is needed while this is in review."
                      : "Complete the steps below to send your credentials to Lubin. Nothing here opens prescribing by itself — Lubin makes the decision."}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-[#F1ECFD] px-3 py-1 text-[11.5px] font-semibold text-[#5A3EB8]">
              {decided ? "Prescribing open" : submitted ? "In review" : `${done} of 5 steps done`}
            </span>
          </div>

          <ol className="mt-4 grid gap-3 sm:grid-cols-4">
            {REVIEW_STEPS.map((s, i) => {
              const state = reviewStage > i ? "done" : reviewStage === i ? "current" : "todo";
              return (
                <li key={s.label} className="flex items-start gap-2">
                  <span
                    className={`mt-[2px] grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-semibold ${
                      state === "done"
                        ? "bg-[#3E8F6F] text-white"
                        : state === "current"
                          ? "bg-[#6E4FD3] text-white"
                          : "bg-[#EFEBF8] text-[#8B7BC0]"
                    }`}
                  >
                    {state === "done" ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-semibold text-[#2C2B4B]">
                      {s.label}
                    </span>
                    <span className="block text-[11.5px] leading-snug text-[#6F6889]">{s.note}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          {record && record.status !== "verified" && record.outstanding.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#EFE6C9] bg-[#FDFAF0] px-4 py-3">
              <p className="text-[12.5px] font-semibold text-[#7A6420]">What Lubin still needs</p>
              <ul className="mt-1.5 space-y-1">
                {record.outstanding.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-[12.5px] text-[#6B5A2A]">
                    <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#C9B063]" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Application steps */}
        <div className="mt-5 space-y-3">
          {STEP_ORDER.map((id, i) => {
            const complete = stepComplete(app, id);
            const isOpen = open === id;
            const missing = stepGaps(app, id);
            return (
              <section
                key={id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  isOpen ? "border-[#C9B8F0]" : "border-[#EAE2F6]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
                >
                  <span
                    className={`grid h-7 w-7 flex-none place-items-center rounded-full text-[12.5px] font-semibold ${
                      complete ? "bg-[#3E8F6F] text-white" : "bg-[#2C2B4B] text-white"
                    }`}
                  >
                    {complete ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[#2C2B4B]">
                      {STEP_TITLES[id]}
                    </span>
                    <span className="block text-[12px] text-[#6F6889]">
                      {complete
                        ? "Complete"
                        : missing.length === 1
                          ? missing[0]
                          : `${missing.length} details still needed`}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 flex-none text-[#8B7BC0] transition ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#F0EAFA] px-4 py-4 sm:px-5">
                    <StepBody id={id} app={app} patch={patch} readOnly={submitted} />
                    {!submitted && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => goNext(id)}
                          className="inline-flex h-9 items-center rounded-[10px] bg-[#6E4FD3] px-4 text-[13px] font-semibold text-white transition hover:bg-[#5A3EB8]"
                        >
                          {i === STEP_ORDER.length - 1 ? "Close" : "Save and continue"}
                        </button>
                        {missing.length > 0 && (
                          <span className="text-[12px] text-[#8A7BAA]">
                            You can come back to finish this later.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Submit */}
        <section className="mt-5 rounded-2xl border border-[#EAE2F6] bg-white p-5">
          {submitted ? (
            <div className="flex flex-wrap items-center gap-3">
              <FileCheck2 className="h-5 w-5 flex-none text-[#3E8F6F]" />
              <p className="min-w-[240px] flex-1 text-[13px] leading-relaxed text-[#5A4A8A]">
                Sent to Lubin on{" "}
                {new Date(app.submittedAt as number).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                . We will email you as soon as a decision is made. Prescribing stays closed until
                then.
              </p>
              <button
                type="button"
                onClick={() => {
                  patch({ submittedAt: undefined });
                  setOpen(STEP_ORDER.find((s) => !stepComplete(app, s)) ?? "credentials");
                  toast.message("Submission reopened for editing.");
                }}
                className="inline-flex h-9 items-center rounded-[10px] border border-[#D9D5E3] bg-white px-3.5 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB]"
              >
                Update my documents
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-[15px] font-semibold text-[#2C2B4B]">Send to Lubin</h2>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#5A4A8A]">
                Lubin checks every document against the issuing register before prescribing opens.
                Verification usually takes up to 2 business days.
              </p>
              {hydrated && gaps.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {gaps.slice(0, 5).map((g) => (
                    <li key={g} className="flex items-start gap-2 text-[12.5px] text-[#5A4A8A]">
                      <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#B9A9E8]" />
                      {g}
                    </li>
                  ))}
                  {gaps.length > 5 && (
                    <li className="text-[12px] text-[#8A7BAA]">
                      and {gaps.length - 5} more detail{gaps.length - 5 === 1 ? "" : "s"}
                    </li>
                  )}
                </ul>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={gaps.length > 0}
                className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-[#6E4FD3] px-5 text-[13.5px] font-semibold text-white transition hover:bg-[#5A3EB8] disabled:cursor-not-allowed disabled:bg-[#CFC6E8]"
              >
                Submit for verification
              </button>
            </>
          )}
        </section>

        <p className="mt-4 text-[12px] leading-relaxed text-[#8A7BAA]">
          While verification is open you can still write private clinical notes, review a
          client&rsquo;s current medication, share a summary, and record that no prescription is
          needed.
        </p>
      </main>
    </div>
  );
}

/* ---------------------------------- steps --------------------------------- */

function StepBody({
  id,
  app,
  patch,
  readOnly,
}: {
  id: StepId;
  app: VerificationApplication;
  patch: (p: Partial<VerificationApplication>) => void;
  readOnly: boolean;
}) {
  const ph = app.jurisdictions.includes("PH");
  const us = app.jurisdictions.includes("US");
  const set = (p: Partial<VerificationApplication>) => {
    if (readOnly) return;
    patch(p);
  };

  if (id === "profession")
    return (
      <div className="space-y-4">
        <Fieldset
          label="Prescribing profession"
          hint="Only these professions can be verified for prescribing on Lubin."
        >
          <div className="flex flex-wrap gap-2">
            {PRESCRIBING_PROFESSIONS.map((p) => (
              <Chip
                key={p}
                active={app.profession === p}
                disabled={readOnly}
                onClick={() => set({ profession: p })}
              >
                {p}
              </Chip>
            ))}
          </div>
        </Fieldset>
        <Fieldset
          label="Countries you prescribe in"
          hint="Each country is verified separately, because the credentials and rules differ."
        >
          <div className="flex flex-wrap gap-2">
            {(["PH", "US"] as RxJurisdiction[]).map((j) => (
              <Chip
                key={j}
                active={app.jurisdictions.includes(j)}
                disabled={readOnly}
                onClick={() =>
                  set({
                    jurisdictions: app.jurisdictions.includes(j)
                      ? app.jurisdictions.filter((x) => x !== j)
                      : [...app.jurisdictions, j],
                  })
                }
              >
                {j === "PH" ? "Philippines" : "United States"}
              </Chip>
            ))}
          </div>
        </Fieldset>
      </div>
    );

  if (id === "identity")
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Text
          label="Full legal name"
          value={app.fullName}
          disabled={readOnly}
          onChange={(v) => set({ fullName: v })}
          placeholder="Dr. Maria Santos"
        />
        <Text
          label="Qualifications"
          value={app.qualifications}
          disabled={readOnly}
          onChange={(v) => set({ qualifications: v })}
          placeholder="MD, FPPA"
        />
        <Text
          label="Date of birth"
          type="date"
          value={app.dateOfBirth}
          disabled={readOnly}
          onChange={(v) => set({ dateOfBirth: v })}
        />
        <Fieldset label="Government ID type">
          <div className="flex flex-wrap gap-2">
            {["Passport", "Driver's licence", "PhilID / National ID"].map((t) => (
              <Chip
                key={t}
                active={app.govIdType === t}
                disabled={readOnly}
                onClick={() => set({ govIdType: t })}
              >
                {t}
              </Chip>
            ))}
          </div>
        </Fieldset>
        <UploadRow
          label="Government ID"
          note="Clear photo of the front, all corners visible."
          done={app.govIdUploaded}
          disabled={readOnly}
          onToggle={() => set({ govIdUploaded: !app.govIdUploaded })}
        />
        <UploadRow
          label="Liveness photo"
          note="A short camera check that you match the ID."
          done={app.selfieUploaded}
          disabled={readOnly}
          onToggle={() => set({ selfieUploaded: !app.selfieUploaded })}
          actionLabel="Start camera check"
        />
      </div>
    );

  if (id === "credentials")
    return (
      <div className="space-y-5">
        {!ph && !us && (
          <p className="rounded-xl bg-[#F7F5FB] px-3.5 py-3 text-[12.5px] text-[#5A4A8A]">
            Choose at least one country in step 1 — the required credentials depend on it.
          </p>
        )}
        {ph && (
          <div className="rounded-xl border border-[#EAE2F6] p-4">
            <p className="text-[13px] font-semibold text-[#2C2B4B]">Philippines</p>
            <p className="mt-0.5 text-[12px] text-[#6F6889]">
              PRC registration and a current PTR are required. An S2 licence is only needed for
              dangerous drugs.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Text
                label="PRC registration number"
                value={app.prcNumber}
                disabled={readOnly}
                onChange={(v) => set({ prcNumber: v })}
                placeholder="0102934"
              />
              <Text
                label="PRC expiry"
                type="date"
                value={app.prcExpiry}
                disabled={readOnly}
                onChange={(v) => set({ prcExpiry: v })}
              />
              <Text
                label="PTR number (current year)"
                value={app.ptrNumber}
                disabled={readOnly}
                onChange={(v) => set({ ptrNumber: v })}
                placeholder="PTR-2026-0038211"
              />
              <Text
                label="S2 licence number (optional)"
                value={app.s2Number}
                disabled={readOnly}
                onChange={(v) => set({ s2Number: v })}
                placeholder="Only if you prescribe dangerous drugs"
              />
              <UploadRow
                label="PRC registration card"
                done={app.prcUploaded}
                disabled={readOnly}
                onToggle={() => set({ prcUploaded: !app.prcUploaded })}
              />
              <UploadRow
                label="PTR receipt"
                done={app.ptrUploaded}
                disabled={readOnly}
                onToggle={() => set({ ptrUploaded: !app.ptrUploaded })}
              />
            </div>
          </div>
        )}
        {us && (
          <div className="rounded-xl border border-[#EAE2F6] p-4">
            <p className="text-[13px] font-semibold text-[#2C2B4B]">United States</p>
            <p className="mt-0.5 text-[12px] text-[#6F6889]">
              State licence and NPI are required. Controlled substances additionally need a verified
              DEA registration and two-factor signing through a certified EPCS provider.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Text
                label="State licence number"
                value={app.licenseNumber}
                disabled={readOnly}
                onChange={(v) => set({ licenseNumber: v })}
                placeholder="A-092416"
              />
              <Text
                label="Licensing state"
                value={app.licenseState}
                disabled={readOnly}
                onChange={(v) => set({ licenseState: v })}
                placeholder="California"
              />
              <Text
                label="NPI number"
                value={app.npiNumber}
                disabled={readOnly}
                onChange={(v) => set({ npiNumber: v })}
                placeholder="1902847361"
              />
              <UploadRow
                label="State licence"
                done={app.licenseUploaded}
                disabled={readOnly}
                onToggle={() => set({ licenseUploaded: !app.licenseUploaded })}
              />
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl bg-[#F7F5FB] px-3.5 py-3">
              <input
                type="checkbox"
                checked={app.wantsControlled}
                disabled={readOnly}
                onChange={(e) => set({ wantsControlled: e.target.checked })}
                className="mt-[3px] h-4 w-4 accent-[#6E4FD3]"
              />
              <span className="text-[12.5px] leading-relaxed text-[#5A4A8A]">
                I also prescribe controlled substances and want DEA and EPCS verified. Leave this
                unchecked to be verified for non-controlled medication only.
              </span>
            </label>
            {app.wantsControlled && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Text
                  label="DEA registration number"
                  value={app.deaNumber}
                  disabled={readOnly}
                  onChange={(v) => set({ deaNumber: v })}
                  placeholder="BW4820117"
                />
                <Fieldset label="Certified EPCS provider">
                  <div className="flex flex-wrap gap-2">
                    {["IdentiTrust EPCS", "Exostar EPCS", "ID.me for EPCS"].map((p) => (
                      <Chip
                        key={p}
                        active={app.epcsProvider === p}
                        disabled={readOnly}
                        onClick={() => set({ epcsProvider: p })}
                      >
                        {p}
                      </Chip>
                    ))}
                  </div>
                </Fieldset>
                <UploadRow
                  label="DEA certificate"
                  done={app.deaUploaded}
                  disabled={readOnly}
                  onToggle={() => set({ deaUploaded: !app.deaUploaded })}
                />
                <p className="self-center text-[12px] leading-relaxed text-[#6F6889]">
                  Identity proofing and your two-factor token are set up with the EPCS provider
                  after Lubin verifies your DEA registration.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );

  if (id === "practice")
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Text
          label="Practice or clinic name"
          value={app.clinicName}
          disabled={readOnly}
          onChange={(v) => set({ clinicName: v })}
          placeholder="Lubin Psychiatry — Makati"
        />
        <Text
          label="Practice contact"
          value={app.clinicContact}
          disabled={readOnly}
          onChange={(v) => set({ clinicContact: v })}
          placeholder="(02) 8541 2280 · care@lubin.health"
        />
        <div className="sm:col-span-2">
          <Text
            label="Practice address"
            value={app.clinicAddress}
            disabled={readOnly}
            onChange={(v) => set({ clinicAddress: v })}
            placeholder="8th Floor, Alveo Financial Tower, 6794 Ayala Ave, Makati City 1226"
          />
        </div>
        <p className="text-[12px] leading-relaxed text-[#6F6889] sm:col-span-2">
          These details are printed on the prescription your client receives. Credential numbers are
          not.
        </p>
      </div>
    );

  return (
    <div className="space-y-3">
      <Attest
        checked={app.attestTrue}
        disabled={readOnly}
        onChange={(v) => set({ attestTrue: v })}
      >
        Everything I submitted is true, current and mine. I will tell Lubin within 5 days if a
        licence, PTR or registration lapses, is restricted or is withdrawn.
      </Attest>
      <Attest
        checked={app.attestScope}
        disabled={readOnly}
        onChange={(v) => set({ attestScope: v })}
      >
        I will prescribe only within my licensed scope and only in the countries Lubin verifies me
        for, and I remain the prescriber of record for anything I sign.
      </Attest>
      <Attest
        checked={app.attestAudit}
        disabled={readOnly}
        onChange={(v) => set({ attestAudit: v })}
      >
        I understand Lubin keeps a record of every prescription I sign for audit, and that
        prescribing can be suspended if a credential can no longer be verified.
      </Attest>
      <Text
        label="Type your full name as a signature"
        value={app.signature}
        disabled={readOnly}
        onChange={(v) => set({ signature: v })}
        placeholder="Maria Santos"
      />
    </div>
  );
}

/* --------------------------------- controls -------------------------------- */

function Fieldset({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-[#5A4A8A]">{label}</p>
      {hint && <p className="mt-0.5 text-[11.5px] leading-snug text-[#8A7BAA]">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center rounded-full border px-3.5 text-[12.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
        active
          ? "border-[#6E4FD3] bg-[#F1ECFD] text-[#5A3EB8]"
          : "border-[#DEDAE8] bg-white text-[#5A4A8A] hover:bg-[#F7F5FB]"
      }`}
    >
      {children}
    </button>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-[12px] font-medium text-[#5A4A8A]">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-[#DEDAE8] bg-white px-3 text-[13px] text-[#2C2B4B] placeholder:text-[#9C96AF] focus:border-[#6E4FD3] focus:outline-none focus:ring-2 focus:ring-[#6E4FD3]/20 disabled:bg-[#F7F5FB]"
      />
    </div>
  );
}

function UploadRow({
  label,
  note,
  done,
  disabled,
  onToggle,
  actionLabel = "Attach file",
}: {
  label: string;
  note?: string;
  done: boolean;
  disabled?: boolean;
  onToggle: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#EAE2F6] px-3.5 py-3">
      <span
        className={`grid h-7 w-7 flex-none place-items-center rounded-full ${
          done ? "bg-[#E8F4EE] text-[#3E8F6F]" : "bg-[#F1ECFD] text-[#6E4FD3]"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : <Upload className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold text-[#2C2B4B]">{label}</span>
        <span className="block text-[11.5px] leading-snug text-[#6F6889]">
          {done ? "Received — Lubin will check it" : note || "PDF or photo, up to 10 MB"}
        </span>
      </span>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="inline-flex h-8 flex-none items-center rounded-[9px] border border-[#D9D5E3] bg-white px-3 text-[12px] font-semibold text-[#3D2E6B] transition hover:bg-[#F7F5FB] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {done ? "Replace" : actionLabel}
      </button>
    </div>
  );
}

function Attest({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#EAE2F6] px-3.5 py-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[3px] h-4 w-4 accent-[#6E4FD3]"
      />
      <span className="text-[12.5px] leading-relaxed text-[#5A4A8A]">{children}</span>
    </label>
  );
}