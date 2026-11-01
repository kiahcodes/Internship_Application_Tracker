import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUsername, usernameError } from "./username.js";

test("usernames are lowercased and a leading @ is dropped", () => {
  assert.equal(normalizeUsername("  @Kiah_D "), "kiah_d");
});

test("format and reserved names are rejected", () => {
  assert.equal(usernameError("kiah_d1"), null);
  assert.match(usernameError("ab"), /3-30/);
  assert.match(usernameError("has space"), /3-30/);
  assert.match(usernameError("Upper"), /3-30/); // must be normalized first
  assert.match(usernameError("admin"), /isn't available/);
});
