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
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTQ0IiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgNTQ0IDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNNjUuNDQxOCA2OUM2My4yNDM0IDY5IDYxLjE1MzggNjguNDU1NSA1OS4xOTY3IDY3LjM2MzdDNTMuODEzOCA2NC4zNjQ3IDUwLjQxMTYgNTcuNTk1NiA0OC4wMzk1IDUwLjYyMzVDNDMuNDQyNCA1OS40ODUgMzQuNzEzMiA3Mi4xNTIgMjMuODE4IDY4LjE4NDhDMjEuMjUxNiA2Ny4yNTE4IDE3LjAxMDcgNjQuMzgyMyAxNy40ODE1IDU1LjY4ODVDMTcuNjY3IDUyLjI4MDQgMTguNTc2NCA0OC40NzggMTkuOTgzMiA0NS4wMTRDMTMuMzU1NCAzOS43MjUzIDEuODQyMDcgMjguODEyNCAwLjIwNTcxOCAxNy45ODE4Qy0wLjUzNTkzNiAxMy4wNjEgMC43Mjk1ODQgOC42NzI5MSAzLjk3Mjg1IDQuOTQxMDlDNy40NTQ1IDAuNzU2MDQ1IDEyLjE4OTkgLTAuODI3MzI4IDE3LjYzMTYgMC40MDg3NjNDMjguMjc2NyAyLjgyNzk3IDQwLjQzMTYgMTYuNTUxNSA0Ni41Mjk3IDI3LjIxNDNDNTIuMzA5OSAxOC45NDcyIDY1Ljg1MDkgNC40OTA4IDc3LjcxMTUgMS45NjI3MUM4My4wMzU1IDAuODI2NjggODcuNjU2MiAyLjE4MzQ0IDkxLjA1NTQgNS44OTQ2NUM5My4wOTc5IDguMTI1NSA5NS4yMDUxIDEyLjE3NTIgOTMuNjMwNiAxOC44MDNDOTEuMzkwOSAyOC4yMTQ5IDgyLjYzODIgMzkuMTk4NSA3Ni40NTE5IDQ1LjEyMjlDNzcuNzgyMSA0OC43NzUyIDc4LjQ3NjcgNTIuNzYzMSA3OC4zMDYgNTYuMTMyOUM3Ny45OTcgNjIuMzMzOSA3NS4wOTUxIDY2LjYzMDggNzAuMTQ0OSA2OC4yMjAxQzY4LjUyOTEgNjguNzQxIDY2Ljk2MDUgNjkgNjUuNDQxOCA2OVpNNDkuNjExMSAzMy43MDk2QzQ5LjgxNzEgMzQuMzAxMiA0OS45OTM3IDM0Ljg2NjIgNTAuMTI2MSAzNS4zODcyTDUwLjYwNTggMzcuMzE0OUM1Mi41Nzc3IDQ1LjI2NDEgNTUuODc5OCA1OC41NzU2IDYyLjE0ODYgNjIuMDYzMkM2My45NDk3IDYzLjA3MjcgNjUuOTU5OCA2My4xOTMzIDY4LjI4NzggNjIuNDQ1OEM3MC43MzY0IDYxLjY2IDcyLjA2NjcgNTkuNDM1IDcyLjI0OTIgNTUuODIwOUM3Mi4zNjEgNTMuNTkwMSA3Mi4wMjU1IDUxLjI3MzkgNzEuNDI1MSA0OS4xMjg0QzcxLjI2OTEgNDkuMjA3OCA3MS4xMjQ5IDQ5LjI3NTUgNzAuOTk1NCA0OS4zMTk3QzY3LjQ5OTEgNTAuNjQxMSA2MS43NTcxIDQ5LjQyODYgNTkuMjk2NyA0NS44MjkyQzU4LjM2OTYgNDQuNDY5NSA1Ni42NTk3IDQwLjgyMDEgNjAuNzk3NyAzNi4yMTQyQzYyLjk4NDQgMzMuOTY1NyA2NS43MzMyIDMzLjM5NzcgNjguNDExNCAzNC41NjYxQzcwLjM2NTYgMzUuNDE2NiA3Mi4xMzE1IDM3LjE1MyA3My42MTQ4IDM5LjM3OEM3OC44NzExIDMzLjkwNjggODYuNDk5NSAyNC4yODMgODcuOTA5MyAxNi41MzM5Qzg4LjQzMzEgMTMuNjY0NCA4OC4wMDA1IDExLjUyMTggODYuNTg0OSA5Ljk3NjY5Qzg0LjYzNjYgNy44NTQ3NCA4Mi4yMjYyIDcuMTg5NiA3OC45NzQxIDcuODc4MjhDNjYuOTA3NSAxMC40NjgyIDUxLjA3OTcgMzAuMDk4NSA0OS42MTExIDMzLjcwOTZaTTI1LjA4NjQgNDguNjM2OQyNDQuNDY1NSA1MC4zODggMjMuOTYyMiA1Mi4zMTI4IDIzLjY5MTQgNTQuMzQwNkMyMy40NzA3IDU1Ljk4NTcgMjIuOTc2MyA2MS40MjQ1IDI1Ljg4OTkgNjIuNDhDMzMuODk4IDY1LjM5NzcgNDIuNTQxOCA0OC45MzEyIDQ1LjQ2NDMgNDEuNzU4OUM0NS4yMDIzIDQwLjcyMyA0NC45NTUxIDM5LjczNDEgNDQuNzE5NyAzOC43Nzc2TDQ0LjI0MjkgMzYuODczNEM0Mi4xNzEgMjguNjQxNyAyNy42MDg3IDguODkzNjQgMTYuMjgzNyA2LjMyMTRDMTMuMDg3NSA1LjU5MTUxIDEwLjY0MTkgNi40MDM4IDguNTkwNTMgOC44NzAwOUM2LjQ5OCAxMS4yODA1IDUuNzI5ODYgMTMuOTQ5OCA2LjIwMDc2IDE3LjA3ODNDNy40NjkyMiAyNS40NjkgMTYuOTQ1OSAzNC42NDg1IDIyLjg0NjggMzkuNTE2M0MyNC43NTA5IDM2LjY2NDUgMjcuMDIgMzQuNTc0OSAyOS40MTU3IDMzLjk4MzNDMzAuNzYzNiAzMy42NTM3IDM0LjE1NyAzMy4zMyAzNi42NTI3IDM3LjUwOTFDMzYuNjkzOSAzNy41NzM5IDM2LjcyOTIgMzcuNjUwNCAzNi43Njc1IDM3LjcyMUMzOS4xMDQzIDQyLjQ2MjMgMzcuNTkxNiA0Ni4xMzIzIDM1LjM5NiA0Ny45ODM1QzMyLjY4MjUgNTAuMjgyMSAyOC41Mjk4IDUwLjQ5NjkgMjUuMDg2NCA0OC42MzY5V20yNy43MDU4IDQzLjE1MUMyOS4xNDIgNDQuMDUxNiAzMC43NTE5IDQzLjk3MjEgMzEuNDg3NiA0My4zNTExQzMyLjI3MzQgNDIuNjg4OSAzMS43MjAxIDQxLjIyMDMgMzEuMzg0NiA0MC41MTExQzMxLjA5NjIgNDAuMDQ5IDMwLjg3MjUgMzkuODY2NSAzMC44MDc4IDM5LjgzNzFDMzAuMTgzOCAzOS45MDc3IDI4Ljk3MTMgNDEuMTM1IDI3LjcwNTggNDMuMTUxWk02NS43MDM4IDQwLjA0NjFDNjUuNTgwMiA0MC4wNDYxIDY1LjQ1NjYgNDAuMTI4NSA2NS4yMjQxIDQwLjM2NjhDNjUuMDcxIDQwLjU0MDUgNjMuOTI5MSA0MS44NjE5IDY0LjMwNTggNDIuNDEyM0M2NS4wMDkyIDQzLjQ0ODIgNjcuNzMxNiA0NC4wNjYzIDY4Ljg1MjkgNDMuNjUxM0M2OC45MTQ3IDQzLjYxMzEgNjguOTk0MSA0My41Nzc3IDY5LjA3MzYgNDMuNTIxOEM2OC4wNDk0IDQxLjc4NTQgNjYuOTM0IDQwLjU0MzQgNjUuOTg2MyA0MC4xMzE0QzY1Ljg3NDUgNDAuMDg0MyA2NS43ODkxIDQwLjA0NjEgNjUuNzAzOCA0MC4wNDYxWiIgZmlsbD0iIzdFNkJBRiIvPgo8cGF0aCBkPSJNMTE3Ljk4IC01LjcyMjA1ZS0wNlY2M0gxNTMuMDhMMTUyLjM4IDY5SDExMC4yOFYtNS43MjIwNWUtMDZIMTE3Ljk4Wk0yNDUuMzc1IDYzLjlDMjQwLjcwOCA2Ny45NjY3IDIzNC4xNzUgNzAgMjI1Ljc3NSA3MDIxNy4zNzUgNzAyMTAuODQyIDY3Ljk2NjcgMjA2LjE3NSA2My45QzIwMS41MDggNTkuNzY2NyAxOTkuMTc1IDUzLjMzMzMgMTk5LjE3NSA0NC42Vi01LjcyMjA1ZS0wNkgyMDYuODc1VjQ0LjVDMjA2Ljg3NSA1MC43IDIwOC41MDggNTUuNCAyMTEuNzc1IDU4LjZDMjE1LjEwOCA2MS44IDIxOS43NzUgNjMuNCAyMjUuNzc1IDYzLjRDMjMxLjg0MiA2My40IDIzNi41NDIgNjEuOCAyMzkuODc1IDU4LjZDMjQzLjIwOCA1NS40IDI0NC44NzUgNTAuNyAyNDQuODc1IDQ0LjVWLTUuNzIyMDVlLTA2SDI1Mi4zNzVWNDQuNkMyNTIuMzc1IDUzLjMzMzMgMjUwLjA0MiA1OS43NjY3IDI0NS4zNzUgNjMuOVpNMzA3LjQyIDY5Vi01LjcyMjA1ZS0wNkgzMjkuNzJDMzM2LjcyIC01LjcyMjA1ZS0wNiAzNDIuMDU0IDEuNDk5OTkgMzQ1LjcyIDQuNUMzNDkuNDU0IDcuNSAzNTEuMzIgMTEuOCAzNTEuMzIgMTcuNEMzNTEuMzIgMjEuMTMzMyAzNTAuMzIgMjQuNDMzMyAzNDguMzIgMjcuM0MzNDYuMzIgMzAuMTY2NyAzNDMuNjg3IDMyLjEgMzQwLjQyIDMzLjFWmMzLjVDNjQ0LjM1NCAzNC4wMzMzIDM0Ny43MiAzNS43MzMzIDM1MC41MiAzOC42QzM1My4zMiA0MS40NjY3IDM1NC43MiA0NS4yNjY3IDM1NC43MiA1MEMzNTQuNzIgNTUuOCAzNTIuNjU0IDYwLjQzMzMgMzQ4LjUyIDYzLjlDMzQ0LjQ1NCA2Ny4zIDMzOC44NTQgNjkgMzMxLjcyIDY5SDMwNy40MlpNMzE1LjAyIDMwLjlIMzI5LjJDMzMzLjk1NCAzMC45IDMzNy40ODcgMjkuNiAzNDAuMDIgMjdDMzQyLjU1NCAyNC40IDM0My44MiAyMS40IDM0My44MiAxOEMzNDMuODIgMTQuMDY2NyAzNDIuNTU0IDExLjA2NjcgMzQwLjAyIDlDMzM3LjQ4NyA2Ljg2NjY2IDMzMy44MiA1LjggMzI5LjAyIDUuOEgzMTUuMDJWMzAuOVpNMzE1LjAyIDYzLjJIMzMwLjEyQzMzNS40NTQgNjMuMiAzMzkuNjIgNjEuOTY2NyAzNDIuNjIgNTkuNUMzNDUuNjg3IDU3LjAzMzMgMzQ3LjIyIDUzLjcgMzQ3LjIyIDQ5LjVDMzQ3LjIyIDQ1LjQzMzMgMzQ1LjUyIDQyLjMgMzQyLjEyIDQwLjFDMzM4Ljc4NyAzNy45IDMzNC42NTQgMzYuOCAzMjkuNzIgMzYuOEgzMTUuMDJWNjMuMlpNNDExLjQyNzQgLTUuNzIyMDVlLTA2VjY5SDQwNi42NzRWMC01LjcyMjA1ZS0wNkg0MTQuMjc0Wk00NjkuNyA2OVYtNS43MjIwNWUtMDZINDc2LjhMNTE1LjEgNTYuMkg1MTUuOFYtNS43MjIwNWUtMDZINTIyLjlWNjlINTE2TDQ3Ny42IDEyLjVINDc2LjhWNjlINDY5LjdaIiBmaWxsPSIjN0U2QkFGIi8+Cjwvc3ZnPg==";

