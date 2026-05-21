import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { mockSummary } from "@/lib/share/summary";
import TherapistReport from "@/components/share/reports/TherapistReport";
import TrustedContactReport from "@/components/share/reports/TrustedContactReport";
import type { RecipientId } from "@/lib/share/shareStore";

const schema = z.object({
  recipient: fallback(
    z.enum(["trusted", "therapist", "psychiatrist", "counselor", "doctor", "other-mhp"]),
    "therapist",
  ).default("therapist"),
});

export const Route = createFileRoute("/share/preview")({
  validateSearch: zodValidator(schema),
  component: PreviewPage,
  head: () => ({ meta: [{ title: "Share preview — Lubin" }] }),
});

function PreviewPage() {
  const { recipient } = Route.useSearch();
  const summary = mockSummary();
  const includedKeys = ["narrative", "mood", "topics", "assessments", "checkinCount"];
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF8FD] to-white">
      {recipient === "trusted" ? (
        <TrustedContactReport summary={summary} includedKeys={includedKeys} sharerName="Alex" />
      ) : (
        <TherapistReport
          summary={summary}
          includedKeys={includedKeys}
          recipient={recipient as RecipientId}
        />
      )}
    </div>
  );
}