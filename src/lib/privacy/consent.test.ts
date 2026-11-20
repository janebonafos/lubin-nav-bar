import { test } from "node:test";
import assert from "node:assert/strict";
import { canSaveInformation, DEFAULT_CHOICES, storeCareConsent, hasCareConsent, CONSENT_KEY } from "./consent";

test("saving is allowed as soon as the person taps I agree", () => {
  assert.equal(canSaveInformation(false), true);
});
test("saving cannot be submitted twice while in progress", () => {
  assert.equal(canSaveInformation(true), false);
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