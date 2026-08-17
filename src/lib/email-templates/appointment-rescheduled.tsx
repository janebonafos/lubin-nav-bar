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

export interface AppointmentRescheduledProps {
  recipientName?: string;
  recipientRole?: "provider" | "client";
  rescheduledByLabel?: string;
  counterpartName?: string;
  serviceName?: string;
  previousDateTime?: string;
  newDateTime?: string;
  duration?: string;
  timezone?: string;
  note?: string;
  appointmentLink?: string;
  addToCalendarLink?: string;
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

export default function AppointmentRescheduledEmail({
  recipientName,
  recipientRole = "client",
  rescheduledByLabel,
  counterpartName,
  serviceName,
  previousDateTime,
  newDateTime,
  duration,
  timezone,
  note,
  appointmentLink,
  addToCalendarLink,
  supportEmail,
}: AppointmentRescheduledProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        New time confirmed{newDateTime ? `: ${newDateTime}` : ""} — your appointment was rescheduled.
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
              Appointment rescheduled
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
              The new time is confirmed
            </Heading>
            <Text
              style={{
                margin: "0 0 24px",
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: "1.5",
              }}
            >
              {rescheduledByLabel ?? "This appointment"} moved your session
              {counterpartName ? ` with ${counterpartName}` : ""}
              {serviceName ? ` (${serviceName})` : ""}. Your calendar and your Lubin
              appointment have both been updated.
            </Text>

            <Section
              style={{
                backgroundColor: colors.lavender,
                borderRadius: 16,
                padding: 24,
                marginBottom: 24,
              }}
            >
              {previousDateTime && (
                <div style={{ marginBottom: 14 }}>
                  <Text style={label}>Previous time</Text>
                  <Text
                    style={{
                      ...value,
                      textDecoration: "line-through",
                      color: colors.textMuted,
                    }}
                  >
                    {previousDateTime}
                  </Text>
                </div>
              )}
              <div style={{ marginBottom: duration || timezone ? 14 : 0 }}>
                <Text style={label}>New time</Text>
                <Text style={{ ...value, fontWeight: 700 }}>{newDateTime ?? "—"}</Text>
              </div>
              {(duration || timezone) && (
                <Text style={{ margin: 0, color: colors.textMuted, fontSize: 13 }}>
                  {[duration, timezone].filter(Boolean).join(" · ")}
                </Text>
              )}
            </Section>

            {note && (
              <Section
                style={{
                  border: `1px solid ${colors.lavenderBorder}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <Text style={label}>Note included</Text>
                <Text
                  style={{
                    margin: "6px 0 0",
                    color: colors.brandNavy,
                    fontSize: 14,
                    lineHeight: "1.6",
                  }}
                >
                  {note}
                </Text>
              </Section>
            )}

            {appointmentLink && (
              <Button
                href={appointmentLink}
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
                {recipientRole === "provider" ? "Open the appointment" : "View my appointment"}
              </Button>
            )}

            {addToCalendarLink && (
              <Button
                href={addToCalendarLink}
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
                Update my calendar
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
              A separate message was also added to your appointment thread in Lubin, so both of
              you can see this change in one place. Reply there to keep talking — personal email
              addresses are never shared.
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
            <Text
              style={{ margin: 0, color: colors.textMuted, fontSize: 12, fontWeight: 600 }}
            >
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
  component: AppointmentRescheduledEmail,
  subject: (data: AppointmentRescheduledProps) =>
    data.newDateTime
      ? `New time confirmed · ${data.newDateTime}`
      : "Your appointment was rescheduled",
  displayName: "Appointment rescheduled (system confirmation)",
  previewData: {
    recipientName: "Anna",
    recipientRole: "client",
    rescheduledByLabel: "Dr. Camille Lazaro",
    counterpartName: "Dr. Camille Lazaro",
    serviceName: "Initial consultation · 50 min",
    previousDateTime: "Aug 18, 2026 · 10:00 AM",
    newDateTime: "Aug 19, 2026 · 3:00 PM",
    duration: "50 min",
    timezone: "GMT+8",
    note: "Moving this so we have a longer window to review your results.",
    appointmentLink: "https://lubin.care/profile",
    addToCalendarLink: "https://lubin.care/profile",
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;