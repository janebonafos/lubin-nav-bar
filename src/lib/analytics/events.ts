// Typed event taxonomy. Feature code imports `track` from here — never from
// `@amplitude/analytics-browser` directly. Enumerated props only; no PHI.

import { track as rawTrack } from "./client";

export type Role = "client" | "provider" | "guest";

export type EventMap = {
  page_view: { route: string };
  nav_click: { route: string; target: "health_passport" | "self_discovery" | "find_provider" | "profile" | "faqs" };
  consent_changed: { granted: boolean };
  auth_completed: { method: "email" | "google" | "linkedin" | "facebook"; role: Role };

  check_in_started: Record<string, never>;
  check_in_completed: Record<string, never>;
  self_discovery_opened: { instrument: string };
  assessment_started: { instrument: string };
  assessment_completed: { instrument: string };
  health_passport_viewed: { tab: "overview" | "patterns" | "share" };
  find_provider_searched: { has_filters: boolean };
  provider_profile_viewed: { provider_hash: string };
  booking_started: { provider_hash: string };
  booking_service_selected: { provider_hash: string };
  booking_slot_selected: { provider_hash: string };
  booking_review_reached: { provider_hash: string };
  checkout_started: { provider_hash: string };
  checkout_promo_applied: { ok: boolean };
  checkout_confirmed: { zero_value: boolean; currency: "USD" | "PHP" };
  payment_result: { outcome: "success" | "failed" | "zero_value" };
  sharing_option_selected: { option: "share_all" | "choose" | "do_not_share" };
  sharing_confirmed: { categories_count: number; include_future: boolean };
  appointment_action: { action: "view" | "reschedule" | "cancel" };

  provider_onboarding_step: { step_index: number };
  provider_appointment_opened: Record<string, never>;
  provider_workspace_section_opened: { section: "brief" | "notes" | "recap" | "complete" };
  provider_notes_saved: { has_content: boolean };
  provider_recap_published: { has_next_steps: boolean; has_resources: boolean; has_attachments: boolean };
  provider_prescription_action: { action: "drafted" | "approved" };
  provider_appointment_marked_completed: Record<string, never>;

  client_error: { route: string; kind: "route_error" | "boundary" };
};

export function track<K extends keyof EventMap>(name: K, props?: EventMap[K]): void {
  rawTrack(name as string, props as Record<string, unknown> | undefined);
}