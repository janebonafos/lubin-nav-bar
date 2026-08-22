import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

const LUBIN_LOGO =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTQ0IiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgNTQ0IDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNNjUuNDQxOCA2OUM2My4yNDM0IDY5IDYxLjE1MzggNjguNDU1NSA1OS4xOTY3IDY3LjM2MzdDNTMuODEzOCA2NC4zNjQ3IDUwLjQxMTYgNTcuNTk1NiA0OC4wMzk1IDUwLjYyMzVDNDMuNDQyNCA1OS40ODUgMzQuNzEzMiA3Mi4xNTIgMjMuODE4IDY4LjE4NDhDMjEuMjUxNiA2Ny4yNTE4IDE3LjAxMDcgNjQuMzgyMyAxNy40ODE1IDU1LjY4ODVDMTcuNjY3IDUyLjI4MDQgMTguNTc2NCA0OC40NzggMTkuOTgzMiA0NS4wMTRDMTMuMzU1NCAzOS43MjUzIDEuODQyMDcgMjguODEyNCAwLjIwNTcxOCAxNy45ODE4Qy0wLjUzNTkzNiAxMy4wNjEgMC43Mjk1ODQgOC42NzI5MSAzLjk3Mjg1IDQuOTQxMDlDNy40NTQ1IDAuNzU2MDQ1IDEyLjE4OTkgLTAuODI3MzI4IDE3LjYzMTYgMC40MDg3NjNDMjguMjc2NyAyLjgyNzk3IDQwLjQzMTYgMTYuNTUxNSA0Ni41Mjk3IDI3LjIxNDNDNTIuMzA5OSAxOC45NDcyIDY1Ljg1MDkgNC40OTA4IDc3LjcxMTUgMS45NjI3MUM4My4wMzU1IDAuODI2NjggODcuNjU2MiAyLjE4MzQ0IDkxLjA1NTQgNS44OTQ2NUM5My4wOTc5IDguMTI1NSA5NS4yMDUxIDEyLjE3NTIgOTMuNjMwNiAxOC44MDNDOTEuMzkwOSAyOC4yMTQ5IDgyLjYzODIgMzkuMTk4NSA3Ni40NTE5IDQ1LjEyMjlDNzcuNzgyMSA0OC43NzUyIDc4LjQ3NjcgNTIuNzYzMSA3OC4zMDYgNTYuMTMyOUM3Ny45OTcgNjIuMzMzOSA3NS4wOTUxIDY2LjYzMDggNzAuMTQ0OSA2OC4yMjAxQzY4LjUyOTEgNjguNzQxIDY2Ljk2MDUgNjkgNjUuNDQxOCA2OVpNNDkuNjExMSAzMy43MDk2QzQ5LjgxNzEgMzQuMzAxMiA0OS45OTM3IDM0Ljg2NjIgNTAuMTI2MSAzNS4zODcyTDUwLjYwNTggMzcuMzE0OUM1Mi41Nzc3IDQ1LjI2NDEgNTUuODc5OCA1OC41NzU2IDYyLjE0ODYgNjIuMDYzMkM2My45NDk3IDYzLjA3MjcgNjUuOTU5OCA2My4xOTMzIDY4LjI4NzggNjIuNDQ1OEM3MC43MzY0IDYxLjY2IDcyLjA2NjcgNTkuNDM1IDcyLjI0OTIgNTUuODIwOUM3Mi4zNjEgNTMuNTkwMSA3Mi4wMjU1IDUxLjI3MzkgNzEuNDI1MSA0OS4xMjg0QzcxLjI2OTEgNDkuMjA3OCA3MS4xMjQ5IDQ5LjI3NTUgNzAuOTk1NCA0OS4zMTk3QzY3LjQ5OTEgNTAuNjQxMSA2MS43NTcxIDQ5LjQyODYgNTkuMjk2NyA0NS44MjkyQzU4LjM2OTYgNDQuNDY5NSA1Ni42NTk3IDQwLjgyMDEgNjAuNzk3NyAzNi4yMTQyQzYyLjk4NDQgMzMuOTY1NyA2NS43MzMyIDMzLjM5NzcgNjguNDExNCAzNC41NjYxQzcwLjM2NTYgMzUuNDE2NiA3Mi4xMzE1IDM3LjE1MyA3My42MTQ4IDM5LjM3OEM3OC44NzExIDMzLjkwNjggODYuNDk5NSAyNC4yODMgODcuOTA5MyAxNi41MzM5Qzg4LjQzMzEgMTMuNjY0NCA4OC4wMDA1IDExLjUyMTggODYuNTg0OSA5Ljk3NjY5Qzg0LjYzNjYgNy44NTQ3NCA4Mi4yMjYyIDcuMTg5NiA3OC45NzQxIDcuODc4MjhDNjYuOTA3NSAxMC40NjgyIDUxLjA3OTcgMzAuMDk4NSA0OS42MTExIDMzLjcwOTZaTTI1LjA4NjQgNDguNjM2OUMyNC40NjU1IDUwLjM4OCAyMy45NjIyIDUyLjMxMjggMjMuNjkxNCA1NC4zNDA2QzIzLjQ3MDcgNTUuOTg1NyAyMi45NzYzIDYxLjQyNDUgMjUuODg5OSA2Mi40ODdDMzMuODk4IDY1LjM5NzcgNDIuNTQxOCA0OC45MzEyIDQ1LjQ2NDMgNDEuNzU4OUM0NS4yMDIzIDQwLjcyMyA0NC45NTUxIDM5LjczNDEgNDQuNzE5NyAzOC43Nzc2TDQ0LjI0MjkgMzYuODczNEM0Mi4xNzEgMjguNjQxNyAyNy42MDg3IDguODkzNjQgMTYuMjgzNyA2LjMyMTRDMTMuMDg3NSA1LjU5MTUxIDEwLjY0MTkgNi40MDM4IDguNTkwNTMgOC44NzAwOUM2LjQ5OCAxMS4yODA1IDUuNzI5ODYgMTMuOTQ5OCA2LjIwMDc2IDE3LjA3ODNDNy40NjkyMiAyNS40NjkgMTYuOTQ1OSAzNC42NDg1IDIyLjg0NjggMzkuNTE2M0MyNC43NTA5IDM2LjY2NDUgMjcuMDIgMzQuNTc0OSAyOS40MTU3IDMzLjk4MzMzMC43NjM2IDMzLjY1MzcgMzQuMTU3IDMzLjMzIDM2LjY1MjcgMzcuNTA5MUMzNi42OTM5IDM3LjU3MzkgMzYuNzI5MiAzNy42NTA0IDM2Ljc2NzUgMzcuNzIxQzM5LjEwNDMgNDIuNDYyMyAzNy41OTE2IDQ2LjEzMjMgMzUuMzk2IDQ3Ljk4MzVDMzIuNjgyNSA1MC4yODIxIDI4LjUyOTggNTAuNDk2OSAyNS4wODY0IDQ4LjYzNjlaTTI3LjcwNTggNDMuMTUxQzI5LjE0MiA0NC4wNTE2IDMwLjc1MTkgNDMuOTcyMSAzMS40ODc2IDQzLjM1MTFDMzIuMjczNCA0Mi42ODg5IDMxLjcyMDEgNDEuMjIwMyAzMS4zODQ2IDQwLjUxMTFDMzEuMDk2MiA0MC4wNDkgMzAuODcyNSAzOS44NjY1IDMwLjgwNzggMzkuODM3MUMzMC4xODM4IDM5LjkwNzcgMjguOTcxMyA0MS4xMzUgMjcuNzA1OCA0My4xNTFaTTY1LjcwMzggNDAuMDQ2MUM2NS41ODAyIDQwLjA0NjEgNjUuNDU2NiA0MC4xMjg1IDY1LjIyNDEgNDAuMzY2OEM2NS4wNzEgNDAuNTQwNSA2My45MjkxIDQxLjg2MTkgNjQuMzA1OCA0Mi40MTIzQzY1LjAwOTIgNDMuNDQ4MiA2Ny43MzE2IDQ0LjA2NjMgNjguODUyOSA0My42NTEzQzY4LjkxNDcgNDMuNjEzMSA2OC45OTQxIDQzLjU3NzcgNjkuMDczNiA0My41MjE4QzY4LjA0OTQgNDEuNzg1NCA2Ni45MzQgNDAuNTQzNCA2NS45ODYzIDQwLjEzMTRDNjUuODc0NSA0MC4wODQzIDY1Ljc4OTEgNDAuMDQ2MSA2NS43MDM4IDQwLjA0NjFaIiBmaWxsPSIjN0U2QkFGIi8+CjxwYXRoIGQ9Ik0xMTcuOTggLTUuNzIyMDVlLTA2VjYzSDE1My4wOEwxNTIuMzggNjlIMTEwLjI4Vi01LjcyMjA1ZS0wNkwxMTcuOThaTTI0NS4zNzUgNjMuOUMyNDAuNzA4IDY3Ljk2NjcgMjM0LjE3NSA3MCAyMjUuNzc1IDcwQzIxNy4zNzUgNzAgMjEwLjg0MiA2Ny45NjY3IDIwNi4xNzUgNjMuOUMyMDEuNTA4IDU5Ljc2NjcgMTk5LjE3NSA1My4zMzMzIDE5OS4xNzUgNDQuNlYtNS43MjIwNWUtMDZIMjA2Ljg3NVY0NC41QzIwNi44NzUgNTAuNyAyMDguNTA4IDU1LjQgMjExLjc3NSA1OC42QzIxNS4xMDggNjEuOCAyMTkuNzc1IDYzLjQgMjI1Ljc3NSA2My40QzIzMS44NDIgNjMuNCAyMzYuNTQyIDYxLjggMjM5Ljg3NSA1OC42QzI0My4yMDggNTUuNCAyNDQuODc1IDUwLjcgMjQ0Ljg3NSA0NC41Vi01LjcyMjA1ZS0wNkgyNTIuMzc1VjQ0LjZDMjUyLjM3NSA1My4zMzMzIDI1MC4wNDIgNTkuNzY2NyAyNDUuMzc1IDYzLjlaTTMwNy40MiA2OVYtNS43MjIwNWUtMDZIMzI5LjcyQzMzNi43MiAtNS43MjIwNWUtMDYgMzQyLjA1NCAxLjQ5OTk5IDM0NS43MiA0LjVDMzQ5LjQ1NCA3LjUgMzUxLjMyIDExLjggMzUxLjMyIDE3LjRDMzUxLjMyIDIxLjEzMzMgMzUwLjMyIDI0LjQzMzMgMzQ4LjMyIDI3LjNDMzQ2LjMyIDMwLjE2NjcgMzQzLjY4NyAzMi4xIDM0MC40MiAzMy4xVjMzLjVDMzQ0LjM1NCAzNC4wMzMzIDM0Ny43MiAzNS43MzMzIDM1MC41MiAzOC42QzM1My4zMiA0MS40NjY3IDM1NC43MiA0NS4yNjY3IDM1NC43MiA1MEMzNTQuNzIgNTUuOCAzNTIuNjU0IDYwLjQzMzMgMzQ4LjUyIDYzLjlDMzQ0LjQ1NCA2Ny4zIDMzOC44NTQgNjkgMzMxLjcyIDY5SDMwNy40MlpNMzE1LjAyIDMwLjlIMzI5LjQyQzMzMy45NTQgMzAuOSAzMzcuNDg3IDI5LjYgMzQwLjAyIDI3QzM0Mi41NTQgMjQuNCAzNDMuODIgMjEuNCAzNDMuODIgMThDMzQzLjgyIDE0LjA2NjcgMzQyLjU1NCAxMS4wNjY3IDM0MC4wMiA5QzMzNy40ODcgNi44NjY2NiAzMzMuODIgNS44IDMyOS4wMiA1LjhIMzE1LjAyVjMwLjlaTTMxNS4wMiA2My4ySDMzMC4xMkMzMzUuNDU0IDYzLjIgMzM5LjYyIDYxLjk2NjcgMzQyLjYyIDU5LjVDMzQ1LjY4NyA1Ny4wMzMzIDM0Ny4yMiA1My43IDM0Ny4yMiA0OS41QzM0Ny4yMiA0NS40MzMzIDM0NS41MiA0Mi4zIDM0Mi4xMiA0MC4xQzMzOC43ODcgMzcuOSAzMzQuNjU0IDM2LjggMzI5LjcyIDM2LjhIMzE1LjAyVjYzLjJaTTQxNC4yNzQgLTUuNzIyMDVlLTA2VjY5SDQwNi42NzRWLTUuNzIyMDVlLTA2SDQxNC4yNzRaTTQ2OS43IDY5Vi01LjcyMjA1ZS0wNkg0NzYuOEw1MTUuMSA1Ni4ySDUxNS44Vi01LjcyMjA1ZS0wNkg1MjIuOVY2OUg1MTZMNDc3LjYgMTIuNUg0NzYuOFY2OUg0NjkuN1oiIGZpbGw9IiM3RTZCQUYiLz4KPC9zdmc+Cg==";

