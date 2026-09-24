import { expect, test, type Page } from '@playwright/test'

async function mockAdminApi(page: Page) {
  const sampleMerchant = {
    id: 'tenant-acme-1',
    businessTradingName: 'Acme Superstore',
    code: 'ACME',
    ownerFullName: 'Alice Acme',
    ownerEmail: 'alice@acme.com',
    currentMode: 'TEST_MODE',
    status: true,
    createdAt: '2026-09-01T10:00:00Z',
  }

  const sampleCategory = {
    id: 'cat-electronics',
    name: 'Electronics & Audio',
    slug: 'electronics-audio',
    children: [],
  }

  const sampleProduct = {
    id: 'prod-headphone-1',
    name: 'Noise-Cancelling Wireless Headphones',
    sku: 'ACME-NCH-001',
    productCode: 'NCH-001',
    productType: 'SIMPLE',
    price: 35000,
    costPrice: 20000,
    quantityInStock: 45,
    unitTrackingMode: 'SINGLE_UNIT',
    status: 'ACTIVE',
    categoryId: 'cat-electronics',
    categoryName: 'Electronics & Audio',
    brandName: 'Acme Audio',
    description: '<p>Premium wireless noise cancelling headphones with deep bass.</p>',
    summary: 'Premium wireless headphones',
    tenantId: 'tenant-acme-1',
    createdAt: '2026-09-10T12:00:00Z',
    imageList: ['https://placehold.co/400x400/png?text=Headphone'],
    images: [{ id: 'img-1', url: 'https://placehold.co/400x400/png?text=Headphone' }],
    variantGroups: [],
  }

  const sampleInventory = {
    id: 'inv-record-1',
    productId: 'prod-headphone-1',
    productName: 'Noise-Cancelling Wireless Headphones',
    skuId: 'ACME-NCH-001',
    sku: 'ACME-NCH-001',
    inventoryCode: 'INV-NCH-001',
    tenantId: 'tenant-acme-1',
    branchName: 'Main Warehouse',
    unitTrackingMode: 'SINGLE_UNIT',
    onHandQty: 45,
    reservedQty: 5,
    availableQty: 40,
    reorderPoint: 10,
    costingMethod: 'WEIGHTED_AVERAGE',
    averageCost: 20000,
    version: 1,
    status: 'IN_STOCK',
  }

  const sampleLogs = [
    {
      id: 'log-1',
      action: 'RECEIVED',
      quantityChange: 50,
      onHandQtyAfter: 50,
      unitCost: 20000,
      reference: 'PO-2026-001',
      notes: 'Initial restock from supplier',
      createdAt: '2026-09-11T09:00:00Z',
    },
    {
      id: 'log-2',
      action: 'SOLD',
      quantityChange: -5,
      onHandQtyAfter: 45,
      unitCost: 20000,
      reference: 'ORD-98214',
      notes: 'Storefront sale',
      createdAt: '2026-09-12T14:30:00Z',
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

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })

    // Auth profile
    if (path === '/v1/admin/auth/profile') {
      return json({
        status: true,
        data: {
          id: 'admin-usr-1',
          email: 'admin@shopsynch.com',
          fullName: 'Super Admin',
          role: { name: 'Super Admin', slug: 'super_admin' },
          currentMode: 'live',
        },
      })
    }

    // Merchants list
    if (path === '/v1/admin/merchants' && request.method() === 'GET') {
      return json({
        status: true,
        data: {
          items: [sampleMerchant],
          total: 1,
          currentPage: 0,
        },
      })
    }

    // Categories
    if (path === '/v1/admin/categories' || path === '/v1/categories') {
      return json({
        status: true,
        data: [sampleCategory],
      })
    }

    // Product unit suggestions
    if (path.includes('/unit-suggestions') || path.includes('/unit-scaffolds')) {
      return json({
        status: true,
        data: [
          { key: 'piece', label: 'Piece', isBase: true },
          { key: 'pack', label: 'Pack of 10', multiplier: 10 },
        ],
      })
    }

    // Products list
    if (path === '/v1/admin/products' && request.method() === 'GET') {
      return json({
        status: true,
        data: {
          products: [sampleProduct],
          total: 1,
          currentPage: 1,
        },
      })
    }

    // Product create
    if (
      (path === '/v1/admin/products' || path.startsWith('/v1/admin/products/merchants/')) &&
      request.method() === 'POST'
    ) {
      const payload = JSON.parse(request.postData() || '{}')
      return json({
        status: true,
        message: 'Product created successfully',
        data: {
          id: 'prod-new-123',
          ...payload,
        },
      })
    }

    // Product detail
    if (path === '/v1/admin/products/prod-headphone-1' && request.method() === 'GET') {
      return json({
        status: true,
        data: sampleProduct,
      })
    }

    // Product update
    if (path === '/v1/admin/products/prod-headphone-1' && request.method() === 'PATCH') {
      const payload = JSON.parse(request.postData() || '{}')
      return json({
        status: true,
        message: 'Product updated successfully',
        data: {
          ...sampleProduct,
          ...payload,
        },
      })
    }

    // Product archive / unarchive
    if (path === '/v1/admin/products/prod-headphone-1/archive' && request.method() === 'PATCH') {
      return json({
        status: true,
        message: 'Product archived successfully',
        data: { ...sampleProduct, isArchived: true },
      })
    }

    // Inventory by product
    if (path === '/v1/admin/inventory/product/prod-headphone-1') {
      return json({
        status: true,
        data: [sampleInventory],
      })
    }

    // Inventory list
    if (path === '/v1/admin/inventory' && request.method() === 'GET') {
      return json({
        status: true,
        data: {
          items: [sampleInventory],
          total: 1,
          currentPage: 1,
        },
      })
    }

    // Inventory single detail
    if (path === '/v1/admin/inventory/inv-record-1' && request.method() === 'GET') {
      return json({
        status: true,
        data: sampleInventory,
      })
    }

    // Inventory logs
    if (path === '/v1/admin/inventory/inv-record-1/logs') {
      return json({
        status: true,
        data: {
          items: sampleLogs,
          total: 2,
        },
      })
    }

    // Inventory batches
    if (path === '/v1/admin/inventory/inv-record-1/batches') {
      return json({
        status: true,
        data: [],
      })
    }

    // Inventory adjust
    if (path === '/v1/admin/inventory/inv-record-1/adjust' && request.method() === 'PATCH') {
      const payload = JSON.parse(request.postData() || '{}')
      const addedQty = payload.action === 'RECEIVED' ? Number(payload.qty) : -Number(payload.qty)
      const updated = {
        ...sampleInventory,
        onHandQty: sampleInventory.onHandQty + addedQty,
        availableQty: sampleInventory.availableQty + addedQty,
        version: sampleInventory.version + 1,
      }
      return json({
        status: true,
        message: 'Stock movement recorded successfully',
        data: updated,
      })
    }

    // Default fallback
    return json({ status: true, data: [] })
  })

  // Set mock auth cookies
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

