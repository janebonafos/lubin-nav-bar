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

export interface FollowUpBookedProps {
  recipientRole?: "client" | "provider";
  status?: "awaiting-payment" | "confirmed";
  clientName?: string;
  providerName?: string;
  serviceName?: string;
  dateTime?: string;
  duration?: string;
  timezone?: string;
  feeLabel?: string;
  paymentLine?: string;
  seriesLabel?: string;
  visitList?: string[];
  note?: string;
  actionLink?: string;
  calendarLink?: string;
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

export default function FollowUpBookedEmail({
  recipientRole = "client",
  status = "awaiting-payment",
  clientName,
  providerName,
  serviceName,
  dateTime,
  duration,
  timezone,
  feeLabel,
  paymentLine,
  seriesLabel,
  visitList,
  note,
  actionLink,
  calendarLink,
  supportEmail,
}: FollowUpBookedProps) {
  const isProvider = recipientRole === "provider";
  const confirmed = status === "confirmed";

  const previewText = isProvider
    ? confirmed
      ? `Free follow-up confirmed — ${clientName ?? "your client"} needs no payment.`
      : `Copy of the follow-up booking you sent to ${clientName ?? "your client"}.`
    : confirmed
      ? `Your follow-up with ${providerName ?? "your provider"} is confirmed.`
      : `${providerName ?? "Your provider"} scheduled your follow-up${dateTime ? ` · ${dateTime}` : ""}.`;

  const heading = isProvider
    ? confirmed
      ? "Free follow-up confirmed"
      : "Booking sent to your client"
    : confirmed
      ? "Your follow-up is confirmed"
      : "Your next visit is scheduled";

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
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
              {isProvider ? "Your booking receipt" : "Follow-up booked"}
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
              Hi {isProvider ? providerName ?? "there" : clientName ?? "there"},
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
              {heading}
            </Heading>
            <Text
              style={{
                margin: "0 0 24px",
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: "1.5",
              }}
            >
              {isProvider ? (
                confirmed ? (
                  <>
                    You confirmed a free follow-up for {clientName ?? "your client"}. No payment is
                    needed, so the visit is already on both of your calendars.
                  </>
                ) : (
                  <>
                    Here is a copy of the follow-up booking you sent to{" "}
                    <strong style={{ color: colors.brandNavy }}>{clientName ?? "your client"}</strong>
                    . They will get a notification in Lubin and an email from you, with the option to
                    add the visit to their own calendar. The visit stays reserved on your calendar
                    until the client pays in Lubin.
                  </>
                )
              ) : confirmed ? (
                <>Your next appointment with {providerName ?? "your provider"} is confirmed. I look forward to seeing you.</>
              ) : (
                <>
                  <strong style={{ color: colors.brandNavy }}>{providerName ?? "Your provider"}</strong>{" "}
                  scheduled your next appointment. Please review the details below and complete
                  payment in Lubin to confirm your visit.
                </>
              )}
            </Text>

            <Section
              style={{
                backgroundColor: colors.lavender,
                borderRadius: 16,
                padding: 24,
                marginBottom: 24,
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <Text style={label}>{isProvider ? "Client" : "Provider"}</Text>
                <Text style={value}>
                  {isProvider ? clientName ?? "—" : providerName ?? "—"}
                </Text>
              </div>
              <div style={{ marginBottom: 14 }}>
                <Text style={label}>Appointment</Text>
                <Text style={{ ...value, fontWeight: 700 }}>{serviceName ?? "—"}</Text>
              </div>
              <div style={{ marginBottom: 14 }}>
                <Text style={label}>Date & time</Text>
                <Text style={{ ...value, fontWeight: 700 }}>{dateTime ?? "—"}</Text>
                {(duration || timezone) && (
                  <Text style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: 13 }}>
                    {[duration, timezone].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </div>
              <div style={{ marginBottom: 0 }}>
                <Text style={label}>{isProvider ? (confirmed ? "Fee" : "Fee per visit") : "Fee"}</Text>
                <Text style={{ ...value, fontWeight: 700 }}>{feeLabel ?? "—"}</Text>
                {paymentLine && (
                  <Text style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: 13 }}>
                    {paymentLine}
                  </Text>
                )}
              </div>
            </Section>

            {seriesLabel && (
              <Text
                style={{
                  margin: "0 0 10px",
                  color: colors.brandNavy,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {seriesLabel}
              </Text>
            )}
            {visitList && visitList.length > 0 && (
              <Section
                style={{
                  border: `1px solid ${colors.lavenderBorder}`,
                  borderRadius: 16,
                  padding: "18px 20px",
                  marginBottom: 24,
                }}
              >
                {visitList.map((visit, index) => (
                  <Text
                    key={visit}
                    style={{
                      margin: index === 0 ? 0 : "8px 0 0",
                      color: colors.textMuted,
                      fontSize: 14,
                      lineHeight: "1.5",
                    }}
                  >
                    {visit}
                  </Text>
                ))}
              </Section>
            )}

            {note && (
              <Section
                style={{
                  border: `1px solid ${colors.lavenderBorder}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <Text style={label}>Note from {isProvider ? "you" : "your provider"}</Text>
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

            {actionLink && (
              <Button
                href={actionLink}
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
                  marginBottom: calendarLink ? 12 : 0,
                }}
              >
                {isProvider
                  ? "View my calendar"
                  : confirmed
                    ? "View my appointment"
                    : "Review & pay in Lubin"}
              </Button>
            )}

            {calendarLink && (
              <Button
                href={calendarLink}
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
                Add to my calendar
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
              {isProvider
                ? confirmed
                  ? "This free visit is confirmed automatically — no action is needed from you or your client."
                  : "You will get a notification in Lubin when the client pays and confirms the visit. If the visit stays unpaid, it frees up automatically."
                : confirmed
                  ? "This visit is confirmed. If you need to change it, message your provider in Lubin."
                  : "Payment happens safely inside Lubin. Once you pay, the visit is confirmed and the time is yours."}
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
  component: FollowUpBookedEmail,
  subject: (data: FollowUpBookedProps) =>
    data.recipientRole === "provider"
      ? data.status === "confirmed"
        ? `Free follow-up confirmed · ${data.clientName ?? ""}`.trim()
        : `Booking sent · ${data.clientName ?? "follow-up"}`.trim()
      : data.status === "confirmed"
        ? `Your follow-up with ${data.providerName ?? "your provider"} is confirmed`
        : `${data.providerName ?? "Your provider"} scheduled your follow-up`,
  displayName: "Follow-up booked (client copy)",
  previewData: {
    recipientRole: "client",
    status: "awaiting-payment",
    clientName: "Anna Reyes",
    providerName: "Maria Santos",
    serviceName: "Follow-up consultation",
    dateTime: "Wednesday, October 28, 2026 · 9:00 AM",
    duration: "30 min",
    timezone: "Manila (GMT+8)",
    feeLabel: "₱1,500",
    paymentLine: "Pay in Lubin to confirm this visit.",
    seriesLabel: "Visit 1 of 4 · Weekly",
    visitList: [
      "1. Wednesday, October 28 · 9:00 AM",
      "2. Wednesday, November 4 · 9:00 AM",
      "3. Wednesday, November 11 · 9:00 AM",
      "4. Wednesday, November 18 · 9:00 AM",
    ],
    note: "Please bring your recent lab results so we can review them together.",
    actionLink: "https://lubin.care/appointments",
    calendarLink: "https://lubin.care/appointments",
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;
