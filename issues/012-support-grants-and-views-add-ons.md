# 12: Support grants and views add-ons in the admin dashboard

**Status:** ready-for-agent
**Type:** AFK
**Parent PRD:** `ecommerceapi/docs/prds/capacity-add-ons.md`
**Blocked by:** ecommerceapi 154 (ecommerceapi/issues/154-support-grants-add-on-and-limits-follow.md)
**GitHub tracker:** not filed yet

## What to build

In the admin dashboard, a support agent can see a store's base limits, add-ons and effective limits, and grant, reduce or remove an add-on with a required reason.

## Acceptance criteria

- [ ] The merchant billing view shows, per limit, the plan part, the add-on part and the effective total.
- [ ] Each add-on shows quantity, the price it was bought at, the period it runs to, its status, and where it came from (payment or admin grant).
- [ ] Grant, reduce and remove need a reason, show the audit entry afterwards, and surface validation errors beside the fields.
- [ ] Only users with the right admin permission see the actions.
