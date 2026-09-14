import React from "react";
import {
  Body,
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

interface Props {
  providerName?: string;
  clientName?: string;
  sessionName?: string;
  sessionDateTime?: string;
  answeredCount?: number;
  totalCount?: number;
  completedAt?: string;
  answeredTopics?: string[];
  openTopics?: string[];
  reviewLink?: string;
  supportEmail?: string;
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "Inter, Arial, sans-serif",
  color: "#3D2E6B",
};
const container = { padding: "32px 28px", maxWidth: "560px" };
const label = {
  fontSize: "11px",
  letterSpacing: "1.4px",
  fontWeight: 700,
  color: "#A89BD0",
  textTransform: "uppercase" as const,
  margin: "0 0 6px",
};
const h1 = { fontSize: "22px", lineHeight: "30px", margin: "0 0 10px", color: "#3D2E6B" };
const p = { fontSize: "15px", lineHeight: "24px", color: "#5B4796", margin: "0 0 14px" };
const cardStyle = {
  border: "1px solid #D8C7F0",
  borderRadius: "12px",
  padding: "16px 18px",
  backgroundColor: "#FBF9FF",
  margin: "0 0 18px",
};
const openCard = {
  ...cardStyle,
  backgroundColor: "#FFF9F0",
  border: "1px solid #F0DDBF",
};
const item = { fontSize: "14px", lineHeight: "22px", color: "#3D2E6B", margin: "0 0 6px" };
const cta = {
  display: "inline-block",
  backgroundColor: "#3D2E6B",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 22px",
  borderRadius: "12px",
  textDecoration: "none",
};
const small = { fontSize: "12.5px", lineHeight: "20px", color: "#7E6BAF", margin: "14px 0 0" };

const Email = ({
  providerName,
  clientName = "Your client",
  sessionName,
  sessionDateTime,
  answeredCount,
  totalCount,
  completedAt,
  answeredTopics = [],
  openTopics = [],
  reviewLink = "https://lubin.care/provider/appointments",
  supportEmail = "support@lubin.care",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${clientName} filled in their session prep — ready to review before your session`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={label}>Session prep · ready to review</Text>
        <Heading style={h1}>{clientName} filled in their session prep</Heading>
        <Text style={p}>
          {providerName ? `Hi ${providerName} — ` : "Hi — "}
          {clientName} answered the questions you requested
          {sessionName ? ` for ${sessionName}` : ""}
          {sessionDateTime ? ` on ${sessionDateTime}` : ""}.
          {answeredCount != null && totalCount != null
            ? ` ${answeredCount} of ${totalCount} items are in.`
            : ""}
          {completedAt ? ` Completed ${completedAt}.` : ""}
        </Text>

        {answeredTopics.length > 0 && (
          <Section style={cardStyle}>
            <Text style={{ ...label, margin: "0 0 8px" }}>Answered</Text>
            {answeredTopics.map((t) => (
              <Text key={t} style={item}>
                • {t}
              </Text>
            ))}
          </Section>
        )}

        {openTopics.length > 0 && (
          <Section style={openCard}>
            <Text style={{ ...label, margin: "0 0 8px", color: "#B98A3C" }}>
              Left open — can be covered live
            </Text>
            {openTopics.map((t) => (
              <Text key={t} style={item}>
                • {t}
              </Text>
            ))}
          </Section>
        )}

        <Link href={reviewLink} style={cta}>
          Review before the session
        </Link>

        <Text style={small}>
          Answers open securely in Lubin inside the appointment — nothing clinical is included in this
          email. Anything left blank simply wasn&apos;t answered; it doesn&apos;t rule anything out.
        </Text>

        <Hr style={{ borderColor: "#EAE7F5", margin: "22px 0 14px" }} />
        <Text style={small}>
          Questions? Reach us at{" "}
          <Link href={`mailto:${supportEmail}`} style={{ color: "#5B4796" }}>
            {supportEmail}
          </Link>
          .
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: any) =>
    data?.clientName
      ? `${data.clientName} completed their session prep`
      : "A client completed their session prep",
  displayName: "Intake form completed (provider)",
  previewData: {
    providerName: "Dr. Camille Lazaro",
    clientName: "Anna Reyes",
    sessionName: "Initial consultation · 50 min",
    sessionDateTime: "Aug 18, 2026 · 10:00 AM (GMT+8)",
    answeredCount: 4,
    totalCount: 5,
    completedAt: "Aug 17, 4:12 PM",
    answeredTopics: [
      "Goals for this session",
      "What's been going on lately",
      "Current medication and supplements",
      "Sleep, energy, appetite",
    ],
    openTopics: ["Relevant medical history"],
    reviewLink: "https://lubin.care/provider/appointments",
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;

export default Email;
