import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface HealthPassportSharedProps {
  /** Who receives this email: the provider, or the patient's own copy. */
  recipientRole?: "provider" | "patient";
  recipientName?: string;
  /** Patient who shared the passport. */
  patientName?: string;
  providerName?: string;
  appointmentLabel?: string;
  /** Health Passport details shared, as label/value rows. */
  healthRecords?: Array<{ label: string; value: string }>;
  /** Intake form answers, when the patient completed one. */
  intake?: { formName?: string; completedAt?: string; answers?: Array<{ label: string; value: string }> };
  /** Assessments the patient chose to include. */
  assessments?: Array<{
    name: string;
    clinicalName?: string;
    score?: number;
    maxScore?: number;
    statusLabel?: string;
    takenAt?: string;
  }>;
  patientNote?: string;
  viewLink?: string;
  expiresAt?: string;
  supportEmail?: string;
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "Inter, Arial, sans-serif",
  color: "#3D2E6B",
};
const container = { padding: "32px 28px", maxWidth: "600px" };
const label = {
  fontSize: "11px",
  letterSpacing: "1.4px",
  fontWeight: 700,
  color: "#A89BD0",
  textTransform: "uppercase" as const,
  margin: "0 0 8px",
};
const h1 = { fontSize: "23px", lineHeight: "31px", margin: "0 0 10px", color: "#3D2E6B" };
const p = { fontSize: "15px", lineHeight: "24px", color: "#5B4796", margin: "0 0 16px" };
const card = {
  border: "1px solid #EAE7F5",
  borderRadius: "16px",
  padding: "18px 20px",
  backgroundColor: "#FBF9FF",
  margin: "0 0 16px",
};
const rowLabel = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#7E6BAF",
  margin: "0",
  fontWeight: 600,
};
const rowValue = {
  fontSize: "14.5px",
  lineHeight: "22px",
  color: "#2A2550",
  margin: "0 0 12px",
};
const cta = {
  display: "inline-block",
  backgroundColor: "#3D2E6B",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 22px",
  borderRadius: "12px",
  textDecoration: "none",
};
const small = { fontSize: "12.5px", lineHeight: "20px", color: "#7E6BAF", margin: "14px 0 0" };

const Rows = ({ rows }: { rows: Array<{ label: string; value: string }> }) => (
  <>
    {rows.map((r) => (
      <Section key={r.label}>
        <Text style={rowLabel}>{r.label}</Text>
        <Text style={rowValue}>{r.value}</Text>
      </Section>
    ))}
  </>
);

