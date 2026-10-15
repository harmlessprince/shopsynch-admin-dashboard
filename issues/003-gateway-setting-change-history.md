## Parent PRD

`ecommerceapi/docs/prds/payment-gateway-availability-and-control.md`

Status: done

## What to build

The per-country gateway view shows who changed which gateway setting and when, so the admin can see the history next to the control. Each change already writes an audit record (resource `PAYMENT_GATEWAY_SETTING`, resource id the country or `DEFAULT`, with the previous and new enabled gateways and default gateway in its metadata). The existing admin audit log read (`GET /v1/admin/audit-logs`, page and size only) cannot yet be narrowed to this resource, so the backend part adds that filter.

## Acceptance criteria

- [x] Backend: the admin audit log read accepts a resource filter (and optional resource id) so only `PAYMENT_GATEWAY_SETTING` entries for a country are returned; targeted Java 17 test; internal API docs and `features.json` updated.
- [x] The gateway-by-country view lists the latest changes for the selected country: admin, time, gateways switched on or off and default change.
- [x] The list refreshes after the admin saves a change.
- [x] Uses the existing admin components and endpoint registry; add an admin journey.

## Blocked by

- Blocked by `admin_dashboard/issues/001-per-country-gateway-control.md`

## User stories addressed

- User story 7
