import { useEffect, useMemo, useState } from "react";
import PassportEmptyState from "@/components/passport/PassportEmptyState";
import {
  listSignedPrescriptions,
  subscribePrescriptionDocuments,
  type SignedPrescriptionDocument,
} from "@/lib/prescription/documents";
import { ensureSamplePrescriptionRecord } from "@/lib/prescription/sampleRecord";
import { prescriptionViewHref } from "@/lib/prescription/viewHandoff";
import {
  FEE_LABEL,
  buildDemoPaymentRows,
  loadPayments,
  markPaid,
  resetPayments,
  subscribePayments,
  type PaymentRecord,
  type PaymentState,
} from "@/lib/prescription/payment";
import MedicationList from "@/components/passport/MedicationList";
import PrescriptionPaySheet from "./PrescriptionPaySheet";

const PAGE_SIZE = 4;
const DAY = 24 * 60 * 60 * 1000;

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "awaiting", label: "Awaiting payment" },
  { key: "valid", label: "Still valid" },
  { key: "expired", label: "Expired" },
  { key: "voided", label: "Voided" },
] as const;
type StatusKey = (typeof STATUS_FILTERS)[number]["key"];

type RowStatus = "awaiting" | "valid" | "expired-paid" | "expired-unpaid" | "voided";

type Row = {
  doc: SignedPrescriptionDocument;
  payment: PaymentState;
  payBy?: number;
  requestNote?: string;
  status: RowStatus;
};

function prescriptionHref(doc: SignedPrescriptionDocument, opts?: { download?: boolean }): string {
  return prescriptionViewHref(
    {
      appointmentId: doc.appointmentId,
      country: doc.country,
      clientName: doc.patientName,
      providerName: doc.identity?.fullName,
      docId: doc.id,
      document: doc,
    },
    opts,
  );
}

function deriveStatus(doc: SignedPrescriptionDocument, payment: PaymentState, payBy: number | undefined, now: number): RowStatus {
  if (doc.voided) return "voided";
  if (payment === "awaiting") return payBy && payBy < now ? "expired-unpaid" : "awaiting";
  if (doc.validUntil && doc.validUntil < now) return "expired-paid";
  return "valid";
}

const matchesFilter = (s: RowStatus, f: StatusKey) =>
  f === "all" ||
  (f === "awaiting" && s === "awaiting") ||
  (f === "valid" && s === "valid") ||
  (f === "expired" && (s === "expired-paid" || s === "expired-unpaid")) ||
  (f === "voided" && s === "voided");

/**
 * Client-facing prescription record. Prescriptions issued after a chat
 * request need a fee before they can be viewed or downloaded (design-only;
 * real pricing and payment come from the production system).
 */
