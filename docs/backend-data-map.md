# Backend data map — Medication safety review

This doc is a hand-off for the backend team. It maps every piece of data shown in the **medication-specific safety review** (the "Relevant conditions / Monitoring requirements" cards) to the place it currently lives in the demo, and to the production table/entity it should come from.

> Current implementation: `src/components/appointment/AiPrescription.tsx` renders the UI; `src/lib/prescription/safety.ts` computes the checks; `src/lib/prescription/store.ts` defines the data shapes. All data is currently stored in `localStorage`.

---

## 1. Patient identity & demographics

| UI field | Current local source | Production source |
|---|---|---|
| Full name | `HealthDetails` (`identity.fullName`) | `profiles.full_name` (extends `auth.users`) |
| Preferred name | `HealthDetails` (`identity.preferredName`) | `profiles.preferred_name` |
| Date of birth / age | `PatientSafetyInfo.dob` or `ageYears` | `profiles.dob` |
| Sex | `PatientSafetyInfo.sex` | `profiles.sex` |
| Pronouns | `HealthDetails` (`identity.pronouns`) | `profiles.pronouns` |
| Phone | `HealthDetails` (`contact.phone`) | `profiles.phone` |
| Email | `HealthDetails` (`contact.email`) | `auth.users.email` / `profiles.email` |
| Address | `PatientSafetyInfo.address` | `profiles.address` |
| Emergency contact | `HealthDetails` (`emergency.*`) | `profiles.emergency_contact` (JSON) |

**Who fills it:** the patient, in the Health Passport "About you" section. The provider can confirm or override it during the session.

---

## 2. Health Passport voluntary details

Stored today in `src/lib/intake/healthDetails.ts` under the key `lubin.passport.healthDetails.v1`.

| Field id | Meaning | Production source |
|---|---|---|
| `medication.list` | Current meds / supplements | `patient_health_details.value` where `field_id = 'medication.list'` |
| `history.allergies` | Allergies / reactions | `patient_health_details.value` where `field_id = 'history.allergies'` |
| `history.conditions` | Relevant conditions | `patient_health_details.value` where `field_id = 'history.conditions'` |
| `history.pregnancy` | Pregnancy / breastfeeding choice | `patient_health_details.value` where `field_id = 'history.pregnancy'` |
| `care.previous` | Previous therapy / psychiatric care | `patient_health_details.value` where `field_id = 'care.previous'` |
| `care.clinicians` | Other clinicians involved | `patient_health_details.value` where `field_id = 'care.clinicians'` |

**Suggested schema:**

```sql
CREATE TABLE patient_health_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_id text NOT NULL,          -- matches the IDs in HEALTH_DETAIL_GROUPS
  value text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, field_id)
);
```

---

## 3. Appointment intake form responses

When a provider requests pre-session information, the client fills an intake form. Today the answers live in `src/lib/intake/store.ts` keyed by `appointmentId`.

| Question id | Maps to safety field | Production source |
|---|---|---|
| `history.allergies` | Allergies | `intake_responses.value` where `question_id = 'history.allergies'` |
| `medication.list` | Current medications | `intake_responses.value` where `question_id = 'medication.list'` |
| `history.conditions` | Relevant conditions | `intake_responses.value` where `question_id = 'history.conditions'` |
| `identity.dob` | Age | `intake_responses.value` where `question_id = 'identity.dob'` |
| `history.pregnancy` | Pregnancy status | `intake_responses.value` where `question_id = 'history.pregnancy'` |

**Suggested schema:**

```sql
CREATE TABLE intake_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id text NOT NULL,
  value text,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE (appointment_id, question_id)
);
```

**Important business rule:** intake answers are **patient-provided**, not clinician-attested. The provider must explicitly click "Use this answer" before it becomes part of the clinical record (`PatientSafetyInfo`). See `src/lib/prescription/intakeImport.ts`.

---

## 4. Clinical patient safety record

This is the core record the medication review reads. Today it is a field on the prescription draft: `Prescription.patientInfo` (`PatientSafetyInfo`).

| UI check / field | Field in `PatientSafetyInfo` | Where it should come from |
|---|---|---|
| Allergy history | `allergyEntries[]` + `allergyState` | Provider accepts intake/Health Passport answers, or enters manually. |
| Current medications | `medicationEntries[]` + `medicationState` | Same as above, plus meds the provider adds in the visit workspace. |
| Relevant conditions | `conditionEntries[]` + `conditionState` | Same as above. |
| Bipolar / mania history | `bipolarHistory` + `bipolarDetail` | A dedicated screening question in intake or provider review. |
| Pregnancy / breastfeeding | `pregnancyStatus` | Health Passport or intake; provider can override. |
| Date of birth / age | `dob` / `ageYears` | Profile, with provider override if needed. |
| Labs / organ function | `labs` + `labsAt` | Provider enters results, or syncs from lab integration. |
| Sex | `sex` | Profile. |
| Address | `address` | Profile / prescription address. |
| Emergency contact | `emergencyContact` | Profile. |
| Provider notes | `providerNotes` | Free-text clinical note for this encounter. |

