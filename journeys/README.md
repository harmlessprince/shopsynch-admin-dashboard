# Admin Dashboard User Journeys

This directory contains executable journey definitions for validating administrative workflows across payment gateway controls and billing plan management.

## Journey Index

| File | Journey Name | Issue Reference | Description |
|---|---|---|---|
| [`01_per_country_gateway_control.journey.xml`](./01_per_country_gateway_control.journey.xml) | Per-Country Payment Gateway Control | Issue 001 | Enable/disable gateways per country (NG), select default gateway, impact count confirmation. |
| [`02_gateway_health_reset_and_metrics.journey.xml`](./02_gateway_health_reset_and_metrics.journey.xml) | Gateway Health, Circuit Reset and Metrics | Issue 002 | Real-time circuit breaker status (CLOSED, OPEN, HALF_OPEN), metrics, latency, manual circuit reset. |
| [`03_gateway_setting_change_history.journey.xml`](./03_gateway_setting_change_history.journey.xml) | Payment Gateway Setting Change History | Issue 003 | Chronological audit trail of gateway changes filtered by country beside routing controls. |
| [`04_support_store_gateway_availability.journey.xml`](./04_support_store_gateway_availability.journey.xml) | Merchant Gateway Availability Panel | Issue 004 | Support operator view of country-enabled vs store-configured gateways on merchant detail page. |
| [`05_platform_payment_alert_recipients.journey.xml`](./05_platform_payment_alert_recipients.journey.xml) | Platform Payment Alert Recipients | Issue 005 | Configure and validate alert email recipients for invalid credentials or opened circuits. |
| [`06_structured_plan_rule_editor.journey.xml`](./06_structured_plan_rule_editor.journey.xml) | Structured Plan Rule Editor | Issue 006 | Dynamic rule editor grouped by Features, Limits, Areas; missing-key semantics, seeded plan guard. |
| [`07_store_effective_access_panel.journey.xml`](./07_store_effective_access_panel.journey.xml) | Store Effective Access Panel | Issue 007 | Support view of merchant's plan, subscription status, billing enforcement reason, and access breakdown. |
| [`08_retired_plan_moves_report.journey.xml`](./08_retired_plan_moves_report.journey.xml) | Retired Plan Moves Report | Issue 008 | Audit report of stores moved off retired plans to Pro, with merchant detail link. |
| [`09_resync_subscriptions_to_test.journey.xml`](./09_resync_subscriptions_to_test.journey.xml) | Resync Subscriptions to Test Mode | Issue 009 | Super admin action to replicate live subscriptions to test mode with confirmation and count. |
| [`10_subscription_refunds.journey.xml`](./10_subscription_refunds.journey.xml) | Subscription Refunds | GitHub #54 | List refunds, status badges, Refresh an open refund, time taken back. |
| [`11_duplicate_subscription_payments.journey.xml`](./11_duplicate_subscription_payments.journey.xml) | Duplicate Subscription Payments | GitHub #55 | Shadow mode duplicates review, type filter, Refund with required reason. |
| [`12_incoming_payment_webhooks.journey.xml`](./12_incoming_payment_webhooks.journey.xml) | Incoming Payment Webhooks | GitHub #56 | Status counts, failed/unmatched highlight, reference search, payload and headers detail. |
| [`13_pricing_offers.journey.xml`](./13_pricing_offers.journey.xml) | Pricing Offers | Pricing offers screen | Offer status, slots, price overrides and perks, pause/resume/end with confirmation, redemption commitments. |

## Verification

Validate XML syntax with:
```bash
xmllint --noout admin_dashboard/journeys/*.journey.xml
```
