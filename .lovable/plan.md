## Overview

Two connected changes:
1. **Client sharing flow** — redesign the Health Passport consent modal to offer three choices with a "share everything" default option, plus a stricter review + confirmation gate.
2. **Provider post-appointment workspace** — add a structured 6-section workflow inside the existing provider appointment details.

No dashboard redesigns. Reuse existing components, store, and snapshot logic where possible.

---

## Part 1 — Sharing modal rewrite

**File:** `src/components/share/ShareConsentModal.tsx` (major rework)

New step flow:

```text
Step 1: Choice   → Step 2: Selection (only if "Choose what to share")   → Step 3: Review + Confirm
```

**Step 1 — Choice screen**
- Heading: "Share your Health Passport?"
- Subcopy referencing the provider name.
- Three radio-style option cards:
  1. Share my current Health Passport (preselected, but not consent)
  2. Choose what to share
  3. Don't share (closes modal, clears any pending share)
- Continue button advances to Step 2 (if custom) or Step 3 (if share-all).

**Step 2 — Selection (custom path only)**
- Reuse existing category checkboxes and nested assessment list from current modal.
- Add lightweight date-range control per category ("Last 30 days" / "Last 90 days" / "All time") where meaningful (check-ins, assessments). Store on the pending share.

**Step 3 — Review**
- Heading: "Review what Dr. [Name] will see"
- Grouped sections (only those included):
  - Recent check-ins
  - Assessment results (nested list preserved)
  - Patterns and observations
  - Previous patient-facing appointment summaries
  - Medication information
- Metadata row: Recipient · Appointment · Access expires (7 days after appointment) · Date range.
- "Remove" affordance per section (unchecks from the pending set).
- "Include future Health Passport updates" toggle — OFF by default.
- Required unchecked confirmation checkbox with exact copy from spec.
- Primary button "Confirm and share" — disabled until checkbox is checked.
- Secondary "Don't share" link.

**Downstream wiring**
- `checkout.tsx` and `ClientAppointmentsSection.tsx` continue to open the modal — no API changes needed beyond passing provider name (already passed).
- `providerShareStore.ts` already supports `futureUpdates` and snapshots; no schema change.

---

## Part 2 — Provider appointment workspace

**File:** `src/components/profile/ProviderSections.tsx` (extend `ApptNotesBlock` area) and/or `src/routes/appointment.details.tsx`.

Add a new component `ProviderAppointmentWorkspace` rendered inside the existing appointment details page under the current key-facts card. Six collapsible sections in order:

1. **Shared Health Passport** — reads `getAnyProviderGrant(appointmentId)`; renders the immutable snapshot. Shows "Shared by the patient for this appointment." Empty state when no grant / revoked / expired.
2. **Assessments** — table with columns: assessment name, clinical name, date, score, severity (reuse `getAssessmentStatus`), delta vs previous. Row checkbox: "Include in visit summary".
3. **Session notes** — structured textareas (presenting concerns, observations, impression, interventions, plan, follow-up). Persist to localStorage keyed by appointment id. Prominent "Private clinical notes — not shared with the patient through this summary." banner.
4. **AI-assisted summary** — "Generate draft summary" button calls Lovable AI Gateway via a new server function `generateVisitSummary` in `src/lib/visit-summary.functions.ts`. Input: shared snapshot subset + selected assessments + notes. Output: editable draft object with the fields listed in the spec. Label "AI-generated draft — provider review required". Never auto-publishes.
5. **Medication plan** — list editor: name, dose, form, frequency, instructions, status (continued/changed/stopped), patient-facing instructions, optional prescription upload. Prescription controls gated behind a `canPrescribe` flag (stub true for now, comment for future role check).
6. **Publish** — patient-facing preview built from selected assessments + AI draft + medication (public-facing fields only, never notes). Required confirm checkbox. "Approve and share with patient" button writes an entry into a new `publishedSummaries` store keyed by appointment id, with version history array, provider name, approved date. Notifies patient (toast placeholder). Subsequent edits create a new version rather than mutating v1.

**New files**
- `src/lib/visit-summary/store.ts` — localStorage helpers for notes, medication, selected assessments, and published-summary versions.
- `src/lib/visit-summary/visit-summary.functions.ts` — TanStack server fn wrapping Lovable AI Gateway (`google/gemini-3-flash-preview`) with a structured `Output.object` schema.
- `src/components/profile/provider-workspace/*` — one file per section for readability.

**Patient-side surfacing**
- `my-health-passport.tsx`: when a published summary exists for an appointment, list it under "What you've explored" (or a new "Visit summaries" block) with label "AI-assisted summary, reviewed by Dr. [Name]". Reads from the new store.

---

## Technical notes

- All persistence stays in localStorage for now — matches existing sharing/appointment stores.
- AI call goes through `LOVABLE_API_KEY` via existing gateway helper (`src/lib/ai-gateway.server.ts` if present, otherwise create it per the connecting-to-ai-models-tanstack pattern).
- Reuse `SummaryData` snapshot type for the shared Health Passport view.
- Provider-change auto-revoke already exists (`revokeForProviderChange`); no new work.

---

## Out of scope

- Real backend/RLS (kept as localStorage per existing pattern).
- Real prescription signing / e-Rx integration.
- Real transcript/recording pipeline (AI input limited to snapshot + notes + selected assessments).
- Provider role/permission system (single `canPrescribe` flag stubbed).
