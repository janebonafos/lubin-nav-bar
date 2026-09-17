// Real PDF output for the Health Passport downloads (frontend prototype).
// Two separate documents, matching the two separate purposes:
//   - Identification card: name, date of birth, Passport ID, dates, Demo QR.
//   - Health summary: the health information the patient added.
// Medical information never appears on the card.
import { demoQrModules } from "@/components/passport/DemoQr";
import type { PassportCardData } from "./printCard";
import type { HealthSummaryData } from "./printSummary";

const PURPLE = [61, 46, 107] as const;
const LAVENDER = [126, 107, 175] as const;
const INK = [44, 43, 75] as const;

// jsPDF is loaded from a CDN at click time. Bundling it (even behind a dynamic
// import) pulls its embedded fonts into the server build and exhausts the build
// heap, so it is deliberately kept out of the bundle graph.
const JSPDF_URL = "https://esm.sh/jspdf@4.2.1";

type Doc = {
  internal: { pageSize: { getWidth(): number; getHeight(): number } };
  setFillColor(r: number, g: number, b: number): void;
  setTextColor(r: number, g: number, b: number): void;
  setDrawColor(r: number, g: number, b: number): void;
  setLineWidth(w: number): void;
  setFont(name: string, style: string): void;
  setFontSize(size: number): void;
  text(text: string | string[], x: number, y: number, options?: Record<string, unknown>): void;
  rect(x: number, y: number, w: number, h: number, style?: string): void;
  roundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    rx: number,
    ry: number,
    style?: string,
  ): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  splitTextToSize(text: string, width: number): string[];
  addPage(): void;
  setPage(page: number): void;
  getNumberOfPages(): number;
  save(filename: string): void;
};

async function newDoc(orientation: "p" | "l" = "p"): Promise<Doc> {
  const mod = (await import(/* @vite-ignore */ JSPDF_URL)) as {
    jsPDF: new (o: Record<string, unknown>) => Doc;
  };
  return new mod.jsPDF({ orientation, unit: "pt", format: "a4" });
}

function saveAs(doc: Doc, filename: string) {
  doc.save(filename);
}

/** Draw the decorative demo QR as vector squares. */
function drawDemoQr(doc: Doc, seed: string, x: number, y: number, size: number, light = false) {
  const grid = 21;
  const cell = size / grid;
  if (light) doc.setFillColor(255, 255, 255);
  else doc.setFillColor(PURPLE[0], PURPLE[1], PURPLE[2]);
  for (const [mx, my] of demoQrModules(seed)) {
    doc.rect(x + mx * cell, y + my * cell, cell, cell, "F");
  }
}

/* ----------------------------- Identification card ----------------------------- */

