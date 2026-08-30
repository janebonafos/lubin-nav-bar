// One source of truth for provider session-prep requests and the client's
// answers, so the same state can surface at checkout, on the appointment card
// and inside the Health Passport without ever duplicating the ask.
import {
  DEFAULT_TEMPLATE_IDS,
  INTAKE_TEMPLATES,
  templateById,
  type IntakeField,
  type IntakeTemplate,
} from "./templates";
import { buildIntakePrefill, type PrefillValue } from "./prefill";
import {
  DEFAULT_MEASURE_IDS,
  STANDARD_MEASURES,
  type StandardMeasure,
} from "./measures";

const PROVIDER_KEY = "lubin.intake.providerTemplates.v1";
const RESPONSE_KEY = "lubin.intake.responses.v1";
const CHANGE_EVENT = "lubin-intake-change";

export type ProviderRequest = {
  /** Templates this provider asks for. */
  templateIds: string[];
  /** Individual questions the provider turned off — they never reach the client. */
  excludedFieldIds?: string[];
  /** Extra questions the provider wrote, keyed by the section they belong to. */
  customFields?: Record<string, IntakeField[]>;
  /** Standard clinical measures (CORE-10, PHQ-9, WSAS…) this provider collects. */
  measureIds?: string[];
};

export type IntakeResponse = {
  /** Answers the client confirmed or wrote. */
  values: Record<string, string>;
  /** Fields the client chose to talk about in person instead. */
  skipped: string[];
  /** Fields the provider filled in during the session, on the client's behalf. */
  providerFilled?: string[];
  /** Client closed the card; we nudge once more later, never repeatedly. */
  dismissedAt?: number;
  nudgedAt?: number;
  updatedAt: number;
};

function emit() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* noop */
  }
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    emit();
  } catch {
    /* noop */
  }
}

