# Provider intake requests, without the drop-off

Providers often need a few things from a client before a session (goals, history, consent, current medication). Today there is no way to ask. The plan adds a **single, optional "help your provider prepare" request** that is prefilled from the Health Passport, framed as a benefit, and surfaced wherever the client already is — never as a blocking task.

## How it works for the provider

- In the provider profile, a new **Session prep requests** area (inside the provider's existing profile sections).
- The provider picks from a **library of prep templates**, no custom builder:
  - Your goals for this session (1 short question)
  - What's been going on lately
  - Current medication and supplements
  - Relevant medical history
  - Sleep, energy, appetite
  - Consent and practice policies acknowledgement
- Toggle each template on/off; optionally mark one as "important" (stronger nudge copy, still non-blocking).
- Provider sees, per appointment, what the client answered, what was auto-filled from the Health Passport, and what is still open. Open items also appear inside the existing provider session form so they can be asked live.

## How it feels for the client

One question set, three places it can surface (same data, same state):

1. **Checkout / booking confirmation** — a quiet card after payment: "Want your first 10 minutes to count? Share a couple of things with <Provider>. About 2 minutes." Dismissible.
2. **Appointment card** (client Appointments tab) — a "Help <Provider> prepare" card showing progress ("3 of 5 already filled from your Health Passport"), with Continue / Not now.
3. **Health Passport** — the same open items appear as gentle nudges in the existing passport layout, so answering there also completes the provider request.

Key mechanics:

- **Auto-prefill from Health Passport**: anything we already know (assessments, mood check-ins, medication, support stats) prefills; the client only confirms or fills gaps. The card leads with what is already done, not what is missing.
- **One question at a time is not used** — it's a single short form with prefilled fields and inline confirm, so the effort looks small and finite.
- **Value framing everywhere**, no "required" language: short line explaining that sharing this ahead of time means less time on background questions and more time on what they came for.
- **Never blocking**: booking, payment, joining a session, and messaging all work with nothing filled in.

## If the client skips

- No gate. The card stays available and reappears once (not repeatedly) closer to the session, plus a single line in the existing appointment reminder email.
- The nudge carries encouragement copy, e.g. "This saves time in your session — your provider can read it beforehand instead of asking during your appointment. You can skip anything you'd rather talk about in person."
- Unanswered items surface in the provider's session form so they can be collected in conversation.

## Technical notes

- New `src/lib/intake/` module: template library (ids, labels, field types, passport prefill mapping), provider per-profile template selection, and per-appointment client responses — same localStorage + change-event pattern as `provider-brief/store.ts` and `patientRecords.ts`, so the request state is one source of truth read by all three surfaces.
- Prefill resolves from the existing `SummaryData` (`src/lib/share/summary.ts`) and passport grants, so no data is duplicated; only client-confirmed answers are stored.
- New client component `IntakeRequestCard.tsx` (compact + expanded form states) rendered in checkout confirmation, `ClientAppointmentsSection.tsx`, and the Health Passport page.
- Provider side: a `SessionPrepSection` in the provider profile sections for template selection, and an "Open items" block added to the existing session form in `ProviderSections.tsx`.
- Reuses existing design tokens and card styles; no new colour or type decisions.
