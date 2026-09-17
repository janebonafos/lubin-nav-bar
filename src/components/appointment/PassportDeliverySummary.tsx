type DeliverySummaryProps = {
  clientLabel: string;
  publishedAt?: number;
  hasVisitSummary: boolean;
  attachmentCount: number;
  resourceCount: number;
  prescriptionStatus: "none" | "pending" | "issued";
  appointmentCompleted?: boolean;
};

function formatSharedAt(at: number) {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PassportDeliverySummary({
  clientLabel,
  publishedAt,
  hasVisitSummary,
  attachmentCount,
  resourceCount,
  prescriptionStatus,
  appointmentCompleted = false,
}: DeliverySummaryProps) {
  const shared = Boolean(publishedAt);

  return (
    <section className="rounded-[12px] border border-brand-lavender bg-card px-4 py-4 font-body">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-purple">
        {shared
          ? "Shared to the client’s Health Passport"
          : "These will appear in the client’s Health Passport after you share them"}
      </p>
      {publishedAt && (
        <p className="mt-1 text-[11.5px] font-medium text-brand-navy/60">{formatSharedAt(publishedAt)}</p>
      )}

      <div className="mt-3 divide-y divide-brand-lavender/70">
        <DeliveryRow
          label="Visit summary"
          value={hasVisitSummary ? (shared ? "Shared" : "Ready to share") : "No visit summary shared"}
        />
        <DeliveryRow
          label="Visit documents"
          value={attachmentCount ? `${attachmentCount} document${attachmentCount === 1 ? "" : "s"}` : "No documents"}
        />
        <DeliveryRow
          label="Follow-up resources"
          value={resourceCount ? `${resourceCount} resource${resourceCount === 1 ? "" : "s"}` : "No resources"}
        />
        <DeliveryRow
          label="Lubin visit entry"
          value={appointmentCompleted ? "Added as a completed visit" : "Added when the appointment is completed"}
        />
      </div>

      <div className="mt-3 rounded-[10px] bg-secondary px-3 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-purple">Prescription · separate record</p>
        <p className="mt-1 text-[12.5px] text-brand-navy/75">
          {prescriptionStatus === "issued"
            ? `Already issued to ${clientLabel}; it is not dependent on sharing the visit summary.`
            : prescriptionStatus === "pending"
              ? "Not issued yet; signing and delivery stay in the prescription step."
              : "No prescription is being added from this appointment."}
        </p>
      </div>
    </section>
  );
}

function DeliveryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <span className="text-[12.5px] font-semibold text-brand-purple-dark">{label}</span>
      <span className="text-right text-[12px] text-brand-navy/65">{value}</span>
    </div>
  );
}