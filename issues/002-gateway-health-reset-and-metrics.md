## Parent PRD

`ecommerceapi/docs/prds/payment-gateway-availability-and-control.md`

Status: start

## What to build

The admin dashboard shows each gateway's health: circuit state, recent failures, when it opened and when it will be tried again, plus start success rate, latency and fallback rate. The admin can reset a circuit by hand. Alerts for a circuit opening or closing and for a low success rate are visible.

## Acceptance criteria

- [ ] A gateway health view lists platform circuits and metrics per gateway.
- [ ] A reset action closes the circuit after confirmation and refreshes the view.
- [ ] Alert states are shown clearly (open circuit, low success rate).
- [ ] Uses existing admin components; add an admin journey.

## Blocked by

- Blocked by `ecommerceapi/issues/094-circuit-alerts-reset-and-gateway-metrics.md`

## User stories addressed

- User stories 38, 39, 40, 50
