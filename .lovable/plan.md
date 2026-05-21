# Share My Summary — Implementation Plan

A multi-part feature: a new "Share" tab in My Health Passport, a 3-step consent modal, a share-options modal (PDF / link / email) with passcode sub-flow, a localStorage share persistence layer, and public recipient pages at `/share/$token` (plus a `/share/preview` route for design QA).

## 1. Share persistence layer

New file: `src/lib/share/shareStore.ts`

- Types: `RecipientId = "therapist" | "psychiatrist" | "counselor" | "doctor" | "other-mhp" | "trusted"`
- `SharePayload` exactly as spec'd (token, pin, recipient, includedKeys, createdAt, expiresAt, revoked?).
- `createShare(input)` — 10-char URL-safe token from alphabet `abcdefghijkmnpqrstuvwxyz23456789`, sets `expiresAt = createdAt + 30 days`.
- `getShare(token)` — returns payload or null; null when revoked or expired.
- `buildShareUrl(token)` — `${window.location.origin}/share/${token}`.
- Saved PIN helpers in `src/lib/share/savedPin.ts`: `getSavedPin / setSavedPin / clearSavedPin`, validating `^\d{4}$`. Key: `lubin.savedPin.v1`. Shares key: `lubin.shares.v1`. All reads/writes wrapped in try/catch.

## 2. Share summary data assembly

New file: `src/lib/share/summary.ts`

- `buildSummary(range: "latest" | "30d" | "90d")` reads existing localStorage:
  - mood check-ins (existing CheckIn store in `my-health-passport.tsx`)
  - completed pattern attempts via `loadAttempts()`
- Returns: date span string, plain-language insight (rule-based on mood trend + recent topics), mood/stress/direction chips, theme tag counts, support stats (resources count from existing store if available, check-in count, appointments count if tracked — fall back to 0).
- Pure functions, SSR-safe (guard `window`).

## 3. Share tab in Passport

Edit `src/routes/my-health-passport.tsx`:

- Add third tab `"Share"` alongside Today / Patterns.
- New component `ShareTabView` rendering:
  - Header + subcopy as spec'd.
  - Empty state when no attempts and no check-ins (or guest): blurred ghost card + "Start your first check-in →" CTA to `/check-in`.
  - Pill toggle for range (Latest / 30d default / 90d) + 📅 date span line.
  - Document-style preview card: lavender gradient header band with user name + range, "How you've been feeling" gradient panel, supporting chips (Mood / Stress / Direction), "What's been coming up most" theme tags with counts, "Support & care" stats list, footer with range + 🔒 User-owned chip.
  - Lavender review banner (👁 Review this summary before sharing…).
  - Action buttons: "Download Summary" (white) and "Share with a provider" (purple gradient).
  - Footnote line.
- Guest gate: if no user (existing auth check in passport), Download and Share open the existing AuthModal in signup mode with the spec'd headline.

User name: pull from existing auth/profile if accessible in this file; fallback "You".

## 4. 3-step consent modal

New component: `src/components/share/ShareConsentModal.tsx`

- Centered modal desktop, full-sheet mobile (`md:` breakpoint).
- Top progress bar `Step X of 3`. ESC closes (key listener + backdrop click).
- Step 1 — Included checklist (5 items pre-checked, Select all / Deselect all, disabled rows with "Nothing to share yet." when data missing, warning when empty). Read-only "Always stays private" card. Assessment-context variant: optional `assessmentContext?: { id, label }` prop — when present only "Assessment results" is pre-checked and relabelled.
- Step 2 — Radio recipient list (6 options w/ emoji + description). "Someone I trust" gets the subtext line.
- Step 3 — Consent body + Confirm button.
- Calls `onConfirm({ includedKeys, recipient })` which opens the Share Options modal.

## 5. Share options modal

New component: `src/components/share/ShareOptionsModal.tsx`

