# Ticket service — policy and limitations

The PRD requires INC/REQ, fixed categories, complete drafts, confirmed mutations, owner isolation, no duplicates, reopening within 7 days, and SLAs. TicketService implements the core domain entrypoints (prepareDraft, confirmDraft, listMine, getMine, findDuplicate). No HTTP route is exposed yet.

## Invariants
- No ticket creation/update without a pending draft associated with an AGENT conversation owned by the employee.
- An employee's ticket queries and mutations are filtered by ownerId, never accepted from an untrusted request without a future auth layer.
- Exact normalized title + category + type is the *initial* deterministic duplicate criterion; semantic duplicate detection will be added at agent/service integration.
- Updates reset the deadline; event history remains persisted.
- All calls to confirmDraft use a serializable transaction. SQLite concurrent writers may still require explicit conflict retry in production.
- Reference numbers use random identifiers rather than a sequence, to avoid a shared counter.
- Critical SLA runs 24/7. Noncritical follows 08:00–18:00 Mon–Fri in America/Sao_Paulo, without holidays (holiday calendar is not specified in PRD).
- Draft categories and priorities are validated. Priority is **not yet computed from impact and urgency**: a later classifier/policy must derive these, rather than trusting agent input.
- Ticket references and data are never returned cross-owner by this service.

## Follow-up
- Auth/role checks at API entrypoint; no caller should supply arbitrary ownerId.
- Creation and assignment for analysts, handoff routing, legacy system outages/retries.
- Stronger duplicate detection and race-safe uniqueness around concurrent creation.
- Contract/integration tests against real SQLite + adversarial identity cases.
- The prototype's 30-message limit applies to chat sessions, not ticket service.
