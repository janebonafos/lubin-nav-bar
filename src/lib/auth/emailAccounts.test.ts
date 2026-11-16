import { test } from "node:test";
import assert from "node:assert/strict";

const store = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  },
};
const { checkEmail, isValidEmail, registerEmailAccount } = await import("./emailAccounts");

test("only valid emails are accepted", () => {
  assert.equal(isValidEmail("jane@mail.com"), true);
  assert.equal(isValidEmail("jane@mail"), false);
  assert.equal(isValidEmail("jane mail.com"), false);
  assert.equal(isValidEmail("jane@mail.c"), false);
});

test("signing up with an existing email asks to sign in", () => {
  assert.equal(checkEmail("client@example.com", "signup", "client").kind, "exists");
});

test("signing in with an unknown email suggests creating an account", () => {
  assert.equal(checkEmail("new@mail.com", "signin", "client").kind, "not-found");
});

test("a provider email used as a patient is flagged", () => {
  assert.deepEqual(checkEmail("provider@example.com", "signin", "client"), { kind: "other-role", registeredAs: "provider" });
});

test("registered emails are remembered", () => {
  registerEmailAccount("New@Mail.com", "client");
  assert.equal(checkEmail("new@mail.com", "signin", "client").kind, "ok");
});
