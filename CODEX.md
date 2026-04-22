# CODEX.md


This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on http://localhost:3007
npm run build      # Production build
npm run generate   # Static site generation
npm run preview    # Preview production build
```

There is no test suite in this project.

## Environment Variables

```
NUXT_PUBLIC_API_TEST_BASE_URL=   # Base URL for test mode API
NUXT_PUBLIC_API_LIVE_BASE_URL=   # Base URL for live mode API
NUXT_PUBLIC_API_ENV=             # Environment name (e.g. production)
```

## Architecture

### Dual-Mode API (Test / Live)

Every merchant operates in either **test** or **live** mode. This is the most important architectural concept:

- `stores/mode.store.js` (`useSwitchModeStore`) tracks the current mode, persisted in a `displayMode` cookie.
- `services/apiService.js` (`useApiService`) is the only HTTP wrapper used across the app. It selects `testBaseUrl` or `liveBaseUrl` from runtime config based on current mode.
- Some calls must always hit live (auth, compliance). Pass `{ forceMode: 'live' }` as the options argument to `useApiService` methods.
- `fetch-interceptor.client.ts` attaches `Authorization`, `X-Mode`, and `X-MerchantId` headers to every outgoing request and handles all HTTP error responses globally (400/401/403/404/422/500 → toast + store updates).
- Switching to live mode requires KYB compliance; the mode store enforces this check before calling the API.

### Auth Flow

- JWT stored in the `auth_token` cookie. `init-auth.client.ts` bootstraps auth on load by reading the cookie and fetching the user profile.
- `middleware/auth.global.ts` guards all `/dashboard/**` routes and redirects logged-out users to `/login`.
- `useAuthStore` (`stores/auth.store.js`) holds the user, token, and all auth actions (login, register, password reset, email verify, Google OAuth).

### State Management (Pinia)

All stores live in `stores/`. Key stores:
- `auth.store.js` — user session
- `mode.store.js` — test/live mode switch
- `tenant.store.js` — multi-store support; `switchActiveStore()` reloads the app to the selected store
- `error.store.js` — validation errors and server error flags set by the fetch interceptor
- `toast.store.js` — wraps izitoast for notifications
- `compliance.store.js` — KYB compliance status (required before going live)
- `products.store.js`, `orders.store.js`, `inventory.store.js` — domain data

### API Endpoints

All endpoint paths are centralized in `utils/endpoints.js`. Endpoints that include route parameters use `:param` placeholders and must be interpolated before use (e.g. `url.replace(':id', id)`). The `appSettings` endpoints are functions that take `tenantId`.

### 4. API Documentation**:
  - Consulting internal API documentation at `/Users/harmlessprince/webprojects/shopsync/shopsynch_internall_docs/AllInOne.md`.
  - Reviewing `utils/endpoints.js` for a quick reference to all API routes and their purposes.


### Routing & Layouts

- File-based routing via Nuxt 3. All authenticated pages live under `pages/dashboard/`.
- `layouts/dashboard.vue` wraps all dashboard pages with the sidebar, top header (with mode switch toggle), store switcher, and notification dropdown.
- Route meta `fluid` and `noPadding` are supported by `components/Dashboard/Page.vue` to control layout padding.

### Key Utilities (`utils/helpers.js`)

- `logger` — drop-in replacement for `console.log/warn/error`; silenced in production via `appEnv` check. **Always use `logger` instead of `console.*`.**
- `formatToMoney`, `formatDate` — display formatters
- `handleFileUpload` — uploads a file to `endpoints.files.uploadSingle` and returns the URL
- `getPaginatedData` — normalizes paginated API responses into a standard shape

### Forms

Forms use **vee-validate** with **zod** schemas (`@vee-validate/zod`). Validation errors from the API (422) are stored in `error.store.js` and surfaced via `AppErrorMessage` or field-level `AppInput` components.


Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.