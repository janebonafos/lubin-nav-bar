// Printable / downloadable Health Passport card (frontend prototype).
// The printed card carries identity essentials and a clearly labelled demo QR
// only — detailed medical information stays in the controlled summary the
// patient shares deliberately.
import { demoQrSvgMarkup } from "@/components/passport/DemoQr";

export type PassportCardData = {
  name: string;
  dob: string;
  passportId: string;
  lastUpdated: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export function passportCardDocument(data: PassportCardData): string {
  const qr = demoQrSvgMarkup(data.passportId, 132, "#3D2E6B");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Lubin Health Passport card — ${escapeHtml(data.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: #F5F2FB; color: #3D2E6B; }
  .card { width: 560px; max-width: 100%; border-radius: 22px; padding: 26px 28px; color: #fff;
          background: linear-gradient(135deg, #3D2E6B 0%, #4A3880 55%, #7E6BAF 100%); }
  .brand { font-size: 12px; font-weight: 800; font-style: italic; text-transform: uppercase; letter-spacing: .02em; }
  .brand small { display: block; font-style: normal; font-weight: 500; letter-spacing: .2em; font-size: 8px; opacity: .6; }
  .row { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
  .name { margin: 22px 0 2px; font-size: 24px; font-weight: 600; }
  .eyebrow { font-size: 9px; letter-spacing: .18em; text-transform: uppercase; opacity: .55; }
  .grid { display: flex; gap: 28px; margin-top: 18px; border-top: 1px solid rgba(255,255,255,.16); padding-top: 14px; }
  .grid div p { margin: 3px 0 0; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .06em; }
  .qr { background: #fff; border-radius: 12px; padding: 8px; text-align: center; }
  .qr span { display: block; margin-top: 4px; font-size: 8px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #7E6BAF; }
  .notes { width: 560px; max-width: 100%; margin-top: 18px; font-size: 11.5px; line-height: 1.6; color: rgba(61,46,107,.7); }
  @media print { body { background: #fff; padding: 0; } .notes { color: #555; } }
</style></head>
<body>
  <div class="card">
    <div class="row">
      <div class="brand">Lubin<small>Health Network</small></div>
      <div class="qr">${qr}<span>Demo QR</span></div>
    </div>
    <p class="eyebrow">Cardholder</p>
    <div class="name">${escapeHtml(data.name || "Your name")}</div>
    <div class="grid">
      <div><p class="eyebrow">Date of birth</p><p>${escapeHtml(data.dob || "—")}</p></div>
      <div><p class="eyebrow">Passport ID</p><p>${escapeHtml(data.passportId)}</p></div>
      <div><p class="eyebrow">Last updated</p><p>${escapeHtml(data.lastUpdated)}</p></div>
    </div>
  </div>
  <div class="notes">
    Patient-provided information. Medical details such as medications, allergies and conditions
    are not printed here — they are shared through the summary the cardholder chooses to share.
    The QR block is a demo placeholder in this prototype and is not scannable.
  </div>
</body></html>`;
}

export function printPassportCard(data: PassportCardData): void {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=760,height=720");
  if (!win) return;
  win.document.write(passportCardDocument(data));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

export function downloadPassportCard(data: PassportCardData): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([passportCardDocument(data)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lubin-health-passport-${data.passportId}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
