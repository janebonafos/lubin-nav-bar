-- ============ enums ============
create type public.app_role as enum ('admin','catalog_admin','provider','patient');
create type public.jurisdiction_code as enum ('PH','US');
create type public.clinical_state as enum ('documented','none_known','not_applicable','not_assessed');
create type public.verification_status as enum ('verified','in_review','action_required','not_submitted','expired','suspended','revoked');
create type public.finding_severity as enum ('info','caution','warning','critical');
create type public.rx_draft_status as enum ('draft','ready_for_review','signed','voided','superseded','no_prescription_needed');
create type public.catalog_approval as enum ('draft','in_review','approved','rejected');

-- ============ shared helpers ============
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ============ identity ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_legal_name text,
  display_name text,
  date_of_birth date,
  clinically_relevant_sex text,
  residential_address text,
  country_code text default 'PH',
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- ============ provider records ============
create table public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_legal_name text not null,
  professional_designation text,
  profession text,
  qualifications text,
  practice_name text,
  practice_address text,
  professional_contact text,
  can_document boolean not null default true,
  can_diagnose boolean not null default false,
  requires_cosign boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.provider_profiles to authenticated;
grant all on public.provider_profiles to service_role;
alter table public.provider_profiles enable row level security;
create policy "own provider profile" on public.provider_profiles for select to authenticated using (user_id = auth.uid());
create policy "own provider profile write" on public.provider_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "own provider profile update" on public.provider_profiles for update to authenticated using (user_id = auth.uid());

-- Regulated credential data. Never exposed to clients: no authenticated grants.
create table public.provider_verifications (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  jurisdiction_code public.jurisdiction_code not null default 'PH',
  status public.verification_status not null default 'not_submitted',
  verified_at timestamptz,
  license_expires_at timestamptz,
  prc_number text,
  ptr_number text,
  ptr_year int,
  signing_email text,
  signing_email_verified_at timestamptz,
  outstanding jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_user_id, jurisdiction_code)
);
grant all on public.provider_verifications to service_role;
alter table public.provider_verifications enable row level security;

create table public.provider_authorities (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  jurisdiction_code public.jurisdiction_code not null default 'PH',
  authority text not null,
  active boolean not null default true,
  suspended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider_user_id, jurisdiction_code, authority)
);
grant all on public.provider_authorities to service_role;
alter table public.provider_authorities enable row level security;

-- ============ appointments / encounters ============
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid references auth.users(id) on delete set null,
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_at timestamptz,
  duration_minutes int,
  timezone text,
  appointment_type text,
  session_format text,
  mode text,
  status text not null default 'scheduled',
  jurisdiction_code public.jurisdiction_code not null default 'PH',
  patient_location_country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;
create policy "appt provider read" on public.appointments for select to authenticated
  using (provider_user_id = auth.uid() or patient_user_id = auth.uid());
create policy "appt provider write" on public.appointments for update to authenticated
  using (provider_user_id = auth.uid());

create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  patient_user_id uuid references auth.users(id) on delete set null,
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  jurisdiction_code public.jurisdiction_code not null default 'PH',
  patient_location_country text,
  presenting_symptoms text,
  symptom_duration text,
  symptom_severity text,
  working_diagnosis text,
  monitoring_plan text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.encounters to authenticated;
grant all on public.encounters to service_role;
alter table public.encounters enable row level security;

create or replace function public.is_encounter_provider(_encounter_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.encounters e where e.id = _encounter_id and e.provider_user_id = auth.uid())
$$;
create or replace function public.is_encounter_patient(_encounter_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.encounters e where e.id = _encounter_id and e.patient_user_id = auth.uid())
$$;

create policy "encounter access" on public.encounters for select to authenticated
  using (provider_user_id = auth.uid() or patient_user_id = auth.uid());
create policy "encounter provider insert" on public.encounters for insert to authenticated
  with check (provider_user_id = auth.uid());
create policy "encounter provider update" on public.encounters for update to authenticated
  using (provider_user_id = auth.uid());

-- ============ clinical documentation ============
create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  note_type text not null default 'progress_note',
  subjective text,
  objective text,
  assessment text,
  plan text,
  cosigned_by uuid references auth.users(id),
  cosigned_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.clinical_notes to authenticated;
