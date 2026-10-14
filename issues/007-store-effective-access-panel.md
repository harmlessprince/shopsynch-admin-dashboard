## Parent

`ecommerceapi/agents/knowledge/plans-and-gating.md` (admin plan management)

Status: start

## What to build

On a merchant's detail page (`pages/dashboard/merchants/[tenantId].vue`), add a **Plan and access** section so support can answer "why does this store see this?" without reading code.

- The plan, the subscription status, and whether plan rules apply to the store. When they do not, say which cause applies: billing enforcement off for the store, an active override, or an exempt subscription, with the plain message.
- The effective access: every feature (included or not), every limit (cap, 0 = left out, none = no cap) and every dashboard area (none, view, manage), grouped and labelled.
- A short note: dashboard areas limit dashboard requests only, not the API.
- Loading and error states; a store not found shows the API message.

## Acceptance criteria

- [ ] The section shows plan, subscription status, enforcement state with reason, and effective features, limits and areas.
- [ ] A store with enforcement off clearly says rules do not apply and why, instead of looking like a plan that includes everything.
- [ ] A store with no plan says so.
- [ ] Uses existing admin components and the endpoint registry; add an admin journey.

## Blocked by

- `ecommerceapi/issues/097-admin-store-effective-access.md`

## User stories addressed

Support can explain a store's access.
