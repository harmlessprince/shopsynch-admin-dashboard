import { expect, test, type Page } from '@playwright/test'

async function mockAdminApi(page: Page) {
  let merchantsList = [
    {
      id: 'tenant-existing-1',
      businessTradingName: 'Existing Store One',
      code: 'EX1',
      ownerFullName: 'Existing Owner',
      ownerEmail: 'owner1@example.com',
      currentMode: 'TEST_MODE',
      complianceReviewStatus: 'APPROVED',
      status: true,
      createdAt: '2026-09-01T10:00:00Z',
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

    if (path === '/v1/admin/merchants' && request.method() === 'GET') {
      await json({
        status: true,
        data: {
          items: merchantsList,
          total: merchantsList.length,
          currentPage: 0,
          totalElements: merchantsList.length,
        },
      })
      return
    }

    if (path === '/v1/admin/merchants' && request.method() === 'POST') {
      const payload = JSON.parse(request.postData() || '{}')

      if (payload.ownerEmail === 'duplicate.verified@example.com') {
        await json({
          status: true,
          message: 'Email is already registered and verified.',
          data: {
            outcome: 'EMAIL_ALREADY_REGISTERED',
            message: 'An account with this email address already exists and is verified. Duplicate registration is not permitted.',
          },
        })
        return
      }

      if (payload.ownerEmail === 'duplicate.unverified@example.com') {
        await json({
          status: true,
          message: 'Email is already registered but unverified. Advise the merchant to check their inbox.',
          data: {
            outcome: 'EMAIL_ALREADY_REGISTERED_UNVERIFIED',
            message: 'This merchant already started registration but has not verified their email. Advise the merchant to check their inbox for their original setup email.',
          },
        })
        return
      }

      // Happy path
      const newMerchant = {
        id: 'tenant-new-123',
        businessTradingName: payload.businessName,
        code: 'NEW',
        ownerFullName: payload.ownerName,
        ownerEmail: payload.ownerEmail,
        currentMode: 'TEST_MODE',
        complianceReviewStatus: 'NOT_SUBMITTED',
        status: true,
        createdAt: new Date().toISOString(),
      }
      merchantsList = [newMerchant, ...merchantsList]

      await json({
        status: true,
        message: 'Merchant registered successfully.',
        data: {
          outcome: 'CREATED',
          userId: 'usr-new-123',
          tenantId: 'tenant-new-123',
          message: 'Merchant registered successfully.',
        },
      })
      return
    }

    // Default mock response
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

test.describe('Staff-Assisted Merchant Registration (Module A)', () => {
  test('User Story 1 & 2: Staff registers a brand-new merchant with minimal fields', async ({ page }) => {
    await mockAdminApi(page)

    await page.goto('/dashboard/merchants')
    await expect(page.locator('h1:has-text("Merchants")')).toBeVisible()

    // Click Register Merchant button
    const registerBtn = page.locator('[data-testid="open-register-merchant-modal"]')
    await expect(registerBtn).toBeVisible()
    await registerBtn.click()

    // Assert modal opened
    await expect(page.locator('h2:has-text("Register New Merchant")')).toBeVisible()

    // Fill minimal required fields: ownerName, ownerEmail, businessName
    await page.fill('input[name="ownerName"]', 'Alice Walker')
    await page.fill('input[name="ownerEmail"]', 'alice@newstore.com')
    await page.fill('input[name="businessName"]', 'Alice Modern Boutique')

    // Submit form
    await page.click('[data-testid="submit-register-merchant"]')

    // Modal should close upon successful creation
    await expect(page.locator('h2:has-text("Register New Merchant")')).toBeHidden()

    // Newly created merchant should appear in the merchants list
    await expect(page.locator('text=Alice Modern Boutique')).toBeVisible()
  })

  test('User Story 3: Duplicate verified email displays error alert and prevents registration', async ({ page }) => {
    await mockAdminApi(page)

    await page.goto('/dashboard/merchants')
    await page.click('[data-testid="open-register-merchant-modal"]')
    await expect(page.locator('h2:has-text("Register New Merchant")')).toBeVisible()

    await page.fill('input[name="ownerName"]', 'Existing Verified Owner')
    await page.fill('input[name="ownerEmail"]', 'duplicate.verified@example.com')
    await page.fill('input[name="businessName"]', 'Duplicate Verified Store')

    await page.click('[data-testid="submit-register-merchant"]')

    // Assert error alert visible
    const alert = page.locator('[data-testid="outcome-verified-alert"]')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText('Email Already Registered')

    // Modal remains open
    await expect(page.locator('h2:has-text("Register New Merchant")')).toBeVisible()
  })

  test('User Story 4 & 5: Duplicate unverified email displays warning advisory without automatic email resend', async ({ page }) => {
    await mockAdminApi(page)

    await page.goto('/dashboard/merchants')
    await page.click('[data-testid="open-register-merchant-modal"]')
    await expect(page.locator('h2:has-text("Register New Merchant")')).toBeVisible()

    await page.fill('input[name="ownerName"]', 'Existing Unverified Owner')
    await page.fill('input[name="ownerEmail"]', 'duplicate.unverified@example.com')
    await page.fill('input[name="businessName"]', 'Duplicate Unverified Store')

    await page.click('[data-testid="submit-register-merchant"]')

    // Assert warning advisory alert visible
    const alert = page.locator('[data-testid="outcome-unverified-alert"]')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText('Email Already Registered (Unverified)')
    await expect(alert).toContainText('Advise the merchant to check their inbox')

    // Modal remains open
    await expect(page.locator('h2:has-text("Register New Merchant")')).toBeVisible()
  })
})