grant all on public.clinical_notes to service_role;
alter table public.clinical_notes enable row level security;
create policy "notes author access" on public.clinical_notes for select to authenticated
  using (author_user_id = auth.uid() or public.is_encounter_provider(encounter_id));
create policy "notes author insert" on public.clinical_notes for insert to authenticated
  with check (author_user_id = auth.uid() and public.is_encounter_provider(encounter_id));
create policy "notes author update" on public.clinical_notes for update to authenticated
  using (author_user_id = auth.uid());

-- ============ patient clinical context ============
create table public.patient_allergies (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid references public.encounters(id) on delete set null,
  state public.clinical_state not null default 'not_assessed',
  substance text,
  reaction text,
  severity text,
  is_intolerance boolean not null default false,
  source text not null default 'provider',
  source_date timestamptz,
  patient_provided boolean not null default false,
  provider_reviewed_at timestamptz,
  provider_reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.patient_medications (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid references public.encounters(id) on delete set null,
  state public.clinical_state not null default 'not_assessed',
  category text not null default 'prescription',
  name text,
  medication_concept_id uuid,
  strength text,
  dose text,
  route text,
  frequency text,
  adherence text,
  previous_trial boolean not null default false,
  previous_benefit text,
  adverse_effects text,
  reason_discontinued text,
  source text not null default 'provider',
  source_date timestamptz,
  patient_provided boolean not null default false,
  provider_reviewed_at timestamptz,
  provider_reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.patient_conditions (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid references public.encounters(id) on delete set null,
  state public.clinical_state not null default 'not_assessed',
  name text,
  detail text,
  status text,
  source text not null default 'provider',
  source_date timestamptz,
  patient_provided boolean not null default false,
  provider_reviewed_at timestamptz,
  provider_reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.patient_observations_labs (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid references public.encounters(id) on delete set null,
  kind text not null,
  state public.clinical_state not null default 'not_assessed',
  value_text text,
  value_number numeric,
  unit text,
  observed_at timestamptz,
  source text not null default 'provider',
  patient_provided boolean not null default false,
  provider_reviewed_at timestamptz,
  provider_reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id uuid references public.encounters(id) on delete set null,
  instrument text not null,
  score numeric,
  status_label text,
  answers jsonb not null default '{}'::jsonb,
  taken_at timestamptz not null default now(),
  patient_provided boolean not null default true,
  provider_reviewed_at timestamptz,
  provider_reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- patient clinical context: grants + RLS (provider of the encounter, or the patient)
do $$
declare t text;
begin
  foreach t in array array['patient_allergies','patient_medications','patient_conditions','patient_observations_labs','assessments']
  loop
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "clinical read" on public.%I for select to authenticated using (patient_user_id = auth.uid() or public.is_encounter_provider(encounter_id))', t);
    execute format('create policy "clinical insert" on public.%I for insert to authenticated with check (patient_user_id = auth.uid() or public.is_encounter_provider(encounter_id))', t);
    execute format('create policy "clinical update" on public.%I for update to authenticated using (patient_user_id = auth.uid() or public.is_encounter_provider(encounter_id))', t);
  end loop;
end $$;

-- ============ medication catalog (jurisdiction aware) ============
create table public.medication_concepts (
  id uuid primary key default gen_random_uuid(),
  generic_name text not null,
  inn_name text,
  active_ingredient text,
  medication_class text,
  approval_status public.catalog_approval not null default 'draft',
  active boolean not null default false,
  catalog_version text not null default 'v0-draft',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (generic_name)
);
create table public.medication_products_ph (
  id uuid primary key default gen_random_uuid(),
  medication_concept_id uuid not null references public.medication_concepts(id) on delete cascade,
  jurisdiction_code public.jurisdiction_code not null default 'PH',
  country_code text not null default 'PH',
  brand_names text[] not null default '{}',
  strength_value numeric,
  strength_unit text,
  dosage_form text,
  route text,
  ph_registration_id text,
  manufacturer text,
  registration_status text,
  prescription_classification text,
  dangerous_drug boolean not null default false,
  requires_s2 boolean not null default false,
  approval_status public.catalog_approval not null default 'draft',
  active boolean not null default false,
  catalog_version text not null default 'v0-draft',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.medication_sources (
  id uuid primary key default gen_random_uuid(),
  medication_product_id uuid references public.medication_products_ph(id) on delete cascade,
  medication_concept_id uuid references public.medication_concepts(id) on delete cascade,
  source_document_id text,
  source_url text,
  source_date date,
  source_version text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.medication_concepts to authenticated;
grant select, insert, update on public.medication_products_ph to authenticated;
grant select, insert, update on public.medication_sources to authenticated;
grant all on public.medication_concepts to service_role;
grant all on public.medication_products_ph to service_role;
grant all on public.medication_sources to service_role;
alter table public.medication_concepts enable row level security;
alter table public.medication_products_ph enable row level security;
alter table public.medication_sources enable row level security;
create policy "catalog read" on public.medication_concepts for select to authenticated using (true);
create policy "catalog admin write" on public.medication_concepts for all to authenticated
  using (public.has_role(auth.uid(),'catalog_admin')) with check (public.has_role(auth.uid(),'catalog_admin'));
create policy "products read" on public.medication_products_ph for select to authenticated using (true);
create policy "products admin write" on public.medication_products_ph for all to authenticated
  using (public.has_role(auth.uid(),'catalog_admin')) with check (public.has_role(auth.uid(),'catalog_admin'));
create policy "sources read" on public.medication_sources for select to authenticated using (true);
create policy "sources admin write" on public.medication_sources for all to authenticated
  using (public.has_role(auth.uid(),'catalog_admin')) with check (public.has_role(auth.uid(),'catalog_admin'));

-- ============ prescribing authority ============
create or replace function public.can_prescribe_ph(_provider_user_id uuid, _encounter_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v record; e record; p record;
begin
  if _provider_user_id is null then return false; end if;
  select * into v from public.provider_verifications
    where provider_user_id = _provider_user_id and jurisdiction_code = 'PH';
  if not found then return false; end if;
  if v.status <> 'verified' then return false; end if;
  if v.verified_at is null then return false; end if;
  if v.license_expires_at is not null and v.license_expires_at < now() then return false; end if;
  if coalesce(v.prc_number,'') = '' or coalesce(v.ptr_number,'') = '' then return false; end if;
  if coalesce(v.signing_email,'') = '' or v.signing_email_verified_at is null then return false; end if;
  if exists (select 1 from public.provider_authorities a
             where a.provider_user_id = _provider_user_id and a.jurisdiction_code = 'PH'
               and (a.active = false or a.suspended_at is not null or a.revoked_at is not null)) then
    return false;
  end if;
  select * into p from public.provider_profiles where user_id = _provider_user_id;
  if not found then return false; end if;
  if lower(coalesce(p.profession,'')) not in ('physician','doctor','psychiatrist','medical doctor') then
    return false;
  end if;
  if _encounter_id is not null then
    select * into e from public.encounters where id = _encounter_id;
    if not found then return false; end if;
    if e.provider_user_id <> _provider_user_id then return false; end if;
    if e.jurisdiction_code <> 'PH' then return false; end if;
    if upper(coalesce(e.patient_location_country,'')) <> 'PH' then return false; end if;
  end if;
  return true;
end $$;

-- ============ prescriptions ============
create table public.prescription_drafts (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  patient_user_id uuid references auth.users(id) on delete set null,
  jurisdiction_code public.jurisdiction_code not null default 'PH',
  country_code text not null default 'PH',
  status public.rx_draft_status not null default 'draft',
  version int not null default 1,
  clinical_confirmation_at timestamptz,
  clinical_confirmation_by uuid references auth.users(id),
  clinical_confirmation_statement text,
  no_prescription_reason text,
  unsigned_document_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.prescription_drafts(id) on delete cascade,
  medication_concept_id uuid references public.medication_concepts(id),
  medication_product_id uuid references public.medication_products_ph(id),
  generic_name text not null,
  brand_name text,
  strength text,
  dosage_form text,
  dose_amount text,
  dose_unit text,
  route text,
  frequency text,
  timing text,
  duration text,
  stop_or_review_date date,
  quantity text,
  quantity_unit text,
  refills text,
  indication text,
  prn boolean not null default false,
  prn_reason text,
  max_daily_dose text,
  titration_instructions text,
  taper_instructions text,
  special_administration text,
  follow_up_plan text,
  patient_instructions text,
  generated_sig text,
  sig_override text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.prescription_safety_reviews (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.prescription_drafts(id) on delete cascade,
  service_name text not null default 'lubin.limited-screening',
  service_version text not null default '0.1.0',
  limited_screening boolean not null default true,
  information_used jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz not null default now(),
  stale_at timestamptz,
  stale_reason text,
  created_at timestamptz not null default now()
);
create table public.prescription_safety_findings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.prescription_safety_reviews(id) on delete cascade,
  prescription_item_id uuid references public.prescription_items(id) on delete cascade,
  code text not null,
  severity public.finding_severity not null default 'caution',
  title text not null,
  detail text,
  source text,
  requires_acknowledgement boolean not null default true,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.ai_suggestion_runs (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references public.prescription_drafts(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  model text,
  allowed_medication_ids uuid[] not null default '{}',
  option_count int not null default 0,
  rejected_reason text,
  outcome text not null default 'completed',
  created_at timestamptz not null default now()
);

-- ============ signing ============
-- Signing challenges hold OTP hashes: no client grants at all.
create table public.signing_challenges (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  session_id text,
  draft_id uuid not null references public.prescription_drafts(id) on delete cascade,
  prescription_version int not null,
  document_sha256 text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempt_count int not null default 0,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  invalidated_reason text,
  created_at timestamptz not null default now()
);
grant all on public.signing_challenges to service_role;
alter table public.signing_challenges enable row level security;

create table public.signed_prescription_versions (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.prescription_drafts(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  patient_user_id uuid references auth.users(id) on delete set null,
  jurisdiction_code public.jurisdiction_code not null default 'PH',
  prescription_number text not null unique,
  prescription_version int not null,
  document_sha256 text not null,
  canonical_json jsonb not null,
  prescriber_snapshot jsonb not null,
  signed_at timestamptz not null default now(),
  released_at timestamptz,
  released_by uuid references auth.users(id),
  first_viewed_at timestamptz,
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text,
  superseded_by uuid references public.signed_prescription_versions(id),
  created_at timestamptz not null default now()
);
create table public.signature_events (
  id uuid primary key default gen_random_uuid(),
  signed_version_id uuid references public.signed_prescription_versions(id) on delete cascade,
  draft_id uuid not null references public.prescription_drafts(id) on delete cascade,
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  identity_snapshot jsonb not null,
  prescription_version int not null,
  document_sha256 text not null,
  signing_method text not null default 'email_otp',
  verified_email text not null,
  attestation_statement text not null,
  signing_challenge_id uuid,
  session_id text,
  signed_at timestamptz not null default now()
);
create table public.prescription_delivery_events (
  id uuid primary key default gen_random_uuid(),
  signed_version_id uuid not null references public.signed_prescription_versions(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id),
  document_version int not null default 1,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.prescription_audit_events (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references public.prescription_drafts(id) on delete set null,
  encounter_id uuid references public.encounters(id) on delete set null,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- grants + RLS for prescription tables
grant select, insert, update on public.prescription_drafts to authenticated;
grant select, insert, update on public.prescription_items to authenticated;
grant select, insert, update on public.prescription_safety_reviews to authenticated;
grant select, insert, update on public.prescription_safety_findings to authenticated;
grant select, insert on public.ai_suggestion_runs to authenticated;
grant select on public.signed_prescription_versions to authenticated;
grant select on public.signature_events to authenticated;
grant select on public.prescription_delivery_events to authenticated;
grant select on public.prescription_audit_events to authenticated;
grant all on public.prescription_drafts to service_role;
grant all on public.prescription_items to service_role;
grant all on public.prescription_safety_reviews to service_role;
grant all on public.prescription_safety_findings to service_role;
grant all on public.ai_suggestion_runs to service_role;
grant all on public.signed_prescription_versions to service_role;
grant all on public.signature_events to service_role;
grant all on public.prescription_delivery_events to service_role;
grant all on public.prescription_audit_events to service_role;

alter table public.prescription_drafts enable row level security;
alter table public.prescription_items enable row level security;
alter table public.prescription_safety_reviews enable row level security;
alter table public.prescription_safety_findings enable row level security;
alter table public.ai_suggestion_runs enable row level security;
alter table public.signed_prescription_versions enable row level security;
alter table public.signature_events enable row level security;
alter table public.prescription_delivery_events enable row level security;
alter table public.prescription_audit_events enable row level security;

create or replace function public.is_draft_provider(_draft_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.prescription_drafts d where d.id = _draft_id and d.provider_user_id = auth.uid())
$$;

create policy "draft provider read" on public.prescription_drafts for select to authenticated
  using (provider_user_id = auth.uid());
create policy "draft provider insert" on public.prescription_drafts for insert to authenticated
  with check (provider_user_id = auth.uid() and public.is_encounter_provider(encounter_id));
create policy "draft provider update" on public.prescription_drafts for update to authenticated
  using (provider_user_id = auth.uid() and status in ('draft','ready_for_review'));

create policy "items provider read" on public.prescription_items for select to authenticated
  using (public.is_draft_provider(draft_id));
create policy "items provider insert" on public.prescription_items for insert to authenticated
  with check (public.is_draft_provider(draft_id));
create policy "items provider update" on public.prescription_items for update to authenticated
  using (public.is_draft_provider(draft_id));

create policy "safety provider read" on public.prescription_safety_reviews for select to authenticated
  using (public.is_draft_provider(draft_id));
create policy "safety provider insert" on public.prescription_safety_reviews for insert to authenticated
  with check (public.is_draft_provider(draft_id));
create policy "findings provider read" on public.prescription_safety_findings for select to authenticated
  using (exists (select 1 from public.prescription_safety_reviews r where r.id = review_id and public.is_draft_provider(r.draft_id)));
create policy "findings provider update" on public.prescription_safety_findings for update to authenticated
  using (exists (select 1 from public.prescription_safety_reviews r where r.id = review_id and public.is_draft_provider(r.draft_id)));
create policy "findings provider insert" on public.prescription_safety_findings for insert to authenticated
  with check (exists (select 1 from public.prescription_safety_reviews r where r.id = review_id and public.is_draft_provider(r.draft_id)));

create policy "ai runs provider read" on public.ai_suggestion_runs for select to authenticated
  using (provider_user_id = auth.uid());

-- Signed content is immutable: read-only for provider, and for the patient only
-- once the document has been released to their account.
create policy "signed read" on public.signed_prescription_versions for select to authenticated
  using (provider_user_id = auth.uid() or (patient_user_id = auth.uid() and released_at is not null));
create policy "signature read" on public.signature_events for select to authenticated
  using (provider_user_id = auth.uid());
create policy "delivery read" on public.prescription_delivery_events for select to authenticated
  using (exists (select 1 from public.signed_prescription_versions v where v.id = signed_version_id
    and (v.provider_user_id = auth.uid() or (v.patient_user_id = auth.uid() and v.released_at is not null))));
create policy "audit read" on public.prescription_audit_events for select to authenticated
  using (actor_user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- Immutability guard for signed clinical content.
create or replace function public.protect_signed_prescription() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'signed prescriptions cannot be deleted';
  end if;
  if new.document_sha256 <> old.document_sha256
     or new.canonical_json::text <> old.canonical_json::text
     or new.prescription_number <> old.prescription_number
     or new.prescriber_snapshot::text <> old.prescriber_snapshot::text
     or new.signed_at <> old.signed_at then
    raise exception 'signed prescription content is immutable';
  end if;
  return new;
end $$;
create trigger signed_rx_immutable before update or delete on public.signed_prescription_versions
  for each row execute function public.protect_signed_prescription();

create or replace function public.protect_signature_events() returns trigger
language plpgsql set search_path = public as $$
begin raise exception 'signature events are append-only'; end $$;
create trigger signature_events_append_only before update or delete on public.signature_events
  for each row execute function public.protect_signature_events();

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','provider_profiles','provider_verifications','appointments','encounters',
    'clinical_notes','patient_allergies','patient_medications','patient_conditions','patient_observations_labs',
    'medication_concepts','medication_products_ph','prescription_drafts','prescription_items']
  loop
    execute format('create trigger set_updated_at_%s before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;