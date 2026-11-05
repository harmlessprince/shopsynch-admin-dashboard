import { expect, test, type Page } from '@playwright/test'

async function mockAdminBillingApi(page: Page) {
  let attempt1Status = 'PENDING'
  let attempt2Status = 'INITIATED'
  let currentLockStatus = 'ACTIVE'
  let subStatus = 'ACTIVE'

  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })

    // Auth profile
    if (path === '/v1/admin/auth/profile') {
      await json({
        status: true,
        data: {
          id: 'admin-usr-1',
          email: 'admin@shopsynch.com',
          fullName: 'Super Admin',
          role: { name: 'Super Admin', slug: 'super_admin' },
          currentMode: 'live',
        },
      })
      return
    }

    // Merchant preview for TenantHoverCard
    if (path.match(/\/v1\/admin\/merchants\/[^/]+\/preview/) && request.method() === 'GET') {
      const parts = path.split('/')
      const tenant = parts[4]
      await json({
        status: true,
        data: {
          id: tenant,
          name: tenant === 'tn_alpha' ? 'Alpha Apparel' : 'Beta Boutique',
          slug: tenant,
          email: `${tenant}@example.com`,
          firstName: 'John',
          lastName: 'Doe',
          currentMode: 'live',
          complianceStatus: 'APPROVED',
          status: true,
        },
      })
      return
    }

    // Payment attempts list
    if (path === '/v1/admin/billing/payment-attempts' && request.method() === 'GET') {
      await json({
        status: true,
        data: {
          items: [
            {
              id: 'attempt-1',
              tenantId: 'tn_alpha',
              subscriptionId: 'sub_1',
              planId: 'pro',
              status: attempt1Status,
              provider: 'PAYSTACK',
              providerReference: 'ref_pending_1',
              previousProviderReferences: ['ref_old_0'],
              amount: 10000,
              baseAmount: 9302,
              listAmount: 15000,
              vatAmount: 698,
              currency: 'NGN',
              priceSource: 'OFFER',
              offerCode: 'FOUNDING50',
              periodUnitCount: 3,
              periodDays: 90,
              initiatedAt: '2026-11-04 08:00:00',
            },
            {
              id: 'attempt-2',
              tenantId: 'tn_beta',
              subscriptionId: 'sub_2',
              planId: 'basic',
              status: attempt2Status,
              provider: 'PAYSTACK',
              providerReference: 'ref_init_2',
              previousProviderReferences: [],
              amount: 15000,
              baseAmount: 13953,
              listAmount: 15000,
              vatAmount: 1047,
              currency: 'NGN',
              priceSource: 'LIST',
              offerCode: null,
              periodUnitCount: 1,
              periodDays: 30,
              initiatedAt: '2026-11-04 07:30:00',
            },
            {
              id: 'attempt-3',
              tenantId: 'tn_gamma',
              subscriptionId: 'sub_3',
              planId: 'pro',
              status: 'NEEDS_REVIEW',
              provider: 'FLUTTERWAVE',
              providerReference: 'ref_review_3',
              previousProviderReferences: [],
              amount: 12000,
              baseAmount: 11162,
              listAmount: 15000,
              vatAmount: 838,
              currency: 'NGN',
              priceSource: 'PRICE_LOCK',
              offerCode: null,
              periodUnitCount: 1,
              periodDays: 30,
              initiatedAt: '2026-11-04 06:15:00',
            },
          ],
          page: 0,
          size: 20,
          totalElements: 3,
          totalPages: 1,
        },
      })
      return
    }

    // Verify payment attempt
    if (path === '/v1/admin/billing/payment-attempts/attempt-1/verify' && request.method() === 'POST') {
      attempt1Status = 'SUCCESSFUL'
      await json({
        status: true,
        message: 'Checked with provider: PAID. Subscription activated.',
        data: {
          attemptId: 'attempt-1',
          verification: 'PAID',
          attemptStatus: 'SUCCESSFUL',
        },
      })
      return
    }

    // Abandon payment attempt
    if (path === '/v1/admin/billing/payment-attempts/attempt-2/abandon' && request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}')
      if (!body.reason) {
        await json({ status: false, message: 'Validation error', errors: { reason: 'Reason is required' } }, 422)
        return
      }
      attempt2Status = 'ABANDONED'
      await json({
        status: true,
        message: 'Payment attempt abandoned successfully',
        data: {
          id: 'attempt-2',
          tenantId: 'tn_beta',
          status: 'ABANDONED',
          amount: 15000,
          currency: 'NGN',
          priceSource: 'LIST',
        },
      })
      return
    }

    // Payments list
    if (path === '/v1/admin/billing/payments' && request.method() === 'GET') {
      await json({
        status: true,
        data: {
          items: [
            {
              id: 'pay-1',
              tenantId: 'tn_alpha',
              subscriptionId: 'sub_1',
              planId: 'pro',
              paymentAttemptId: 'attempt-1',
              amount: 10000,
              amountPaid: 10000,
              overpaidAmount: 0,
              baseAmount: 9302,
              listAmount: 15000,
              vatAmount: 698,
              currency: 'NGN',
              priceSource: 'OFFER',
              offerCode: 'FOUNDING50',
              periodUnitCount: 3,
              periodDays: 90,
              provider: 'PAYSTACK',
              providerReference: 'ref_paid_1',
              paymentMethod: 'card',
              paymentSource: 'MERCHANT_CONFIRMATION',
              paidAt: '2026-11-04 08:05:00',
            },
          ],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        },
      })
      return
    }

    // Tenant snapshot
    if (path === '/v1/admin/billing/subscriptions/tenants/tn_alpha' && request.method() === 'GET') {
      await json({
        status: true,
        data: {
          subscription: {
            id: 'sub_1',
            tenantId: 'tn_alpha',
            planId: 'pro',
            status: subStatus,
            renewalMode: 'AUTOMATIC',
            currentPeriodEndDate: '2026-12-01 00:00:00',
            gracePeriodEndDate: null,
          },
          activeOverrides: [],
          extensionCodes: [],
          recentEvents: [
            { id: 'ev_1', action: 'OFFER_REDEEMED', reason: 'Founding merchant 50% promo', timestamp: '2026-11-01 10:00:00' },
          ],
        },
      })
      return
    }

    // Invoices
    if (path === '/v1/admin/billing/tenants/tn_alpha/invoices') {
      await json({ status: true, data: [] })
      return
    }

    // Audit logs
    if (path === '/v1/admin/billing/subscriptions/audit-logs') {
      await json({ status: true, data: [] })
      return
    }

    // Plans list
    if (path === '/v1/admin/billing/plans') {
      await json({
        status: true,
        data: [
          { id: 'plan_1', code: 'pro', name: 'Pro Plan', status: 'ACTIVE' },
          { id: 'plan_2', code: 'basic', name: 'Basic Plan', status: 'ACTIVE' },
        ],
      })
      return
    }

    if (path === '/v1/admin/billing/plan-rules') {
      await json({ status: true, data: [] })
      return
    }

    // Price lock GET
    if (path === '/v1/admin/billing/subscriptions/tenants/tn_alpha/price-lock' && request.method() === 'GET') {
      if (currentLockStatus === 'NONE') {
        await json({ status: true, data: null })
        return
      }
      await json({
        status: true,
        data: {
          offerCode: 'FOUNDING50',
          planCode: 'pro',
          periodUnitCount: 3,
          amount: 10000,
          currency: 'NGN',
          status: currentLockStatus,
          atRisk: false,
          mustRenewBy: '2026-12-05 00:00:00',
          lostAt: currentLockStatus === 'LOST' ? '2026-11-04 09:00:00' : null,
          lostReason: currentLockStatus === 'LOST' ? 'Admin manual revocation' : null,
        },
      })
      return
    }

    // Price lock PUT (Grant)
    if (path === '/v1/admin/billing/subscriptions/tenants/tn_alpha/price-lock' && request.method() === 'PUT') {
      const body = JSON.parse(request.postData() || '{}')
      currentLockStatus = 'ACTIVE'
      await json({
        status: true,
        message: 'Price lock granted successfully',
        data: {
          offerCode: body.offerCode || 'CUSTOM',
          planCode: body.planCode,
          periodUnitCount: body.periodUnitCount,
          amount: body.amount,
          currency: body.currency || 'NGN',
          status: 'ACTIVE',
          atRisk: false,
          mustRenewBy: '2026-12-05 00:00:00',
        },
      })
      return
    }

    // Price lock Revoke
    if (path === '/v1/admin/billing/subscriptions/tenants/tn_alpha/price-lock/revoke' && request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}')
      currentLockStatus = 'LOST'
      await json({
        status: true,
        message: 'Price lock revoked successfully',
        data: {
          offerCode: 'FOUNDING50',
          planCode: 'pro',
          periodUnitCount: 3,
          amount: 10000,
          currency: 'NGN',
          status: 'LOST',
          atRisk: false,
          lostAt: '2026-11-04 09:00:00',
          lostReason: body.reason,
        },
      })
      return
    }

    // Price lock Restore
    if (path === '/v1/admin/billing/subscriptions/tenants/tn_alpha/price-lock/restore' && request.method() === 'POST') {
      currentLockStatus = 'ACTIVE'
      await json({
        status: true,
        message: 'Price lock restored successfully',
        data: {
          offerCode: 'FOUNDING50',
          planCode: 'pro',
          periodUnitCount: 3,
          amount: 10000,
          currency: 'NGN',
          status: 'ACTIVE',
          atRisk: false,
          mustRenewBy: '2026-12-05 00:00:00',
        },
      })
      return
    }

    // Change Subscription Status
    if (path === '/v1/admin/billing/subscriptions/tenants/tn_alpha/status' && request.method() === 'PATCH') {
      const body = JSON.parse(request.postData() || '{}')
      subStatus = body.status
      if (body.status === 'EXPIRED') {
        currentLockStatus = 'LOST'
      }
      await json({
        status: true,
        message: `Subscription status updated to ${body.status}`,
        data: {
          id: 'sub_1',
          tenantId: 'tn_alpha',
          planId: 'pro',
          status: subStatus,
        },
      })
      return
    }

    // Default route continue
    await route.continue()
  })

  await page.context().addCookies([
    {
      name: 'shopsynch_admin_auth_token',
      value: 'mock-admin-token',
      url: 'http://localhost:3019',
    },
    {
      name: 'shopsynch_cookie_consent',
      value: encodeURIComponent(
        JSON.stringify({
          version: '2026-05-14',
          necessary: true,
          analytics: false,
          marketing: false,
        })
      ),
      url: 'http://localhost:3019',
    },
  ])
}

