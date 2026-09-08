import * as React from "react";
import {
  Body,
  Button,
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

const colors = {
  brandPurple: "#7E6BAF",
  brandDark: "#3D2E6B",
  lavender: "#F7F2FE",
  lavenderBorder: "#EAE7F5",
  textMuted: "#7E6BAF",
  white: "#ffffff",
} as const;

export interface PrescriptionIssuedProps {
  patientName?: string;
  providerName?: string;
  prescriptionNumber?: string;
  issuedAt?: string;
  validityLabel?: string;
  validUntil?: string;
  /** One line per medication, e.g. "Sertraline 25 mg — 1 tablet each morning". */
  medications?: string[];
  /** Secure claim link — the same link the QR code on the document points to. */
  claimLink?: string;
  /** true when the patient already has a Lubin account. */
  hasAccount?: boolean;
  supportEmail?: string;
}

const label = {
  margin: 0,
  color: colors.textMuted,
  fontSize: 11,
  fontWeight: 700 as const,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
};

export default function PrescriptionIssuedEmail({
  patientName,
  providerName,
  prescriptionNumber,
  issuedAt,
  validityLabel,
  validUntil,
  medications,
  claimLink,
  hasAccount,
  supportEmail,
}: PrescriptionIssuedProps) {
  const meds = medications ?? [];
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Your prescription{providerName ? ` from ${providerName}` : ""} is ready to view.
      </Preview>
      <Body
        style={{
          backgroundColor: colors.white,
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Text style={{ ...label, marginBottom: 8 }}>Lubin · Prescription</Text>
          <Heading
            style={{ margin: "0 0 10px", color: colors.brandDark, fontSize: 22, lineHeight: 1.3 }}
          >
            {patientName ? `${patientName}, your prescription is ready` : "Your prescription is ready"}
          </Heading>
          <Text style={{ margin: "0 0 20px", color: "#5A5372", fontSize: 14, lineHeight: 1.6 }}>
            {providerName ? `${providerName} signed ` : "Your prescriber signed "}
            this prescription
            {issuedAt ? ` on ${issuedAt}` : ""}.{" "}
            {hasAccount
              ? "It is already saved in your Lubin account."
              : "Open it below — you can use it at a pharmacy right away."}
          </Text>

          <Section
            style={{
              backgroundColor: colors.lavender,
              border: `1px solid ${colors.lavenderBorder}`,
              borderRadius: 14,
              padding: "18px 20px",
              marginBottom: 20,
            }}
          >
            <Text style={label}>Prescribed medication</Text>
            {meds.length === 0 ? (
              <Text style={{ margin: "8px 0 0", color: colors.brandDark, fontSize: 14 }}>
                See the prescription for full details.
              </Text>
            ) : (
              meds.map((line) => (
                <Text
                  key={line}
                  style={{
                    margin: "8px 0 0",
                    color: colors.brandDark,
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {line}
                </Text>
              ))
            )}
            {prescriptionNumber && (
              <Text style={{ margin: "12px 0 0", color: colors.textMuted, fontSize: 12 }}>
                Rx no. {prescriptionNumber}
                {validUntil ? ` · ${validityLabel || "Valid until"} ${validUntil}` : ""}
              </Text>
            )}
          </Section>

          {claimLink && (
            <Section style={{ marginBottom: 20 }}>
              <Button
                href={claimLink}
                style={{
                  backgroundColor: colors.brandDark,
                  borderRadius: 12,
                  color: colors.white,
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "13px 22px",
                  textDecoration: "none",
                }}
              >
                {hasAccount ? "Open my prescription" : "Open my prescription"}
              </Button>
              <Text style={{ margin: "12px 0 0", color: "#5A5372", fontSize: 13, lineHeight: 1.6 }}>
                {hasAccount
                  ? "This link opens the prescription in your Lubin health passport, where you can view or download it any time."
                  : "You can also create a free Lubin account from that page to keep this prescription — and any future ones — in one place."}
              </Text>
            </Section>
          )}

          <Hr style={{ borderColor: colors.lavenderBorder, margin: "0 0 16px" }} />
          <Text style={{ margin: "0 0 8px", color: colors.textMuted, fontSize: 12, lineHeight: 1.6 }}>
            This link is personal to you. If you received it for someone you care for, you can say so
            when you open it so the prescription is filed under their name.
          </Text>
          {supportEmail && (
            <Text style={{ margin: "0 0 8px", color: colors.textMuted, fontSize: 12 }}>
              Need help?{" "}
              <Link
                href={`mailto:${supportEmail}`}
                style={{ color: colors.brandPurple, textDecoration: "underline" }}
              >
                {supportEmail}
              </Link>
            </Text>
          )}
          <Text style={{ margin: 0, color: colors.textMuted, fontSize: 12, fontWeight: 600 }}>
            Best, <br />
            The Lubin team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: PrescriptionIssuedEmail,
  subject: (data: PrescriptionIssuedProps) =>
    data.hasAccount
      ? "Your prescription is in your Lubin account"
      : "Your prescription from Lubin is ready",
  displayName: "Prescription issued (claim link)",
  previewData: {
    patientName: "Anna",
    providerName: "Dr. Camille Lazaro",
    prescriptionNumber: "LBN-PH-20260908-0001",
    issuedAt: "Sep 8, 2026 · 10:24 AM",
    validityLabel: "Valid until",
    validUntil: "Dec 8, 2026",
    medications: [
      "Sertraline 25 mg — 1 tablet each morning for 14 days",
      "Melatonin 3 mg — 1 tablet at bedtime as needed",
    ],
    claimLink: "https://lubin.care/rx-claim/rxc_demo1234",
    hasAccount: false,
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;
