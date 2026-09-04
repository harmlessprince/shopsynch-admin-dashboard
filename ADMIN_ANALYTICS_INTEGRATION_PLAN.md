# Admin Analytics Client Integration Plan

## Goal

Expose ShopSynch product analytics inside the admin dashboard using the backend rollup API:

`GET /v1/admin/analytics/summary`

Admins can manually refresh rollups through:

`POST /v1/admin/analytics/rollups/run`

The admin dashboard should help answer:

- Which app generated the activity: Merchant Dashboard vs Customer Storefront.
- Which tenants are using the dashboard/storefront most.
- Which pages are most visited.
- Which features are interacted with most.
- Which events are happening most often.
- Where a specific tenant is active or dropping off.

This UI must consume rollup statistics, not raw event history. Raw `client_analytics_events` is short-lived and should only be used for recent event detail.

## Backend Contract

Add this endpoint to `utils/endpoints.js`:

```js
admin: {
    analytics: {
        summary: "/v1/admin/analytics/summary",
        runRollup: "/v1/admin/analytics/rollups/run",
    },
}
```

The request should always use `{ forceMode: "live" }` because this is platform/admin data.

### Summary Query

Query params:

| Param | Required | Purpose |
|---|---:|---|
| `from` | No | ISO datetime start. Defaults to last 30 days on backend. |
| `to` | No | ISO datetime end. Defaults to now on backend. |
| `tenantId` | No | Filter analytics to one tenant. |
| `appName` | No | Filter by `Merchant Dashboard` or `Customer Storefront`. |
| `source` | No | Filter by source slug, e.g. `shopsynch-merchant-dashboard`. |
| `eventName` | No | Filter by event, e.g. `merchant_dashboard_page_view`. |
| `featureCode` | No | Filter by feature, e.g. `products_page`. |
| `pagePath` | No | Filter by path, e.g. `/dashboard/product`. |
| `limit` | No | Number of rows per grouped section. Backend clamps to 1-100. |

Response shape:

```js
{
    status: true,
    message: "success",
    data: {
        from: "2026-08-05T00:00:00Z",
        to: "2026-09-04T23:59:59Z",
        totalEvents: 0,
        totalPageViews: 0,
        uniqueSessions: 0,
        appUsage: [],
        topPages: [],
        topFeatures: [],
        topTenants: [],
        eventBreakdown: [],
        recentEvents: []
    }
}
```

### Manual Rollup Trigger

Request:

```js
post(endpoints.admin.analytics.runRollup, null, {
    forceMode: "live",
    params: { days: 30 },
})
```

If the current `useApiService().post` helper does not support GET-style params for POST requests, call the endpoint as:

```js
post(`${endpoints.admin.analytics.runRollup}?days=30`, null, { forceMode: "live" })
```

Response shape:

```js
{
    status: true,
    message: "analytics rollup completed",
    data: {
        id: "run-id",
        status: "COMPLETED",
        requestedDays: 30,
        rowsInserted: 42,
        startedAt: "2026-09-04T17:30:00Z",
        completedAt: "2026-09-04T17:30:03Z",
        nextAllowedAt: "2026-09-04T18:00:00Z",
        message: "Analytics rollup completed."
    }
}
```

Retry rule:

- The backend blocks manual rollup retries for 30 minutes.
- A blocked call returns HTTP `429`.
- The UI should disable the refresh button until `nextAllowedAt` when the value is known.
- If the UI receives `429`, show a small inline message instead of a success toast.

Important interpretation:

- `totalEvents`, `totalPageViews`, `appUsage`, `topPages`, `topFeatures`, `topTenants`, and `eventBreakdown` come from durable daily rollups.
- `recentEvents` comes from raw analytics events and is only useful within the raw event retention window.
- `uniqueSessions` is the sum of daily distinct sessions, not a globally deduped all-time person count.

## Files To Add Or Update

### 1. `utils/endpoints.js`

Add:

```js
analytics: {
    summary: "/v1/admin/analytics/summary",
},
```

under `endpoints.admin`.

### 2. `stores/adminAnalytics.store.js`

Create a dedicated Pinia store instead of overloading `adminDashboard.store.js`.

Recommended state:

```js
const summary = ref(null);
const loading = ref(false);
const error = ref("");
const filters = ref({
    from: null,
    to: null,
    tenantId: "",
    appName: "",
    eventName: "",
    featureCode: "",
    pagePath: "",
    limit: 10,
});
```

Recommended actions:

