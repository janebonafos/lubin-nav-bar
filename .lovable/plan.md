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

