# Align provider appointments with Health Passport

## Goal
Make the provider appointment journey clearly show what the client shared before the visit and what provider-created information will appear in the client’s Health Passport afterward.

## What will change

### 1. Clarify client-shared information
- Refresh the Health Passport sharing card in the provider appointment list with a concise status, the included information, access timing, and acknowledgment state.
- Keep the full shared snapshot available through the existing view and acknowledgment actions.
- In appointment details, present the shared Health Passport as the “Before the visit” reference area, using the existing fictional shared data and provider brief.

### 2. Clarify what goes back to the client
- Reframe the post-appointment steps around two destinations: private clinical documentation versus updates to the client’s Health Passport.
- Show a compact “Added to Health Passport after this visit” preview covering the visit summary, issued prescription when applicable, shared resources/documents, and the completed Lubin visit entry.
- Keep provider-only notes visibly excluded and keep “nothing shared” as an explicit choice.

### 3. Improve completion feedback
- Before closing, summarize exactly what the client will receive in their Health Passport.
- After completion, show the same information as a read-only delivery record with clear shared/not-shared states.
- Reuse the existing visit, prescription, sharing, and dummy-data structures; do not add backend behavior.

### 4. Keep the experience consistent
- Use the Health Passport’s Fraunces headings, Plus Jakarta Sans body, light lavender surfaces, restrained borders, and 12px controls.
- Preserve appointment messaging, prescribing, sharing acknowledgment, editing windows, and close-out rules.
- Verify the provider appointment list and appointment details on desktop and mobile.

## Technical notes
- Frontend prototype only; local state and existing fictional data remain the source of truth.
- Prefer small shared presentation components over duplicating patient-facing Health Passport logic.
- No authentication, backend, email, or appointment-sharing behavior changes.
