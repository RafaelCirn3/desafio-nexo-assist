import { test } from "node:test";
import assert from "node:assert/strict";
import { canReopen, isDuplicate, ticketInput } from "./ticket-rules.js";
import { calculateDueAt, isOverdue } from "./sla.js";

test("ticket requires complete classification", () => {
  assert.equal(ticketInput.safeParse({ title: "VPN parou" }).success, false);
});
test("duplicate matching ignores casing and accents, but respects category", () => {
  const a = { title: "Conexão VPN", category: "REDE_VPN", type: "INC" };
  assert.equal(isDuplicate(a, { title: "conexao VPN!", category: "REDE_VPN", type: "INC" }), true);
  assert.equal(isDuplicate(a, { title: "conexao VPN!", category: "ACESSO", type: "INC" }), false);
});
test("reopen within seven days only", () => {
  const now = new Date("2026-10-28T12:00:00Z");
  assert.equal(canReopen(new Date("2026-10-21T12:00:00Z"), now), true);
  assert.equal(canReopen(new Date("2026-10-20T12:00:00Z"), now), false);
});
test("critical is elapsed hour; others business time", () => {
  const friday = new Date("2026-10-30T20:00:00Z"); // 17:00 São Paulo
  assert.equal(calculateDueAt("CRITICAL", friday).toISOString(), "2026-10-30T21:00:00.000Z");
  assert.equal(calculateDueAt("HIGH", friday).toISOString(), "2026-11-02T14:00:00.000Z"); // Monday 11:00 São Paulo
});
test("overdue is strictly after deadline", () => {
  const due = new Date("2026-10-28T12:00:00Z");
  assert.equal(isOverdue(due, due), false);
  assert.equal(isOverdue(due, new Date(due.getTime() + 1)), true);
});
