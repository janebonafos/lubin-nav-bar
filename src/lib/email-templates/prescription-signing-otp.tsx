import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

const colors = {
  brandPurple: "#7E6BAF",
  brandDark: "#3D2E6B",
  brandNavy: "#2A2550",
  lavender: "#F7F2FE",
  lavenderBorder: "#EAE7F5",
  textMuted: "#6F6889",
  white: "#ffffff",
} as const;

interface PrescriptionSigningOtpProps {
  prescriberName?: string;
  code: string;
  expiresInMinutes?: number;
  /** Jurisdiction label only — never patient identifiers. */
  jurisdiction?: string;
  medicationCount?: number;
  requestedAt?: string;
}

/**
 * One-time code used by a verified prescriber to sign a prescription.
 * Deliberately contains no patient information: only the code, the
 * prescriber's own name and the number of medications being signed.
 */
export default function PrescriptionSigningOtpEmail({
  prescriberName,
  code,
  expiresInMinutes = 10,
  jurisdiction,
  medicationCount,
  requestedAt,
}: PrescriptionSigningOtpProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Lubin prescription signing code</Preview>
      <Body
        style={{
          backgroundColor: colors.white,
          margin: 0,
          padding: "24px 0",
          fontFamily: "Helvetica, Arial, sans-serif",
          color: colors.brandNavy,
        }}
      >
        <Container style={{ maxWidth: "520px", margin: "0 auto", padding: "0 24px" }}>
          <Text
            style={{
              margin: 0,
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: colors.brandPurple,
              fontWeight: 700,
            }}
          >
            Lubin · Prescription signing
          </Text>
          <Heading
            style={{ margin: "10px 0 4px", fontSize: "22px", lineHeight: 1.25, fontWeight: 700 }}
          >
            Your signing code
          </Heading>
          <Text style={{ margin: "0 0 18px", fontSize: "14px", color: colors.textMuted }}>
            {prescriberName ? `Dr. ${prescriberName.replace(/^Dr\.?\s+/i, "")}, ` : ""}use this
            one-time code to complete the electronic signature for the prescription you are
            reviewing.
          </Text>

          <Section
            style={{
              backgroundColor: colors.lavender,
              border: `1px solid ${colors.lavenderBorder}`,
              borderRadius: "14px",
              padding: "20px 24px",
              textAlign: "center" as const,
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: 700,
                letterSpacing: "0.32em",
                color: colors.brandDark,
              }}
            >
              {code}
            </Text>
            <Text style={{ margin: "8px 0 0", fontSize: "12px", color: colors.textMuted }}>
              Expires in {expiresInMinutes} minutes · single use
            </Text>
          </Section>

          <Section style={{ padding: "18px 0 0" }}>
            {medicationCount ? (
              <Text style={{ margin: "0 0 6px", fontSize: "13px", color: colors.brandNavy }}>
                Medications in this prescription: <strong>{medicationCount}</strong>
              </Text>
            ) : null}
            {jurisdiction ? (
              <Text style={{ margin: "0 0 6px", fontSize: "13px", color: colors.brandNavy }}>
                Jurisdiction: <strong>{jurisdiction}</strong>
              </Text>
            ) : null}
            {requestedAt ? (
              <Text style={{ margin: 0, fontSize: "13px", color: colors.brandNavy }}>
                Requested: <strong>{requestedAt}</strong>
              </Text>
            ) : null}
          </Section>

          <Hr style={{ borderColor: colors.lavenderBorder, margin: "22px 0 14px" }} />
          <Text style={{ margin: 0, fontSize: "12px", lineHeight: 1.6, color: colors.textMuted }}>
            If you did not start this signature, do not enter the code. Your prescription cannot be
            signed without it. Never share this code with anyone, including Lubin staff.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: PrescriptionSigningOtpEmail,
  subject: "Your Lubin prescription signing code",
  displayName: "Prescription signing code",
  previewData: {
    prescriberName: "Maria Santos",
    code: "482913",
    expiresInMinutes: 10,
    jurisdiction: "Philippines",
    medicationCount: 1,
    requestedAt: "Aug 11, 2026 · 2:12 PM",
  },
} satisfies TemplateEntry;