export async function downloadPassportCardPdf(data: PassportCardData) {
  const doc = await newDoc("l");
  const pageW = doc.internal.pageSize.getWidth();

  const cardW = 460;
  const cardH = 244;
  const x = (pageW - cardW) / 2;
  const y = 60;

  doc.setFillColor(PURPLE[0], PURPLE[1], PURPLE[2]);
  doc.roundedRect(x, y, cardW, cardH, 16, 16, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(12);
  doc.text("LUBIN.AI", x + 26, y + 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("HEALTH NETWORK", x + 26, y + 46);

  const qrSize = 96;
  drawDemoQr(doc, data.passportId, x + cardW - 26 - qrSize, y + 24, qrSize, true);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("DEMO QR", x + cardW - 26 - qrSize / 2, y + 24 + qrSize + 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("CARDHOLDER", x + 26, y + 128);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(22);
  doc.text(data.name || "Your name", x + 26, y + 152);

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(x + 26, y + 178, x + cardW - 26, y + 178);

  const fields: [string, string][] = [
    ["DATE OF BIRTH", data.dob || "—"],
    ["PASSPORT ID", data.passportId],
    ["JOINED LUBIN", data.joinedLubin || "—"],
    ["LAST UPDATED", data.lastUpdated],
  ];
  const colW = (cardW - 52) / fields.length;
  fields.forEach(([label, value], i) => {
    const cx = x + 26 + i * colW;
    doc.setFontSize(7);
    doc.text(label, cx, y + 200);
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(value, cx, y + 216);
    doc.setFont("helvetica", "normal");
  });

  doc.setTextColor(LAVENDER[0], LAVENDER[1], LAVENDER[2]);
  doc.setFontSize(9);
  const notes = doc.splitTextToSize(
    "Identification only. Medications, allergies and conditions are not printed here — they are in the separate health summary the cardholder chooses to share. The QR block is a demo placeholder in this prototype and is not scannable.",
    cardW,
  );
  doc.text(notes, x, y + cardH + 26);

  saveAs(doc, `lubin-health-passport-card-${data.passportId}.pdf`);
}

/* ------------------------------- Health summary ------------------------------- */

export async function downloadHealthSummaryPdf(data: HealthSummaryData) {
  const doc = await newDoc("p");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageH - margin - 40) return;
    doc.addPage();
    y = margin;
  };

  doc.setTextColor(LAVENDER[0], LAVENDER[1], LAVENDER[2]);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(10);
  doc.text("LUBIN.AI HEALTH NETWORK", margin, y);
  y += 22;

  doc.setTextColor(PURPLE[0], PURPLE[1], PURPLE[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);
  doc.text(`Health summary — ${data.name || "Your name"}`, margin, y);
  y += 22;

  doc.setFontSize(8);
  const meta: [string, string][] = [
    ["DATE OF BIRTH", data.dob || "—"],
    ["PASSPORT ID", data.passportId],
    ["LAST UPDATED", data.lastUpdated],
  ];
  meta.forEach(([label, value], i) => {
    const cx = margin + i * (contentW / 3);
    doc.setTextColor(LAVENDER[0], LAVENDER[1], LAVENDER[2]);
    doc.setFontSize(7.5);
    doc.text(label, cx, y);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(value, cx, y + 13);
    doc.setFont("helvetica", "normal");
  });
  y += 30;

  doc.setDrawColor(220, 214, 238);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  if (!data.sections.length) {
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.setFontSize(11);
    doc.text("Nothing has been added to this Health Passport yet.", margin, y);
    y += 20;
  }

  for (const section of data.sections) {
    ensureSpace(46);
    doc.setTextColor(LAVENDER[0], LAVENDER[1], LAVENDER[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(section.label.toUpperCase(), margin, y);
    y += 12;
    doc.setDrawColor(230, 226, 243);
    doc.line(margin, y, pageW - margin, y);
    y += 12;

    for (const row of section.rows) {
      const labelW = contentW * 0.36;
      const valueW = contentW - labelW - 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const labelLines = doc.splitTextToSize(row.label, labelW);
      const valueLines = row.values.flatMap((v) => doc.splitTextToSize(v, valueW) as string[]);
      const blockH = Math.max(labelLines.length, valueLines.length) * 13 + 8;
      ensureSpace(blockH + 6);

      doc.setTextColor(120, 116, 150);
      doc.text(labelLines, margin, y + 10);
      if (row.answered) {
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(150, 146, 175);
        doc.setFont("helvetica", "italic");
      }
      doc.text(valueLines, margin + labelW + 12, y + 10);
      doc.setFont("helvetica", "normal");

      y += blockH;
      doc.setDrawColor(238, 235, 248);
      doc.line(margin, y - 4, pageW - margin, y - 4);
    }
    y += 14;
  }

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setTextColor(130, 124, 160);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const footer = doc.splitTextToSize(
      'Patient-provided information, shared by the cardholder for reference. It has not been verified by a clinician and a clinic may still ask you to complete its own form. Blank answers mean "not answered", not "none".',
      contentW,
    );
    doc.text(footer, margin, pageH - margin - 18);
    doc.text(`${p} / ${total}`, pageW - margin, pageH - margin + 4, { align: "right" });
  }

  saveAs(doc, `lubin-health-summary-${data.passportId}.pdf`);
}