const Email = ({
  recipientRole = "provider",
  recipientName,
  patientName = "Your patient",
  providerName = "your provider",
  appointmentLabel,
  healthRecords = [],
  intake,
  assessments = [],
  patientNote,
  viewLink = "https://lubin.care/provider/appointments",
  expiresAt,
  supportEmail = "support@lubin.care",
}: HealthPassportSharedProps) => {
  const isPatient = recipientRole === "patient";
  const intakeAnswers = intake?.answers ?? [];

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {isPatient
          ? `You shared your Health Passport with ${providerName}`
          : `${patientName} shared their Health Passport with you before your appointment`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={label}>Health Passport shared</Text>
          <Heading style={h1}>
            {isPatient
              ? `You shared your Health Passport with ${providerName}`
              : `${patientName} shared their Health Passport`}
          </Heading>
          <Text style={p}>
            {recipientName ? `Hi ${recipientName} — ` : "Hi — "}
            {isPatient
              ? `${providerName} can now see the information you chose to share`
              : `${patientName} chose what to share with you`}
            {appointmentLabel ? ` for ${appointmentLabel}` : ""}. Only the items listed below are
            included{expiresAt ? `, and access ends on ${expiresAt}` : ""}.
          </Text>

          {healthRecords.length > 0 && (
            <Section style={card}>
              <Text style={label}>Health records</Text>
              <Rows rows={healthRecords} />
            </Section>
          )}

          {intakeAnswers.length > 0 && (
            <Section style={card}>
              <Text style={label}>
                Intake form{intake?.formName ? ` · ${intake.formName}` : ""}
              </Text>
              {intake?.completedAt && (
                <Text style={{ ...small, margin: "0 0 12px" }}>
                  Completed {intake.completedAt}
                </Text>
              )}
              <Rows rows={intakeAnswers} />
            </Section>
          )}

          {assessments.length > 0 && (
            <Section style={card}>
              <Text style={label}>Assessments shared</Text>
              {assessments.map((a) => (
                <Section key={`${a.name}-${a.takenAt ?? ""}`}>
                  <Text style={rowLabel}>
                    {a.name}
                    {a.clinicalName ? ` · ${a.clinicalName}` : ""}
                    {a.takenAt ? ` · ${a.takenAt}` : ""}
                  </Text>
                  <Text style={rowValue}>
                    {typeof a.score === "number" && typeof a.maxScore === "number"
                      ? `${a.score} / ${a.maxScore}`
                      : "Result shared"}
                    {a.statusLabel ? ` · ${a.statusLabel}` : ""}
                  </Text>
                </Section>
              ))}
              <Text style={{ ...small, margin: "0" }}>
                Self-reported results, meant for conversation — not a diagnosis.
              </Text>
            </Section>
          )}

          {patientNote && (
            <Section style={card}>
              <Text style={label}>
                A note from {isPatient ? "you" : patientName}
              </Text>
              <Text style={{ ...rowValue, margin: 0, fontStyle: "italic" }}>“{patientNote}”</Text>
            </Section>
          )}

          <Link href={viewLink} style={cta}>
            {isPatient ? "Review what I shared" : "Open the full Health Passport"}
          </Link>

          <Text style={small}>
            {isPatient
              ? "You can update or stop this sharing at any time from your Health Passport."
              : "Open it on Lubin to see the complete, up-to-date version. The patient can update or withdraw access at any time."}
          </Text>

          <Hr style={{ borderColor: "#EAE7F5", margin: "22px 0 14px" }} />
          <Text style={small}>
            This email contains personal health information — please keep it confidential. Questions?{" "}
            <Link href={`mailto:${supportEmail}`} style={{ color: "#5B4796" }}>
              {supportEmail}
            </Link>
            <br />
            lubin.care
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (data: any) =>
    data?.recipientRole === "patient"
      ? "You shared your Health Passport"
      : data?.patientName
        ? `${data.patientName} shared their Health Passport with you`
        : "A patient shared their Health Passport with you",
  displayName: "Health Passport shared (provider)",
  previewData: {
    recipientRole: "provider",
    recipientName: "Dr. Camille Lazaro",
    patientName: "Anna Reyes",
    providerName: "Dr. Camille Lazaro",
    appointmentLabel: "Initial consultation · Aug 18, 2026 · 10:00 AM (GMT+8)",
    healthRecords: [
      { label: "Allergies", value: "Penicillin — rash" },
      { label: "Conditions", value: "Anxiety, mild asthma" },
      { label: "Current medication", value: "Sertraline 50 mg, once daily" },
      { label: "Pregnancy", value: "Not pregnant" },
      { label: "Breastfeeding", value: "No" },
      { label: "Previous care", value: "Talk therapy in 2024 (6 sessions)" },
    ],
    intake: {
      formName: "Session prep",
      completedAt: "Aug 17, 2026",
      answers: [
        { label: "Goal for this session", value: "Manage work-related anxiety and sleep better." },
        { label: "What's been going on lately", value: "Trouble falling asleep for about 3 weeks." },
        { label: "Anything you'd rather not discuss yet", value: "Family history" },
      ],
    },
    assessments: [
      {
        name: "Mood check",
        clinicalName: "PHQ-9",
        score: 8,
        maxScore: 27,
        statusLabel: "Mild",
        takenAt: "Aug 19, 2026",
      },
      {
        name: "Anxiety check",
        clinicalName: "GAD-7",
        score: 11,
        maxScore: 21,
        statusLabel: "Moderate",
        takenAt: "Aug 19, 2026",
      },
    ],
    patientNote: "I shared my sleep notes too — that's what's bothering me most right now.",
    viewLink: "https://lubin.care/provider/appointments",
    expiresAt: "Aug 25, 2026",
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;

export default Email;
