# Admin Billing Plan Management and Access Gating

This document guides developers working on billing plans, merchant plan access, and subscription operations within `admin_dashboard`.

## Core Concepts

### 1. Catalog vs Custom Plans
- **Catalog Plans (`starter`, `pro`, `growth`, `developer`):**
  - Seeded into the database by `BillingPricingSeeder` on every backend startup.
  - Marked with `seeded: true`.
  - Any modifications made directly in the admin dashboard to a seeded plan's rules or prices will be overwritten on the next backend deployment/restart. Changes to catalog plans must be committed in backend seed code (`BillingPricingSeeder.java`).
  - In `admin_dashboard/pages/dashboard/billing/plans/index.vue`, seeded plans display an explicit warning notice and require explicit user confirmation to unlock temporary editing.
- **Custom / Hidden / Admin-Only Plans:**
  - Created by platform administrators through the dashboard.
  - Can be marked `adminOnly: true` (only assigned by admins, hidden from merchant checkout) or `publicVisible: false`.

### 2. The Three Rule Kinds & Missing-Key Semantics
Rule definitions are served dynamically by `GET /v1/admin/billing/plan-rules`. They fall into three kinds:

1. **Features (`kind: feature`)**:
   - Boolean entitlements (e.g., `products_bundles`, `shipment_tracking`, `customer_reviews`, `carrier_quotes`, `report_exports`, `audit_trail`, `pos_access`, `whatsapp_messaging`).
   - **Missing Key Meaning:** Not included (`false`).
2. **Limits (`kind: limit`)**:
   - Numeric caps (e.g., `staff_limit`, `locations_limit`, `booking_resources_limit`, `invoices_monthly_limit`, `promo_ads_active_limit`, `ask_analytics_monthly_limit`).
   - A value of `0` means 0 permitted (disabled/left out).
   - **Missing Key Meaning:** No cap (`null` / unlimited).
3. **Dashboard Areas (`kind: area`)**:
   - Area permissions controlling merchant dashboard navigation (`dashboard_area_*` for areas defined in `PlanAreaCodes.ALL`).
   - Allowed values: `none` (no access), `view` (read-only), `manage` (full control).
   - **Missing Key Meaning:** Full control (`manage`).
   - **Important Note:** Dashboard areas restrict merchant dashboard UI only; backend API endpoints are governed by feature entitlements.

### 3. Merchant Effective Access & Enforcement
Located on the merchant detail page (`pages/dashboard/merchants/[tenantId].vue`):
- Fetched from `GET /v1/admin/merchants/{tenantId}/billing/access`.
- Indicates whether plan rules apply to this store (`enforcementApplies: true | false`).
- If `enforcementApplies: false`, the UI displays the exact reason:
  - `billing_enforcement_off`: Billing enforcement toggle is disabled globally or for this store.
  - `active_override`: An admin has applied an active billing override.
  - `subscription_exempted`: The subscription status is `EXEMPTED`.
- Shows effective grouped features, limits, and areas as computed by the backend's entitlement resolver.

### 4. Retired Plan Moves Audit Report
Located on `pages/dashboard/billing/operations.vue`:
- When a plan outside the catalog is deleted during seeding, stores on that plan are automatically moved to the default plan (`pro`).
- Every move is audited as a `BillingAuditLog` with `reason: "plan_retired"`.
- Admins can query `GET /v1/admin/billing/subscriptions/audit-logs?reason=plan_retired` to explain why a merchant's plan changed.
- On a merchant's detail page, if a `plan_retired` log exists for that tenant, a warning notice banner is displayed.

### 5. Resync Subscriptions to Test
Located on `pages/dashboard/billing/operations.vue`:
- Endpoint: `POST /v1/admin/billing/subscriptions/resync-to-test` (Super Admin only).
- Live-only backend action that publishes change events to replicate current merchant subscription states into the test environment.
- Safe to run idempotently whenever test mode data needs resynchronization.

## Related Backend Notes & Skills
- Backend Knowledge: `ecommerceapi/agents/knowledge/plans-and-gating.md`
- Backend Gating Skill: `ecommerceapi/agents/skills/gate-by-plan/SKILL.md`
