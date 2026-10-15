---
name: manage-plans
description: Guide for adding or updating billing plan management, rule editing, store effective access views, or subscription operations in the ShopSync Admin Dashboard.
---

# Manage Billing Plans and Gating in Admin Dashboard

Use this skill when extending or modifying billing plans, plan rule definitions, effective store access panels, or subscription operational tools in the `admin_dashboard`.

## 1. Always Read Upstream Contracts

Before modifying plan fields or rules:
- Read `ecommerceapi/agents/knowledge/plans-and-gating.md` for backend rules and seeder conventions.
- Review `admin_dashboard/agents/knowledge/plan-management.md` for admin UI behaviors.
- Check backend skill `ecommerceapi/agents/skills/gate-by-plan/SKILL.md` when introducing new plan features or limits.

## 2. Dynamic Plan Rule Catalog

Never hardcode rules in the admin dashboard:
- Query `GET /v1/admin/billing/plan-rules` using `adminBillingPlansStore.fetchPlanRules()`.
- Rules are typed into:
  - `kind: feature` -> Boolean switch or "Not set" (missing = not included).
  - `kind: limit` -> Integer cap or "Not set / No cap" (missing = unlimited; `0` = disabled).
  - `kind: area` -> `none` | `view` | `manage` or "Not set" (missing = `manage`).
- When submitting `featureAccessRules`, omit keys that are marked "Not set" to preserve default backend fallbacks.

## 3. Seeded Plan Safety

Catalog plans (`starter`, `pro`, `growth`, `developer`) have `seeded: true`:
- Changes made in the UI will be wiped on the next backend deployment because `BillingPricingSeeder` re-seeds the catalog idempotently.
- Always require user confirmation before allowing temporary edits on seeded plans.
- If permanent changes are needed, update `ecommerceapi/src/main/java/com/harmlessprince/ecommerceApi/billing/BillingPricingSeeder.java`.

## 4. Merchant Effective Access & Debugging

When support asks "why can't this store access X?":
- View `GET /v1/admin/merchants/{tenantId}/billing/access`.
- Check `enforcementApplies`:
  - If `false`, inspect `enforcementReasonCode` (`billing_enforcement_off`, `active_override`, or `subscription_exempted`).
  - If `true`, inspect the effective values under `features`, `limits`, and `areas`.
- Check if the store was affected by plan retirement in `GET /v1/admin/billing/subscriptions/audit-logs?tenantId={tenantId}&reason=plan_retired`.

## 5. Resync to Test Mode

- Only visible to Super Admins on the live backend: `POST /v1/admin/billing/subscriptions/resync-to-test`.
- Display a confirmation prompt explaining that this triggers the live-to-test subscription replication stream.
