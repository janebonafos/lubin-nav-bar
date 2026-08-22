import { activeFields, type ProviderRequest } from "@/lib/intake/store";
import { templateById, type IntakeField } from "@/lib/intake/templates";

/**
 * Read-only replica of what the client sees, so providers can check the exact
 * wording, order and input type of every question before it goes out. Inputs are
 * disabled — this is a preview, nothing is saved.
 */
export default function ClientFormPreview({
  request,
  providerLabel,
  templateId,
}: {
  request: ProviderRequest;
  providerLabel: string;
  templateId?: string;
}) {
  const ids = templateId
    ? request.templateIds.filter((id) => id === templateId)
    : request.templateIds;

  const sections = ids
    .map((id) => templateById(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => ({ template: t, fields: activeFields(t, request) }))
    .filter((s) => s.fields.length > 0);

  const total = sections.reduce((sum, s) => sum + s.fields.length, 0);
  const minutes = sections.reduce((sum, s) => sum + s.template.minutes, 0);

  if (sections.length === 0) {
    return (
      <p className="rounded-[12px] bg-[#FFF4E5] px-3 py-2 text-xs text-[#8A5A12]">
        Nothing is ticked yet, so clients won't see a form.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-[#EAE7F5] bg-[#FBF9FF] p-4">
        <p className="text-sm font-semibold text-[#3D2E6B]">
          Help {providerLabel} prepare for your session
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#7E6BAF]">
          These are the details clinicians normally record before a first
          session. Answer what you can — anything you skip can be talked through
          live. About {Math.max(1, minutes)} min · {total} question
          {total === 1 ? "" : "s"}.
        </p>
      </div>

      {sections.map(({ template, fields }) => (
        <div
          key={template.id}
          className="rounded-[12px] border border-[#EAE7F5] bg-white p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A89BD0]">
            {template.group}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#3D2E6B]">
            {template.label}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#7E6BAF]">
            {template.why}
          </p>

          <div className="mt-4 space-y-4">
            {fields.map((f) => (
              <PreviewField key={f.id} field={f} />
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-[11px] text-[#A89BD0]">
        Preview only — nothing here is saved.
      </p>
    </div>
  );
}

function PreviewField({ field }: { field: IntakeField }) {
  return (
    <div>
      <p className="text-sm font-medium text-[#3D2E6B]">{field.label}</p>
      {field.help && (
        <p className="mt-0.5 text-xs text-[#7E6BAF]">{field.help}</p>
      )}

      {field.type === "ack" ? (
        <label className="mt-2 flex items-start gap-2 text-sm text-[#3D2E6B]">
          <input
            type="checkbox"
            disabled
            className="mt-0.5 h-4 w-4 rounded border-[#D8C7F0]"
          />
          <span>Yes, I've read it</span>
        </label>
      ) : field.type === "choice" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => (
            <span
              key={opt}
              className="rounded-[12px] border border-[#D8C7F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D2E6B]"
            >
              {opt}
            </span>
          ))}
        </div>
      ) : field.type === "long-text" ? (
        <textarea
          disabled
          rows={3}
          placeholder={field.placeholder}
          className="mt-2 w-full rounded-[8px] border border-[#EAE7F5] bg-[#FDFCFF] px-3 py-2 text-sm leading-relaxed text-[#3D2E6B] placeholder:text-[#A89BD0]"
        />
      ) : (
        <input
          disabled
          type="text"
          placeholder={
            field.placeholder ??
            (field.type === "date" ? "dd/mm/yyyy" : undefined)
          }
          className="mt-2 w-full rounded-[8px] border border-[#EAE7F5] bg-[#FDFCFF] px-3 py-2 text-sm text-[#3D2E6B] placeholder:text-[#A89BD0]"
        />
      )}

      {field.prefill && (
        <p className="mt-1.5 inline-block rounded-full bg-[#F0EAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5B4796]">
          Prefilled from Health Passport
        </p>
      )}
      <p className="mt-1.5 text-xs text-[#A89BD0]">
        I'd rather talk about this in person
      </p>
    </div>
  );
}