- Header: ✅ Consent confirmed chip, back arrow (returns to consent step 3), close.
- Title + subtitle, three option cards:
  - **PDF** — calls `prepareSharePdf()` (toast: "Preparing PDF…" then "PDF ready" using existing toast system). Implementation: client-side print to PDF via `window.print()` of a hidden print-only summary template, or simple data-URL download of a basic HTML/PDF placeholder. Keep simple: render summary into a hidden printable div and trigger `window.print()`.
  - **Link** — sub-flow:
    1. Passcode choice screen (Add passcode [Recommended] / No passcode w/ warning).
    2. Set passcode screen — two 4-digit inputs, validation. If saved PIN exists, show "Using your saved passcode •••• [Change]" plus "Or share without passcode" link.
    3. Result screen — `createShare(...)` returns token, show copyable URL (`buildShareUrl`), copy button with "Link copied" toast, open-in-new-tab, 30-day note.
  - **Email** — email field (regex), reuse saved PIN if any, on submit create share + open `mailto:` with subject/body per recipient. Clinical body addresses role; trusted body warm. Confirmation screen after.
- Footnote: "Your provider will only see what you selected in step 1."

Component split: each option has its own subcomponent file under `src/components/share/` to keep files <300 lines.

## 6. Recipient pages

New route files:

- `src/routes/share.$token.tsx` — resolves token via `getShare`. If null/expired/revoked → friendly "Link expired or revoked" view. If `pin` set, render PIN entry gate (4 inputs, matches stored pin). Once unlocked, render the appropriate report based on `recipient`:
  - `trusted` → `<TrustedContactReport />`
  - all others → `<TherapistReport />` (passing recipient label)
  - Only render sections matching `includedKeys`.
- `src/routes/share.preview.tsx` — reads `?recipient=` search param via zod validator, renders the matching report with mock data so no token needed.

New components in `src/components/share/reports/`:
- `TrustedContactReport.tsx` — warm, plain-language.
- `TherapistReport.tsx` — clinical/structured layout, recipient-aware heading.
- `ReportSections.tsx` — shared section primitives (Mood patterns, Key topics, Assessment results, Check-in count, General feeling summary, plus the "Always private" notice in the footer for clarity).

## 7. Design tokens

Add (or confirm) in `src/styles.css` the spec'd colors as CSS variables under `:root` (oklch where possible, hex fallback comments):

- `--share-primary: #7E6BAF`
- `--share-primary-hover: #6A5A98`
- `--share-text-deep: #3D2E6B`
- `--share-text-muted: #5A4A8A`
- `--share-surface-1: #FAF8FD` / `-2: #F4F0FB` / `-3: #ECE7F6` / `-4: #EDE9FE`
- `--share-accent-green-bg: #DCFCE7` / `-fg: #166534`
- `--share-warning: #B45309`

Buttons use pill rounded-full, gradient header bands, soft purple shadows `0 30px 80px -20px rgba(126,107,175,0.45)`.

## 8. Out of scope (this pass)

- No backend persistence — share payloads live in localStorage per device. Recipient pages will only work on the same device unless we later add a Cloud-backed share table. Spec did not request backend; we'll note this in the result screen so users understand the link is device-local.
- No real PDF generation library — using `window.print()` of a styled hidden template. We can swap for `pdf-lib` later if requested.
- No real email send — uses `mailto:` per spec.

## Technical notes

- All localStorage helpers SSR-guarded (`typeof window === "undefined"`).
- Toasts via existing `sonner` setup (`src/components/ui/sonner.tsx`).
- Keep files modular (one component per file) to avoid the 2294-line passport file growing further; the Share tab body lives in `src/components/share/ShareTabView.tsx` and is imported by `my-health-passport.tsx`.
- All new routes added as files under `src/routes/`; `routeTree.gen.ts` regenerates automatically.

## Open questions

1. **PDF**: OK to use browser print-to-PDF for v1, or do you want a real generated PDF (would add `pdf-lib`)?
2. **Cross-device share links**: should the recipient be able to open a link from any browser? If yes, this needs Lovable Cloud (DB table for shares) — happy to wire that up, but it's beyond what you spec'd.
3. **"Resources accessed" and "Appointments booked" stats**: do these data sources exist in the app yet, or should they render as `0` placeholders for now?
