# Privacy-first Amplitude analytics — investigation & plan

This is a research + integration plan. No code has been changed yet.

---

## 1. Current state of the codebase

**Framework & routing**
- TanStack Start v1 on Vite 7, deployed to Cloudflare Workers (see `vite.config.ts`, `wrangler.jsonc`).
- File-based routing under `src/routes/`. Root at `src/routes/__root.tsx` wires `QueryClientProvider`, `Toaster`, `ChatWaitlistModal`, and a `RouteProgressBar` around `<Outlet />`.
- Router bootstrap lives in `src/router.tsx`; SSR entry is `src/server.ts`; client entry `src/start.ts`.

**Analytics SDKs installed today**
- None. `rg` finds no Amplitude, PostHog, GA/GTM, Segment, or Mixpanel imports in `src/`. `package.json` has no analytics dependency. This is a greenfield analytics install.

**Global providers / app initialization**
- `src/routes/__root.tsx` — `RootComponent` (client tree) and `RootShell` (HTML shell). Best place to mount an `<AnalyticsProvider />` and a route-change listener (via `useRouterState`).
- `src/start.ts` — client entry. Good spot for one-time SDK init before hydration.

**Auth / user-role model**
- Demo-only auth. `src/routes/auth.tsx` writes to `localStorage`: `lubin.userRole` (`"client" | "provider"`), `lubin.signedIn`, `lubin.userName`, and dispatches `lubin:auth-change`.
- No Supabase/Lovable Cloud user IDs today. There is no stable server-issued user ID we can hash; we must mint a pseudonymous device ID ourselves.

**Sensitive data surfaces (must be scrubbed before send)**
- Dynamic route params:
  - `/provider/$id` — provider ID (low sensitivity, but treat as opaque).
  - `/share/$token` — share token grants Health Passport access. Never send the token.
  - `/self-discovery_/$slug` — assessment slug (PHQ-9, GAD-7, …) reveals clinical instrument identity.
  - `/appointment.details`, `/appointment.cancel`, `/appointment.reschedule` — read appointment IDs from search params.
- Query strings on `/checkout`, `/payment-success`, `/payment-failed`, `/auth?redirect=…` may carry appointment IDs, provider IDs, promo codes, redirect targets.
- Route/component state contains: check-in mood values, assessment answers/scores/status, appointment notes, private clinician notes, prescription content, chat transcripts, promo codes, amounts, client/provider names, PIN, share tokens. **None of this may leave the browser via analytics.**

**Environment-variable conventions**
- Server-only secrets: `process.env.LOVABLE_API_KEY` inside server-function `.handler()` bodies (see `src/routes/api/*`).
- Client-visible values: `import.meta.env.VITE_*` (only one use today, `import.meta.env.DEV`).
- Amplitude write key is a browser-visible publishable key, so it belongs in `VITE_LUBIN_AMPLITUDE_API_KEY`.

---

## 2. Privacy rules the integration must enforce

Hard rules baked into the wrapper — the SDK is never called directly from feature code:

1. **No PHI/PII in events or user properties.** Never send: names, emails, phone, dates of birth, chat/message content, check-in text, mood/energy/sleep values, assessment answers, scores, severity labels, prescription content, private notes, promo codes, amounts, provider/client names, PINs, share tokens.
2. **URL sanitization on every page view.** Replace dynamic segments with placeholders and drop the query string entirely:
   - `/provider/abc123` → `/provider/:id`
   - `/self-discovery/phq-9` → `/self-discovery/:slug`
   - `/share/tok_…` → `/share/:token`
   - `/appointment/details?id=…` → `/appointment/details`
   Allowlisted routes are matched against `routeTree.gen.ts` route IDs, not raw `location.pathname`, so new dynamic segments cannot accidentally leak.
