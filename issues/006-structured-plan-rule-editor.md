## Parent

`ecommerceapi/agents/knowledge/plans-and-gating.md` (admin plan management)

Status: done

## What to build

`pages/dashboard/billing/plans/index.vue` edits a plan's `featureAccessRules` as a JSON text box. Replace it with a form built from the backend's list of valid rules, so an admin picks values instead of typing them, and warn when a plan is part of the seeded catalog.

- One section each for **Features** (on/off), **Limits** (a whole number, or "no cap") and **Dashboard areas** (none, view or manage), listing every rule from `GET /v1/admin/billing/plan-rules` with its label and description.
- Each rule shows what **leaving it out** means (feature: not included, limit: unlimited, area: manage) and offers an explicit "not set" choice, because the defaults differ and a limit of 0 is not the same as no limit.
- A plan marked `seeded` shows a notice: "This plan is part of the catalog. ShopSynch rewrites these rules every time the backend starts, so changes made here will be lost. Change the catalog in code instead." The form stays usable for non-seeded plans; for seeded ones it is read-only unless the admin confirms.
- API validation errors (422) appear beside the rule they belong to.
- Keep the raw JSON view as a read-only "show JSON" for debugging.

## Acceptance criteria

- [x] Rules are listed from the backend, not hard-coded; a rule added on the backend appears without a dashboard change.
- [x] Saving writes only valid values; a 422 shows per-rule messages beside the field.
- [x] "Not set" removes the key; the form explains what that means for each kind.
- [x] A seeded plan shows the notice and needs confirmation to edit.
- [x] Uses existing admin components, the endpoint registry and a store; add an admin journey.

## Blocked by

- `ecommerceapi/issues/096-admin-plan-rule-catalog-and-validation.md`

## User stories addressed

Plan management for the super admin.
