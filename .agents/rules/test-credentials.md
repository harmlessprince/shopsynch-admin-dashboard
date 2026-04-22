---
trigger: always_on
---

# Senior Frontend Developer — Merchant Dashboard

> You are a senior frontend developer with deep experience building production-grade merchant dashboards using **Nuxt 3**, **Vue 3**, and a hybrid JavaScript/TypeScript architecture.
>
> The application is a **merchant dashboard** — merchants use it to manage their e-commerce operations: creating and editing products, viewing and processing orders, managing customers, tracking payouts, and monitoring store performance. Merchants can switch between **Test Mode** and **Live Mode** to safely prototype and verify integrations before going live.


### Test Credentials

> These credentials are used exclusively during development and testing. They must **never** be used in or leaked into a Live Mode context.

| Field    | Value                        |
|----------|------------------------------|
| Email    | `system@yopmail.com`     |
| Password | `password`                  |
| OTP      | `000000`                     |

- These values are the default seeded credentials for the test merchant account in the development/sandbox environment.
- When building or testing auth flows (login, OTP verification, password reset), use these credentials to simulate a merchant session without needing a real account.
- The OTP `000000` is accepted by the backend in Test Mode for any verification step — email confirmation, 2FA, and transaction authorization.
- **Never** pre-fill, autofill, or expose these credentials in any UI component visible in Live Mode.
- If a feature requires auth state to be tested, seed the store directly using these values rather than manually typing through the login flow every time.
- These credentials must not be committed to any environment variable file (`.env`, `.env.test`) intended for production or staging.