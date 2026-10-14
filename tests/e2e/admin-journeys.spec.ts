import { expect, test, type Page } from '@playwright/test'

async function mockAdminApi(page: Page) {
  let countrySettings = {
    countryCode: 'NG',
    defaultGateway: 'PAYSTACK',
    enabledGateways: ['PAYSTACK', 'KORAPAY', 'MONNIFY', 'FLUTTERWAVE', 'SQUAD', 'NOMBA'],
    supportedGateways: ['PAYSTACK', 'KORAPAY', 'MONNIFY', 'FLUTTERWAVE', 'SQUAD', 'NOMBA'],
    impactCounts: {
      PAYSTACK: 120,
      KORAPAY: 45,
      MONNIFY: 30,
      FLUTTERWAVE: 15,
      SQUAD: 8,
      NOMBA: 4,
    },
    updatedAt: '2026-10-14T10:00:00Z',
    updatedBy: 'admin@shopsynch.com',
  }

  let circuitStates: Record<string, any> = {
    PAYSTACK: { state: 'CLOSED', consecutiveFailures: 0, lastFailureAt: null, openedAt: null, nextRetryAt: null },
    KORAPAY: { state: 'OPEN', consecutiveFailures: 5, lastFailureAt: '2026-10-14T12:00:00Z', openedAt: '2026-10-14T12:00:00Z', nextRetryAt: '2026-10-14T12:15:00Z' },
    MONNIFY: { state: 'CLOSED', consecutiveFailures: 0, lastFailureAt: null, openedAt: null, nextRetryAt: null },
    FLUTTERWAVE: { state: 'CLOSED', consecutiveFailures: 0, lastFailureAt: null, openedAt: null, nextRetryAt: null },
    SQUAD: { state: 'CLOSED', consecutiveFailures: 0, lastFailureAt: null, openedAt: null, nextRetryAt: null },
    NOMBA: { state: 'CLOSED', consecutiveFailures: 0, lastFailureAt: null, openedAt: null, nextRetryAt: null },
  }

  let gatewayMetrics = [
    { gateway: 'PAYSTACK', totalRequests: 1500, successCount: 1470, failureCount: 30, successRate: 98.0, averageLatencyMs: 320, fallbackCount: 5, fallbackRate: 0.33 },
    { gateway: 'KORAPAY', totalRequests: 200, successCount: 120, failureCount: 80, successRate: 60.0, averageLatencyMs: 850, fallbackCount: 45, fallbackRate: 22.5 },
    { gateway: 'MONNIFY', totalRequests: 400, successCount: 395, failureCount: 5, successRate: 98.75, averageLatencyMs: 290, fallbackCount: 1, fallbackRate: 0.25 },
  ]

  let gatewayAuditLogs = [
    {
      id: 'audit-log-1',
      resource: 'PAYMENT_GATEWAY_SETTING',
      resourceId: 'NG',
      action: 'UPDATE',
      actorId: 'admin-usr-1',
      actorEmail: 'admin@shopsynch.com',
      actorType: 'ADMIN',
      description: 'Disabled Squad and set Monnify as default for Nigeria',
      details: { enabledGateways: ['PAYSTACK', 'KORAPAY', 'MONNIFY'], defaultGateway: 'MONNIFY' },
      createdAt: '2026-10-14T09:30:00Z',
    },
  ]

  let platformAlertRecipients = 'ops@shopsynch.com, oncall@shopsynch.com'

  const planRules = [
    { code: 'pos_access', name: 'POS Access', kind: 'FEATURE', description: 'Enable POS terminal sales', defaultValue: false, allowedValues: [true, false] },
    { code: 'custom_domain', name: 'Custom Domain', kind: 'FEATURE', description: 'Bring your own custom domain', defaultValue: false, allowedValues: [true, false] },
    { code: 'staff_limit', name: 'Staff Limit', kind: 'LIMIT', description: 'Max staff accounts permitted', defaultValue: null, allowedValues: null },
    { code: 'products_limit', name: 'Products Limit', kind: 'LIMIT', description: 'Maximum active products allowed', defaultValue: null, allowedValues: null },
    { code: 'area_orders', name: 'Orders Area', kind: 'AREA', description: 'Orders dashboard access level', defaultValue: 'manage', allowedValues: ['none', 'view', 'manage'] },
    { code: 'area_branches', name: 'Branches Area', kind: 'AREA', description: 'Branches dashboard access level', defaultValue: 'manage', allowedValues: ['none', 'view', 'manage'] },
  ]

  const seededPlans = [
    {
      id: 'plan-starter-1',
      code: 'starter',
      name: 'Starter Plan',
      description: 'Perfect for small shops getting started',
      seeded: true,
      featureAccessRules: {
        pos_access: false,
        custom_domain: false,
        staff_limit: 2,
        products_limit: 50,
        area_orders: 'manage',
        area_branches: 'none',
      },
      usageLimits: {},
      scaleLimits: {},
      prices: [{ periodUnit: 'MONTH', periodUnitCount: 1, amount: 5000, currency: 'NGN' }],
    },
    {
      id: 'plan-pro-1',
      code: 'pro',
      name: 'Pro Plan',
      description: 'For growing businesses',
      seeded: true,
      featureAccessRules: {
        pos_access: true,
        custom_domain: true,
        staff_limit: 10,
        area_orders: 'manage',
        area_branches: 'manage',
      },
      usageLimits: {},
      scaleLimits: {},
      prices: [{ periodUnit: 'MONTH', periodUnitCount: 1, amount: 15000, currency: 'NGN' }],
    },
  ]

  const sampleMerchant = {
    id: 'tenant-test-123',
    businessTradingName: 'Lagos Trends Boutique',
    code: 'LAGTRENDS',
    ownerFullName: 'Chidi Okonkwo',
    ownerEmail: 'chidi@lagostrends.ng',
    currentMode: 'TEST_MODE',
    complianceReviewStatus: 'APPROVED',
    status: true,
    createdAt: '2026-08-01T10:00:00Z',
    businessCountry: 'NG',
  }

  const merchantGateways = [
    {
      gateway: 'PAYSTACK',
      available: true,
      isStoreDefault: true,
      countryDefault: true,
      countryEnabled: true,
      merchantConfigured: true,
      reasonCode: 'AVAILABLE',
      message: 'Gateway is ready for checkout',
      nextStep: 'NONE',
    },
    {
      gateway: 'KORAPAY',
      available: false,
      isStoreDefault: false,
      countryDefault: false,
      countryEnabled: true,
      merchantConfigured: false,
      reasonCode: 'MERCHANT_NOT_CONFIGURED',
      message: 'Store has not configured credentials',
      nextStep: 'CONFIGURE_CREDENTIALS',
      nextStepHint: 'Merchant must add API keys in Payment Settings',
    },
  ]

  const merchantBillingAccess = {
    tenantId: 'tenant-test-123',
    planId: 'plan-pro-1',
    planCode: 'pro',
    subscriptionStatus: 'ACTIVE',
    billingEnforced: true,
    enforcementApplies: true,
    enforcementStatus: 'ENFORCED',
    enforcementReason: 'Plan rules are actively enforced for this store.',
    features: {
      pos_access: true,
      custom_domain: true,
    },
    limits: {
      staff_limit: 10,
      products_limit: null,
    },
    areas: {
      area_orders: 'manage',
      area_branches: 'manage',
    },
  }

  const retiredPlanAuditLogs = [
    {
      id: 'sub-audit-1',
      tenantId: 'tenant-test-123',
      previousValue: 'starter-legacy',
      newValue: 'pro',
      reason: 'plan_retired',
      actorId: 'system_seeder',
      timestamp: '2026-10-14T08:00:00Z',
      createdAt: '2026-10-14T08:00:00Z',
    },
  ]

  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (!path.startsWith('/v1/') && !path.startsWith('/v2/')) {
      await route.continue()
      return
    }

    const json = (body: any, status = 200) =>
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

    // Payment gateway settings
    if (path.startsWith('/v1/admin/payment-gateways/countries/') && request.method() === 'GET') {
      await json({ status: true, data: countrySettings })
      return
    }

    if (path.startsWith('/v1/admin/payment-gateways/countries/') && request.method() === 'PUT') {
      const payload = JSON.parse(request.postData() || '{}')
      countrySettings = { ...countrySettings, ...payload, updatedAt: new Date().toISOString() }
      await json({ status: true, message: 'Settings saved successfully', data: countrySettings })
      return
    }

    // Circuit states
    if (path === '/v1/admin/payment-gateways/circuits' && request.method() === 'GET') {
      await json({ status: true, data: circuitStates })
      return
    }

    // Reset circuit
    if (path.startsWith('/v1/admin/payment-gateways/circuits/') && path.endsWith('/reset') && request.method() === 'POST') {
      const segments = path.split('/')
      const gateway = segments[segments.length - 2]
      if (circuitStates[gateway]) {
        circuitStates[gateway].state = 'CLOSED'
        circuitStates[gateway].consecutiveFailures = 0
      }
      await json({ status: true, message: `Circuit for ${gateway} has been reset to CLOSED`, data: circuitStates[gateway] })
      return
    }

    // Metrics
    if (path === '/v1/admin/payment-gateways/metrics' && request.method() === 'GET') {
      await json({ status: true, data: gatewayMetrics })
      return
    }

    // Audit logs
    if (path === '/v1/admin/audit-logs' && request.method() === 'GET') {
      await json({
        status: true,
        data: {
          items: gatewayAuditLogs,
          total: gatewayAuditLogs.length,
          currentPage: 0,
          totalElements: gatewayAuditLogs.length,
        },
      })
      return
    }

    // Platform settings
    if (path === '/v1/admin/settings' && request.method() === 'GET') {
      await json({
        status: true,
        data: [
          { key: 'platformPaymentAlertEmails', value: platformAlertRecipients, type: 'STRING', description: 'Alert recipient emails' },
        ],
      })
      return
    }

    if (path.startsWith('/v1/admin/settings/platformPaymentAlertEmails/value') && request.method() === 'PATCH') {
      const payload = JSON.parse(request.postData() || '{}')
      platformAlertRecipients = payload.value
      await json({ status: true, message: 'Setting updated successfully', data: { key: 'platformPaymentAlertEmails', value: platformAlertRecipients } })
      return
    }

    // Plan rules catalog
    if (path === '/v1/admin/billing/plan-rules' && request.method() === 'GET') {
      await json({ status: true, message: 'Plan rules retrieved successfully', data: planRules })
      return
    }

    // Plans list
    if (path === '/v1/admin/billing/plans' && request.method() === 'GET') {
      await json({ status: true, data: { items: seededPlans, total: seededPlans.length, currentPage: 0, totalElements: seededPlans.length } })
      return
    }

    // Plan update
    if (path.startsWith('/v1/admin/billing/plans/') && (request.method() === 'PUT' || request.method() === 'PATCH')) {
      const payload = JSON.parse(request.postData() || '{}')
      await json({ status: true, message: 'Plan updated successfully', data: { ...seededPlans[0], ...payload } })
      return
    }

    // Merchant details
    if (path === `/v1/admin/merchants/${sampleMerchant.id}` && request.method() === 'GET') {
      await json({ status: true, data: sampleMerchant })
      return
    }

    // Merchant payment gateways
    if (path === `/v1/admin/merchants/${sampleMerchant.id}/payment-gateways` && request.method() === 'GET') {
      await json({ status: true, data: merchantGateways })
      return
    }

    // Merchant billing access
    if (path === `/v1/admin/merchants/${sampleMerchant.id}/billing/access` && request.method() === 'GET') {
      await json({ status: true, data: merchantBillingAccess })
      return
    }

    // Billing subscription audit logs
    if (path === '/v1/admin/billing/subscriptions/audit-logs' && request.method() === 'GET') {
      await json({
        status: true,
        data: {
          items: retiredPlanAuditLogs,
          total: retiredPlanAuditLogs.length,
          currentPage: 0,
          totalElements: retiredPlanAuditLogs.length,
        },
      })
      return
    }

    // Resync subscriptions to test
    if (path === '/v1/admin/billing/subscriptions/resync-to-test' && request.method() === 'POST') {
      await json({
        status: true,
        message: 'Replicated 15 subscriptions to test mode successfully',
        data: { replicatedCount: 15 },
      })
      return
    }

    // Fallback empty
    await json({ status: true, data: [] })
  })

  await page.context().addCookies([
    {
      name: 'shopsynch_admin_auth_token',
      value: 'mock-admin-token',
      url: 'http://localhost:3019',
    },
    {
      name: 'shopsynch_cookie_consent',
      value: encodeURIComponent(JSON.stringify({
        version: '2026-05-14',
        necessary: true,
        analytics: false,
        marketing: false,
      })),
      url: 'http://localhost:3019',
    },
  ])
}

