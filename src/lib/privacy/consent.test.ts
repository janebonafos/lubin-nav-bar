import { test } from "node:test";
import assert from "node:assert/strict";
import { canSaveInformation, DEFAULT_CHOICES, storeCareConsent, hasCareConsent, isProviderRole, CONSENT_KEY } from "./consent";

function withWindow(localStorage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }, run: () => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage, dispatchEvent: () => true } });
  try { run(); } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("saving is allowed as soon as the person taps I agree", () => {
  assert.equal(canSaveInformation(false), true);
});
test("saving cannot be submitted twice while in progress", () => {
  assert.equal(canSaveInformation(true), false);
});
test("the consent prompt is skipped for providers", () => {
  const values = new Map<string, string>([["lubin.userRole", "provider"]]);
  withWindow({ getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }, () => {
    assert.equal(isProviderRole(), true);
  });
  const patient = new Map<string, string>([["lubin.userRole", "client"]]);
  withWindow({ getItem: (k) => patient.get(k) ?? null, setItem: (k, v) => patient.set(k, v) }, () => {
    assert.equal(isProviderRole(), false);
  });
});
test("research is off by default", () => { assert.equal(DEFAULT_CHOICES.research, false); });
test("AI training is off by default", () => { assert.equal(DEFAULT_CHOICES.aiTraining, false); });
test("only explicit consent enables local saving", () => {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) },
    dispatchEvent: () => true,
  } });
  try {
    assert.equal(hasCareConsent(), false);
    assert.equal(values.has(CONSENT_KEY), false);
    storeCareConsent();
    assert.equal(hasCareConsent(), true);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});