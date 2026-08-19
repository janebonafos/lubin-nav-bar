import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getShare,
  decodeSharePayload,
  type SharePayload,
} from "@/lib/share/shareStore";
import { buildSummary } from "@/lib/share/summary";
import TherapistReport from "@/components/share/reports/TherapistReport";
import TrustedContactReport from "@/components/share/reports/TrustedContactReport";

export const Route = createFileRoute("/share/$token")({
  component: SharePage,
  validateSearch: (search: Record<string, unknown>) => ({
    d: typeof search.d === "string" ? search.d : undefined,
  }),
  head: () => ({
    meta: [{ title: "Shared summary — Lubin" }],
  }),
});

function SharePage() {
  const { token } = Route.useParams();
  const { d } = Route.useSearch();
  const [payload, setPayload] = useState<SharePayload | null | undefined>(undefined);
  const [pinInput, setPinInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const local = getShare(token);
    setPayload(local ?? (d ? decodeSharePayload(d) : null));
  }, [token, d]);

  if (payload === undefined) {
    return <div className="min-h-screen bg-[#FAF8FD]" />;
  }

  if (payload === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8FD] px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-[#3D2E6B]">Link expired or revoked</h1>
          <p className="mt-2 text-sm text-[#5A4A8A]">
            This share link is no longer available. Please ask the sender for a new one.
          </p>
        </div>
      </div>
    );
  }

  if (payload.pin && !unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8FD] px-6">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_30px_80px_-30px_rgba(126,107,175,0.45)] ring-1 ring-[#ECE7F6]">
          <h1 className="text-xl font-bold text-[#3D2E6B]">Enter passcode</h1>
          <p className="mt-1.5 text-sm text-[#5A4A8A]">
            The sender protected this summary with a 4-digit passcode.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mt-4 w-full rounded-xl border border-[#ECE7F6] bg-white px-4 py-2.5 text-center text-lg font-semibold tracking-[0.5em] text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none"
            placeholder="••••"
          />
          <button
            type="button"
            onClick={() => {
              if (pinInput === payload.pin) setUnlocked(true);
              else setPinInput("");
            }}
            className="mt-4 w-full rounded-full bg-gradient-to-r from-[#7E6BAF] to-[#6A5A98] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Unlock summary
          </button>
        </div>
      </div>
    );
  }

  const summary = buildSummary("30d", { checkins: [] });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF8FD] to-white">
      {payload.recipient === "trusted" ? (
        <TrustedContactReport summary={summary} includedKeys={payload.includedKeys} />
      ) : (
        <TherapistReport
          summary={summary}
          includedKeys={payload.includedKeys}
          recipient={payload.recipient}
        />
      )}
    </div>
  );
}