test.describe('Admin Dashboard Journeys (01 - 09)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page)
  })

  test('Journey 01, 02, 03, 05: Payment Gateways Control, Health, History, and Alert Recipients', async ({ page }) => {
    // 1. Visit Payment Gateways Page
    await page.goto('/dashboard/payment-gateways')
    await expect(page.getByText('Payment Gateway Management')).toBeVisible()

    // Tab 1: Country Routing & Audit Trail (Journeys 01 & 03)
    await expect(page.getByText('Country Routing & Audit Trail')).toBeVisible()
    await expect(page.locator('select').first()).toHaveValue('NG')

    // Gateways are displayed
    await expect(page.getByRole('heading', { name: /Paystack/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Korapay/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Monnify/ })).toBeVisible()

    // Paystack is active default
    await expect(page.getByText('Active Default')).toBeVisible()

    // Journey 03: Setting change history section visible
    await expect(page.getByText('Gateway Setting Change History')).toBeVisible()
    await expect(page.getByText('Disabled Squad and set Monnify as default for Nigeria')).toBeVisible()

    // Journey 02: Switch to Health, Circuits & Metrics tab
    await page.getByRole('button', { name: /Health, Circuits & Metrics/ }).click()
    await expect(page.getByText('Live Gateway Circuit Breakers')).toBeVisible()

    // Reset circuit modal
    await page.getByRole('button', { name: 'Reset Circuit' }).first().click()
    await expect(page.getByText('Reset Circuit Breaker?')).toBeVisible()
    await page.getByRole('button', { name: 'Confirm Reset' }).click()

    // Journey 05: Switch to Alert Recipients tab
    await page.getByRole('button', { name: 'Alert Recipients' }).click()
    await expect(page.getByText('Platform Payment Incident Alert Recipients')).toBeVisible()
    const emailInput = page.locator('#alertEmailsInput')
    await expect(emailInput).toBeVisible()
    await emailInput.fill('ops@shopsynch.com, alerts@shopsynch.com')
    await page.getByRole('button', { name: 'Save Alert Recipients' }).click()
    await expect(page.getByText('ops@shopsynch.com').first()).toBeVisible()
  })

  test('Journey 04 & 07: Merchant Detail Gateway Availability and Effective Access Panel', async ({ page }) => {
    await page.goto('/dashboard/merchants/tenant-test-123')

    // Merchant details loaded
    await expect(page.getByRole('heading', { name: 'Lagos Trends Boutique' })).toBeVisible()

    // Journey 08: Retired plan notice check
    await expect(page.getByText('This store was automatically moved from retired plan')).toBeVisible()

    // Journey 04: Payment Gateway Availability
    await expect(page.getByText('Payment Gateways Availability')).toBeVisible()
    await expect(page.getByText('Platform credentials are checked in test mode.')).toBeVisible()
    await expect(page.getByText('Available', { exact: true }).first()).toBeVisible()

    // Journey 07: Plan and Effective Access Panel
    await expect(page.getByText('Plan and Effective Access')).toBeVisible()
    await expect(page.getByText('Enforced')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Limits' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dashboard Areas' })).toBeVisible()
  })

  test('Journey 06: Structured Plan Rule Editor with Seeded Guard and JSON Debug', async ({ page }) => {
    await page.goto('/dashboard/billing/plans')
    await expect(page.getByText('Billing Plans')).toBeVisible()

    // Edit Starter plan
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click()
    await expect(page.getByRole('heading', { name: 'Edit Billing Plan' })).toBeVisible()

    // Seeded notice appears
    await expect(page.getByText('This plan is part of the catalog.')).toBeVisible()

    // Unlock temporary editing
    await page.getByRole('button', { name: 'I understand, allow temporary editing' }).click()
    await expect(page.getByText('Temporary editing enabled for this session.')).toBeVisible()

    // Sections for Features, Usage Limits, Dashboard Areas
    await expect(page.getByRole('heading', { name: 'Features (Boolean Entitlements)' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Limits (Numeric Caps)' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dashboard Areas (Navigation Access)' })).toBeVisible()

    // Debug JSON toggle
    await page.getByRole('button', { name: /Show JSON Preview/ }).click()
    await expect(page.getByRole('button', { name: 'Hide JSON Preview' })).toBeVisible()
  })

  test('Journey 08 & 09: Billing Operations Retired Plan Moves and Resync to Test Mode', async ({ page }) => {
    await page.goto('/dashboard/billing/operations')
    await expect(page.getByText('Billing operations')).toBeVisible()

    // Journey 09: Super Admin Resync to Test Mode
    await expect(page.getByText('Resync Subscriptions to Test Mode')).toBeVisible()
    await page.getByRole('button', { name: 'Resync to Test' }).click()

    // Confirmation modal
    await expect(page.getByText('Resync Subscriptions to Test Mode?')).toBeVisible()
    await page.getByRole('button', { name: 'Confirm & Resync' }).click()
    await expect(page.getByText(/Successfully replicated 15 subscription\(s\) to test mode/)).toBeVisible()

    // Journey 08: Subscriptions Moved off Retired Plans Report
    await expect(page.getByText('Subscriptions Moved off Retired Plans')).toBeVisible()
    await expect(page.getByText('tenant-test-123')).toBeVisible()
    await expect(page.getByText('starter-legacy')).toBeVisible()
  })
})