const colors = {
  brandPurple: "#7E6BAF",
  brandDark: "#3D2E6B",
  brandNavy: "#2A2550",
  lavender: "#F7F2FE",
  lavenderBorder: "#EAE7F5",
  textMuted: "#7E6BAF",
  textDark: "#2A2550",
  white: "#ffffff",
  highlightBg: "#FBF9FF",
  highlightBorder: "#D8C7F0",
} as const;

interface WebinarConfirmationProps {
  attendeeName: string;
  webinarTitle: string;
  speakerName: string;
  speakerCred?: string;
  hostOrg?: string;
  dateTime: string;
  duration: string;
  timezone: string;
  platform: string;
  meetingLink: string;
  registrationEmail: string;
  addToCalendarLink?: string;
  supportEmail?: string;
}

export default function WebinarConfirmationEmail({
  attendeeName,
  webinarTitle,
  speakerName,
  speakerCred,
  hostOrg,
  dateTime,
  duration,
  timezone,
  platform,
  meetingLink,
  registrationEmail,
  addToCalendarLink,
  supportEmail,
}: WebinarConfirmationProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        You're registered for {webinarTitle}. Use {registrationEmail} to join on the day.
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
              Registration confirmed
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
              Dear {attendeeName},
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
              You're registered — see you at the webinar
            </Heading>

            <Text
              style={{
                margin: "0 0 24px",
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: "1.5",
              }}
            >
              Thank you for registering for{" "}
              <strong style={{ color: colors.brandNavy }}>{webinarTitle}</strong>
              {hostOrg ? ` presented by ${hostOrg}` : ""}. This email is your confirmation — keep it
              handy so you can join easily on the day.
            </Text>

            {/* Use-this-email callout */}
            <Section
              style={{
              backgroundColor: colors.highlightBg,
              border: `1px solid ${colors.highlightBorder}`,
              borderRadius: 14,
              padding: "16px 18px",
              marginBottom: 24,
              }}
            >
              <Text
                style={{
                  margin: "0 0 4px",
                  color: colors.brandDark,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                }}
              >
                Use this email to join
              </Text>
              <Text
                style={{
                  margin: 0,
                  color: colors.textMuted,
                  fontSize: 14,
                  lineHeight: "1.5",
                }}
              >
                For easier access, join the webinar using the same email you registered with:{" "}
                <strong style={{ color: colors.brandNavy }}>{registrationEmail}</strong>. This helps us
                let you in quickly without extra verification.
              </Text>
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
                Webinar details
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
                  Webinar
                </Text>
                <Text
                  style={{
                    margin: "4px 0 0",
                    color: colors.brandNavy,
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.35,
                  }}
                >
                  {webinarTitle}
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
                  Guest speaker
                </Text>
                <Text
                  style={{
                    margin: "4px 0 0",
                    color: colors.brandNavy,
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {speakerName}
                  {speakerCred ? `, ${speakerCred}` : ""}
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
                  Platform
                </Text>
                <Text
                  style={{
                    margin: "4px 0 0",
                    color: colors.brandNavy,
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {platform}
                </Text>
              </div>
            </Section>

            {/* Meeting link */}
            <Section
              style={{
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  margin: "0 0 6px",
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
                  color: colors.brandPurple,
                  fontSize: 14,
                  textDecoration: "underline",
                  wordBreak: "break-all",
                }}
              >
                {meetingLink}
              </Link>
            </Section>

            {/* CTAs */}
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
              Join webinar
            </Button>

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
              A few minutes before the start time, click <strong>Join webinar</strong> above. Try to
              join 5 minutes early so we can admit you on time.
            </Text>

            <Text
              style={{
                margin: "0 0 8px",
                color: colors.textMuted,
                fontSize: 14,
                lineHeight: "1.5",
              }}
            >
              Can't find the link on the day? Check your spam or promotions folder first, then
              contact us.
            </Text>

            {supportEmail && (
              <Text
                style={{
                  margin: 0,
                  color: colors.textMuted,
                  fontSize: 14,
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
  component: WebinarConfirmationEmail,
  subject: (data: WebinarConfirmationProps) =>
    `You're registered — ${data.webinarTitle}`,
  displayName: "Webinar registration confirmation",
  previewData: {
    attendeeName: "Anna",
    webinarTitle: "Be the Bridge — A Youth Mental & Suicide Prevention Talk",
    speakerName: "Mrs. Christine Anne M. Villamarzo",
    speakerCred: "RPsy",
    hostOrg: "Area One Youth Federation",
    dateTime: "September 20, 2026 · 2:00 PM",
    duration: "1 hour",
    timezone: "PHT (GMT+8)",
    platform: "Google Meet",
    meetingLink: "https://meet.google.com/sks-hhcc-zse",
    registrationEmail: "anna@example.com",
    addToCalendarLink:
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Be+the+Bridge+Webinar&dates=20260920T060000Z/20260920T070000Z",
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;
