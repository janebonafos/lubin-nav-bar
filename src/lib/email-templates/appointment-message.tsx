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

export interface AppointmentMessageEmailProps {
  /** Who receives this copy. Controls the wording only. */
  recipientRole?: "client" | "provider";
  recipientName?: string;
  /** Person who wrote the message. */
  authorName: string;
  authorRole?: "client" | "provider";
  messageBody: string;
  sentAt?: string;
  appointmentLabel?: string;
  appointmentDateTime?: string;
  /** Deep link back to the appointment thread in Lubin. */
  threadLink?: string;
  /** Masked Lubin relay address the recipient can reply to. */
  replyToAddress?: string;
  supportEmail?: string;
}

export default function AppointmentMessageEmail({
  recipientRole = "client",
  recipientName,
  authorName,
  authorRole = "provider",
  messageBody,
  sentAt,
  appointmentLabel,
  appointmentDateTime,
  threadLink,
  replyToAddress,
  supportEmail,
}: AppointmentMessageEmailProps) {
  const isOwnCopy = authorRole === recipientRole;
  const label = (
    <>
      {isOwnCopy ? "Your message was sent" : `New message from ${authorName}`}
    </>
  );

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {isOwnCopy
          ? "Copy of the message you sent about your Lubin appointment"
          : `New message from ${authorName} about your Lubin appointment`}
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
            }}
          >
            <Text
              style={{
                margin: 0,
                color: colors.brandPurple,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.6,
                textTransform: "uppercase",
              }}
            >
              Lubin · Appointment messages
            </Text>
            <Heading
              as="h1"
              style={{
                margin: "10px 0 0",
                color: colors.brandNavy,
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              {label}
            </Heading>
            {(appointmentLabel || appointmentDateTime) && (
              <Text style={{ margin: "6px 0 0", color: colors.textMuted, fontSize: 13 }}>
                {appointmentLabel}
                {appointmentLabel && appointmentDateTime ? " · " : ""}
                {appointmentDateTime}
              </Text>
            )}
          </Section>

          <Section
            style={{
              border: `1px solid ${colors.lavenderBorder}`,
              borderRadius: 24,
              padding: "28px 24px",
              marginTop: 16,
            }}
          >
            {recipientName && (
              <Text style={{ margin: "0 0 14px", color: colors.brandNavy, fontSize: 15 }}>
                Hi {recipientName},
              </Text>
            )}
            <Text style={{ margin: "0 0 18px", color: colors.textMuted, fontSize: 15, lineHeight: 1.5 }}>
              {isOwnCopy
                ? "Here is a copy of the message now attached to your appointment in Lubin. Replies will arrive in the same thread."
                : `${authorName} sent you a message about this appointment. It is also saved in the appointment thread in Lubin.`}
            </Text>

            <Section
              style={{
                backgroundColor: colors.lavender,
                borderRadius: 16,
                padding: 20,
              }}
            >
              <Text
                style={{
                  margin: "0 0 8px",
                  color: colors.brandPurple,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                {authorName}
                {sentAt ? ` · ${sentAt}` : ""}
              </Text>
              <Text
                style={{
                  margin: 0,
                  color: colors.brandNavy,
                  fontSize: 15,
                  lineHeight: 1.6,
                  whiteSpace: "pre-line",
                }}
              >
                {messageBody}
              </Text>
            </Section>

            {threadLink && (
              <Button
                href={threadLink}
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
                  marginTop: 20,
                }}
              >
                {isOwnCopy ? "Open the thread in Lubin" : "Reply in Lubin"}
              </Button>
            )}

            <Hr
              style={{
                border: "none",
                borderTop: `1px solid ${colors.lavenderBorder}`,
                margin: "24px 0",
              }}
            />

            <Section
              style={{
                border: `1px solid ${colors.lavenderBorder}`,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <Text
                style={{
                  margin: "0 0 8px",
                  color: colors.brandPurple,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Reply by email
              </Text>
              <Text style={{ margin: 0, color: colors.brandNavy, fontSize: 14, lineHeight: 1.6 }}>
                Just hit <strong>Reply</strong> in your inbox and write above the line below. Your
                reply is added to this appointment thread in Lubin and the other person is notified
                there and by email.
                {replyToAddress ? (
                  <>
                    {" "}
                    Replies go to the private address{" "}
                    <span style={{ fontWeight: 600 }}>{replyToAddress}</span>.
                  </>
                ) : null}
              </Text>
              <Text
                style={{
                  margin: "14px 0 0",
                  color: colors.textMuted,
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                Personal email addresses are never shared between clients and providers.
              </Text>
            </Section>

            <Text
              style={{
                margin: "20px 0 0",
                color: colors.textMuted,
                fontSize: 12,
                textAlign: "center",
                letterSpacing: 0.4,
              }}
            >
              ✂ — — — Write your reply above this line — — — ✂
            </Text>
          </Section>

          <Section style={{ marginTop: 24, textAlign: "center" }}>
            <Text style={{ margin: "0 0 6px", color: colors.textMuted, fontSize: 12 }}>
              Please keep clinical questions in this thread so they stay attached to the appointment.
            </Text>
            {supportEmail && (
              <Text style={{ margin: "0 0 6px", color: colors.textMuted, fontSize: 12 }}>
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
              The Lubin team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: AppointmentMessageEmail,
  subject: (data: AppointmentMessageEmailProps) =>
    data.authorRole === data.recipientRole
      ? "Copy of your message · Lubin appointment"
      : `New message from ${data.authorName} · Lubin appointment`,
  displayName: "Appointment message (to recipient)",
  previewData: {
    recipientRole: "client",
    recipientName: "Anna",
    authorName: "Dr. Camille Lazaro",
    authorRole: "provider",
    messageBody:
      "Hi Anna — thanks for letting me know. I have a 3:00 PM slot on Aug 19 if that works better for you. Nothing to prepare beforehand.",
    sentAt: "Aug 17, 2:24 PM",
    appointmentLabel: "Initial consultation · 50 min",
    appointmentDateTime: "Aug 18, 2026 · 10:00 AM (GMT+8)",
    threadLink: "https://lubin.care/appointment/details",
    replyToAddress: "client-cu1@messages.lubin.care",
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;
