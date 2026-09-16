// Printable / downloadable health summary (frontend prototype).
// Different purpose from the identity card: this sheet carries the health
// information the patient chose to keep in their Health Passport — contacts,
// medications, allergies and relevant history — for clinics that cannot scan.
// It is a patient-provided reference, never a replacement for a clinic's form.
import {
  HEALTH_DETAIL_GROUPS,
  type HealthDetails,
} from "@/lib/intake/healthDetails";

export type SummarySection = {
  label: string;
  rows: { label: string; values: string[]; answered: boolean }[];
};

export type HealthSummaryData = {
  name: string;
  dob: string;
  passportId: string;
  lastUpdated: string;
  sections: SummarySection[];
};

/** Split list-style answers ("a, b; c") into separate lines. */
function splitValue(value: string, type: string): string[] {
  if (!value) return [];
  if (type === "tags" || type === "meds" || value.includes(";")) {
    return value
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [value];
}

/**
 * Everything the patient added, grouped as on the card back. Health and care
 * sections keep unanswered rows so a blank reads as "Not answered" rather than
 * as "no allergy" or "no medication".
 */
export function buildSummarySections(details: HealthDetails): SummarySection[] {
  return HEALTH_DETAIL_GROUPS.map((group) => {
    const rows = group.fields
      .map((field) => {
        const value = (details[field.id] ?? "").trim();
        return { field, value };
      })
      .filter(
        ({ value }) => value.length > 0 || group.id === "health" || group.id === "care",
      )
      .map(({ field, value }) => ({
        label: field.label,
        answered: value.length > 0,
        values: value ? splitValue(value, field.type) : ["Not answered"],
      }));

    if (group.id === "safety-net" && details["emergency.none"]?.trim()) {
      rows.unshift({
        label: "Emergency contact",
        answered: true,
        values: [details["emergency.none"].trim()],
      });
    }

    return { label: group.label, rows };
  }).filter((section) => section.rows.length > 0);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export function healthSummaryDocument(data: HealthSummaryData): string {
  const sections = data.sections
    .map(
      (section) => `
    <section>
      <h2>${escapeHtml(section.label)}</h2>
      <dl>
        ${section.rows
          .map(
            (row) => `<div class="row">
          <dt>${escapeHtml(row.label)}</dt>
          <dd class="${row.answered ? "" : "blank"}">${row.values
            .map((v) => `<span>${escapeHtml(v)}</span>`)
            .join("")}</dd>
        </div>`,
          )
          .join("")}
      </dl>
    </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Lubin health summary — ${escapeHtml(data.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 34px; background: #F5F2FB; color: #2C2B4B;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
  .sheet { width: 700px; max-width: 100%; margin: 0 auto; background: #fff; border-radius: 20px;
           padding: 30px 32px 26px; box-shadow: 0 18px 50px -30px rgba(61,46,107,.5); }
  .head { border-bottom: 1px solid rgba(61,46,107,.12); padding-bottom: 16px; }
  .brand { font-size: 11px; font-weight: 800; font-style: italic; letter-spacing: .02em; text-transform: uppercase; color: #7E6BAF; }
  h1 { margin: 10px 0 2px; font-size: 21px; font-weight: 600; color: #3D2E6B; }
  .meta { display: flex; flex-wrap: wrap; gap: 22px; margin-top: 12px; }
  .meta div p { margin: 3px 0 0; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .05em; }
  .eyebrow { margin: 0; font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: rgba(61,46,107,.5); }
  section { margin-top: 22px; page-break-inside: avoid; }
  h2 { margin: 0 0 8px; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #7E6BAF; }
  dl { margin: 0; border-top: 1px solid rgba(61,46,107,.08); }
  .row { display: flex; gap: 18px; padding: 8px 0; border-bottom: 1px solid rgba(61,46,107,.08); }
  dt { width: 38%; flex: 0 0 auto; margin: 0; font-size: 12px; color: rgba(44,43,75,.6); }
  dd { flex: 1; margin: 0; font-size: 12.5px; font-weight: 500; }
  dd span { display: block; }
  dd.blank { font-style: italic; font-weight: 400; color: rgba(44,43,75,.45); }
  .notes { width: 700px; max-width: 100%; margin: 18px auto 0; font-size: 11.5px; line-height: 1.6; color: rgba(61,46,107,.7); }
  @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; border-radius: 0; } .notes { color: #555; } }
</style></head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand">LUBIN.AI Health Network</div>
      <h1>Health summary — ${escapeHtml(data.name || "Your name")}</h1>
      <div class="meta">
        <div><p class="eyebrow">Date of birth</p><p>${escapeHtml(data.dob || "—")}</p></div>
        <div><p class="eyebrow">Passport ID</p><p>${escapeHtml(data.passportId)}</p></div>
        <div><p class="eyebrow">Last updated</p><p>${escapeHtml(data.lastUpdated)}</p></div>
      </div>
    </div>
    ${sections || '<section><p class="notes" style="margin:16px 0 0">Nothing has been added to this Health Passport yet.</p></section>'}
  </div>
  <div class="notes">
    Patient-provided information, shared by the cardholder for reference. It has not been verified
    by a clinician and a clinic may still ask you to complete its own form.
    Blank answers mean "not answered", not "none".
  </div>
</body></html>`;
}

export function printHealthSummary(data: HealthSummaryData): void {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=820,height=900");
  if (!win) return;
  win.document.write(healthSummaryDocument(data));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

export function downloadHealthSummary(data: HealthSummaryData): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([healthSummaryDocument(data)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lubin-health-summary-${data.passportId}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
