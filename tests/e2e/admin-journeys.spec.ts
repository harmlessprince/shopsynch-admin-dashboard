import { expect, test, type Page } from '@playwright/test'

async function mockAdminApi(page: Page) {
  const defaultCountryGateways = [
    { gateway: 'PAYSTACK', enabled: true },
    { gateway: 'MONNIFY', enabled: true },
    { gateway: 'FLUTTERWAVE', enabled: false },
    { gateway: 'STRIPE', enabled: false },
    { gateway: 'OFFLINE', enabled: true },
  ]

  const countrySettings = [
    { country: 'DEFAULT', defaultGateway: 'PAYSTACK', affectedStores: 142, gateways: defaultCountryGateways },
    {
      country: 'Nigeria',
      defaultGateway: 'PAYSTACK',
      affectedStores: 120,
      gateways: [
        { gateway: 'PAYSTACK', enabled: true },
        { gateway: 'MONNIFY', enabled: true },
        { gateway: 'FLUTTERWAVE', enabled: true },
        { gateway: 'STRIPE', enabled: false },
        { gateway: 'OFFLINE', enabled: false },
      ],
    },
  ]

  type CircuitState = {
    gateway: string
    tenantId: string | null
    mode: string
    state: string
    consecutiveFailures: number
    openedAt: string | null
    nextTrialAt: string | null
    lastFailureAt: string | null
    lastFailureReason: string | null
  }

  const circuitStates: CircuitState[] = [
    { gateway: 'PAYSTACK', tenantId: null, mode: 'live', state: 'CLOSED', consecutiveFailures: 0, openedAt: null, nextTrialAt: null, lastFailureAt: null, lastFailureReason: null },
    { gateway: 'MONNIFY', tenantId: null, mode: 'live', state: 'CLOSED', consecutiveFailures: 0, openedAt: null, nextTrialAt: null, lastFailureAt: null, lastFailureReason: null },
    { gateway: 'FLUTTERWAVE', tenantId: null, mode: 'live', state: 'OPEN', consecutiveFailures: 5, openedAt: '2026-10-14T12:00:00Z', nextTrialAt: '2026-10-14T12:15:00Z', lastFailureAt: '2026-10-14T12:00:00Z', lastFailureReason: 'Elevated error rate' },
    { gateway: 'STRIPE', tenantId: null, mode: 'live', state: 'CLOSED', consecutiveFailures: 0, openedAt: null, nextTrialAt: null, lastFailureAt: null, lastFailureReason: null },
    { gateway: 'OFFLINE', tenantId: null, mode: 'live', state: 'CLOSED', consecutiveFailures: 0, openedAt: null, nextTrialAt: null, lastFailureAt: null, lastFailureReason: null },
  ]

  const gatewayMetrics = [
    { gateway: 'PAYSTACK', windowMinutes: 60, attempts: 1500, started: 1470, failed: 30, successRatePercent: 98.0, averageLatencyMillis: 320, firstChoiceAttempts: 1400, movedAway: 5, movedHere: 0, fallbackRatePercent: 0.33 },
    { gateway: 'MONNIFY', windowMinutes: 60, attempts: 400, started: 395, failed: 5, successRatePercent: 98.75, averageLatencyMillis: 290, firstChoiceAttempts: 380, movedAway: 1, movedHere: 0, fallbackRatePercent: 0.25 },
    { gateway: 'FLUTTERWAVE', windowMinutes: 60, attempts: 200, started: 120, failed: 80, successRatePercent: 60.0, averageLatencyMillis: 850, firstChoiceAttempts: 180, movedAway: 45, movedHere: 0, fallbackRatePercent: 22.5 },
  ]

  const gatewayAuditLogs = [
    {
      id: 'audit-log-1',
      resource: 'PAYMENT_GATEWAY_SETTING',
      resourceId: 'Nigeria',
      action: 'UPDATED',
      actorId: 'admin-usr-1',
      actorEmail: 'admin@shopsynch.com',
      actorType: 'ADMIN',
      metadata: { enabledGateways: ['PAYSTACK', 'MONNIFY'], defaultGateway: 'MONNIFY' },
      createdAt: '2026-10-14T09:30:00Z',
    },
  ]

  let platformAlertRecipients = 'ops@shopsynch.com, oncall@shopsynch.com'

  let pricingOffer = {
    id: 'offer-1',
    code: 'founding',
    name: 'Founding Merchant',
    description: '14 days of Pro free and a locked 3-month price.',
    status: 'ACTIVE',
    startsAt: '2026-10-11T00:00:00Z',
    endsAt: '2027-01-09T00:00:00Z',
    publicVisible: true,
    eligiblePlanCodes: ['pro'],
    trialDays: 14,
    priceOverrides: [{ planCode: 'pro', periodUnitCount: 3, amount: 10000, currency: 'NGN', lockedForLife: true }],
    perks: [],
    maxRedemptions: 50,
    redemptionCount: 5,
    slotsRemaining: 45,
  }

  let createdOffers: Record<string, unknown>[] = []

  let offerRedemptions = [
    { id: 'red-1', offerCode: 'founding', tenantId: 'tenant-test-123', planCode: 'pro', redeemedAt: '2026-10-18T10:00:00Z', setupCallCompleted: false, reviewReceived: false, commitmentNotes: '' },
  ]

  const incomingWebhooks = [
    {
      id: 'hook-1',
      provider: 'PAYSTACK',
      eventType: 'charge.success',
      reference: 'PSK_FAILED_1',
      tenantId: 'tenant-test-123',
      targetKind: 'SUBSCRIPTION_PAYMENT',
      status: 'FAILED',
      attempts: 2,
      duplicateCount: 0,
      lastError: 'Could not activate the subscription',
      payload: '{"event":"charge.success","data":{"reference":"PSK_FAILED_1","customer":{"email":"buyer@example.com"}}}',
      headers: { 'x-paystack-signature': 'abc123', 'content-type': 'application/json' },
      receivedAt: '2026-10-22T08:00:00Z',
    },
    {
      id: 'hook-2',
      provider: 'MONNIFY',
      eventType: 'SUCCESSFUL_TRANSACTION',
      reference: 'MNF_UNKNOWN_1',
      targetKind: 'UNMATCHED',
      status: 'UNMATCHED',
      attempts: 1,
      duplicateCount: 3,
      payload: 'not-json-body',
      headers: {},
      receivedAt: '2026-10-22T07:00:00Z',
    },
    {
      id: 'hook-3',
      provider: 'PAYSTACK',
      eventType: 'charge.success',
      reference: 'PSK_OK_1',
      targetKind: 'ORDER_PAYMENT',
      status: 'PROCESSED',
      attempts: 1,
      duplicateCount: 0,
      payload: '{}',
      headers: {},
      receivedAt: '2026-10-22T06:00:00Z',
    },
  ]

  const shadowDuplicates = [
    {
      id: 'shadow-1',
      tenantId: 'tenant-test-789',
      slotKey: 'tenant-test-789:2026-10',
      type: 'WOULD_BE_DUPLICATE',
      paymentId: 'pay-dup-3',
      providerReference: 'PSK_REF_3',
      provider: 'PAYSTACK',
      channel: 'CARD',
      amount: 15000,
      currency: 'NGN',
      firstPaymentId: 'pay-first-3',
      createdAt: '2026-10-22T09:00:00Z',
    },
    {
      id: 'shadow-2',
      tenantId: 'tenant-test-123',
      slotKey: 'tenant-test-123:2026-10',
      type: 'WOULD_BE_DUPLICATE',
      paymentId: 'pay-dup-1',
      providerReference: 'PSK_REF_1',
      provider: 'PAYSTACK',
      channel: 'BANK_TRANSFER',
      amount: 15000,
      currency: 'NGN',
      firstPaymentId: 'pay-first-1',
      createdAt: '2026-10-21T09:00:00Z',
    },
  ]

  let subscriptionRefunds = [
    {
      id: 'refund-pending',
      tenantId: 'tenant-test-123',
      paymentId: 'pay-dup-1',
      provider: 'PAYSTACK',
      transactionReference: 'PSK_REF_1',
      amount: 15000,
      currency: 'NGN',
      status: 'PENDING',
      active: true,
      reason: 'Paid twice for October',
      requestedAt: '2026-10-22T10:00:00Z',
    },
    {
      id: 'refund-failed',
      tenantId: 'tenant-test-456',
      paymentId: 'pay-dup-2',
      provider: 'PAYSTACK',
      transactionReference: 'PSK_REF_2',
      amount: 15000,
      currency: 'NGN',
      status: 'FAILED',
      active: false,
      providerMessage: 'Refund refused by provider',
      reason: 'Duplicate card charge',
      requestedAt: '2026-10-21T10:00:00Z',
    },
  ]

  const planRules = [
    { code: 'pos_access', kind: 'feature', label: 'POS Access', description: 'Enable POS terminal sales', allowedValues: ['true', 'false'], missingKeyMeaning: 'not included' },
    { code: 'custom_domain', kind: 'feature', label: 'Custom Domain', description: 'Bring your own custom domain', allowedValues: ['true', 'false'], missingKeyMeaning: 'not included' },
    { code: 'staff_limit', kind: 'limit', label: 'Staff Limit', description: 'Max staff accounts permitted', allowedValues: [], missingKeyMeaning: 'no cap' },
    { code: 'products_limit', kind: 'limit', label: 'Products Limit', description: 'Maximum active products allowed', allowedValues: [], missingKeyMeaning: 'no cap' },
    { code: 'area_orders', kind: 'area', label: 'Orders Area', description: 'Orders dashboard access level', allowedValues: ['none', 'view', 'manage'], missingKeyMeaning: 'manage' },
    { code: 'area_branches', kind: 'area', label: 'Branches Area', description: 'Branches dashboard access level', allowedValues: ['none', 'view', 'manage'], missingKeyMeaning: 'manage' },
  ]

  const seededPlans = [
    {
      id: 'plan-starter-1',
      code: 'starter',
      status: 'ACTIVE',
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
      status: 'ACTIVE',
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

  const merchantGatewayCatalog = {
    defaultGateway: 'PAYSTACK',
    currency: 'NGN',
    gateways: [
      {
        gateway: 'PAYSTACK',
        name: 'Paystack',
        kind: 'CARD',
        available: true,
        switchable: false,
        reasonCode: null,
        unavailableReason: null,
        nextStep: null,
        nextStepHint: null,
        paymentMethods: [],
        currencies: ['NGN'],
      },
      {
        gateway: 'MONNIFY',
        name: 'Monnify',
        kind: 'TRANSFER',
        available: false,
        switchable: false,
        reasonCode: 'MERCHANT_NOT_CONFIGURED',
        unavailableReason: 'Store has not configured credentials',
        nextStep: 'CONFIGURE_CREDENTIALS',
        nextStepHint: 'Merchant must add API keys in Payment Settings',
        paymentMethods: [],
        currencies: ['NGN'],
      },
    ],
  }

  const merchantBillingAccess = {
    planId: 'plan-pro-1',
    planCode: 'pro',
    subscriptionStatus: 'ACTIVE',
    enforcement: { applies: true, reason: 'enforced', message: 'Plan rules are actively enforced for this store.' },
    features: [
      { code: 'pos_access', included: true },
      { code: 'custom_domain', included: true },
    ],
    limits: [
      { code: 'staff_limit', limit: 10 },
      { code: 'products_limit', limit: null },
    ],
    areas: [
      { code: 'area_orders', level: 'manage' },
      { code: 'area_branches', level: 'manage' },
    ],
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

    // Payment gateway settings (list + per-country update)
    if (path === '/v1/admin/payment-gateway-settings' && request.method() === 'GET') {
      await json({ status: true, data: countrySettings })
      return
    }

    if (path.startsWith('/v1/admin/payment-gateway-settings/') && request.method() === 'PUT') {
      const payload = JSON.parse(request.postData() || '{}')
      const country = decodeURIComponent(path.split('/').pop() || '')
      const entry = countrySettings.find((setting) => setting.country.toLowerCase() === country.toLowerCase())
      if (!entry) {
        await json({ status: false, message: `${country} isn't a supported country. Choose one from the country list.` }, 400)
        return
      }
      entry.defaultGateway = payload.defaultGateway || entry.defaultGateway
      entry.gateways = entry.gateways.map((gateway) => ({
        ...gateway,
        enabled: (payload.enabledGateways || []).includes(gateway.gateway),
      }))
      await json({ status: true, message: 'Payment gateway settings saved.', data: countrySettings })
      return
    }

    // Circuit states
    if (path === '/v1/admin/payment-gateway-health/circuits' && request.method() === 'GET') {
      await json({ status: true, data: circuitStates })
      return
    }

    // Reset circuit
    if (path.startsWith('/v1/admin/payment-gateway-health/circuits/') && path.endsWith('/reset') && request.method() === 'POST') {
      const segments = path.split('/')
      const gateway = segments[segments.length - 2]
      const circuit = circuitStates.find((item) => item.gateway.toLowerCase() === gateway.toLowerCase())
      if (circuit) {
        circuit.state = 'CLOSED'
        circuit.consecutiveFailures = 0
        circuit.openedAt = null
        circuit.nextTrialAt = null
      }
      await json({ status: true, message: 'The circuit is closed.', data: circuitStates })
      return
    }

    // Metrics
    if (path === '/v1/admin/payment-gateway-health/metrics' && request.method() === 'GET') {
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
      await json({ status: true, message: 'Billing plans retrieved successfully.', data: seededPlans })
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
      await json({ status: true, data: merchantGatewayCatalog })
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

    // Shadow mode duplicate payments
    if (path === '/v1/admin/billing/shadow/summary' && request.method() === 'GET') {
      await json({ status: true, data: { ATTEMPT: 12, WOULD_APPLY: 9, WOULD_BE_DUPLICATE: 3 } })
      return
    }

    if (path === '/v1/admin/billing/shadow/entries' && request.method() === 'GET') {
      await json({ status: true, data: shadowDuplicates })
      return
    }

    if (path === '/v1/admin/billing/refunds' && request.method() === 'POST') {
      const payload = request.postDataJSON()
      if (!payload.note?.trim()) {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ status: false, message: 'Validation failed', errors: { note: 'note is required' } }),
        })
        return
      }
      const created = { id: 'refund-new', tenantId: 'tenant-test-789', paymentId: payload.paymentId, provider: 'PAYSTACK', transactionReference: 'PSK_REF_3', amount: 15000, currency: 'NGN', status: 'PENDING', active: true, reason: payload.note, requestedAt: '2026-10-22T12:00:00Z' }
      subscriptionRefunds = [created, ...subscriptionRefunds]
      await json({ status: true, message: 'refund pending', data: created })
      return
    }

    // Pricing offers
    if (path === '/v1/admin/billing/offers' && request.method() === 'POST') {
      const payload = request.postDataJSON()
      if (!payload.eligiblePlanCodes?.length) {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ status: false, message: 'Validation failed', errors: { eligiblePlanCodes: 'At least one eligible plan is required.' } }),
        })
        return
      }
      const created = { ...pricingOffer, ...payload, id: 'offer-2', status: payload.status, redemptionCount: 0, slotsRemaining: payload.maxRedemptions ?? null, perks: payload.perks, priceOverrides: payload.priceOverrides.map((override) => ({ ...override, currency: 'NGN' })) }
      createdOffers = [created, ...createdOffers]
      await json({ status: true, message: 'pricing offer created', data: created })
      return
    }

    if (path === '/v1/admin/billing/offers/founding' && request.method() === 'PUT') {
      if (!request.postDataJSON().code) {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ status: false, message: 'Validation failed', errors: { code: 'The offer code is required.' } }),
        })
        return
      }
      pricingOffer = { ...pricingOffer, ...request.postDataJSON(), slotsRemaining: request.postDataJSON().maxRedemptions - pricingOffer.redemptionCount }
      await json({ status: true, message: 'pricing offer updated', data: pricingOffer })
      return
    }

    if (path === '/v1/admin/billing/offers' && request.method() === 'GET') {
      await json({ status: true, data: [...createdOffers, pricingOffer] })
      return
    }

    if (path === '/v1/admin/billing/offers/founding/pause' && request.method() === 'POST') {
      pricingOffer = { ...pricingOffer, status: 'PAUSED' }
      await json({ status: true, message: 'pricing offer paused', data: pricingOffer })
      return
    }

    if (path === '/v1/admin/billing/offers/founding/resume' && request.method() === 'POST') {
      pricingOffer = { ...pricingOffer, status: 'ACTIVE' }
      await json({ status: true, message: 'pricing offer resumed', data: pricingOffer })
      return
    }

    if (path === '/v1/admin/billing/offers/founding/end' && request.method() === 'POST') {
      pricingOffer = { ...pricingOffer, status: 'ENDED' }
      await json({ status: true, message: 'pricing offer ended', data: pricingOffer })
      return
    }

    if (path === '/v1/admin/billing/offers/founding/redemptions' && request.method() === 'GET') {
      await json({ status: true, data: offerRedemptions })
      return
    }

    if (path === '/v1/admin/billing/offers/founding/redemptions/tenant-test-123/commitments' && request.method() === 'PATCH') {
      offerRedemptions = offerRedemptions.map((redemption) =>
        redemption.tenantId === 'tenant-test-123' ? { ...redemption, ...request.postDataJSON(), commitmentNotes: request.postDataJSON().notes ?? redemption.commitmentNotes } : redemption,
      )
      await json({ status: true, data: offerRedemptions[0] })
      return
    }

    // Incoming payment webhooks
    if (path === '/v1/admin/webhooks/incoming/summary' && request.method() === 'GET') {
      await json({ status: true, data: { RECEIVED: 0, PROCESSED: 41, IGNORED: 2, FAILED: 1, UNMATCHED: 1 } })
      return
    }

    if (path === '/v1/admin/webhooks/incoming' && request.method() === 'GET') {
      const url = new URL(request.url())
      const reference = url.searchParams.get('reference')
      const status = url.searchParams.get('status')
      const rows = incomingWebhooks
        .filter((hook) => (reference ? hook.reference === reference : true))
        .filter((hook) => (!reference && status ? hook.status === status : true))
      await json({ status: true, data: rows })
      return
    }

    // Subscription refunds
    if (path === '/v1/admin/billing/refunds' && request.method() === 'GET') {
      await json({ status: true, data: subscriptionRefunds })
      return
    }

    if (path === '/v1/admin/billing/refunds/refund-pending/refresh' && request.method() === 'POST') {
      subscriptionRefunds = subscriptionRefunds.map((refund) =>
        refund.id === 'refund-pending'
          ? { ...refund, status: 'PROCESSED', periodDaysReversed: 30, periodReversedAt: '2026-10-22T11:00:00Z', periodReversalNote: 'Removed 30 days from the subscription' }
          : refund,
      )
      await json({ status: true, data: subscriptionRefunds[0] })
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

test.describe('Admin Dashboard Journeys (01 - 14)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page)
  })

  test('Journey 01, 02, 03, 05: Payment Gateways Control, Health, History, and Alert Recipients', async ({ page }) => {
    // 1. Visit Payment Gateways Page
    await page.goto('/dashboard/payment-gateways')
    await expect(page.getByText('Payment Gateway Management')).toBeVisible()
    await expect(page.getByTestId('payment-alert-emails-warning')).toBeHidden()

    // Tab 1: Country Routing & Audit Trail (Journeys 01 & 03)
    await expect(page.getByText('Country Routing & Audit Trail')).toBeVisible()
    await expect(page.locator('select').first()).toHaveValue('DEFAULT')

    // Gateways are displayed
    await expect(page.getByRole('heading', { name: /Paystack/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Monnify/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Flutterwave/ })).toBeVisible()

    // Paystack is active default
    await expect(page.getByText('Active Default')).toBeVisible()

    // Journey 03: Setting change history section visible
    await expect(page.getByText('Gateway Setting Change History')).toBeVisible()
    await expect(page.getByText(/Enabled: PAYSTACK, MONNIFY/)).toBeVisible()

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

  test('Journey 05: warns on payment pages when alert recipients are empty', async ({ page }) => {
    await page.route('**/v1/admin/settings?*', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: true,
          data: [{ key: 'platformPaymentAlertEmails', value: '', valueType: 'STRING', category: 'PAYMENT' }],
        }),
      })
    })
    await page.goto('/dashboard/payment-gateways')
    const warning = page.getByTestId('payment-alert-emails-warning')
    await expect(warning).toBeVisible()
    await warning.getByRole('link', { name: /Set the recipients in Settings/ }).click()
    await expect(page).toHaveURL(/\/dashboard\/settings#platformPaymentAlertEmails/)
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

  test('Journey 10: Subscription Refunds list and Refresh', async ({ page }) => {
    await page.goto('/dashboard/billing/refunds')
    await expect(page.getByRole('heading', { name: 'Subscription Refunds' })).toBeVisible()
    await expect(page.getByText('Paid twice for October')).toBeVisible()
    await expect(page.getByText('Refund refused by provider')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refresh' })).toHaveCount(1)

    await page.getByRole('button', { name: 'Refresh' }).click()
    await expect(page.getByText('Removed 30 days from the subscription')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refresh' })).toHaveCount(0)
  })

  test('Journey 11: Duplicate payments review and Refund action', async ({ page }) => {
    await page.goto('/dashboard/billing/duplicate-payments')
    await expect(page.getByRole('heading', { name: 'Duplicate Subscription Payments' })).toBeVisible()
    await expect(page.getByText('This is observation only today.')).toBeVisible()
    await expect(page.getByText('PSK_REF_3')).toBeVisible()
    await expect(page.getByText('Period first paid by payment pay-first-3')).toBeVisible()

    // pay-dup-1 already has an active refund, so its status replaces the button
    await expect(page.getByText('Refund pending')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refund', exact: true })).toHaveCount(1)

    await page.getByRole('button', { name: 'Refund', exact: true }).click()
    await expect(page.getByText('Refund this duplicate payment?')).toBeVisible()
    await expect(page.getByText(/provider keeps its processing fee/)).toBeVisible()

    // A missing reason shows the 422 beside the field
    await page.getByRole('button', { name: 'Refund payment' }).click()
    await expect(page.getByText('note is required')).toBeVisible()

    await page.getByPlaceholder('Why is this payment being refunded?').fill('Paid twice for October')
    await page.getByRole('button', { name: 'Refund payment' }).click()
    await expect(page.getByText('Refund this duplicate payment?')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Refund', exact: true })).toHaveCount(0)
  })

  test('Journey 12: Incoming webhooks viewer', async ({ page }) => {
    await page.goto('/dashboard/payment-gateways/webhooks')
    await expect(page.getByRole('heading', { name: 'Incoming Payment Webhooks' })).toBeVisible()
    await expect(page.getByTestId('webhook-tile-FAILED')).toContainText('needs action')
    await expect(page.getByTestId('webhook-tile-UNMATCHED')).toContainText('needs action')
    await expect(page.getByTestId('webhook-tile-PROCESSED')).not.toContainText('needs action')

    // Status tile filters the list
    await page.getByTestId('webhook-tile-FAILED').click()
    await expect(page.getByText('PSK_FAILED_1')).toBeVisible()
    await expect(page.getByText('MNF_UNKNOWN_1')).toBeHidden()
    await expect(page.getByText('Could not activate the subscription').first()).toBeVisible()

    // Row detail shows pretty-printed payload and headers
    await page.getByRole('button', { name: 'View' }).click()
    await expect(page.getByTestId('webhook-payload')).toContainText('"reference": "PSK_FAILED_1"')
    await expect(page.getByText('x-paystack-signature:')).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()

    // Reference search takes priority over status
    await page.getByPlaceholder('Search by payment reference').fill('MNF_UNKNOWN_1')
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByText('The status filter is ignored while a reference is searched.')).toBeVisible()
    await expect(page.getByText('3 duplicate deliveries')).toBeVisible()
    await page.getByRole('button', { name: 'View' }).click()
    await expect(page.getByTestId('webhook-payload')).toContainText('not-json-body')
  })

  test('Journey 13: Pricing offers lifecycle and redemption commitments', async ({ page }) => {
    await page.goto('/dashboard/billing/offers')
    await expect(page.getByRole('heading', { name: 'Pricing Offers' })).toBeVisible()
    await expect(page.getByText('5 of 50 redeemed').first()).toBeVisible()

    // The first offer is selected: configuration is visible
    const detail = page.getByTestId('offer-detail')
    await expect(detail.getByText('locked for life')).toBeVisible()

    // Pause asks first, then updates the status
    await detail.getByRole('button', { name: 'Pause' }).click()
    await expect(page.getByText('Pause this offer?')).toBeVisible()
    await expect(page.getByText(/keep their trial and locked price/)).toBeVisible()
    await page.getByRole('button', { name: 'Pause offer' }).click()
    await expect(detail.getByText('Paused', { exact: true })).toBeVisible()

    // Resume, then ending is final and leaves no actions
    await detail.getByRole('button', { name: 'Resume' }).click()
    await page.getByRole('button', { name: 'Open offer' }).click()
    await expect(detail.getByText('Active', { exact: true })).toBeVisible()
    await detail.getByRole('button', { name: 'End' }).click()
    await expect(page.getByText('End this offer for good?')).toBeVisible()
    await page.getByRole('button', { name: 'End offer' }).click()
    await expect(detail.getByText('Ended', { exact: true })).toBeVisible()
    await expect(detail.getByRole('button', { name: 'Pause' })).toHaveCount(0)

    // Commitments are tracked per redeeming store
    const setupCall = page.getByLabel('Setup call completed for tenant-test-123')
    await setupCall.check()
    await expect(setupCall).toBeChecked()
    await page.getByPlaceholder('Add a note').fill('Call done on Friday')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
  })

  test('Journey 14: Create and edit a pricing offer', async ({ page }) => {
    await page.goto('/dashboard/billing/offers')
    await expect(page.getByTestId('offer-detail').getByText('Founding Merchant')).toBeVisible()

    // Edit the cap of the selected offer
    await page.getByTestId('offer-detail').getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByText('Edit Founding Merchant')).toBeVisible()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByPlaceholder('founding', { exact: true })).toHaveAttribute('readonly', '')
    await dialog.getByPlaceholder('e.g. 50').fill('80')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Edit Founding Merchant')).toBeHidden()
    await expect(page.getByTestId('offer-detail').getByText('5 of 80 redeemed')).toBeVisible()

    // Create: the 422 for a missing plan shows beside the plan choices
    await page.getByRole('button', { name: 'New offer' }).click()
    await dialog.getByPlaceholder('founding', { exact: true }).fill('spring')
    await dialog.getByPlaceholder('Founding Merchant').fill('Spring Launch')
    await page.getByRole('button', { name: 'Create offer' }).click()
    await expect(page.getByText('At least one eligible plan is required.')).toBeVisible()

    await page.getByText('Pro Plan').click()
    await page.getByRole('button', { name: 'Add perk' }).click()
    await dialog.getByPlaceholder('WHATSAPP_UTILITY_CREDITS').fill('WHATSAPP_UTILITY_CREDITS')
    await page.getByRole('button', { name: 'Create offer' }).click()
    await expect(page.getByText('New pricing offer')).toBeHidden()
    await expect(page.getByTestId('offer-detail').getByText('Spring Launch')).toBeVisible()
  })
})
