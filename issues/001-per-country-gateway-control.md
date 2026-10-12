## Parent PRD

`ecommerceapi/docs/prds/payment-gateway-availability-and-control.md`

Status: start

## What to build

The super admin sees every gateway for each country (Nigeria for now) in the admin dashboard and can enable or disable it and choose the default gateway for the country. Before disabling, the admin sees how many stores are affected and must confirm. Changes take effect for new payments immediately and show who changed what.

## Acceptance criteria

- [ ] A gateway-by-country view lists each gateway with enabled state, the country default and the number of stores using it.
- [ ] Enabling, disabling and choosing the default call the backend endpoints and show validation errors.
- [ ] Disabling shows the affected store count and needs confirmation.
- [ ] The view shows the audit trail of changes.
- [ ] Uses the existing admin components and the endpoint registry; add an admin journey.

## Blocked by

- Blocked by `ecommerceapi/issues/088-per-country-gateway-enablement-and-defaults.md`

## User stories addressed

- User stories 1, 3, 4, 6
