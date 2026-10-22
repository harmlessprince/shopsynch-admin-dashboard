# Admin Payments, Refunds, Webhooks and Pricing Offers

Screens for platform payment operations in `admin_dashboard`. Backend notes: `ecommerceapi/agents/knowledge/billing.md` (Paystack refunds, pricing offers) and `payments-payment-links-orders.md` (webhook inbox).

## Pages

| Page | Route | Store | Backend |
| --- | --- | --- | --- |
| Subscription refunds | `/dashboard/billing/refunds` | `adminBillingRefunds` | `/v1/admin/billing/refunds` |
| Duplicate payments | `/dashboard/billing/duplicate-payments` | `adminBillingShadow` (+ refunds) | `/v1/admin/billing/shadow/*` |
| Incoming webhooks | `/dashboard/payment-gateways/webhooks` | `adminIncomingWebhooks` | `/v1/admin/webhooks/incoming*` |
| Pricing offers | `/dashboard/billing/offers` | `adminBillingOffers` | `/v1/admin/billing/offers*` |

All four are reached from buttons on the billing plans page or the payment gateways page, not the sidebar.

## Rules that are easy to get wrong

- **Pricing offers are not plans.** Founding Merchants is a `PricingOffer`. The plan seeder deletes any plan outside the catalog on every backend start; offers are stored separately and survive.
- **List endpoints return bare arrays with no total** (refunds, shadow entries, webhooks). Use DataTable `pagination-type="cursor"` and treat a full page as "there may be more".
- **Refunds:** only a payment flagged `WOULD_BE_DUPLICATE` can be refunded, once per payment (`active`); a `FAILED` refund frees it again. The merchant's extra time is taken back when the refund is `PROCESSED`, not when requested. Never start a second refund for an `UNCERTAIN` one; refresh it.
- **Webhook payloads hold customer details.** Show them in the detail dialog only. Never pass them to `logger`.
- **Offer edits** replace the whole configuration. Code, status and redemption count do not change, the cap cannot drop below redemptions made, and prices already locked for stores are unaffected. Status changes use the pause, resume and end endpoints, never the edit form. Setup call and review flags are tracking only.
- **Errors:** the global interceptor toasts 400 and 422. Stores keep 422 field errors (`requestErrors`, `formErrors`) so the form can show them beside the field.
- **Empty DataTable slots fall back to the default actions menu.** A `#cell(_action)` slot that can render nothing must render a placeholder.
- **`AppInput` gives every input the same `id`**, so tests locate fields by placeholder, not label.

## Notices for settings that ship empty

`components/Dashboard/EmptySettingNotice.vue` shows a banner when a global setting is loaded and empty (it stays silent while the setting is unknown). Use `tone="warning"` when nothing happens until it is set, `tone="info"` when there is a working fallback. Wrap it in a small component per setting so pages stay one line.

| Setting | Notice | Where | Empty means |
| --- | --- | --- | --- |
| `platformPaymentAlertEmails` | `PaymentAlertEmailsWarning` (warning) | payment gateways, refunds, duplicate payments, webhooks | alerts only go to the server log |
| `merchantFunnelWeeklyDigestEmails` | `FunnelDigestEmailsNotice` (info) | merchant funnel | the Monday digest falls back to every Super Admin |

These are the only two global settings the backend seeds as empty (`AppSettingSeeder`). Add a notice for a new one only if it ships empty and someone needs to act.

On the Settings page each generic card has the id `setting-<key>`; pass it as the notice's `anchor`. The payment alert card keeps its own input id (`platformPaymentAlertEmails`).

## Gotchas found in live testing

- The offer update request validates `code` as required even though the backend ignores it, so the edit form always sends it.
- A commitment note can be replaced but never cleared: the backend ignores a blank note.
- Editing an offer must keep its original start and end timestamps when the date is unchanged, or every save shifts them to midnight UTC.
