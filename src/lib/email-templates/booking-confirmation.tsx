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
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTQ0IiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgNTQ0IDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNNjUuNDQxOCA2OUM2My4yNDM0IDY5IDYxLjE1MzggNjguNDU1NSA1OS4xOTY3IDY3LjM2MzdDNTMuODEzOCA2NC4zNjQ3IDUwLjQxMTYgNTcuNTk1NiA0OC4wMzk1IDUwLjYyMzVDNDMuNDQyNCA1OS40ODUgMzQuNzEzMiA3Mi4xNTIgMjMuODE4IDY4LjE4NDhDMjEuMjUxNiA2Ny4yNTE4IDE3LjAxMDcgNjQuMzgyMyAxNy40ODE1IDU1LjY4ODVDMTcuNjY3IDUyLjI4MDQgMTguNTc2NCA0OC40NzggMTkuOTgzMiA0NS4wMTRDMTMuMzU1NCAzOS43MjUzIDEuODQyMDcgMjguODEyNCAwLjIwNTcxOCAxNy45ODE4Qy0wLjUzNTkzNiAxMy4wNjEgMC43Mjk1ODQgOC42NzI5MSAzLjk3Mjg1IDQuOTQxMDlDNy40NTQ1IDAuNzU2MDQ1IDEyLjE4OTkgLTAuODI3MzI4IDE3LjYzMTYgMC40MDg3NjNDMjguMjc2NyAyLjgyNzk3IDQwLjQzMTYgMTYuNTUxNSA0Ni41Mjk3IDI3LjIxNDNDNTIuMzA5OSAxOC45NDcyIDY1Ljg1MDkgNC40OTA4IDc3LjcxMTUgMS45NjI3MUM4My4wMzU1IDAuODI2NjggODcuNjU2MiAyLjE4MzQ0IDkxLjA1NTQgNS44OTQ2NUM5My4wOTc5IDguMTI1NSA5NS4yMDUxIDEyLjE3NTIgOTMuNjMwNiAxOC44MDNDOTEuMzkwOSAyOC4yMTQ5IDgyLjYzODIgMzkuMTk4NSA3Ni40NTE5IDQ1LjEyMjlDNzcuNzgyMSA0OC43NzUyIDc4LjQ3NjcgNTIuNzYzMSA3OC4zMDYgNTYuMTMyOUM3Ny45OTcgNjIuMzMzOSA3NS4wOTUxIDY2LjYzMDggNzAuMTQ0OSA2OC4yMjAxQzY4LjUyOTEgNjguNzQxIDY2Ljk2MDUgNjkgNjUuNDQxOCA2OVpNNDkuNjExMSAzMy43MDk2QzQ5LjgxNzEgMzQuMzAxMiA0OS45OTM3IDM0Ljg2NjIgNTAuMTI2MSAzNS4zODcyTDUwLjYwNTggMzcuMzE0OUM1Mi41Nzc3IDQ1LjI2NDEgNTUuODc5OCA1OC41NzU2IDYyLjE0ODYgNjIuMDYzMkM2My45NDk3IDYzLjA3MjcgNjUuOTU5OCA2My4xOTMzIDY4LjI4NzggNjIuNDQ1OEM3MC43MzY0IDYxLjY2IDcyLjA2NjcgNTkuNDM1IDcyLjI0OTIgNTUuODIwOUM3Mi4zNjEgNTMuNTkwMSA3Mi4wMjU1IDUxLjI3MzkgNzEuNDI1MSA0OS4xMjg0QzcxLjI2OTEgNDkuMjA3OCA3MS4xMjQ5IDQ5LjI3NTUgNzAuOTk1NCA0OS4zMTk3QzY3LjQ5OTEgNTAuNjQxMSA2MS43NTcxIDQ5LjQyODYgNTkuMjk2NyA0NS44MjkyQzU4LjM2OTYgNDQuNDY5NSA1Ni42NTk3IDQwLjgyMDEgNjAuNzk3NyAzNi4yMTQyQzYyLjk4NDQgMzMuOTY1NyA2NS43MzMyIDMzLjM5NzcgNjguNDExNCAzNC41NjYxQzcwLjM2NTYgMzUuNDE2NiA3Mi4xMzE1IDM3LjE1MyA3My42MTQ4IDM5LjM3OEM3OC44NzExIDMzLjkwNjggODYuNDk5NSAyNC4yODMgODcuOTA5MyAxNi41MzM5Qzg4LjQzMzEgMTMuNjY0NCA4OC4wMDA1IDExLjUyMTggODYuNTg0OSA5Ljk3NjY5Qzg0LjYzNjYgNy44NTQ3NCA4Mi4yMjYyIDcuMTg5NiA3OC45NzQxIDcuODc4MjhDNjYuOTA3NSAxMC40NjgyIDUxLjA3OTcgMzAuMDk4NSA0OS42MTExIDMzLjcwOTZaTTI1LjA4NjQgNDguNjM2OUMyNC40NjU1IDUwLjM4OCAyMy45NjIyIDUyLjMxMjggMjMuNjkxNCA1NC4zNDA2QzIzLjQ3MDcgNTUuOTg1NyAyMi45NzYzIDYxLjQyNDUgMjUuODg5OSA2Mi40ODdDMzMuODk4IDY1LjM5NzcgNDIuNTQxOCA0OC45MzEyIDQ1LjQ2NDMgNDEuNzU4OUM0NS4yMDIzIDQwLjcyMyA0NC45NTUxIDM5LjczNDEgNDQuNzE5NyAzOC43Nzc2TDQ0LjI0MjkgMzYuODczNEM0Mi4xNzEgMjguNjQxNyAyNy42MDg3IDguODkzNjQgMTYuMjgzNyA2LjMyMTRDMTMuMDg3NSA1LjU5MTUxIDEwLjY0MTkgNi40MDM4IDguNTkwNTMgOC44NzAwOUM2LjQ5OCAxMS4yODA1IDUuNzI5ODYgMTMuOTQ5OCA2LjIwMDc2IDE3LjA3ODNDNy40NjkyMiAyNS40NjkgMTYuOTQ1OSAzNC42NDg1IDIyLjg0NjggMzkuNTE2M0MyNC43NTA5IDM2LjY2NDUgMjcuMDIgMzQuNTc0OSAyOS40MTU3IDMzLjk4MzNDMzAuNzYzNiAzMy42NTM3IDM0LjE1NyAzMy4zMyAzNi42NTI3IDM3LjUwOTFDMzYuNjkzOSAzNy41NzM5IDM2LjcyOTIgMzcuNjUwNCAzNi43Njc1IDM3LjcyMUMzOS4xMDQzIDQyLjQ2MjMgMzcuNTkxNiA0Ni4xMzIzIDM1LjM5NiA0Ny45ODM1QzMyLjY4MjUgNTAuMjgyMSAyOC41Mjk4IDUwLjQ5NjkgMjUuMDg2NCA0OC42MzY5Wk0yNy43MDU4IDQzLjE1MUMyOS4xNDIgNDQuMDUxNiAzMC43NTE5IDQzLjk3MjEgMzEuNDg3NiA0My4zNTExQzMyLjI3MzQgNDIuNjg4OSAzMS43MjAxIDQxLjIyMDMgMzEuMzg0NiA0MC41MTExQzMxLjA5NjIgNDAuMDQ5IDMwLjg3MjUgMzkuODY2NSAzMC44MDc4IDM5LjgzNzFDMzAuMTgzOCAzOS45MDc3IDI4Ljk3MTMgNDEuMTM1IDI3LjcwNTggNDMuMTUxWk02NS43MDM4IDQwLjA0NjFDNjUuNTgwMiA0MC4wNDYxIDY1LjQ1NjYgNDAuMTI4NSA2NS4yMjQxIDQwLjM2NjhDNjUuMDcxIDQwLjU0MDUgNjMuOTI5MSA0MS44NjE5IDY0LjMwNTggNDIuNDEyM0M2NS4wMDkyIDQzLjQ0ODIgNjcuNzMxNiA0NC4wNjYzIDY4Ljg1MjkgNDMuNjUxM0M2OC45MTQ3IDQzLjYxMzEgNjguOTk0MSA0My41Nzc3IDY5LjA3MzYgNDMuNTIxOEM2OC4wNDk0IDQxLjc4NTQgNjYuOTM0IDQwLjU0MzQgNjUuOTg2MyA0MC4xMzE0QzY1Ljg3NDUgNDAuMDg0MyA2NS43ODkxIDQwLjA0NjEgNjUuNzAzOCA0MC4wNDYxWiIgZmlsbD0iIzdFNkJBRiIvPgo8cGF0aCBkPSJNMTE3Ljk4IC01LjcyMjA1ZS0wNlY2M0gxNTMuMDhMMTUyLjM4IDY5SDExMC4yOFYtNS43MjIwNWUtMDZIMTE3Ljk4Wk0yNDUuMzc1IDYzLjlDMjQwLjcwOCA2Ny45NjY3IDIzNC4xNzUgNzAgMjI1Ljc3NSA3MEMyMTcuMzc1IDcwIDIxMC44NDIgNjcuOTY2NyAyMDYuMTc1IDYzLjlDMjAxLjUwOCA1OS43NjY3IDE5OS4xNzUgNTMuMzMzMyAxOTkuMTc1IDQ0LjZWLTUuNzIyMDVlLTA2SDIwNi44NzVWNDQuNUMyMDYuODc1IDUwLjcgMjA4LjUwOCA1NS40IDIxMS43NzUgNTguNkMyMTUuMTA4IDYxLjggMjE5Ljc3NSA2My40IDIyNS43NzUgNjMuNEMyMzEuODQyIDYzLjQgMjM2LjU0MiA2MS44IDIzOS44NzUgNTguNkMyNDMuMjA4IDU1LjQgMjQ0Ljg3NSA1MC43IDI0NC44NzUgNDQuNVYtNS43MjIwNWUtMDZIMjUyLjM3NVY0NC42QzI1Mi4zNzUgNTMuMzMzMyAyNTAuMDQyIDU5Ljc2NjcgMjQ1LjM3NSA2My45Wk0zMDcuNDIgNjlWLTUuNzIyMDVlLTA2SDMyOS43MkMzMzYuNzIgLTUuNzIyMDVlLTA2IDM0Mi4wNTQgMS40OTk5OSAzNDUuNzIgNC41QzM0OS40NTQgNy41IDM1MS4zMiAxMS44IDM1MS4zMiAxNy40QzM1MS4zMiAyMS4xMzMzIDM1MC4zMiAyNC40MzMzIDM0OC4zMiAyNy4zQzM0Ni4zMiAzMC4xNjY3IDM0My42ODcgMzIuMSAzNDAuNDIgMzMuMVYzMy41QzM0NC4zNTQgMzQuMDMzMyAzNDcuNzIgMzUuNzMzMyAzNTAuNTIgMzguNkMzNTMuMzIgNDEuNDY2NyAzNTQuNzIgNDUuMjY2NyAzNTQuNzIgNTBDMzU0LjcyIDU1LjggMzUyLjY1NCA2MC40MzMzIDM0OC41MiA2My45QzM0NC40NTQgNjcuMyAzMzguODU0IDY5IDMzMS43MiA2OUgzMDcuNDJaTTMxNS4wMiAzMC45SDMyOS40MkMzMzMuOTU0IDMwLjkgMzM3LjQ4NyAyOS42IDM0MC4wMiAyN0MzNDIuNTU0IDI0LjQgMzQzLjgyIDIxLjQgMzQzLjgyIDE4QzM0My44MiAxNC4wNjY3IDM0Mi41NTQgMTEuMDY2NyAzNDAuMDIgOUMzMzcuNDg3IDYuODY2NjYgMzMzLjgyIDUuOCAzMjkuMDIgNS44SDMxNS4wMlYzMC45Wk0zMTUuMDIgNjMuMkgzMzAuMTJDMzM1LjQ1NCA2My4yIDMzOS42MiA2MS45NjY3IDM0Mi42MiA1OS41QzM0NS42ODcgNTcuMDMzMyAzNDcuMjIgNTMuNyAzNDcuMjIgNDkuNUMzNDcuMjIgNDUuNDMzMyAzNDUuNTIgNDIuMyAzNDIuMTIgNDAuMUMzMzguNzg3IDM3LjkgMzM0LjY1NCAzNi44IDMyOS43MiAzNi44SDMxNS4wMlY2My4yWk00MTQuMjc0IC01LjcyMjA1ZS0wNlY2OUg0MDYuNjc0Vi01LjcyMjA1ZS0wNkg0MTQuMjc0Wk00NjkuNyA2OVYtNS43MjIwNWUtMDZINDc2LjhMNTE1LjEgNTYuMkg1MTUuOFYtNS43MjIwNWUtMDZINTIyLjlWNjlINTE2TDQ3Ny42IDEyLjVINDc2LjhWNjlINDY5LjdaIiBmaWxsPSIjN0U2QkFGIi8+Cjwvc3ZnPgo=";

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

