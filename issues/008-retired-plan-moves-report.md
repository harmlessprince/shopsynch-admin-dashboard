## Parent

`ecommerceapi/agents/knowledge/plans-and-gating.md` (retired plans move to Pro)

Status: start

## What to build

When a plan is removed from the catalog, its stores are moved to Pro automatically. Let the admin see which stores were moved, from which plan and when, so a store that says "my plan changed" can be answered.

In the billing operations area, add a filter or a short list for the reason `plan_retired` over the existing billing audit records: store, previous plan, new plan, date. A store's detail page links to its own entry when it has one.

## Acceptance criteria

- [ ] The admin can list subscriptions moved off retired plans with store, previous plan, new plan and date.
- [ ] An empty result says nothing was moved rather than showing a blank table.
- [ ] A moved store's detail page shows a line saying it was moved and when.
- [ ] Uses the existing data table, store and endpoint registry; add an admin journey.

## Blocked by

- `ecommerceapi/issues/098-audit-subscriptions-moved-off-retired-plans.md`

## User stories addressed

Support can explain a plan change the merchant did not choose.