export default function ClientPrescriptionsSection({ forceEmpty = false }: { forceEmpty?: boolean }) {
  const [docs, setDocs] = useState<SignedPrescriptionDocument[]>([]);
  const [payments, setPayments] = useState<Record<string, PaymentRecord>>({});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusKey>("all");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<Row | null>(null);
  const [openRequest, setOpenRequest] = useState<string | null>(null);
  const [requestedAgain, setRequestedAgain] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(0);
  const [tab, setTab] = useState<"prescriptions" | "medication">("prescriptions");

  useEffect(() => {
    ensureSamplePrescriptionRecord();
    const read = () => setDocs(listSignedPrescriptions());
    const readPay = () => setPayments(loadPayments());
    read();
    readPay();
    setNow(Date.now());
    const a = subscribePrescriptionDocuments(read);
    const b = subscribePayments(readPay);
    return () => {
      a();
      b();
    };
  }, []);

  const rows = useMemo<Row[]>(() => {
    const t = now || Date.now();
    const sorted = [...docs].sort((a, b) => b.signedAt - a.signedAt);
    const real: Row[] = sorted.map((doc) => ({
      doc,
      payment: "paid",
      status: deriveStatus(doc, "paid", undefined, t),
    }));
    const demo: Row[] = buildDemoPaymentRows(sorted[0]).map((d) => {
      const payment = payments[d.doc.id]?.state ?? d.initial;
      return {
        doc: d.doc,
        payment,
        payBy: d.payBy,
        requestNote: d.requestNote,
        status: deriveStatus(d.doc, payment, d.payBy, t),
      };
    });
    return [...real, ...demo].sort((a, b) => b.doc.signedAt - a.doc.signedAt);
  }, [docs, payments, now]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (!matchesFilter(r.status, status)) return false;
      if (!q) return true;
      const locked = r.status === "awaiting" || r.status === "expired-unpaid";
      return [
        r.doc.number,
        r.doc.identity?.fullName,
        ...(locked ? [] : r.doc.medications.map((m) => `${m.name ?? ""} ${m.genericName ?? ""}`)),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return order === "newest" ? list : [...list].reverse();
  }, [rows, query, status, order]);

  useEffect(() => setPage(1), [query, status, order]);

  if (forceEmpty) {
    return (
      <section className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">
        <PassportEmptyState
          eyebrow="My prescriptions"
          title="No prescriptions yet"
          description="No prescriptions yet. Start in chat to request one."
        />
      </section>
    );
  }

  const awaitingCount = rows.filter((r) => r.status === "awaiting").length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  return (
    <section className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-5 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8">

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="My Prescription sections"
          className="inline-flex rounded-[14px] border border-[#DCD4F0] bg-white p-1 shadow-sm"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "prescriptions"}
            onClick={() => setTab("prescriptions")}
            className={`rounded-[10px] px-5 py-2 font-display text-[15px] font-semibold transition-colors ${
              tab === "prescriptions"
                ? "bg-[#7E6BAF] text-white shadow-sm"
                : "text-[#5B4B8A] hover:bg-[#F3F0FA]"
            }`}
          >
            My prescriptions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "medication"}
            onClick={() => setTab("medication")}
            className={`rounded-[10px] px-5 py-2 font-display text-[15px] font-semibold transition-colors ${
              tab === "medication"
                ? "bg-[#7E6BAF] text-white shadow-sm"
                : "text-[#5B4B8A] hover:bg-[#F3F0FA]"
            }`}
          >
            My medication
          </button>
        </div>
        {tab === "prescriptions" && (
          <button
            type="button"
            onClick={resetPayments}
            className="shrink-0 text-[12px] font-semibold text-[#7E6BAF] underline-offset-2 hover:underline"
          >
            Reset demo payments
          </button>
        )}
      </div>

      {tab === "prescriptions" && (
        <>
          <div className="mb-6">
            <h4 className="font-display text-xl font-semibold text-[#3D2E6B]">Official prescription copies</h4>
            <p className="mt-1 text-sm text-[#6F6889]">
              Formal records issued by your prescribers — view or download one any time, without finding
              the appointment first.
            </p>
          </div>

      {rows.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by medication, prescriber or record number"
              className="w-full rounded-xl border border-[#DCD4F0] bg-white px-4 py-2.5 text-sm text-[#3D2E6B] placeholder:text-[#9C93B8] focus:border-[#7E6BAF] focus:outline-none"
            />
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as typeof order)}
              className="rounded-xl border border-[#DCD4F0] bg-white px-4 py-2.5 text-sm font-medium text-[#3D2E6B] focus:border-[#7E6BAF] focus:outline-none sm:w-48"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatus(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-[12px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  status === f.key
                    ? "bg-[#7E6BAF] text-white"
                    : "border border-[#DCD4F0] bg-white text-[#5B4B8A] hover:bg-[#EAE7F5]"
                }`}
              >
                {f.label}
                {f.key === "awaiting" && awaitingCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-bold ${
                      status === f.key ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {awaitingCount}
                  </span>
                )}
              </button>
            ))}
            <span className="ml-auto text-[12.5px] text-[#6F6889]">
              {filtered.length} of {rows.length} records
            </span>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyBox title="No prescriptions yet." body="Start in chat to request one." />
      ) : filtered.length === 0 ? (
        status === "awaiting" && !query ? (
          <EmptyBox title="Nothing to pay." body="Prescriptions that need a fee will show up here." />
        ) : (
          <EmptyBox
            title="No prescriptions match your search"
            body="Try a different medication, prescriber or record number, or clear the filters."
            action={
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                }}
                className="mt-3 rounded-[12px] border border-[#A89BD0] bg-white px-4 py-2 text-[13px] font-semibold text-[#3D2E6B] hover:bg-[#EAE7F5]"
              >
                Clear filters
              </button>
            }
          />
        )
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#EAE7F5] bg-white shadow-sm">
          <ul className="divide-y divide-[#F3F1FB]">
            {filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map((row) => (
              <PrescriptionRow
                key={row.doc.id}
                row={row}
                now={now || Date.now()}
                requestOpen={openRequest === row.doc.id}
                onToggleRequest={() => setOpenRequest((v) => (v === row.doc.id ? null : row.doc.id))}
                requestedAgain={!!requestedAgain[row.doc.id]}
                onRequestAgain={() => setRequestedAgain((v) => ({ ...v, [row.doc.id]: true }))}
                onPay={() => setPaying(row)}
              />
            ))}
          </ul>

          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-[#F3F1FB] px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-[12px] px-3 py-1.5 text-[13px] font-semibold text-[#5B4B8A] transition-colors hover:bg-[#F8F7FC] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <p className="text-[12.5px] text-[#6F6889]">
                Page {safePage} of {pageCount} · {filtered.length} record
                {filtered.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage === pageCount}
                className="rounded-[12px] px-3 py-1.5 text-[13px] font-semibold text-[#5B4B8A] transition-colors hover:bg-[#F8F7FC] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

        </>
      )}

      {tab === "medication" && (
        <MedicationList
          onOpenPrescription={(id) => {
            const doc = docs.find((d) => d.id === id);
            if (doc) window.open(prescriptionHref(doc), "_blank", "noopener,noreferrer");
          }}
        />
      )}

      <PrescriptionPaySheet
        open={!!paying}
        reference={paying?.doc.number ?? ""}
        downloadHref={paying ? prescriptionHref(paying.doc, { download: true }) : "#"}
        onClose={() => setPaying(null)}
        onPaid={(promo) => paying && markPaid(paying.doc.id, promo)}
      />
    </section>
  );
}

function PrescriptionRow({
  row,
  now,
  requestOpen,
  onToggleRequest,
  requestedAgain,
  onRequestAgain,
  onPay,
}: {
  row: Row;
  now: number;
  requestOpen: boolean;
  onToggleRequest: () => void;
  requestedAgain: boolean;
  onRequestAgain: () => void;
  onPay: () => void;
}) {
  const { doc, status, payment } = row;
  const locked = status === "awaiting" || status === "expired-unpaid";
  const medNames = doc.medications.map((m) => m.genericName || m.name).filter(Boolean);
  const medCount = `${doc.medications.length} medicine${doc.medications.length === 1 ? "" : "s"}`;
  const includes = locked
    ? medCount
    : medNames.length === 0
      ? "No medication recorded"
      : medNames.length === 1
        ? medNames[0]
        : `${medNames[0]}, ${medNames.length - 1} other${medNames.length - 1 === 1 ? "" : "s"}`;
  const prescriber = doc.identity?.fullName ? `Dr. ${doc.identity.fullName}` : "Not recorded";
  const msLeft = (row.payBy ?? 0) - now;
  const soon = status === "awaiting" && msLeft <= DAY;

  const outline =
    "inline-flex w-full items-center justify-center rounded-xl border border-[#A89BD0] bg-white px-4 py-2 text-sm font-bold text-[#3D2E6B] transition-colors hover:bg-[#EAE7F5] sm:w-auto";
  const filled =
    "inline-flex w-full items-center justify-center rounded-xl bg-[#7E6BAF] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#3D2E6B] sm:w-auto";

  return (
    <li className="p-5 transition-colors hover:bg-[#F8F7FC] sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h5 className="font-display text-[17px] font-semibold text-[#3D2E6B]">Prescription document</h5>
            <span className="rounded border border-[#A89BD0]/20 bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-[#3D2E6B]">
              {doc.number}
            </span>
            <StatusChip status={status} payment={payment} />
            {doc.controlled && !locked ? (
              <span className="rounded-full bg-[#FDF6E7] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B4E10]">
                {doc.country === "PH" ? "Dangerous drug" : "Controlled substance"}
              </span>
            ) : null}
          </div>

          {status === "voided" ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                Signed {formatDate(doc.signedAt)} · Prescriber {prescriber}
              </p>
              <p className="mt-1.5 text-sm text-[#6F6889]">
                This prescription was cancelled and can't be used.
              </p>
            </>
          ) : status === "awaiting" ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                Signed {formatDate(doc.signedAt)} · Prescriber {prescriber}
              </p>
              <p className="mt-1.5 text-sm text-[#6F6889]">
                Pay {FEE_LABEL} to view and download ·{" "}
                <span className={soon ? "font-semibold text-amber-800" : "font-medium text-[#3D2E6B]"}>
                  {soon ? "Expires tomorrow" : `Expires ${formatShort(row.payBy!)}`}
                </span>
                {" · "}
                <span className="font-medium text-[#3D2E6B]">{includes}</span>
              </p>
            </>
          ) : status === "expired-unpaid" ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                Signed {formatDate(doc.signedAt)} · Prescriber {prescriber}
              </p>
              <p className="mt-1.5 text-sm text-[#6F6889]">
                Expired, not paid · No charge · <span className="font-medium text-[#3D2E6B]">{includes}</span>
              </p>
              {requestedAgain && (
                <p className="mt-1.5 text-[13px] font-semibold text-[#2F6B4A]">
                  Open chat to start a new request.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7E6BAF]">
                Issued {formatDate(doc.signedAt)}
              </p>
              <p className="mt-1.5 text-sm text-[#6F6889]">
                Prescriber <span className="font-medium text-[#3D2E6B]">{prescriber}</span>
                {" · "}
                {doc.validityLabel || "Valid until"}{" "}
                <span className="font-medium text-[#3D2E6B]">
                  {doc.validUntil ? formatDate(doc.validUntil) : "—"}
                </span>
                {" · "}
                Includes <span className="font-medium text-[#3D2E6B]">{includes}</span>
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {status === "awaiting" ? (
            <>
              <button type="button" onClick={onToggleRequest} className={outline}>
                {requestOpen ? "Hide request" : "View request"}
              </button>
              <button type="button" onClick={onPay} className={filled}>
                Pay {FEE_LABEL}
              </button>
            </>
          ) : status === "expired-unpaid" ? (
            <button type="button" onClick={onRequestAgain} disabled={requestedAgain} className={`${outline} disabled:opacity-50`}>
              Request again
            </button>
          ) : (
            <>
              <a href={prescriptionHref(doc)} target="_blank" rel="noopener noreferrer" className={outline}>
                View prescription
              </a>
              {status !== "voided" && (
                <a
                  href={prescriptionHref(doc, { download: true })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={filled}
                >
                  Download prescription
                </a>
              )}
            </>
          )}
        </div>
      </div>

      {status === "awaiting" && requestOpen && (
        <div className="mt-4 rounded-xl border border-[#EAE7F5] bg-[#FBF9FF] px-4 py-3 text-[13px] text-[#6F6889]">
          <p className="font-semibold text-[#3D2E6B]">Your request</p>
          <p className="mt-1">{row.requestNote}</p>
          <p className="mt-1">
            Medicine details stay hidden until the fee is paid. If it isn't paid by{" "}
            {formatShort(row.payBy!)}, it expires at no charge.
          </p>
        </div>
      )}
    </li>
  );
}

function StatusChip({ status, payment }: { status: RowStatus; payment: PaymentState }) {
  const base = "rounded-full px-2.5 py-0.5 text-[11px] font-semibold";
  if (status === "awaiting") return <span className={`${base} bg-amber-50 text-amber-800`}>Awaiting payment</span>;
  if (status === "voided") return <span className={`${base} bg-[#F1F0F4] text-[#5F5C6B]`}>Voided</span>;
  if (status === "expired-paid" || status === "expired-unpaid")
    return <span className={`${base} bg-[#F1F0F4] text-[#5F5C6B]`}>Expired</span>;
  return (
    <span className={`${base} bg-[#E7F4EC] text-[#2F6B4A]`}>
      {payment === "promo" ? "Paid (promo)" : "Paid"}
    </span>
  );
}

function EmptyBox({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DCD4F0] bg-white/70 px-5 py-8 text-center">
      <p className="text-[13.5px] font-semibold text-[#3D2E6B]">{title}</p>
      <p className="mt-1 text-[12.5px] text-[#6F6889]">{body}</p>
      {action}
    </div>
  );
}

function formatDate(at: number): string {
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShort(at: number): string {
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
