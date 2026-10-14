## Parent PRD

`ecommerceapi/docs/prds/payment-gateway-availability-and-control.md`

Status: start

## What to build

The super admin can see and edit who is emailed when ShopSynch's own credentials for a payment gateway are rejected or become valid again. The backend stores this as the platform setting `platformPaymentAlertEmails` (comma-separated emails, empty by default, so nobody is emailed until it is set), changed through the existing admin settings API (`PATCH /v1/admin/settings/{key}/value`). Add a small form on the admin payment settings page, with email validation, instead of editing the raw setting.

## Acceptance criteria

- [ ] The form shows the current recipients and says that no one is alerted while it is empty.
- [ ] Saving validates each email, writes the setting through the admin settings endpoint, and shows API validation errors beside the field.
- [ ] Uses the existing admin form components, the endpoint registry and the settings store; add an admin journey.

## Blocked by

- Blocked by `ecommerceapi/issues/091-gateway-credential-health-and-owner-notifications.md` (built)

## User stories addressed

- User stories 29, 40 (the alert recipients; the circuit alert itself is in `ecommerceapi/issues/094-circuit-alerts-reset-and-gateway-metrics.md`)
