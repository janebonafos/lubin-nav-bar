import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import PassportEmptyState from "./PassportEmptyState";

import {
  allRecords,
  fileSizeLabel,
  formatRecordDate,
  recordSourceLabel,
  recordReviewLabel,
  canPatientEdit,
  RECORD_TYPES,
  recordTypeLabel,
  removeUploadedRecord,
  saveUploadedRecord,
  subscribeRecords,
  type PassportRecord,
  type RecordType,
} from "@/lib/passport/records";
import { PASSPORT_VISITS } from "@/lib/passport/visits";


/** Records and results kept in the Health Passport. Prototype design only. */
export default function RecordsSection({
  forceEmpty = false,
  onOpenVisits,
}: {
  forceEmpty?: boolean;
  onOpenVisits?: (visitId: string) => void;
}) {
  const [records, setRecords] = useState<PassportRecord[]>([]);
  const [filter, setFilter] = useState<RecordType | "all">("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewing, setViewing] = useState<PassportRecord | null>(null);

  useEffect(() => {
    const read = () => setRecords(allRecords());
    read();
    return subscribeRecords(read);
  }, []);

  const counts = useMemo(() => {
    const map = new Map<RecordType, number>();
    for (const r of records) map.set(r.type, (map.get(r.type) ?? 0) + 1);
    return map;
  }, [records]);

  const visible = filter === "all" ? records : records.filter((r) => r.type === filter);

  if (forceEmpty) {
    return (
      <section
        className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8"
        aria-label="Records and results"
      >
        <PassportEmptyState
          eyebrow="Records and results"
          title="No records yet"
          description="Lab results, imaging, vaccinations, referrals, and discharge summaries live here. Upload documents from outside Lubin, or records shared by a clinic appear automatically when linked to a visit."
          action={{ label: "Add a record", onClick: () => setUploadOpen(true) }}
        />
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border border-[#E3DBF5]/60 bg-[#FBF9FF]/90 p-6 shadow-md shadow-[#3D2E6B]/5 backdrop-blur-xl sm:p-8"
      aria-label="Records and results"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h3 className="text-[15px] font-bold text-[#3D2E6B]">Records and results</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6F6889]">
            Lab results, imaging, vaccinations, referrals, discharge summaries and any other
            document you want to bring to your next visit. Add records from outside Lubin so
            everything is in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen((v) => !v)}
          className="inline-flex h-10 items-center rounded-xl bg-[#3D2E6B] px-4 text-[13px] font-semibold text-white transition hover:bg-[#33265A]"
        >
          Add a record
        </button>
      </div>

      {uploadOpen && (
        <UploadPanel
          onClose={() => setUploadOpen(false)}
          onSaved={(record) => {
            setUploadOpen(false);
            toast.success(`${recordTypeLabel(record.type)} added to your passport`);
          }}
        />
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All records ({records.length})
        </Chip>
        {RECORD_TYPES.map((type) => (
          <Chip
            key={type.id}
            active={filter === type.id}
            onClick={() => setFilter(type.id)}
          >
            {type.label} ({counts.get(type.id) ?? 0})
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          type={filter === "all" ? undefined : filter}
          onAdd={() => setUploadOpen(true)}
        />
      ) : (
        <ul className="mt-5 space-y-3">
          {visible.map((record) => (
            <RecordRow
              key={record.id}
              record={record}
              onOpenVisits={onOpenVisits}
              onViewFile={record.fileName ? () => setViewing(record) : undefined}
            />
          ))}
        </ul>
      )}
      {viewing ? <DocumentViewer record={viewing} onClose={() => setViewing(null)} /> : null}
    </section>
  );
}

/** Prototype document preview: shows the real uploaded file when available,
 * otherwise a demo placeholder page for fictional records. */
function DocumentViewer({ record, onClose }: { record: PassportRecord; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-[#2C2B4B]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${record.fileName ?? record.title} preview`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#E3DBF5] px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-bold text-[#2C2B4B]">
              {record.fileName ?? record.title}
            </p>
            <p className="text-[11.5px] text-[#8A7FB0]">
              {record.fileSizeLabel ? `${record.fileSizeLabel} · ` : ""}
              {formatRecordDate(record.date)} · {record.source}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-lg p-1.5 text-[#8A7FB0] transition hover:bg-[#F6F4FC] hover:text-[#3D2E6B]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#F6F4FC] p-5">
          {record.fileDataUrl && record.fileMime?.startsWith("image/") ? (
            <img
              src={record.fileDataUrl}
              alt={record.title}
              className="mx-auto max-h-[60vh] rounded-xl border border-[#E3DBF5] bg-white"
            />
          ) : record.fileDataUrl ? (
            <iframe
              src={record.fileDataUrl}
              title={record.fileName ?? record.title}
              className="h-[60vh] w-full rounded-xl border border-[#E3DBF5] bg-white"
            />
          ) : (
            <div className="mx-auto max-w-md rounded-xl border border-[#E3DBF5] bg-white px-8 py-10 shadow-sm">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#A79BC7]">
                Demo document
              </p>
              <p className="mt-2 text-[16px] font-bold text-[#2C2B4B]">{record.title}</p>
              <p className="mt-1 text-[12.5px] text-[#6F6889]">
                {formatRecordDate(record.date)} · {record.source}
              </p>
              {record.summary ? (
                <p className="mt-4 text-[13px] leading-relaxed text-[#4B4570]">{record.summary}</p>
              ) : null}
              <p className="mt-6 border-t border-dashed border-[#DCD4F0] pt-3 text-[11.5px] italic text-[#8A7FB0]">
                Prototype preview — the real {record.fileName ?? "file"} would open here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordRow({
  record,
  onOpenVisits,
  onViewFile,
}: {
  record: PassportRecord;
  onOpenVisits?: (visitId: string) => void;
  onViewFile?: () => void;
}) {
  return (
    <li className="rounded-2xl border border-[#E3DBF5]/70 bg-white p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-bold text-[#2C2B4B]">{record.title}</p>
            <span className="rounded-[10px] bg-[#F3F0FA] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#5B4B8A]">
              {recordTypeLabel(record.type)}
            </span>
            <span
              className={`rounded-[10px] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ${
                record.origin === "uploaded"
                  ? "border border-[#DCD4F0] bg-white text-[#5B4B8A]"
                  : "bg-[#EAF6EF] text-[#256B47]"
              }`}
            >
              {record.origin === "uploaded" ? "Your upload" : "Care team"}
            </span>
            {recordReviewLabel(record) ? (
              <span className="rounded-[10px] bg-[#EAF6EF] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#256B47]">
                Clinician-reviewed
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[12.5px] text-[#6F6889]">
            {formatRecordDate(record.date)} · {record.source}
          </p>
          <p className="mt-0.5 text-[12px] text-[#8A7FB0]">
            {recordSourceLabel(record)}
            {recordReviewLabel(record) ? ` · ${recordReviewLabel(record)}` : ""}
            {record.authoredByClinician ? " · Written by your clinician, so it stays as recorded" : ""}
          </p>
          {record.summary ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#4B4570]">{record.summary}</p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#8A7FB0]">
            {record.fileName ? (
              <button
                type="button"
                onClick={onViewFile}
                className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#DCD4F0] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#5B4B8A] transition hover:bg-[#F6F4FC]"
              >
                {record.fileName}
                {record.fileSizeLabel ? ` · ${record.fileSizeLabel}` : ""}
                <span className="text-[#7E6BAF] underline underline-offset-2">View</span>
              </button>
            ) : null}
            {record.visitId ? (
              <button
                type="button"
                onClick={() => onOpenVisits?.(record.visitId!)}
                className="font-semibold text-[#3D2E6B] hover:text-[#7E6BAF]"
              >
                {record.visitLabel ?? "Related visit"}
              </button>
            ) : (
              <span className="italic">No related visit recorded</span>
            )}
          </div>
        </div>
        {canPatientEdit(record) && record.addedAt ? (
          <button
            type="button"
            onClick={() => {
              removeUploadedRecord(record.id);
              toast.success("Record removed from your passport");
            }}
            className="inline-flex h-8 items-center rounded-xl border border-[#DCD4F0] bg-white px-2.5 text-[12px] font-semibold text-[#5B4B8A] transition hover:bg-[#F6F4FC]"
          >
            Remove
          </button>
        ) : null}
      </div>
    </li>
  );
}

function UploadPanel({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (record: PassportRecord) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<RecordType>("lab");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [source, setSource] = useState("");
  const [visitId, setVisitId] = useState("");
  const [file, setFile] = useState<{ name: string; size: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const completedVisits = PASSPORT_VISITS.filter((v) => v.kind === "completed");
  const ready = Boolean(title.trim() && date && source.trim());

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile({ name: f.name, size: fileSizeLabel(f.size) });
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
  };

  return (
    <div className="mt-5 rounded-2xl border border-[#DCD4F0] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13.5px] font-bold text-[#3D2E6B]">Add a record from outside Lubin</p>
          <p className="mt-0.5 text-[12.5px] text-[#6F6889]">
            Photos or PDFs work. Only you can see it until you choose to share it.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1 text-[#8A7FB0] transition hover:bg-[#F6F4FC] hover:text-[#3D2E6B]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={`mt-4 flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed px-5 py-7 text-center transition ${
          dragging ? "border-[#7E6BAF] bg-[#F3F0FA]" : "border-[#DCD4F0] bg-[#FBF9FF]/70 hover:bg-[#F6F4FC]"
        }`}
      >
        {file ? (
          <>
            <span className="text-[13px] font-semibold text-[#3D2E6B]">{file.name}</span>
            <span className="text-[12px] text-[#8A7FB0]">{file.size} · Tap to replace</span>
          </>
        ) : (
          <>
            <span className="text-[13px] font-semibold text-[#3D2E6B]">
              Drop a file here or tap to choose
            </span>
            <span className="text-[12px] text-[#8A7FB0]">PDF, JPG or PNG</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? undefined)}
      />

      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7E6BAF]">
        Record type
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {RECORD_TYPES.map((t) => (
          <Chip key={t.id} active={type === t.id} onClick={() => setType(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>
      <p className="mt-1.5 text-[12px] text-[#8A7FB0]">
        {RECORD_TYPES.find((t) => t.id === type)?.blurb}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="What is this record?">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fasting blood sugar"
            className={inputClass}
          />
        </Field>
        <Field label="Document date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Clinic, laboratory or source">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Mercy Family Clinic"
            className={inputClass}
          />
        </Field>
        <Field label="Related visit (optional)">
          <select value={visitId} onChange={(e) => setVisitId(e.target.value)} className={inputClass}>
            <option value="">Not related to a visit</option>
            {completedVisits.map((v) => (
              <option key={v.id} value={v.id}>
                {v.reason} · {formatRecordDate(v.date)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            const visit = completedVisits.find((v) => v.id === visitId);
            const saved = saveUploadedRecord({
              type,
              title: title.trim(),
              date,
              source: source.trim(),
              visitId: visit?.id,
              visitLabel: visit ? `${visit.reason} · ${formatRecordDate(visit.date)}` : undefined,
              fileName: file?.name,
              fileSizeLabel: file?.size,
            });
            onSaved(saved);
          }}
          className="inline-flex h-10 items-center rounded-xl bg-[#3D2E6B] px-4 text-[13px] font-semibold text-white transition hover:bg-[#33265A] disabled:cursor-not-allowed disabled:bg-[#C9C0E4]"
        >
          Save to my passport
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center rounded-xl border border-[#DCD4F0] bg-white px-4 text-[13px] font-semibold text-[#3D2E6B] transition hover:bg-[#F6F4FC]"
        >
          Cancel
        </button>
        {!ready ? (
          <span className="text-[12px] text-[#8A7FB0]">
            Add what the record is, its date and where it came from.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ type, onAdd }: { type?: RecordType; onAdd: () => void }) {
  return (
      <div className="mt-5 rounded-2xl border border-dashed border-[#DCD4F0] bg-white/70 px-5 py-10 text-center">
      <p className="mt-3 text-[13.5px] font-semibold text-[#3D2E6B]">
        {type ? `No ${recordTypeLabel(type).toLowerCase()} yet` : "No records yet"}
      </p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-[#6F6889]">
        Results your care team sends through Lubin appear here automatically. You can also add a
        record from another clinic or laboratory so you have it ready at your next visit.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#3D2E6B] px-4 text-[13px] font-semibold text-white transition hover:bg-[#33265A]"
      >
        Add a record
      </button>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-[#DCD4F0] bg-white px-3 text-[13px] text-[#2C2B4B] outline-none transition focus:border-[#7E6BAF]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#A79BC7]">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center rounded-[12px] px-3 text-[12.5px] font-semibold transition ${
        active
          ? "bg-[#5B4A93] text-white shadow-sm"
          : "border border-[#DCD4F0] bg-white text-[#5B4B8A] hover:bg-[#F6F4FC]"
      }`}
    >
      {children}
    </button>
  );
}