**Suggested schema:**

```sql
CREATE TABLE patient_safety_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_by uuid REFERENCES auth.users(id),  -- provider who attested it
  -- structured entries stored as JSONB arrays
  allergy_entries jsonb DEFAULT '[]',
  medication_entries jsonb DEFAULT '[]',
  condition_entries jsonb DEFAULT '[]',
  allergy_state text DEFAULT 'not-documented',
  medication_state text DEFAULT 'not-documented',
  condition_state text DEFAULT 'not-documented',
  bipolar_history text DEFAULT 'not-documented',
  bipolar_detail text,
  pregnancy_status text DEFAULT 'not-documented',
  dob date,
  age_years int,
  labs text,
  labs_at date,
  sex text,
  address text,
  emergency_contact text,
  provider_notes text,
  updated_at timestamptz DEFAULT now(),
  source_breakdown jsonb DEFAULT '{}'  -- which fields came from passport/intake/provider
);
```

---

## 5. Appointment / visit workspace

The provider's clinical notes and any medications they document during the session.

| Field | Current source | Production source |
|---|---|---|
| Presenting complaint | `visit-workspace/store.ts` `notes.presenting` | `visit_workspaces.presenting` |
| Observations | `notes.observations` | `visit_workspaces.observations` |
| Plan | `notes.plan` | `visit_workspaces.plan` |
| Workspace medications | `medications[]` | `visit_workspaces.medications` (JSONB) |
| Appointment outcome | workspace state | `appointments.outcome` |

These feed the AI medication suggestion endpoint (`/api/generate-prescription`) and are also used as an additional source for "current medications" in the safety review.

---

## 6. Medication reference data

The safety review uses medication properties (`requiresLabs`, `requiresPregnancyStatus`, `requiresBipolarScreen`, `controlled`) and reference text (contraindications, interactions, monitoring). Today this is hard-coded / AI-generated.

| Data | Current source | Production source |
|---|---|---|
| Generic name, class, dosing | `MedicationReference.general` | External drug database or `medication_references` table |
| Contraindications | `MedicationReference.general.contraindications` | Drug reference API / table |
| Interactions | `MedicationReference.general.interactions` | Drug interaction API (e.g., First DataBank, NLM) |
| Monitoring requirements | `MedicationReference.general.monitoring` + `med.requiresLabs` | Drug reference + clinical rules engine |
| Pregnancy/lactation | `MedicationReference.general.pregnancyLactation` | Drug reference (e.g., LactMed, product label) |
| Controlled substance schedule | `MedicationReference.general.controlledSubstance` + `med.controlled` | National drug schedule (DEA / FDA PH, BFAD) |
| Availability / jurisdiction | `MedicationReference.general.availability` | Local regulatory source |

**Suggested schema:**

```sql
CREATE TABLE medication_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_name text NOT NULL,
  generic_name text,
  country text NOT NULL,  -- 'US' | 'PH'
  reference_data jsonb NOT NULL,
  sources jsonb DEFAULT '[]',
  sources_available boolean DEFAULT false,
  checked_at timestamptz DEFAULT now(),
  UNIQUE (medication_name, country)
);
```

---

## 7. Prescriber identity & credentials

The signing block and legal prescription layer need verified prescriber data.

| Field | Current source | Production source |
|---|---|---|
| Name | `PrescriberIdentity.name` | `provider_profiles.name` |
| Profession | `profile.profession` | `provider_profiles.profession` |
| Jurisdiction | `RxCountry` derived from encounter | `appointments.jurisdiction` or provider location |
| License / credential numbers | `PrescriberIdentity` (local) | `provider_verifications` table — **backend-only** |
| Clinic / practice name | `PrescriberIdentity` | `provider_profiles.practice_name` |
| Clinic address | `PrescriberIdentity` | `provider_profiles.practice_address` |

**Important:** regulated numbers (PRC/PTR, NPI/DEA) must never be exposed to the client UI. The frontend only knows that the provider is "verified"; the actual numbers live in a backend-only table and are inserted into the signed document server-side.

**Suggested schema:**

