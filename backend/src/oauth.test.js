import test from "node:test";
import assert from "node:assert/strict";
import { githubHandleFromUser } from "./oauth.js";

test("GitHub connector accepts only a handle proved by a GitHub identity", () => {
  assert.equal(
    githubHandleFromUser({
      identities: [{ provider: "github", identity_data: { user_name: "kiah-dev" } }],
    }),
    "kiah-dev",
  );
  assert.equal(
    githubHandleFromUser({
      identities: [{ provider: "google", identity_data: { user_name: "not-github" } }],
      user_metadata: { user_name: "not-github" },
    }),
    null,
  );
  assert.equal(
    githubHandleFromUser({
      identities: [{ provider: "github", identity_data: { user_name: "bad/name" } }],
    }),
    null,
  );
});
