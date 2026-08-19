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

const LUBIN_LOGO =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTQ0IiBoZWlnaHQ9IjcwIiB2aWV3Qm94PSIwIDAgNTQ0IDcwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNNjUuNDQxOCA2OUM2My4yNDM0IDY5IDYxLjE1MzggNjguNDU1NSA1OS4xOTY3IDY3LjM2MzdDNTMuODEzOCA2NC4zNjQ3IDUwLjQxMTYgNTcuNTk1NiA0OC4wMzk1IDUwLjYyMzVDNDMuNDQyNCA1OS40ODUgMzQuNzEzMiA3Mi4xNTIgMjMuODE4IDY4LjE4NDhDMjEuMjUxNiA2Ny4yNTE4IDE3LjAxMDcgNjQuMzgyMyAxNy40ODE1IDU1LjY4ODVDMTcuNjY3IDUyLjI4MDQgMTguNTc2NCA0OC40NzggMTkuOTgzMiA0NS4wMTRDMTMuMzU1NCAzOS43MjUzIDEuODQyMDcgMjguODEyNCAwLjIwNTcxOCAxNy45ODE4Qy0wLjUzNTkzNiAxMy4wNjEgMC43Mjk1ODQgOC42NzI5MSAzLjk3Mjg1IDQuOTQxMDlDNy40NTQ1IDAuNzU2MDQ1IDEyLjE4OTkgLTAuODI3MzI4IDE3LjYzMTYgMC40MDg3NjNDMjguMjc2NyAyLjgyNzk3IDQwLjQzMTYgMTYuNTUxNSA0Ni41Mjk3IDI3LjIxNDNDNTIuMzA5OSAxOC45NDcyIDY1Ljg1MDkgNC40OTA4IDc3LjcxMTUgMS45NjI3MUM4My4wMzU1IDAuODI2NjggODcuNjU2MiAyLjE4MzQ0IDkxLjA1NTQgNS44OTQ2NUM5My4wOTc5IDguMTI1NSA5NS4yMDUxIDEyLjE3NTIgOTMuNjMwNiAxOC44MDNDOTEuMzkwOSAyOC4yMTQ5IDgyLjYzODIgMzkuMTk4NSA3Ni40NTE5IDQ1LjEyMjlDNzcuNzgyMSA0OC43NzUyIDc4LjQ3NjcgNTIuNzYzMSA3OC4zMDYgNTYuMTMyOUM3Ny45OTcgNjIuMzMzOSA3NS4wOTUxIDY2LjYzMDggNzAuMTQ0OSA2OC4yMjAxQzY4LjUyOTEgNjguNzQxIDY2Ljk2MDUgNjkgNjUuNDQxOCA2OVpNNDkuNjExMSAzMy43MDk2QzQ5LjgxNzEgMzQuMzAxMiA0OS45OTM3IDM0Ljg2NjIgNTAuMTI2MSAzNS4zODcyTDUwLjYwNTggMzcuMzE0OUM1Mi41Nzc3IDQ1LjI2NDEgNTUuODc5OCA1OC41NzU2IDYyLjE0ODYgNjIuMDYzMkM2My45NDk3IDYzLjA3MjcgNjUuOTU5OCA2My4xOTMzIDY4LjI4NzggNjIuNDQ1OEM3MC43MzY0IDYxLjY2IDcyLjA2NjcgNTkuNDM1IDcyLjI0OTIgNTUuODIwOUM3Mi4zNjEgNTMuNTkwMSA3Mi4wMjU1IDUxLjI3MzkgNzEuNDI1MSA0OS4xMjg0QzcxLjI2OTEgNDkuMjA3OCA3MS4xMjQ5IDQ5LjI3NTUgNzAuOTk1NCA0OS4zMTk3QzY3LjQ5OTEgNTAuNjQxMSA2MS43NTcxIDQ5LjQyODYgNTkuMjk2NyA0NS44MjkyQzU4LjM2OTYgNDQuNDY5NSA1Ni42NTk3IDQwLjgyMDEgNjAuNzk3NyAzNi4yMTQyQzYyLjk4NDQgMzMuOTY1NyA2NS43MzMyIDMzLjM5NzcgNjguNDExNCAzNC41NjYxQzcwLjM2NTYgMzUuNDE2NiA3Mi4xMzE1IDM3LjE1MyA3My42MTQ4IDM5LjM3OEM3OC44NzExIDMzLjkwNjggODYuNDk5NSAyNC4yODMgODcuOTA5MyAxNi41MzM5Qzg4LjQzMzEgMTMuNjY0NCA4OC4wMDA1IDExLjUyMTggODYuNTg0OSA5Ljk3NjY5Qzg0LjYzNjYgNy44NTQ3NCA4Mi4yMjYyIDcuMTg5NiA3OC45NzQxIDcuODc4MjhDNjYuOTA3NSAxMC40NjgyIDUxLjA3OTcgMzAuMDk4NSA0OS42MTExIDMzLjcwOTZaTTI1LjA4NjQgNDguNjM2OUwyNC40NjU1IDUwLjM4ODAgMjMuOTYyMiA1Mi4zMTI4IDIzLjY5MTQgNTQuMzQwNkMyMy40NzA3IDU1Ljk4NTcgMjIuOTc2MyA2MS40MjQ1IDI1Ljg4OTkgNjIuNDg3QzMzLjg5ODAgNjUuMzk3NyA0Mi41NDE4IDQ4LjkzMTIgNDUuNDY0MyA0MS43NTg5QzQ1LjIwMjMgNDAuNzIzMCA0NC45NTUxIDM5LjczNDEgNDQuNzE5NyAzOC43Nzc2TDQ0LjI0MjkgMzYuODczNEM0Mi4xNzEwIDI4LjY0MTcgMjcuNjA4NyA4Ljg5MzY0IDE2LjI4MzcgNi4zMjE0MEMxMy4wODc1IDUuNTkxNTEgMTAuNjQxOSA2LjQwMzgwIDguNTkwNTMgOC44NzAwOUM2LjQ5ODAwIDExLjI4MDUgNS43Mjk4NiAxMy45NDk4IDYuMjAwNzYgMTcuMDc4M0M3LjQ2OTIyIDI1LjQ2OTEgMTYuOTQ1OSAzNC42NDg1IDIyLjg0NjggMzkuNTE2M0MyNC43NTA5IDM2LjY2NDUgMjcuMDIwMCAzNC41NzQ5IDI5LjQxNTcgMzMuOTgzM0MzMC43NjM2IDMzLjY1MzcgMzQuMTU3MDAgMzMuMzMwIDM2LjY1MjcgMzcuNTA5MUMzNi42OTM5IDM3LjU3MzkgMzYuNzI5MiAzNy42NTA0IDM2Ljc2NzUgMzcuNzIxMEMzOS4xMDQzIDQyLjQ2MjMgMzcuNTkxNiA0Ni4xMzIzIDM1LjM5NjAgNDcuOTgzNUMzMi42ODI1IDUwLjI4MjEgMjguNTI5OCA1MC40OTY5IDI1LjA4NjQgNDguNjM2OVpNMjcuNzA1OCA0My4xNTFDMjkuMTQyMCA0NC4wNTE2IDMwLjc1MTkgNDMuOTcyMSAzMS40ODc2IDQzLjM1MTFDMzIuMjczNCA0Mi42ODg5IDMxLjcyMDEgNDEuMjIwMyAzMS4zODQ2IDQwLjUxMTFDMzEuMDk2MiA0MC4wNDkwIDMwLjg3MjUgMzkuODY2NSAzMC44MDc4IDM5LjgzNzFDMzAuMTgzOCAzOS45MDc3IDI4Ljk3MTMgNDEuMTM1MCAyNy43MDU4IDQzLjE1MVpNNjUuNzAzOCA0MC4wNDYxQzY1LjU4MDIgNDAuMDQ2MSA2NS40NTY2IDQwLjEyODUgNjUuMjI0MSA0MC4zNjY4QzY1LjA3MTAgNDAuNTQwNSA2My45MjkxIDQxLjg2MTkgNjQuMzA1OCA0Mi40MTIzQzY1LjAwOTIgNDMuNDQ4MiA2Ny43MzE2IDQ0LjA2NjMgNjguODUyOSA0My42NTEzQzY4LjkxNDcgNDMuNjEzMSA2OC45OTQxIDQzLjU3NzcgNjkuMDczNiA0My41MjE4QzY4LjA0OTQgNDEuNzg1NCA2Ni45MzQwIDQwLjU0MzQgNjUuOTg2MyA0MC4xMzE0QzY1Ljg3NDUgNDAuMDg0MyA2NS43ODkxIDQwLjA0NjEgNjUuNzAzOCA0MC4wNDYxWiIgZmlsbD0iIzdFNkJBRiIvPgo8cGF0aCBkPSJNMTE3Ljk4IC01LjcyMjA1ZS0wNlY2M0gxNTMuMDhMMTUyLjM4IDY5SDExMC4yOFYtNS43MjIwNWUtMDZIMTE3Ljk4Wk0yNDUuMzc1IDYzLjlDMjQwLjcwOCA2Ny45NjY3IDIzNC4xNzUgNzAgMjI1Ljc3NSA3MEMyMTcuMzc1IDcwIDIxMC44NDIgNjcuOTY2NyAyMDYuMTc1IDYzLjlDMjAxLjUwOCA1OS43NjY3IDE5OS4xNzUgNTMuMzMzMyAxOTkuMTc1IDQ0LjZWLTUuNzIyMDVlLTA2SDIwNi44NzVWNDQuNUMyMDYuODc1IDUwLjcgMjA4LjUwOCA1NS40IDIxMS43NzUgNTguNkMyMTUuMTA4IDYxLjggMjE5Ljc3NSA2My40IDIyNS43NzUgNjMuNEMyMzEuODQyIDYzLjQgMjM2LjU0MiA2MS44IDIzOS44NzUgNTguNkMyNDMuMjA4IDU1LjQgMjQ0Ljg3NSA1MC43IDI0NC44NzUgNDQuNVYtNS43MjIwNWUtMDZIMjUyLjM3NVY0NC42QzI1Mi4zNzUgNTMuMzMzMyAyNTAuMDQyIDU5Ljc2NjcgMjQ1LjM3NSA2My45Wk0zMDcuNDIgNjlWLTUuNzIyMDVlLTA2SDMyOS43MkMzMzYuNzIgLTUuNzIyMDVlLTA2IDM0Mi4wNTQgMS40OTk5OSAzNDUuNzIgNC41QzM0OS40NTQgNy41IDM1MS4zMiAxMS44IDM1MS4zMiAxNy40QzM1MS4zMiAyMS4xMzMzIDM1MC4zMiAyNC40MzMzIDM0OC4zMiAyNy4zQzM0Ni4zMiAzMC4xNjY3IDM0My42ODcgMzIuMSAzNDAuNDIgMzMuMVYzMy41QzM0NC4zNTQgMzQuMDMzMyAzNDcuNzIgMzUuNzMzMyAzNTAuNTIgMzguNkMzNTMuMzIgNDEuNDY2NyAzNTQuNzIgNDUuMjY2NyAzNTQuNzIgNTBDMzU0LjcyIDU1LjggMzUyLjY1NCA2MC40MzMzIDM0OC41MiA2My45QzM0NC40NTQgNjcuMyAzMzguODU0IDY5IDMzMS43MiA2OUgzMDcuNDJaTTMxNS4wMiAzMC45SDMyOS40MkMzMzMuOTU0IDMwLjkgMzM3LjQ4NyAyOS42IDM0MC4wMiAyN0MzNDIuNTU0IDI0LjQgMzQzLjgyIDIxLjQgMzQzLjgyIDE4QzM0My44MiAxNC4wNjY3IDM0Mi41NTQgMTEuMDY2NyAzNDAuMDIgOUMzMzcuNDg3IDYuODY2NjYgMzMzLjgyIDUuOCAzMjkuMDIgNS44SDMxNS4wMlYzMC45Wk0zMTUuMDIgNjMuMkgzMzAuMTJDMzM1LjQ1NCA2My4yIDMzOS42MiA2MS45NjY3IDM0Mi42MiA1OS41QzM0NS42ODcgNTcuMDMzMyAzNDcuMjIgNTMuNyAzNDcuMjIgNDkuNUMzNDcuMjIgNDUuNDMzMyAzNDUuNTIgNDIuMyAzNDIuMTIgNDAuMUMzMzguNzg3IDM3LjkgMzM0LjY1NCAzNi44IDMyOS43MiAzNi44SDMxNS4wMlY2My4yWk00MTQuMjc0IC01LjcyMjA1ZS0wNlY2OUg0MDYuNjc0Vi01LjcyMjA1ZS0wNkg0MTQuMjc0Wk00NjkuNyA2OVYtNS43MjIwNWUtMDZINDc2LjhMNTE1LjEgNTYuMkg1MTUuOFYtNS43MjIwNWUtMDZINTIyLjlWNjlINTE2TDQ3Ny42IDEyLjVINDc2LjhWNjlINDY5LjdaIiBmaWxsPSIjN0U2QkFGIi8+Cjwvc3ZnPgo=";

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