```sql
CREATE TABLE provider_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  profession text,
  country text,
  license_number text,
  dea_number text,
  s2_number text,
  verified_at timestamptz,
  expires_at timestamptz,
  UNIQUE (provider_id, country)
);
```

---

## 8. Prescription & safety review state

The result of the safety review and the final signed document.

| Field | Meaning | Production source |
|---|---|---|
| `medications` | Draft line items | `prescriptions.medications` (JSONB) |
| `med.checks` | Per-medication safety check results | Computed on read from `patient_safety_info` + `medication_references`, or cached in `prescription_medication_checks` |
| `med.checkReviews` | Provider acknowledgement timestamps | `prescription_medication_check_reviews` |
| `med.verifiedAt` | When provider verified the medication | `prescriptions.medications[].verified_at` |
| `rx.reviewedAt` | When whole-prescription review completed | `prescriptions.reviewed_at` |
| `rx.legalAcknowledgedAt` | Final legal attestation | `prescriptions.legal_acknowledged_at` |
| `rx.signature` | Signed document metadata | `prescriptions.signature` (JSONB) |
| `rx.documentId` | Immutable signed PDF / document | `prescription_documents.id` |

**Suggested schema:**

```sql
CREATE TABLE prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES auth.users(id),
  patient_id uuid REFERENCES auth.users(id),
  country text,
  medications jsonb DEFAULT '[]',
  clinical_notes text,
  patient_info_id uuid REFERENCES patient_safety_info(id),
  reviewed_at timestamptz,
  legal_acknowledged_at timestamptz,
  finalised_at timestamptz,
  finalised_by uuid REFERENCES auth.users(id),
  signature jsonb,
  document_id uuid,
  voided jsonb,
  version int DEFAULT 1,
  updated_at timestamptz DEFAULT now()
);
```

---

## 9. Shared assessment safety responses

If the patient shared an assessment result (e.g., PHQ-9 item 9 flagged), the provider must acknowledge it before prescribing.

| Field | Current source | Production source |
|---|---|---|
| Flagged item text | `sharedSafetyResponse` | `assessment_results.flagged_responses` or `shared_safety_responses` |
| Acknowledgement timestamp | `med.sharedSafetyAcknowledgedAt` | `prescriptions.shared_safety_acknowledged_at` |

---

## 10. Deterministic safety rules (today vs. tomorrow)

`src/lib/prescription/safety.ts` currently runs a **demo-grade deterministic review** (keyword matching for interactions, conditions, etc.). In production this should be replaced or augmented by:

1. A clinical decision support service or API that returns interaction / contraindication / monitoring checks.
2. The medication reference table (`medication_references`) for per-drug rules.
3. The patient safety record (`patient_safety_info`) for patient-specific inputs.

The UI already expects a `MedicationChecks` object, so the backend can either:

- Compute it on the fly in a server function and return it to the frontend, or
- Store it in `prescription_medication_checks` and invalidate it whenever `patient_safety_info` or the medication line changes.

---

## Quick reference: which screen uses what

| Screen / component | Main data | Backend tables |
|---|---|---|
| `AiPrescription.tsx` | Medication draft, safety checks, signing | `prescriptions`, `patient_safety_info`, `medication_references`, `provider_verifications` |
| `PatientInfoForm.tsx` | "Still need" list and data entry | `patient_safety_info`, `intake_responses`, `patient_health_details` |
| `MedicationReferenceDrawer.tsx` | Drug reference | `medication_references` |
| `EPrescriptionDocument.tsx` | Signed document | `prescriptions`, `prescription_documents`, `provider_verifications` |
| `IssuePrescriptionDialog.tsx` | Right-side Rx drawer | same as `AiPrescription.tsx` |
| `ProviderClientsSection.tsx` | Patient list & clinical profile | `profiles`, `patient_safety_info`, `appointments`, `prescriptions` |

---

## Migration notes

1. Keep the field IDs in `HEALTH_DETAIL_GROUPS` and the intake template IDs stable — the prefill logic depends on them.
2. When migrating existing demo `localStorage` data, map:
   - `lubin.passport.healthDetails.v1` → `patient_health_details`
   - `lubin.intake.v1:<appointmentId>` → `intake_responses`
   - `lubin.prescription.v1:<appointmentId>` → `prescriptions` + `patient_safety_info`
   - `lubin.prescriberIdentity.v1` → `provider_profiles` / `provider_verifications`
3. Do not expose `provider_verifications.license_number`, `dea_number`, or `s2_number` in any client-facing API. They should only be used server-side when generating the signed document.