test.describe('Admin Product & Inventory Management', () => {
  test('1. Product catalog list displays items and navigates to details', async ({ page }) => {
    await mockAdminApi(page)

    await page.goto('/dashboard/product')
    await expect(page.locator('h1:has-text("Products")')).toBeVisible()

    // Verify Create Product button is visible and active
    const createBtn = page.locator('a[href="/dashboard/product/create"]')
    await expect(createBtn).toBeVisible()

    // Verify product row is displayed
    await expect(page.locator('text=Noise-Cancelling Wireless Headphones')).toBeVisible()
    await expect(page.locator('text=ACME-NCH-001')).toBeVisible()

    // Click product name link to navigate to detail
    await page.click('text=Noise-Cancelling Wireless Headphones')
    await page.waitForURL('**/dashboard/product/prod-headphone-1')

    // Verify product detail page
    await expect(page.getByRole('heading', { name: 'Noise-Cancelling Wireless Headphones' }).first()).toBeVisible()
    await expect(page.locator('text=₦35,000.00').first()).toBeVisible()
  })

  test('2. Product create page loads with merchant selection and basic info', async ({ page }) => {
    await mockAdminApi(page)

    await page.goto('/dashboard/product/create')
    await expect(page.getByRole('heading', { name: 'Product Information' })).toBeVisible()

    // Verify merchant store selector is rendered and shows business trading name
    await expect(page.locator('text=Merchant / Store')).toBeVisible()
    const merchantTrigger = page.locator('text=Select a merchant store...')
    await expect(merchantTrigger).toBeVisible()
    await merchantTrigger.click()
    await expect(page.locator('text=Acme Superstore (ACME)')).toBeVisible()
    await page.locator('text=Acme Superstore (ACME)').click()

    // Verify Product Name input
    const nameInput = page.locator('input[placeholder="EX: Wireless headphone"]')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Ultra Ergonomic Keyboard')

    // Verify Category selection button is present
    const categoryBtn = page.locator('#product-category-button')
    await expect(categoryBtn).toBeVisible()
  })

  test('3. Inventory list displays stock records and links to inventory details', async ({ page }) => {
    await mockAdminApi(page)

    await page.goto('/dashboard/inventory')
    await expect(page.locator('h1:has-text("Inventory")')).toBeVisible()

    // Verify inventory record row is rendered
    const itemLink = page.locator('a[href="/dashboard/inventory/inv-record-1"]')
    await expect(itemLink).toBeVisible()
    await expect(page.locator('text=45').first()).toBeVisible()

    // Navigate to inventory record detail
    await page.goto('/dashboard/inventory/inv-record-1')

    // Verify inventory detail page elements
    await expect(page.getByRole('heading', { name: 'Noise-Cancelling Wireless Headphones' }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Perform Stock Adjustment / Restock' })).toBeVisible()
    await expect(page.locator('text=Main Warehouse').first()).toBeVisible()

    // Verify All Inventory back link is valid and points to /dashboard/inventory
    const allInventoryLink = page.locator('a:has-text("All Inventory")')
    await expect(allInventoryLink).toBeVisible()
    await expect(allInventoryLink).toHaveAttribute('href', '/dashboard/inventory')

    // Verify stock movement logs are visible
    await expect(page.locator('text=Initial restock from supplier')).toBeVisible()
    await expect(page.locator('text=PO-2026-001')).toBeVisible()
  })

  test('4. Inventory restock action performs stock adjustment successfully', async ({ page }) => {
    await mockAdminApi(page)

    await page.goto('/dashboard/inventory/inv-record-1')
    await expect(page.getByRole('heading', { name: 'Perform Stock Adjustment / Restock' })).toBeVisible()

    // Fill restock form (action defaults to RECEIVED)
    const qtyInput = page.locator('input[type="number"]').first()
    await expect(qtyInput).toBeVisible()
    await qtyInput.fill('10')

    const notesInput = page.locator('input[placeholder*="supplier invoice"], textarea, input[name="notes"]').first()
    if (await notesInput.isVisible()) {
      await notesInput.fill('New shipment arrival')
    }

    // Submit movement
    const submitBtn = page.getByRole('button', { name: 'Confirm Stock Adjustment' })
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // Expect updated stock or confirmation
    await expect(page.locator('text=55 Units').or(page.locator('text=Stock movement recorded successfully'))).toBeVisible({ timeout: 5000 })
  })

  test('5. Product edit page loads product details and prepopulates all fields', async ({ page }) => {
    await mockAdminApi(page)

    await page.goto('/dashboard/product/prod-headphone-1/edit')
    await expect(page.getByRole('heading', { name: 'Edit Product Information' })).toBeVisible()

    // Verify merchant store banner is displayed
    await expect(page.locator('text=Merchant Store')).toBeVisible()
    await expect(page.locator('text=Acme Superstore')).toBeVisible()

    // Verify product name input is hydrated
    const nameInput = page.locator('input[placeholder="EX: Wireless headphone"]')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue('Noise-Cancelling Wireless Headphones')

    // Verify category is hydrated and displayed
    await expect(page.locator('#product-category-button')).toContainText('Electronics & Audio')

    // Verify price input is hydrated
    const priceInput = page.locator('input[name="root-price"]')
    await expect(priceInput).toBeVisible()
    await expect(priceInput).toHaveValue('35,000')

    // Verify SKU input is hydrated
    const skuInput = page.locator('input[name="root-seller-sku"]')
    await expect(skuInput).toBeVisible()
    await expect(skuInput).toHaveValue('ACME-NCH-001')

    // Verify stock quantity is hydrated from inventory (availableQty = 40)
    const qtyInput = page.locator('input[name="root-quantity"]')
    await expect(qtyInput).toBeVisible()
    await expect(qtyInput).toHaveValue('40')

    // Verify specification section is visible
    await expect(page.getByRole('heading', { name: 'Product Specification' })).toBeVisible()
  })
})
