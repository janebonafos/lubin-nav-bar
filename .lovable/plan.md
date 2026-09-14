# Health Passport patient design update

## Goal
Make the Health Passport feel like a practical, patient-controlled record for clinic and hospital visits while keeping Lubin’s calm visual language and all current wellbeing tools.

## What will change

### 1. Clarify the purpose at both entry points
- Replace the mental-wellbeing-only introduction with:
  - “Your health information, ready for your next visit.”
  - “Keep your details, visits, medications, and records together. Choose what to share with your care team.”
- Keep privacy and patient control visible without making the page feel warning-heavy.
- Update the profile subtitle and direct-page description to reflect whole-person health records, not only check-ins and emotional trends.

### 2. Add a simple action-first passport home
- Add a compact patient identity/status area that makes the existing Health Card easy to present.
- Put the main actions near the top: **Show health card**, **Update details**, and **Choose what to share**.
- Show concise readiness cues for identity, emergency contact, medications, allergies, and care history using the existing Health Passport information.
- Keep the detailed editable health card and its existing fields as the single source of truth.

### 3. Add one records overview without duplicating existing features
- Add a calm, scannable overview for:
  - recent checkups/visits,
  - current medications and prescriptions,
  - recent assessment results,
  - wellbeing check-ins and patterns.
- Use fictional demo visit and result examples where no current prototype record exists.
- Link each overview area to the existing appointment, prescription, Self Discovery, or sharing experience instead of rebuilding those flows.
- Preserve **My Prescriptions** as its existing section and show only a compact preview/link inside the Passport.

### 4. Keep sharing patient-controlled
- Surface the current appointment-linked sharing flow as a primary action.
- Retain selective records, immutable snapshots, expiry, updates, and revocation.
- Make the share status easier to scan: who can see what, for which appointment, and until when.

### 5. Keep both entry points consistent
- Use a shared Passport home design inside:
  - `/profile?tab=passport`
  - `/my-health-passport`
- Preserve each page’s surrounding navigation.
- Keep existing **Today**, **Patterns**, **Health card**, and **Share** experiences available; reorganize labels and entry points rather than removing their content.

## Visual direction
- Continue Lubin’s lavender, white, and deep-purple palette, restrained borders, compact 12px-radius controls, and clear selected states.
- Reduce decorative effects where they compete with record scanning.
- Use a responsive single-column hierarchy on phones and a compact two-column record overview on larger screens.
- Keep mental wellbeing prominent as one part of the Health Passport, alongside clinical details and records.

## Technical notes
- Frontend prototype only; no changes to backend services, authentication, integrations, or real patient data.
- Reuse existing local prototype stores for health details, appointments, prescriptions, assessments, check-ins, and sharing.
- Add only fictional display records needed to demonstrate new visit/result states.
- Update the direct Health Passport page metadata to match the broader purpose.
- Verify both entry points on desktop and mobile, including all existing tabs and links.
