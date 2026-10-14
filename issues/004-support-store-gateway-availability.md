## Parent PRD

`ecommerceapi/docs/prds/payment-gateway-availability-and-control.md`

Status: start

## What to build

On a merchant's detail page, support sees every payment gateway for that store with whether it is available and, if not, the reason code, the plain message and the next step, exactly as the merchant sees them, so a merchant's question can be answered without reading code. Backend: `GET /v1/admin/merchants/{tenantId}/payment-gateways`. Platform credentials are checked in test mode, so the page says so.

## Acceptance criteria

- [ ] The merchant detail page has a payment gateways section listing each gateway with available or unavailable, reason code, message, next step and next-step hint, and which gateway is the store's default.
- [ ] Loading and error states are handled; a store not found shows the API message.
- [ ] A note explains that platform credentials are checked in test mode.
- [ ] Uses the existing admin components and the endpoint registry; add an admin journey.

## Blocked by

None - the backend endpoint is built (`ecommerceapi/issues/090-merchant-gateway-catalogue-reasons-and-payout-readiness.md`)

## User stories addressed

- User story 32