interface BookingConfirmationProps {
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
}

export default function BookingConfirmationEmail({
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
}: BookingConfirmationProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Your session with {providerName} is booked. See details and your meeting link inside.
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
              Dear {clientName},
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
              Great news! Your{" "}
              <span style={{ color: colors.brandDark, fontWeight: 600 }}>
                {serviceName}
              </span>{" "}
              with{" "}
              <span style={{ color: colors.brandDark, fontWeight: 600 }}>
                {providerName}
              </span>{" "}
              has been successfully booked.
            </Text>

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
                    fontWeight: 600,
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
                  Date & time
                </Text>
                <Text
                  style={{
                    margin: "4px 0 0",
                    color: colors.brandPurple,
                    fontSize: 16,
                    fontWeight: 700,
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

            {/* CTAs */}
            {meetingLink && (
              <Button
                href={meetingLink}
                style={{
                  display: "block",
                  width: "100%",
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
              Need to reschedule?{" "}
              {rescheduleLink ? (
                <Link href={rescheduleLink} style={{ color: colors.brandPurple, textDecoration: "underline" }}>
                  Notify us
                </Link>
              ) : (
                "Notify us"
              )}{" "}
              at least 24 hours in advance.
            </Text>

            {cancelLink && (
              <Text
                style={{
                  margin: 0,
                  color: colors.textMuted,
                  fontSize: 14,
                }}
              >
                Cancel appointment?{" "}
                <Link
                  href={cancelLink}
                  style={{ color: colors.brandPurple, textDecoration: "underline" }}
                >
                  Cancel
                </Link>
              </Text>
            )}
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
                  style={{ color: colors.brandPurple, textDecoration: "underline" }}
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
  component: BookingConfirmationEmail,
  subject: (data: BookingConfirmationProps) =>
    `Your Lubin appointment with ${data.providerName} is confirmed`,
  displayName: "Booking confirmation",
  previewData: {
    clientName: "Jane Edison",
    providerName: "LJ B",
    serviceName: "QA Stress Service 02",
    dateTime: "Monday, 20 Jul — 05:30 PM",
    duration: "30 minutes",
    timezone: "PHT (GMT+8)",
    meetingLink: "https://meet.google.com/sks-hhcc-zse",
    addToCalendarLink: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=QA+Stress+Service+02&dates=20260720T093000Z/20260720T100000Z",
    rescheduleLink: "#reschedule",
    cancelLink: "#cancel",
    supportEmail: "support@lubin.com",
  },
} satisfies TemplateEntry;