3. **Autocapture and session replay OFF.** Init with `autocapture: false` (disables page-views, clicks, form-interactions, sessions, file-downloads, element-interactions, network tracking) and do not install `@amplitude/session-replay-browser`.
4. **Pseudonymous IDs only.** Mint `lubin.analyticsId` = random UUID stored in `localStorage`; use as Amplitude `deviceId`. `userId` stays unset. Role (`client`/`provider`) is the only user property, set from `lubin.userRole`.
5. **Explicit consent / opt-out.** Default = disabled until the user accepts an analytics banner. Persist `lubin.analyticsConsent` (`granted | denied | unset`); on `denied` call `amplitude.setOptOut(true)` and skip init. Provide a toggle on `/privacy` to change consent later. Respect `navigator.doNotTrack`/`Sec-GPC` as an implicit deny.
6. **No IP/geolocation, no cookies.** Init with `trackingOptions: { ipAddress: false, dma: false, city: false, region: false }`, `identityStorage: 'localStorage'` (no Amplitude cookies), `defaultTracking: false`.
7. **Server never sees analytics.** SDK runs only in the browser; never imported from server functions or `*.server.ts`.

---

## 3. Proposed file layout

New files:
- `src/lib/analytics/consent.ts` — read/write `lubin.analyticsConsent`, DNT check, `subscribeConsent()`.
- `src/lib/analytics/id.ts` — get-or-create `lubin.analyticsId` (crypto.randomUUID).
- `src/lib/analytics/sanitize.ts` — `sanitizePath(routeId, params)` and event-prop allowlist.
- `src/lib/analytics/events.ts` — typed event taxonomy (see §5). All feature code calls `track(EventName, props)` from here; direct `amplitude.track` calls are forbidden (enforce with an ESLint `no-restricted-imports` rule on `@amplitude/analytics-browser` outside `src/lib/analytics/**`).
- `src/lib/analytics/client.ts` — lazy `initAnalytics()` (dynamic-imports `@amplitude/analytics-browser` so SSR is untouched), `track`, `setRole`, `reset`, `optOut`.
- `src/components/analytics/AnalyticsProvider.tsx` — mounts in `__root.tsx`; initializes on consent, listens to `useRouterState({ select: s => s.location })` to emit sanitized `page_view` events, listens for `lubin:auth-change` to update role.
- `src/components/analytics/ConsentBanner.tsx` — minimal banner + link to `/privacy`.

Files to edit:
- `src/routes/__root.tsx` — render `<AnalyticsProvider />` and `<ConsentBanner />` inside `RootComponent`.
- `src/routes/privacy.tsx` — add an "Analytics preferences" section with an opt-in/opt-out toggle.
- `.env.example` (create if missing) — document `VITE_LUBIN_AMPLITUDE_API_KEY`.
- `package.json` — add `@amplitude/analytics-browser`.
- `eslint.config.js` — add `no-restricted-imports` for `@amplitude/*` outside the wrapper folder.

No changes required to `src/server.ts`, server functions, or any `*.server.ts` file.

---

## 4. Environment variables

- `VITE_LUBIN_AMPLITUDE_API_KEY` — Amplitude browser write key. Read via `import.meta.env`. If missing, `initAnalytics()` no-ops (safe for previews/PRs without a key).
- `VITE_LUBIN_AMPLITUDE_SERVER_ZONE` — optional, `"EU" | "US"`, default `"US"`. Set to `"EU"` if the Amplitude project is EU-hosted.
- No secret is added; the Amplitude browser key is publishable and safe in the client bundle.

---

## 5. Minimal event taxonomy (no PHI)

Every event carries only: `role` (`client|provider|guest`), `route` (sanitized path template), and the small, enumerated props listed below. IDs are hashed to short opaque tokens (`sha256 → base32, first 10 chars`) when included at all; free text is never sent.

**Shared / navigation**
- `page_view` — `{ route }`
- `nav_click` — `{ route, target: "health_passport"|"self_discovery"|"find_provider"|"profile"|"faqs" }`
- `consent_changed` — `{ granted: boolean }`
- `auth_completed` — `{ method: "email"|"google"|"linkedin"|"facebook", role }`

