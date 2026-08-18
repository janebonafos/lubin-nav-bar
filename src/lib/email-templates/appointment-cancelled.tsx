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

export interface AppointmentCancelledProps {
  recipientName?: string;
  recipientRole?: "provider" | "client";
  cancelledByLabel?: string;
  counterpartName?: string;
  serviceName?: string;
  cancelledDateTime?: string;
  duration?: string;
  timezone?: string;
  reason?: string;
  refundLabel?: string;
  rebookLink?: string;
  appointmentLink?: string;
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

const value = {
  margin: "4px 0 0",
  color: colors.brandNavy,
  fontSize: 15,
  fontWeight: 500 as const,
};

export default function AppointmentCancelledEmail({
  recipientName,
  recipientRole = "client",
  cancelledByLabel,
  counterpartName,
  serviceName,
  cancelledDateTime,
  duration,
  timezone,
  reason,
  refundLabel,
  rebookLink,
  appointmentLink,
  supportEmail,
}: AppointmentCancelledProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Appointment cancelled{cancelledDateTime ? `: ${cancelledDateTime}` : ""} — nothing else is
        needed from you.
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
              Appointment cancelled
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
              This session has been cancelled
            </Heading>
            <Text
              style={{
                margin: "0 0 24px",
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: "1.5",
              }}
            >
              {cancelledByLabel ?? "This appointment"} cancelled the session
              {counterpartName ? ` with ${counterpartName}` : ""}
              {serviceName ? ` (${serviceName})` : ""}. The time slot has been released and your
              calendar reminder no longer applies.
            </Text>

            <Section
              style={{
                backgroundColor: colors.lavender,
                borderRadius: 16,
                padding: 24,
                marginBottom: 24,
              }}
            >
              <div style={{ marginBottom: duration || timezone ? 14 : 0 }}>
                <Text style={label}>Cancelled time</Text>
                <Text
                  style={{
                    ...value,
                    textDecoration: "line-through",
                    color: colors.textMuted,
                  }}
                >
                  {cancelledDateTime ?? "—"}
                </Text>
              </div>
              {(duration || timezone) && (
                <Text style={{ margin: 0, color: colors.textMuted, fontSize: 13 }}>
                  {[duration, timezone].filter(Boolean).join(" · ")}
                </Text>
              )}
            </Section>

            {reason && (
              <Section
                style={{
                  border: `1px solid ${colors.lavenderBorder}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <Text style={label}>Reason given</Text>
                <Text
                  style={{
                    margin: "6px 0 0",
                    color: colors.brandNavy,
                    fontSize: 14,
                    lineHeight: "1.6",
                  }}
                >
                  {reason}
                </Text>
              </Section>
            )}

            {refundLabel && (
              <Section
                style={{
                  border: `1px solid ${colors.lavenderBorder}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <Text style={label}>Payment</Text>
                <Text
                  style={{
                    margin: "6px 0 0",
                    color: colors.brandNavy,
                    fontSize: 14,
                    lineHeight: "1.6",
                  }}
                >
                  {refundLabel}
                </Text>
              </Section>
            )}

            {rebookLink && recipientRole === "client" && (
              <Button
                href={rebookLink}
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
                  marginBottom: 12,
                }}
              >
                Book a new time
              </Button>
            )}

            {appointmentLink && (
              <Button
                href={appointmentLink}
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: colors.white,
                  color: colors.brandDark,
                  fontSize: 15,
                  fontWeight: 600,
                  textAlign: "center",
                  textDecoration: "none",
                  border: `1px solid ${colors.lavenderBorder}`,
                  borderRadius: 14,
                  padding: "14px 24px",
                }}
              >
                {recipientRole === "provider" ? "Open my appointments" : "View my appointments"}
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
              A matching update was added to your appointment thread in Lubin, so both of you can
              see this change in one place. Reply there to keep talking — personal email addresses
              are never shared.
            </Text>
          </Section>

          <Section style={{ marginTop: 24, textAlign: "center" }}>
            <Text style={{ margin: "0 0 8px", color: colors.textMuted, fontSize: 12 }}>
              Please do not reply to this email — it was sent automatically.
            </Text>
            {supportEmail && (
              <Text style={{ margin: "0 0 8px", color: colors.textMuted, fontSize: 12 }}>
                Questions?{" "}
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
  component: AppointmentCancelledEmail,
  subject: (data: AppointmentCancelledProps) =>
    data.cancelledDateTime
      ? `Cancelled · ${data.cancelledDateTime}`
      : "Your appointment was cancelled",
  displayName: "Appointment cancelled (client)",
  previewData: {
    recipientName: "Anna",
    recipientRole: "client",
    cancelledByLabel: "Dr. Camille Lazaro",
    counterpartName: "Dr. Camille Lazaro",
    serviceName: "Initial consultation · 50 min",
    cancelledDateTime: "Aug 18, 2026 · 10:00 AM",
    duration: "50 min",
    timezone: "GMT+8",
    reason: "A clinic emergency came up. Happy to find another time this week.",
    refundLabel: "Your payment will be refunded to the original payment method within 5–10 business days.",
    rebookLink: "https://lubin.care/find-provider",
    appointmentLink: "https://lubin.care/profile",
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;