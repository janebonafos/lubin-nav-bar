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
  brandNavy: "#2A2550",
  lavender: "#F7F2FE",
  lavenderBorder: "#EAE7F5",
  textMuted: "#7E6BAF",
  white: "#ffffff",
} as const;

export interface AppointmentCompletedProps {
  recipientName?: string;
  providerName?: string;
  serviceName?: string;
  appointmentDateTime?: string;
  /** Short recap the provider chose to share. */
  summaryRecap?: string;
  /** One agreed next step per array item. */
  nextSteps?: string[];
  /** Take-home notes the provider added. */
  takeHomeNotes?: string;
  /** Files or links attached to the summary. */
  resources?: { title: string; description?: string; url?: string }[];
  /** Present only when a prescription was signed for this session. */
  prescription?: {
    identifier?: string;
    medications?: string[];
    deliveryLabel?: string;
    viewLink?: string;
  };
  summaryLink?: string;
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

export default function AppointmentCompletedEmail({
  recipientName,
  providerName,
  serviceName,
  appointmentDateTime,
  summaryRecap,
  nextSteps,
  takeHomeNotes,
  resources,
  prescription,
  summaryLink,
  supportEmail,
}: AppointmentCompletedProps) {
  const hasSteps = Array.isArray(nextSteps) && nextSteps.length > 0;
  const hasResources = Array.isArray(resources) && resources.length > 0;
  const meds = prescription?.medications ?? [];

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Your session summary{providerName ? ` from ${providerName}` : ""} is ready
        {prescription ? " — including your prescription" : ""}.
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
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px" }}>
          <Section
            style={{
              backgroundColor: colors.lavender,
              borderRadius: 24,
              padding: "24px",
              textAlign: "center",
            }}
          >
            <Text style={{ ...label, letterSpacing: 1.5, fontSize: 12 }}>
              Session complete
            </Text>
          </Section>

          <Section
            style={{
              backgroundColor: colors.white,
              border: `1px solid ${colors.lavenderBorder}`,
              borderRadius: 24,
              padding: "32px 28px",
              marginTop: 16,
            }}
          >
            <Text style={{ margin: "0 0 8px", color: colors.brandNavy, fontSize: 15 }}>
              Hi {recipientName ?? "there"},
            </Text>
            <Heading
              as="h1"
              style={{
                margin: "0 0 12px",
                color: colors.brandNavy,
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.25,
              }}
            >
              Your session summary is ready
            </Heading>
            <Text
              style={{
                margin: "0 0 24px",
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: "1.5",
              }}
            >
              {providerName ?? "Your provider"} marked your
              {serviceName ? ` ${serviceName}` : " appointment"}
              {appointmentDateTime ? ` on ${appointmentDateTime}` : ""} as completed and shared
              what you can take away from it. Everything stays inside your Lubin account.
            </Text>

            {summaryRecap && (
              <Section
                style={{
                  backgroundColor: colors.lavender,
                  borderRadius: 16,
                  padding: 24,
                  marginBottom: 20,
                }}
              >
                <Text style={label}>What we talked about</Text>
                <Text
                  style={{
                    margin: "8px 0 0",
                    color: colors.brandNavy,
                    fontSize: 15,
                    lineHeight: "1.65",
                  }}
                >
                  {summaryRecap}
                </Text>
              </Section>
            )}

            {hasSteps && (
              <Section
                style={{
                  border: `1px solid ${colors.lavenderBorder}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <Text style={label}>Agreed next steps</Text>
                {nextSteps!.map((step, i) => (
                  <Text
                    key={i}
                    style={{
                      margin: "10px 0 0",
                      color: colors.brandNavy,
                      fontSize: 14,
                      lineHeight: "1.6",
                    }}
                  >
                    {i + 1}. {step}
                  </Text>
                ))}
              </Section>
            )}

            {prescription && (
              <Section
                style={{
                  border: `2px solid ${colors.brandDark}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <Text style={{ ...label, color: colors.brandDark }}>
                  Prescription issued
                </Text>
                {meds.length > 0 &&
                  meds.map((m, i) => (
                    <Text
                      key={i}
                      style={{
                        margin: "10px 0 0",
                        color: colors.brandNavy,
                        fontSize: 15,
                        fontWeight: 600,
                        lineHeight: "1.5",
                      }}
                    >
                      {i + 1}. {m}
                    </Text>
                  ))}
                <Text
                  style={{ margin: "12px 0 0", color: colors.textMuted, fontSize: 13 }}
                >
                  {[
                    prescription.identifier ? `Rx ${prescription.identifier}` : null,
                    prescription.deliveryLabel ?? null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                {prescription.viewLink && (
                  <Button
                    href={prescription.viewLink}
                    style={{
                      display: "block",
                      width: "100%",
                      boxSizing: "border-box",
                      backgroundColor: colors.brandDark,
                      color: colors.white,
                      fontSize: 15,
                      fontWeight: 600,
                      textAlign: "center",
                      textDecoration: "none",
                      borderRadius: 14,
                      padding: "14px 24px",
                      marginTop: 16,
                    }}
                  >
                    View my prescription
                  </Button>
                )}
                <Text
                  style={{
                    margin: "12px 0 0",
                    color: colors.textMuted,
                    fontSize: 12,
                    lineHeight: "1.6",
                  }}
                >
                  Open it in Lubin to view or download the signed copy. Bring that copy to your
                  pharmacy — for your safety, prescription details are never attached to email.
                </Text>
              </Section>
            )}

            {hasResources && (
              <Section
                style={{
                  border: `1px solid ${colors.lavenderBorder}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <Text style={label}>Files and links shared with you</Text>
                {resources!.map((r, i) => (
                  <div key={i} style={{ marginTop: 12 }}>
                    <Text
                      style={{
                        margin: 0,
                        color: colors.brandNavy,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {r.url ? (
                        <Link
                          href={r.url}
                          style={{ color: colors.brandDark, textDecoration: "underline" }}
                        >
                          {r.title}
                        </Link>
                      ) : (
                        r.title
                      )}
                    </Text>
                    {r.description && (
                      <Text
                        style={{
                          margin: "4px 0 0",
                          color: colors.textMuted,
                          fontSize: 13,
                          lineHeight: "1.5",
                        }}
                      >
                        {r.description}
                      </Text>
                    )}
                  </div>
                ))}
              </Section>
            )}

            {takeHomeNotes && (
              <Section
                style={{
                  backgroundColor: colors.lavender,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <Text style={label}>To practise between sessions</Text>
                <Text
                  style={{
                    margin: "8px 0 0",
                    color: colors.brandNavy,
                    fontSize: 14,
                    lineHeight: "1.65",
                  }}
                >
                  {takeHomeNotes}
                </Text>
              </Section>
            )}

            {summaryLink && (
              <Button
                href={summaryLink}
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: prescription ? colors.white : colors.brandDark,
                  color: prescription ? colors.brandDark : colors.white,
                  border: prescription ? `1px solid ${colors.lavenderBorder}` : "none",
                  fontSize: 15,
                  fontWeight: 600,
                  textAlign: "center",
                  textDecoration: "none",
                  borderRadius: 14,
                  padding: "14px 24px",
                }}
              >
                Open my session summary
              </Button>
            )}

            <Hr
              style={{
                border: "none",
                borderTop: `1px solid ${colors.lavenderBorder}`,
                margin: "28px 0",
              }}
            />

            <Text style={{ margin: 0, color: colors.textMuted, fontSize: 14, lineHeight: "1.6" }}>
              Questions about anything here? Reply inside your appointment thread in Lubin and
              {providerName ? ` ${providerName}` : " your provider"} will see it — personal email
              addresses are never shared.
            </Text>
          </Section>

          <Section style={{ marginTop: 24, textAlign: "center" }}>
            <Text style={{ margin: "0 0 8px", color: colors.textMuted, fontSize: 12 }}>
              Please do not reply to this email — it was sent automatically.
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
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: AppointmentCompletedEmail,
  subject: (data: AppointmentCompletedProps) =>
    data.prescription
      ? "Your session summary and prescription are ready"
      : "Your session summary is ready",
  displayName: "Appointment completed (summary + prescription)",
  previewData: {
    recipientName: "Anna",
    providerName: "Dr. Camille Lazaro",
    serviceName: "Initial consultation · 50 min",
    appointmentDateTime: "Aug 17, 2026 · 10:00 AM (GMT+8)",
    summaryRecap:
      "We looked at how your sleep and worry have been building up over the last few weeks, and agreed to start with small, steady changes rather than a big overhaul.",
    nextSteps: [
      "Keep a short sleep note each morning — bedtime, wake time, how rested you felt.",
      "Try the 10-minute wind-down routine we discussed before bed.",
      "Book a follow-up in three weeks so we can review how it went.",
    ],
    takeHomeNotes:
      "If a worry loop starts at night, write it down and park it for the morning instead of solving it in bed.",
    resources: [
      {
        title: "Sleep and worry — a short guide",
        description: "A two-page handout on the wind-down routine we practised.",
        url: "https://lubin.care/resources",
      },
    ],
    prescription: {
      identifier: "RX-2026-0817-4821",
      medications: ["Sertraline 25 mg — 1 tablet each morning for 14 days"],
      deliveryLabel: "Available to view and download in Lubin",
      viewLink: "https://lubin.care/profile",
    },
    summaryLink: "https://lubin.care/profile",
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;