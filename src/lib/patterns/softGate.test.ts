import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isSignedUp, markIntakeDone, mockSignUp } from "./softGate";

test("full self-check access requires free signup, not intake completion", () => {
  const values = new Map<string, string>();
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
      dispatchEvent: () => true,
    },
  });
  try {
    assert.equal(isSignedUp(), false);
    markIntakeDone();
    assert.equal(isSignedUp(), false);
    mockSignUp();
    assert.equal(isSignedUp(), true);
    assert.equal(values.get("lubinai_guest_mode"), "false");
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});