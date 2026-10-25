## Parent

`ecommerceapi/docs/prds/win-back-discount-offer.md`

Status: start

## What to build

Add the win-back discount fields to the admin pricing-offer form and a redemptions view. A win-back offer is a pricing offer whose price overrides carry a discount percent and a duration in months. The backend work that stores these fields is in `ecommerceapi/issues/105-winback-offer-model-and-admin-config.md`, which extends the existing `AdminPricingOfferController` — no new admin endpoints.

- The pricing-offer form gains **Discount percent** and **Discount duration (months)** inputs per plan-and-period override; leaving percent empty means a fixed price instead.
- The offer list/table surfaces the two fields (or "none" when absent).
- A view lists win-back redemptions — which merchants accepted and when — using the existing admin offer/redemption endpoints.
- API validation errors (422) appear beside the field they belong to.

Follow the admin dashboard component kit, the form-components rule, and the `manage-plans` skill.

## Acceptance criteria

- [ ] Admin can set percent + months when creating/editing an offer; values persist via the admin API.
- [ ] The list/table renders the new fields, or "none" when absent.
- [ ] Admin can view which merchants redeemed the win-back offer.
- [ ] Uses existing admin components, the endpoint registry, and a store; add an admin journey.

## Blocked by

- `ecommerceapi/issues/105-winback-offer-model-and-admin-config.md`

## User stories addressed

- User story 10
- User story 13

## Copy

Admin pricing-offer form field labels + helper text:

**Discount percent**
- Label: `Discount percent`
- Helper: `Percentage off the plan's list price. Leave empty to set a fixed price instead.`

**Discount duration**
- Label: `Discount duration (months)`
- Helper: `How long the discount lasts, e.g. 6 months. A 3-month plan gets 2 discounted renewals; a 12-month plan gets 1.`
