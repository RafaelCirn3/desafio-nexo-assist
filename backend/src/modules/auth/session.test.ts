import { test } from "node:test";
import assert from "node:assert/strict";
import { issueToken, verifyToken, requireAnalyst, requireOwner } from "./session.js";
const identity = { id: "2bb54e55-36b6-44c5-93f0-36724c66e1ab", email: "ana@nexo.example", role: "EMPLOYEE" as const };
test("token verifies and fails if tampered or expired", () => {
  const token = issueToken(identity, 1_000_000);
  assert.deepEqual(verifyToken(token, 1_000_001), identity);
  assert.throws(() => verifyToken(token + "bad", 1_000_001));
  assert.throws(() => verifyToken(token, 1_000_000 + 8 * 3600_000));
});
test("owner and analyst guards deny cross-employee access", () => {
  requireOwner(identity, identity.id);
  assert.throws(() => requireOwner(identity, "other"));
  assert.throws(() => requireAnalyst(identity));
  requireAnalyst({ ...identity, role: "ANALYST_N2" });
});
