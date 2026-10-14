## Parent

`ecommerceapi/agents/knowledge/plans-and-gating.md` (test mode)

Status: start

## What to build

A "Resync subscriptions to test" action for the super admin in billing operations, with a short explanation: it copies every store's current plan to test mode so test mode follows the same plan as live, it is safe to run again, and it is needed once after deploying replication. Show how many subscriptions were sent. Ask for confirmation first; the action is live only and the page says so.

## Acceptance criteria

- [ ] A confirmed click calls the endpoint and shows the count sent.
- [ ] Errors (including "not available on the test backend") show the API message.
- [ ] Only the super admin sees the action.
- [ ] Uses existing admin components and the endpoint registry; add an admin journey.

## Blocked by

- `ecommerceapi/issues/099-admin-resync-subscriptions-to-test.md`

## User stories addressed

Operations can finish a deploy without the internal key.
