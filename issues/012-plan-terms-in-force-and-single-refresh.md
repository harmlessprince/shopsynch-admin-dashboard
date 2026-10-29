# 012: Plan terms in force and single-store refresh

**Status:** ready-for-agent
**Type:** AFK
**Parent PRD:** None. Follows `ecommerceapi/issues/154-plan-terms-snapshot-per-subscription.md`
**Blocked by:** ecommerceapi 154 (`ecommerceapi/issues/154-plan-terms-snapshot-per-subscription.md`)
**GitHub tracker:** not filed yet

## What to build

On the merchant billing view in the admin dashboard, a support agent can see which plan terms a store is actually held to (its own snapshot), next to the live plan, and can refresh one store to the current plan with a reason. This is the view the add-ons and bulk refresh screens build on.

## Acceptance criteria

- [ ] The merchant billing view shows the terms in force: plan, when they were taken, and which payment (or backfill) caused them.
- [ ] The terms in force are shown next to the live plan, with the rules that differ marked.
- [ ] A store whose snapshot predates an attribute is flagged, naming the attribute.
- [ ] The agent can refresh the store to the current plan with a required reason; the result and the audit entry are shown afterwards.
- [ ] Validation and server errors appear beside the field or action that caused them.
- [ ] Only admins with the plan management permission see the refresh action.