test.describe('Admin Billing Support APIs (Browser E2E Verification)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminBillingApi(page)
  })

  test('Payment Attempts Page: table, discounts, verify modal, and abandon modal with warnings', async ({ page }) => {
    await page.goto('/dashboard/billing/payment-attempts')
    await page.waitForLoadState('networkidle')

    // Verify page heading and subnav
    await expect(page.getByRole('heading', { name: 'Subscription Payment Attempts' })).toBeVisible()
    await expect(page.locator('text=Operations & Overrides')).toBeVisible()
    await expect(page.locator('text=Payments').first()).toBeVisible()

    // Verify merchant trigger (TenantHoverCard) & actual plan name (via PlanLabel)
    await expect(page.locator('text=tn_alpha').first()).toBeVisible()
    await expect(page.locator('text=Pro Plan').first()).toBeVisible()

    // Test hovering over TenantHoverCard to reveal merchant preview popover on hover (exactly like analytics)
    await page.locator('text=tn_alpha').first().hover()
    await expect(page.locator('text=Alpha Apparel').first()).toBeVisible()
    await expect(page.locator('text=John Doe').first()).toBeVisible()

    // Verify discount & price source display in table
    await expect(page.locator('text=Save ₦5,000')).toBeVisible()
    await expect(page.locator('text=FOUNDING50')).toBeVisible()
    await expect(page.locator('text=List: ₦15,000').first()).toBeVisible()

    // Verify attempt 1 has "Check Provider" button (PENDING row)
    const checkProviderBtn = page.getByRole('button', { name: 'Check Provider' })
    await expect(checkProviderBtn).toBeVisible()

    // Click "Check Provider" -> Confirmation modal with warning opens
    await checkProviderBtn.click()
    const verifyModal = page.getByRole('dialog')
    await expect(verifyModal).toBeVisible()
    await expect(verifyModal.locator('h3')).toContainText('Verify Payment with Provider')
    await expect(verifyModal).toContainText('How this check works:')
    await expect(verifyModal).toContainText('PAYSTACK')

    // Confirm verification
    await verifyModal.getByRole('button', { name: 'Verify with Gateway Now' }).click()
    await expect(verifyModal).not.toBeVisible()

    // Verify attempt 2 has "Abandon" button (INITIATED row)
    const abandonBtn = page.getByRole('button', { name: 'Abandon' }).first()
    await expect(abandonBtn).toBeVisible()

    // Verify attempt 3 (NEEDS_REVIEW) does NOT have Abandon button
    const needsReviewRow = page.locator('tr:has-text("NEEDS_REVIEW")')
    await expect(needsReviewRow.getByRole('button', { name: 'Abandon' })).not.toBeVisible()

    // Click Abandon on attempt 2 -> Confirmation modal opens
    await abandonBtn.click()
    const abandonModal = page.getByRole('dialog')
    await expect(abandonModal).toBeVisible()
    await expect(abandonModal.locator('h3')).toContainText('Abandon Payment Attempt')
    await expect(abandonModal).toContainText('Important safety and gateway policy:')
    await expect(abandonModal).toContainText('Reason for abandoning')

    // Confirm without reason should show validation or be disabled
    const confirmAbandonBtn = abandonModal.getByRole('button', { name: 'Confirm Abandon Attempt' })
    await expect(confirmAbandonBtn).toBeDisabled()

    // Enter audit reason and submit
    await abandonModal.locator('textarea').fill('Stale payment link created before founding promo discount.')
    await expect(confirmAbandonBtn).toBeEnabled()
    await confirmAbandonBtn.click()
    await expect(abandonModal).not.toBeVisible()

    // Take verification screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/payment-attempts-verified.png', fullPage: true })
  })

  test('Recorded Payments Page: breakdown, sources, and details', async ({ page }) => {
    await page.goto('/dashboard/billing/payments')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Recorded Subscription Payments' })).toBeVisible()
    await expect(page.locator('text=Merchant Confirmed')).toBeVisible()
    await expect(page.locator('text=tn_alpha').first()).toBeVisible()
    await expect(page.locator('text=Pro Plan').first()).toBeVisible()
    await expect(page.locator('text=Save ₦5,000')).toBeVisible()

    // Hover to reveal merchant preview on hover
    await page.locator('text=tn_alpha').first().hover()
    await expect(page.locator('text=Alpha Apparel').first()).toBeVisible()

    // View Details modal
    await page.getByRole('button', { name: 'Details' }).first().click()
    const detailModal = page.getByRole('dialog')
    await expect(detailModal).toBeVisible()
    await expect(detailModal.locator('h3')).toContainText('Recorded Payment Details')
    await expect(detailModal).toContainText('Payment & Tax Breakdown')
    await expect(detailModal).toContainText('Payment Attempt ID')

    await detailModal.locator('button:has-text("Close")').last().click()
    await expect(detailModal).not.toBeVisible()

    await page.screenshot({ path: 'tests/e2e/screenshots/payments-verified.png', fullPage: true })
  })

  test('Operations Page: Price Lock card, Revoke/Restore warning modals, and Subscription Status override', async ({ page }) => {
    await page.goto('/dashboard/billing/operations')
    await page.waitForLoadState('networkidle')

    // Search tenant tn_alpha
    await page.locator('input[name="billingTenantId"]').fill('tn_alpha')
    await page.getByRole('button', { name: 'Load tenant' }).click()
    await page.waitForTimeout(1000)

    // Verify entity names in subscription snapshot
    await expect(page.locator('text=tn_alpha').first()).toBeVisible()
    await expect(page.locator('text=Pro Plan').first()).toBeVisible()

    // Verify Tenant Price Lock card is rendered
    await expect(page.locator('h2:has-text("Tenant Price Lock")')).toBeVisible()
    await expect(page.locator('text=ACTIVE').first()).toBeVisible()
    await expect(page.locator('text=₦10,000.00')).toBeVisible()

    // Test Revoke Price Lock with warning modal
    const revokeBtn = page.getByRole('button', { name: 'Revoke Price Lock' })
    await expect(revokeBtn).toBeVisible()
    await revokeBtn.click()

    const revokeModal = page.getByRole('dialog')
    await expect(revokeModal).toBeVisible()
    await expect(revokeModal.locator('h3')).toContainText('Revoke Tenant Price Lock')
    await expect(revokeModal).toContainText('High-Impact Warning:')
    await expect(revokeModal).toContainText('permanently removes the locked discount')

    // Fill audit reason and confirm
    await revokeModal.locator('textarea').fill('Customer upgraded to enterprise plan terms.')
    await revokeModal.getByRole('button', { name: 'Confirm Revoke Lock' }).click()
    await expect(revokeModal).not.toBeVisible()

    // Test Restore Price Lock (now visible because lock is LOST)
    const restoreBtn = page.getByRole('button', { name: 'Restore Price Lock' })
    await expect(restoreBtn).toBeVisible()
    await restoreBtn.click()

    const restoreModal = page.getByRole('dialog')
    await expect(restoreModal).toBeVisible()
    await expect(restoreModal.locator('h3')).toContainText('Restore Tenant Price Lock')
    await restoreModal.locator('textarea').fill('Mistaken revocation; customer requested founding price restoration.')
    await restoreModal.getByRole('button', { name: 'Confirm Restore Lock' }).click()
    await expect(restoreModal).not.toBeVisible()

    // Test Subscription Status Override Card
    await expect(page.locator('h2:has-text("Change Subscription Status")')).toBeVisible()
    const statusSelect = page.locator('select').first()
    await statusSelect.selectOption('EXPIRED')

    // Click Change Status button -> Confirmation modal with warning opens
    await page.getByRole('button', { name: 'Change Status...' }).click()
    const statusModal = page.getByRole('dialog')
    await expect(statusModal).toBeVisible()
    await expect(statusModal.locator('h3')).toContainText('Confirm Subscription Status Change')
    await expect(statusModal).toContainText('Moving to EXPIRED immediately terminates active access AND FORFEITS ANY ACTIVE PRICE LOCK')

    await statusModal.locator('textarea').fill('Account lapsed non-payment beyond grace period.')
    await statusModal.getByRole('button', { name: 'Confirm Status Change' }).click()
    await expect(statusModal).not.toBeVisible()

    await page.screenshot({ path: 'tests/e2e/screenshots/operations-price-lock-verified.png', fullPage: true })
  })
})