**Client journey**
- `check_in_started`, `check_in_completed` — `{}` (no mood/energy/sleep values)
- `self_discovery_opened` — `{ instrument: "phq9"|"gad7"|… }` (instrument name is an app-defined enum, not user data)
- `assessment_started`, `assessment_completed` — `{ instrument }` (no score, no severity)
- `health_passport_viewed` — `{ tab: "overview"|"patterns"|"share" }`
- `find_provider_searched` — `{ has_filters: boolean }` (no query text)
- `provider_profile_viewed` — `{ provider_hash }`
- `booking_started`, `booking_service_selected`, `booking_slot_selected`, `booking_review_reached` — `{ provider_hash }`
- `checkout_started`, `checkout_promo_applied` (`{ ok: boolean }`), `checkout_confirmed` — `{ zero_value: boolean, currency: "USD"|"PHP" }` (no amount, no promo code text)
- `payment_result` — `{ outcome: "success"|"failed"|"zero_value" }`
- `sharing_option_selected` — `{ option: "share_all"|"choose"|"do_not_share" }`
- `sharing_confirmed` — `{ categories_count: number, include_future: boolean }` (no assessment IDs)
- `appointment_action` — `{ action: "view"|"reschedule"|"cancel" }` (no appointment ID)

**Provider journey**
- `provider_onboarding_step` — `{ step_index: number }`
- `provider_appointment_opened` — `{}`
- `provider_workspace_section_opened` — `{ section: "brief"|"notes"|"recap"|"complete" }`
- `provider_notes_saved` — `{ has_content: boolean }`
- `provider_recap_published` — `{ has_next_steps: boolean, has_resources: boolean, has_attachments: boolean }`
- `provider_prescription_action` — `{ action: "drafted"|"approved" }` (never the medication)
- `provider_appointment_marked_completed` — `{}`

**Errors (optional, low volume)**
- `client_error` — `{ route, kind: "route_error"|"boundary" }` (no message, no stack)

---

## 6. SDK init (reference config)

```text
amplitude.init(apiKey, undefined, {
  defaultTracking: false,
  autocapture: false,
  identityStorage: 'localStorage',
  serverZone: 'US',            // or 'EU' via env
  trackingOptions: { ipAddress: false, dma: false, city: false, region: false },
  minIdLength: 1,
  deviceId: lubinAnalyticsId,  // pseudonymous UUID from localStorage
});
```
No `Identify` calls with PII; only `identify.set('role', role)`.

---

## 7. Verification steps (post-implementation)

1. Build passes (`bun run build`) and typecheck (`tsgo`) — SSR still works because SDK is dynamically imported.
2. In DevTools → Network, filter `api2.amplitude.com` / `api.eu.amplitude.com`:
   - Nothing fires until consent = granted.
   - After granting, only allowlisted events appear; every `event_properties.route` is a template (`/provider/:id`, never `/provider/abc123`).
   - No event body contains user names, emails, message text, mood values, assessment answers, scores, severity, promo codes, amounts, appointment IDs, or share tokens.
3. Visit `/self-discovery/phq-9`, submit an assessment: only `assessment_started` + `assessment_completed` with `{ instrument: "phq9" }` fire; no score field.
4. Visit `/share/<token>`: `page_view` route is `/share/:token`; no token in payload; referrer stripped by Amplitude's default policy (we also do not send `page_url`).
5. Toggle opt-out on `/privacy`: subsequent traffic to Amplitude endpoints stops within one route change; `lubin.analyticsConsent = "denied"` persisted.
6. Run with `navigator.doNotTrack = "1"` in a fresh profile: no network calls to Amplitude at all.
7. Grep guard: `rg "@amplitude" src/ | rg -v "src/lib/analytics"` returns nothing (ESLint enforced).
8. Verify no server file imports the SDK: `rg "@amplitude" src/routes/api src/**/*.server.ts` empty.

---

## 8. Out of scope

- Server-side event ingestion / Amplitude HTTP v2 from server functions.
- Session replay, heatmaps, and Amplitude Experiments.
- Backfilling historical events.
- Cross-device identity stitching (requires a real user ID; deferred until Lovable Cloud auth lands).

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