const colors = {
  brandPurple: "#7E6BAF",
  brandDark: "#3D2E6B",
  brandNavy: "#2A2550",
  lavender: "#F7F2FE",
  lavenderBorder: "#EAE7F5",
  textMuted: "#7E6BAF",
  textDark: "#2A2550",
  white: "#ffffff",
} as const;

interface BookingConfirmationClientProps {
  clientName: string;
  providerName: string;
  serviceName: string;
  dateTime: string;
  duration: string;
  timezone: string;
  meetingLink?: string;
  addToCalendarLink?: string;
  rescheduleLink?: string;
  cancelLink?: string;
  supportEmail?: string;
  providerSpecialty?: string;
}

export default function BookingConfirmationClientEmail({
  clientName,
  providerName,
  serviceName,
  dateTime,
  duration,
  timezone,
  meetingLink,
  addToCalendarLink,
  rescheduleLink,
  cancelLink,
  supportEmail,
  providerSpecialty,
}: BookingConfirmationClientProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Your session with {providerName} is confirmed. See details and your meeting link inside.
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
        <Container
          style={{
            maxWidth: 600,
            margin: "0 auto",
            padding: "24px 20px",
          }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: colors.lavender,
              borderRadius: 24,
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <Img
              src={LUBIN_LOGO}
              alt="Lubin"
              height={36}
              style={{
                display: "inline-block",
                margin: "0 auto",
              }}
            />
            <Text
              style={{
                margin: "14px 0 0",
                color: colors.textMuted,
                fontSize: 13,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Appointment confirmed
            </Text>
          </Section>

          {/* Main card */}
          <Section
            style={{
              backgroundColor: colors.white,
              border: `1px solid ${colors.lavenderBorder}`,
              borderRadius: 24,
              padding: "32px 28px",
              marginTop: 16,
            }}
          >
            <Text
              style={{
                margin: "0 0 8px",
                color: colors.textDark,
                fontSize: 15,
                lineHeight: "1.5",
              }}
            >
              Hi {clientName},
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
              Your appointment is confirmed
            </Heading>

            <Text
              style={{
                margin: "0 0 24px",
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: "1.5",
              }}
            >
              You are booked for a {serviceName} with {providerName}
              {providerSpecialty ? `, ${providerSpecialty}` : ""}.
            </Text>

            {/* Provider summary */}
            <Section
              style={{
                backgroundColor: colors.lavender,
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  margin: 0,
                  color: colors.brandNavy,
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {providerName}
              </Text>
              {providerSpecialty && (
                <Text
                  style={{
                    margin: "4px 0 0",
                    color: colors.textMuted,
                    fontSize: 13,
                  }}
                >
                  {providerSpecialty}
                </Text>
              )}
            </Section>

            {/* Details */}
            <Section
              style={{
                backgroundColor: colors.lavender,
                borderRadius: 16,
                padding: 24,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  margin: "0 0 16px",
                  color: colors.textMuted,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Booking details
              </Text>

              <div style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    margin: 0,
                    color: colors.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Service
                </Text>
                <Text
                  style={{
                    margin: "4px 0 0",
                    color: colors.brandNavy,
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {serviceName}
                </Text>
              </div>

              <div style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    margin: 0,
                    color: colors.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Date and time
                </Text>
                <Text
                  style={{
                    margin: "4px 0 0",
                    color: colors.brandNavy,
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {dateTime}
                </Text>
                <Text
                  style={{
                    margin: "4px 0 0",
                    color: colors.textMuted,
                    fontSize: 13,
                  }}
                >
                  {duration} · {timezone}
                </Text>
              </div>

              {meetingLink && (
                <div>
                  <Text
                    style={{
                      margin: 0,
                      color: colors.textMuted,
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Meeting link
                  </Text>
                  <Link
                    href={meetingLink}
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      color: colors.brandPurple,
                      fontSize: 14,
                      textDecoration: "underline",
                      wordBreak: "break-all",
                    }}
                  >
                    {meetingLink}
                  </Link>
                </div>
              )}
            </Section>

            {/* Optional session prep — encouragement, never a requirement */}
            <Section
              style={{
                border: `1px solid ${colors.lavender}`,
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  margin: 0,
                  color: colors.brandNavy,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Want your session to start where it matters?
              </Text>
              <Text
                style={{
                  margin: "6px 0 0",
                  color: colors.textMuted,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                In your Lubin appointment you can share a few notes ahead of time — most of
                it is already filled in from your Health Passport, so it usually takes about
                a minute. Your provider reads it before you meet instead of asking during
                your session. It's completely optional, and you can leave anything for the
                conversation.
              </Text>
            </Section>


            {/* CTAs */}
            {meetingLink && (
              <Button
                href={meetingLink}
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
                Join meeting
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
                Add to Google Calendar
              </Button>
            )}

            <Hr
              style={{
                border: "none",
                borderTop: `1px solid ${colors.lavenderBorder}`,
                margin: "28px 0",
              }}
            />

            <Text
              style={{
                margin: "0 0 8px",
                color: colors.textMuted,
                fontSize: 14,
                lineHeight: "1.5",
              }}
            >
              Need to make a change?{" "}
              {rescheduleLink ? (
                <Link
                  href={rescheduleLink}
                  style={{
                    color: colors.brandPurple,
                    textDecoration: "underline",
                  }}
                >
                  Reschedule
                </Link>
              ) : (
                "Reschedule"
              )}{" "}
              or{" "}
              {cancelLink ? (
                <Link
                  href={cancelLink}
                  style={{
                    color: colors.brandPurple,
                    textDecoration: "underline",
                  }}
                >
                  cancel
                </Link>
              ) : (
                "cancel"
              )}{" "}
              at least 24 hours in advance.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ marginTop: 24, textAlign: "center" }}>
            <Text
              style={{
                margin: "0 0 8px",
                color: colors.textMuted,
                fontSize: 12,
                lineHeight: "1.5",
              }}
            >
              Please do not reply to this email — it was sent automatically.
            </Text>
            {supportEmail && (
              <Text
                style={{
                  margin: "0 0 8px",
                  color: colors.textMuted,
                  fontSize: 12,
                }}
              >
                Questions? Contact us at{" "}
                <Link
                  href={`mailto:${supportEmail}`}
                  style={{
                    color: colors.brandPurple,
                    textDecoration: "underline",
                  }}
                >
                  {supportEmail}
                </Link>
              </Text>
            )}
            <Text
              style={{
                margin: 0,
                color: colors.textMuted,
                fontSize: 12,
                fontWeight: 600,
              }}
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
  component: BookingConfirmationClientEmail,
  subject: (data: BookingConfirmationClientProps) =>
    `Confirmed: Your Lubin appointment with ${data.providerName}`,
  displayName: "Booking confirmation — client",
  previewData: {
    clientName: "Jane Edison",
    providerName: "LJ Basilio",
    providerSpecialty: "Clinical Psychologist",
    serviceName: "Initial Consultation",
    dateTime: "Monday, 20 Jul — 05:30 PM",
    duration: "30 minutes",
    timezone: "PHT (GMT+8)",
    meetingLink: "https://meet.google.com/sks-hhcc-zse",
    addToCalendarLink:
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Initial+Consultation&dates=20260720T093000Z/20260720T100000Z",
    rescheduleLink: "#reschedule",
    cancelLink: "#cancel",
    supportEmail: "support@lubin.com",
  },
} satisfies TemplateEntry;
