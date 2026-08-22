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
  clientName?: string;
  providerName?: string;
  sessionName?: string;
  sessionDateTime?: string;
  minutes?: number;
  topics?: string[];
  prepLink?: string;
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
  clientName,
  providerName = "your provider",
  sessionName,
  sessionDateTime,
  minutes = 3,
  topics = [],
  prepLink = "https://lubin.care/profile",
  supportEmail = "support@lubin.care",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {`Optional · about ${minutes} min — help ${providerName} prepare for your session`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={label}>Optional · about {minutes} min</Text>
        <Heading style={h1}>Help {providerName} prepare for your session</Heading>
        <Text style={p}>
          {clientName ? `Hi ${clientName} — ` : "Hi — "}
          your session {sessionName ? `(${sessionName}) ` : ""}
          {sessionDateTime ? `on ${sessionDateTime} ` : ""}is confirmed. So your time together can
          focus on what you actually came for, {providerName} would like a quick picture of your
          goals, recent changes, and anything relevant to your care.
        </Text>

        {topics.length > 0 && (
          <Section style={cardStyle}>
            <Text style={{ ...label, margin: "0 0 8px" }}>What we&apos;ll ask about</Text>
            {topics.map((t) => (
              <Text key={t} style={item}>
                • {t}
              </Text>
            ))}
          </Section>
        )}

        <Text style={p}>
          It takes about {minutes} minutes, some answers are already filled in from your Health
          Passport, and you can skip anything you&apos;d rather talk about in person.
        </Text>

        <Link href={prepLink} style={cta}>
          Prepare for my session
        </Link>

        <Text style={small}>
          You fill this in securely on Lubin — never by replying to this email. Nothing here is
          required, and your session goes ahead either way.
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
    data?.providerName
      ? `Optional: help ${data.providerName} prepare for your session`
      : "Optional: help your provider prepare for your session",
  displayName: "Intake form request (client)",
  previewData: {
    clientName: "Anna",
    providerName: "Dr. Camille",
    sessionName: "Initial consultation · 50 min",
    sessionDateTime: "Aug 18, 2026 · 10:00 AM (GMT+8)",
    minutes: 3,
    topics: [
      "Your goals for this session",
      "What's been going on lately",
      "Current medication and supplements",
    ],
    prepLink: "https://lubin.care/profile",
    supportEmail: "support@lubin.care",
  },
} satisfies TemplateEntry;

export default Email;