- `fetchSummary(overrides = {})`
- `runRollup(days = 30)`
- `setFilters(nextFilters)`
- `resetFilters()`

Implementation notes:

- Use `useApiService().get`.
- Call `get(endpoints.admin.analytics.summary, params, { forceMode: "live" })`.
- Use `useApiService().post` for manual rollup refresh.
- Do not toast on normal load failure inside the store; set `error` and let the page render it.
- Strip empty string/null params before sending the request.

### 3. `pages/dashboard/analytics.vue`

Create a new admin analytics page.

The first version should include:

- KPI cards:
  - Total events
  - Page views
  - Unique sessions
  - Active apps count
- Filters:
  - Date range
  - App name
  - Tenant ID
  - Feature code
  - Page path
  - Limit
- Actions:
  - Refresh rollups button
  - Last rollup result text
- Sections:
  - App usage
  - Top pages
  - Top features
  - Top tenants
  - Event breakdown
  - Recent events

Keep the UI operational and dense. This is an admin/product analytics tool, not a marketing dashboard.

### 4. Dashboard Navigation

Find the dashboard sidebar/menu config and add an `Analytics` item pointing to:

`/dashboard/analytics`

Use an existing analytics/chart icon if the menu uses Material Symbols.

## UI Layout Recommendation

Use the same visual language as `pages/dashboard/index.vue`:

- `space-y-[1.6rem]`
- white sections
- `rounded-[8px]`
- restrained tables/lists
- no decorative hero section

Recommended page structure:

1. Top filter bar.
2. Rollup refresh action row.
3. KPI cards.
4. Two-column desktop grid:
   - App usage
   - Event breakdown
5. Full-width tables:
   - Top pages
   - Top features
   - Top tenants
   - Recent events

## Data Display Rules

### App Usage

Show:

- App name
- Source
- Event count
- Page view count
- Unique sessions
- Last seen

Use this to compare `Merchant Dashboard` against `Customer Storefront`.

### Top Pages

Show:

- Page name
- Path
- Feature code
- Event count
- Unique sessions
- Last seen

This is the main drop-off/usage table.

### Top Features

Show:

- Feature code
- Event count
- Unique tenants
- Unique sessions
- Last seen

Use this beside the backend feature flag/adoption system.

### Top Tenants

Show:

- Tenant ID
- Event count
- Page view count
- Unique sessions
- Last seen

Tenant ID should be copyable if there is an existing copy-button pattern. If not, plain text is fine for the first pass.

### Recent Events

Show:

- Event name
- App name
- Tenant ID
- Path
- Feature code
- Occurred at

Label this section as recent activity, not historical analytics.

## Filter Defaults

Recommended client defaults:

```js
{
    from: startOfLast30Days,
    to: now,
    appName: "",
    tenantId: "",
    eventName: "",
    featureCode: "",
    pagePath: "",
    limit: 10,
}
```

Backend already defaults `from`/`to`, so the client can either send explicit values or rely on backend defaults. Prefer explicit values so the UI always shows the active range.

App name options:

```js
[
    { label: "All apps", value: "" },
    { label: "Merchant Dashboard", value: "Merchant Dashboard" },
    { label: "Customer Storefront", value: "Customer Storefront" },
]
```

## Implementation Steps

1. Add endpoint registry entry.
2. Create `adminAnalytics.store.js`.
3. Create `/dashboard/analytics` page.
4. Add sidebar/menu navigation item.
5. Wire filters to store state.
6. Render loading, error, empty, and loaded states.
7. Verify API request params in browser devtools or by logging through `logger` only during local testing.
8. Remove temporary logs before commit.

## Verification Plan

Run:

```bash
node --check stores/adminAnalytics.store.js
```

Then start the admin dashboard locally:

```bash
npm run dev
```

Manual checks:

- Login as an admin.
- Open `/dashboard/analytics`.
- Confirm the request hits `/v1/admin/analytics/summary`.
- Click refresh rollups and confirm the request hits `/v1/admin/analytics/rollups/run?days=30`.
- Click refresh again immediately and confirm the UI handles HTTP `429`.
- Confirm it uses live mode.
- Confirm empty states render cleanly if no rollups exist.
- Confirm app filter changes request params.
- Confirm tenant ID filter changes request params.
- Confirm top tables render returned arrays without layout overflow.

Do not run `npm run build` unless explicitly requested.

## Production Note

Before relying on this page in production, run the manual rollup once from the admin dashboard or wait for the scheduled rollup job so `analytics_daily_rollups` has data.