export interface AssessmentResultSharedProps {
  /** The patient / user sharing the result. */
  senderName?: string;
  /** The email recipient. */
  recipientName?: string;
  /** Plain-language assessment title. */
  assessmentName?: string;
  /** Clinical tool name (e.g. "PHQ-9"). */
  clinicalName?: string;
  /** Score achieved. */
  score?: number;
  /** Maximum possible score. */
  maxScore?: number;
  /** Status label, e.g. "Mild" / "Moderate". */
  statusLabel?: string;
  /** One-sentence plain-language explanation. */
  explanation?: string;
  /** Longer summary take-away. */
  summary?: string;
  /** Optional note left by the sender. */
  senderNote?: string;
  /** Link to view the full result on Lubin. */
  resultLink?: string;
  /** When the assessment was taken. */
  takenAt?: string;
  /** Expiry label for the share link. */
  expiresAt?: string;
  supportEmail?: string;
}

export default function AssessmentResultSharedEmail({
  senderName,
  recipientName,
  assessmentName,
  clinicalName,
  score,
  maxScore,
  statusLabel,
  explanation,
  summary,
  senderNote,
  resultLink,
  takenAt,
  expiresAt,
  supportEmail,
}: AssessmentResultSharedProps) {
  const showScore = typeof score === "number" && typeof maxScore === "number";
  const showStatus = statusLabel && statusLabel.trim().length > 0;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {senderName ? `${senderName} ` : ""}shared a {assessmentName ?? "mental health check"} result
        with you on Lubin.
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
          {/* Header */}
          <Section
            style={{
              backgroundColor: colors.lavender,
              borderRadius: 24,
              padding: "24px",
              textAlign: "center",
            }}
          >
            <Img
              src={LUBIN_LOGO}
              alt="Lubin"
              height={32}
              style={{ display: "inline-block", margin: "0 auto" }}
            />
            <Text
              style={{
                margin: "14px 0 0",
                color: colors.textMuted,
                fontSize: 13,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Assessment result shared
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
              }}
            >
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
              {senderName ?? "Someone"} shared a result with you
            </Heading>

            <Text
              style={{
                margin: "0 0 24px",
                color: colors.textMuted,
                fontSize: 15,
                lineHeight: "1.5",
              }}
            >
              {senderName ?? "A Lubin user"} wanted you to see their{" "}
              {assessmentName ?? "mental health check"} result
              {clinicalName ? ` (${clinicalName})` : ""}
              {takenAt ? `, taken on ${takenAt}` : ""}. This is shared privately
              through Lubin and is not a clinical diagnosis.
            </Text>

            {/* Result card */}
            <Section
              style={{
                backgroundColor: colors.lavender,
                borderRadius: 20,
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
                {assessmentName ?? "Assessment"}
                {clinicalName ? ` · ${clinicalName}` : ""}
              </Text>

              {showScore && (
                <Section style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      margin: 0,
                      color: colors.brandNavy,
                      fontSize: 42,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {score}
                    <span
                      style={{
                        color: colors.textMuted,
                        fontSize: 18,
                        fontWeight: 500,
                        marginLeft: 4,
                      }}
                    >
                      / {maxScore}
                    </span>
                  </Text>
                  {showStatus && (
                    <Text
                      style={{
                        margin: "8px 0 0",
                        color: colors.brandPurple,
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {statusLabel}
                    </Text>
                  )}
                </Section>
              )}

              {!showScore && showStatus && (
                <Text
                  style={{
                    margin: "0 0 16px",
                    color: colors.brandPurple,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {statusLabel}
                </Text>
              )}

              {(explanation || summary) && (
                <Text
                  style={{
                    margin: 0,
                    color: colors.brandNavy,
                    fontSize: 15,
                    lineHeight: "1.6",
                  }}
                >
                  {explanation || summary}
                </Text>
              )}
            </Section>

            {/* Sender note */}
            {senderNote && (
              <Section
                style={{
                  border: `1px solid ${colors.lavenderBorder}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    margin: "0 0 8px",
                    color: colors.textMuted,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  A note from {senderName ?? "the sender"}
                </Text>
                <Text
                  style={{
                    margin: 0,
                    color: colors.brandNavy,
                    fontSize: 15,
                    lineHeight: "1.6",
                    fontStyle: "italic",
                  }}
                >
                  “{senderNote}”
                </Text>
              </Section>
            )}

            {resultLink && (
              <Button
                href={resultLink}
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
                View the full result on Lubin
              </Button>
            )}

            <Text
              style={{
                margin: 0,
                color: colors.textMuted,
                fontSize: 13,
                lineHeight: "1.5",
                textAlign: "center",
              }}
            >
              This link is private and expires{expiresAt ? ` on ${expiresAt}` : " after 30 days"}.
            </Text>
          </Section>

          {/* Footer */}
          <Section
            style={{
              border: `1px solid ${colors.lavenderBorder}`,
              borderRadius: 16,
              padding: 20,
              marginTop: 16,
            }}
          >
            <Text
              style={{
                margin: 0,
                color: colors.textDark,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              What is Lubin?
            </Text>
            <Text
              style={{
                margin: "6px 0 0",
                color: colors.textMuted,
                fontSize: 13,
                lineHeight: "1.5",
              }}
            >
              Lubin is a mental health platform that helps people understand their wellbeing, prepare
              for provider visits, and keep their care history in one place. Shared results are
              self-reported and intended for conversation, not diagnosis.
            </Text>

            <Hr
              style={{
                border: "none",
                borderTop: `1px solid ${colors.lavenderBorder}`,
                margin: "16px 0",
              }}
            />

            <Text
              style={{
                margin: 0,
                color: colors.textMuted,
                fontSize: 12,
                lineHeight: "1.5",
                textAlign: "center",
              }}
            >
              Questions?{" "}
              {supportEmail ? (
                <Link href={`mailto:${supportEmail}`} style={{ color: colors.brandPurple }}>
                  Contact Lubin support
                </Link>
              ) : (
                "Contact Lubin support."
              )}
              <br />
              lubin.care
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: AssessmentResultSharedEmail,
  subject: (data: any) =>
    data.senderName
      ? `${data.senderName} shared a mental health check result with you`
      : "A mental health check result was shared with you",
  displayName: "Assessment result shared",
  previewData: {
    senderName: "Anna Reyes",
    recipientName: "Dr. Camille Lazaro",
    assessmentName: "Mood check",
    clinicalName: "PHQ-9",
    score: 8,
    maxScore: 27,
    statusLabel: "Mild",
    explanation:
      "This score suggests a few low mood signs that are worth paying attention to. Many people in this range feel okay most of the time but notice occasional dips in energy, sleep, or motivation.",
    summary: "",
    senderNote: "I wanted you to see this before our next session. Nothing urgent, just context.",
    resultLink: "https://lubin.care/result/abc123?d=encoded",
    takenAt: "Aug 19, 2026",
    expiresAt: "Sep 18, 2026",
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;