export function subscribeIntake(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

export function providerKeyFor(providerName: string): string {
  const key = providerName.trim().toLowerCase().replace(/\s+/g, "-");
  // The signed-in provider edits one shared selection.
  return key === "you" || key === "" ? SELF_KEY : key;
}

const SELF_KEY = "self";

export function getProviderRequest(providerName: string): ProviderRequest {
  const all = read<Record<string, ProviderRequest>>(PROVIDER_KEY, {});
  const found = all[providerKeyFor(providerName)] ?? all[SELF_KEY];
  if (found) return { measureIds: [...DEFAULT_MEASURE_IDS], ...found };
  return {
    templateIds: [...DEFAULT_TEMPLATE_IDS],
    measureIds: [...DEFAULT_MEASURE_IDS],
  };
}

/** Standard measures this provider collects, in library order. */
export function measuresFor(providerName: string): StandardMeasure[] {
  const ids = getProviderRequest(providerName).measureIds ?? [];
  return STANDARD_MEASURES.filter((m) => ids.includes(m.id));
}


export function saveProviderRequest(providerName: string, request: ProviderRequest) {
  const all = read<Record<string, ProviderRequest>>(PROVIDER_KEY, {});
  all[providerKeyFor(providerName)] = request;
  write(PROVIDER_KEY, all);
}

/** Every question in a section, including any the provider wrote themselves. */
export function allFieldsFor(
  template: IntakeTemplate,
  request: ProviderRequest,
): IntakeField[] {
  return [...template.fields, ...(request.customFields?.[template.id] ?? [])];
}

/** Questions actually asked for a template, minus anything the provider turned off. */
export function activeFields(
  template: IntakeTemplate,
  request: ProviderRequest,
): IntakeField[] {
  const off = request.excludedFieldIds ?? [];
  return allFieldsFor(template, request).filter((f) => !off.includes(f.id));
}

/** Provider-authored question added to a section. */
export function addCustomField(
  providerName: string,
  templateId: string,
  label: string,
  type: IntakeField["type"] = "long-text",
): void {
  const request = getProviderRequest(providerName);
  const custom = { ...(request.customFields ?? {}) };
  const list = [...(custom[templateId] ?? [])];
  list.push({
    id: `${templateId}.custom.${Date.now().toString(36)}`,
    label: label.trim(),
    type,
  });
  custom[templateId] = list;
  saveProviderRequest(providerName, { ...request, customFields: custom });
}

export function removeCustomField(
  providerName: string,
  templateId: string,
  fieldId: string,
): void {
  const request = getProviderRequest(providerName);
  const custom = { ...(request.customFields ?? {}) };
  custom[templateId] = (custom[templateId] ?? []).filter((f) => f.id !== fieldId);
  saveProviderRequest(providerName, {
    ...request,
    customFields: custom,
    excludedFieldIds: (request.excludedFieldIds ?? []).filter((f) => f !== fieldId),
  });
}

export function templatesFor(providerName: string): IntakeTemplate[] {
  const req = getProviderRequest(providerName);
  return req.templateIds
    .map((id) => templateById(id))
    .filter((t): t is IntakeTemplate => Boolean(t))
    .map((t) => ({ ...t, fields: activeFields(t, req) }))
    .filter((t) => t.fields.length > 0);
}

export function getResponse(appointmentId: string): IntakeResponse {
  const all = read<Record<string, IntakeResponse>>(RESPONSE_KEY, {});
  return all[appointmentId] ?? { values: {}, skipped: [], updatedAt: 0 };
}

export function saveResponse(appointmentId: string, patch: Partial<IntakeResponse>) {
  const all = read<Record<string, IntakeResponse>>(RESPONSE_KEY, {});
  const current = all[appointmentId] ?? { values: {}, skipped: [], updatedAt: 0 };
  all[appointmentId] = { ...current, ...patch, updatedAt: Date.now() };
  write(RESPONSE_KEY, all);
}

export function setAnswer(appointmentId: string, fieldId: string, value: string) {
  const current = getResponse(appointmentId);
  const values = { ...current.values };
  if (value.trim()) values[fieldId] = value;
  else delete values[fieldId];
  saveResponse(appointmentId, {
    values,
    skipped: current.skipped.filter((s) => s !== fieldId),
  });
}

/**
 * Answer captured by the provider during the session, when the client didn't
 * fill the form in time. Recorded separately so everyone can see who wrote it.
 */
export function setProviderAnswer(
  appointmentId: string,
  fieldId: string,
  value: string,
) {
  const current = getResponse(appointmentId);
  const values = { ...current.values };
  const filled = new Set(current.providerFilled ?? []);
  if (value.trim()) {
    values[fieldId] = value;
    filled.add(fieldId);
  } else {
    delete values[fieldId];
    filled.delete(fieldId);
  }
  saveResponse(appointmentId, {
    values,
    providerFilled: [...filled],
    skipped: current.skipped.filter((s) => s !== fieldId),
  });
}

/** Text stored (and shared with the provider) when a client prefers to talk. */
export const PREFER_IN_PERSON_TEXT = "I'd rather talk about this in person.";

export function toggleSkip(appointmentId: string, fieldId: string) {
  const current = getResponse(appointmentId);
  const isSkipped = current.skipped.includes(fieldId);
  const values = { ...current.values };
  if (isSkipped) {
    // Undo: clear the placeholder answer so the client can write their own.
    if (values[fieldId] === PREFER_IN_PERSON_TEXT) delete values[fieldId];
  } else {
    values[fieldId] = PREFER_IN_PERSON_TEXT;
  }
  saveResponse(appointmentId, {
    values,
    skipped: isSkipped
      ? current.skipped.filter((s) => s !== fieldId)
      : [...current.skipped, fieldId],
  });
}


export function dismissRequest(appointmentId: string) {
  saveResponse(appointmentId, { dismissedAt: Date.now() });
}

export function reopenRequest(appointmentId: string) {
  saveResponse(appointmentId, { dismissedAt: undefined });
}

export type IntakeFieldState = {
  field: IntakeField;
  template: IntakeTemplate;
  answer: string;
  /** Suggested value from the Health Passport, when we have one. */
  prefill?: PrefillValue;
  /** True when the answer came from confirming a prefill. */
  fromPassport: boolean;
  /** True when the provider entered this answer during the session. */
  byProvider: boolean;
  skipped: boolean;
  answered: boolean;
};

export type IntakeProgress = {
  templates: IntakeTemplate[];
  fields: IntakeFieldState[];
  total: number;
  answered: number;
  prefilled: number;
  open: number;
  skipped: number;
  complete: boolean;
  minutes: number;
  response: IntakeResponse;
};

export function buildIntakeProgress(
  appointmentId: string,
  providerName: string,
): IntakeProgress {
  const templates = templatesFor(providerName);
  const response = getResponse(appointmentId);
  const prefill = buildIntakePrefill();

  const fields: IntakeFieldState[] = [];
  for (const template of templates) {
    for (const field of template.fields) {
      const suggestion = prefill[field.id];
      const answer = response.values[field.id] ?? "";
      fields.push({
        field,
        template,
        answer,
        prefill: suggestion,
        fromPassport: Boolean(suggestion && answer === suggestion.value),
        byProvider: (response.providerFilled ?? []).includes(field.id),
        skipped: response.skipped.includes(field.id),
        answered: Boolean(answer.trim()),
      });
    }
  }

  const answered = fields.filter((f) => f.answered).length;
  const skipped = fields.filter((f) => f.skipped && !f.answered).length;
  const open = fields.length - answered - skipped;
  return {
    templates,
    fields,
    total: fields.length,
    answered,
    prefilled: fields.filter((f) => f.prefill && !f.answered).length,
    open,
    skipped,
    complete: open === 0,
    minutes: Math.max(1, templates.reduce((s, t) => s + t.minutes, 0)),
    response,
  };
}

/** Accept every available Health Passport suggestion in one tap. */
export function applyAllPrefill(appointmentId: string, providerName: string) {
  const progress = buildIntakeProgress(appointmentId, providerName);
  const values = { ...progress.response.values };
  for (const f of progress.fields) {
    if (f.prefill && !values[f.field.id]) values[f.field.id] = f.prefill.value;
  }
  saveResponse(appointmentId, { values });
}

export const ALL_TEMPLATES = INTAKE_TEMPLATES;
