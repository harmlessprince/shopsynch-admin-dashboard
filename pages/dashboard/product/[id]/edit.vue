<script setup>
import { useApiService } from '~/services/apiService.js'
import { endpoints } from '~/utils/endpoints.js'
import { debounce, formatToMoney, logger, FIXED_UNIT_OPTIONS, getStockUnitOption, stripHtmlRegex } from '~/utils/helpers.js'
import { useErrorStore } from '~/stores/error.store.js'
import { useCollectionsStore } from '~/stores/collections.store.js'
import { useAdminMerchantsStore } from '~/stores/adminMerchants.store.js'
import TemplateAttributeField from '~/components/Dashboard/TemplateAttributeField.vue'
import BaseSelectInput from '~/components/BaseSelectInput.vue'
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth-middleware',
  name: 'dashboard-products-edit',
  noPadding: true,
  pageTitle: 'Edit product',
  headerBack: true,
})

useHead({
  title: 'Edit Product - ShopSynch',
})

const categoryStore = useCategoryStore()
const productTemplateStore = useProductTemplateStore()
const toastStore = useToastStore()
const merchantsStore = useAdminMerchantsStore()
const productStore = useProductStore()
const inventoryStore = useInventoryStore()
const collectionsStore = useCollectionsStore()
const errorStore = useErrorStore()
const { get, post } = useApiService()
const router = useRouter()
const route = useRoute()

const isCategoryDrawerOpen = ref(false)
const isAddCategoryDrawerOpen = ref(false)
const isSubmitting = ref(false)
const isLoadingProduct = ref(true)
const isResolvingCategory = ref(false)
const isHydratingProduct = ref(false)
const currentTemplate = ref(null)
const templateLoadingError = ref('')
const noCategoryTemplate = ref(false)
const originalUnitTrackingMode = ref('')
const originalUnitCategory = ref('')
const originalUnitTiers = ref(null)
const initialCollectionId = ref('')
const productTenantId = ref('')
const currentMerchantName = computed(() => {
  if (!productTenantId.value) return ''
  const m = (merchantsStore.merchants || []).find((merchant) => merchant.id === productTenantId.value)
  return m ? (m.businessTradingName || m.name || m.code || productTenantId.value) : productTenantId.value
})
const brandQuery = ref('')
const brandOptions = ref([])
const isLoadingBrands = ref(false)
const selectedBrandStats = ref([])
const selectedBrandRecordedKey = ref('')
const stepErrors = reactive({
  images: '',
  name: '',
  categoryId: '',
  description: '',
  summary: '',
})

const emptyImage = () => ({ fileId: null, url: null })

const productForm = reactive({
  images: [emptyImage(), emptyImage(), emptyImage(), emptyImage()],
  uploadingStates: [false, false, false, false],
  name: '',
  categoryId: '',
  categoryName: '',
  collectionId: '',
  productType: 'SIMPLE',
  brandName: '',
  colorFamily: '',
  weight: '',
  attributes: {},
  description: '',
  summary: '',
  manufacturerDescription: '',
  boxContents: '',
  productWarranty: '',
  warrantyAddress: '',
  price: '',
  costPrice: '',
  quantity: '',
  reorderLevel: '',
  reorderQty: '',
  sellerSku: '',
  gtinBarcode: '',
  salesPrice: '',
  salesStartDate: '',
  salesEndDate: '',
  inventoryFieldsLocked: false,
  variantAttributeName: '',
  unitTrackingMode: 'SINGLE_UNIT',
  unitCategory: '',
  unitTiers: [],
  stockEntryUnitKey: '',
  variants: [
    {
      groupId: '',
      skuId: '',
      variation: '',
      attributes: {},
      sellerSku: '',
      systemSku: '',
      gtinBarcode: '',
      quantity: '',
      reorderLevel: '',
      reorderQty: '',
      price: '',
      costPrice: '',
      salesPrice: '',
      salesStartDate: '',
      salesEndDate: '',
      isGeneratingSku: false,
    },
  ],
  bundledProductIds: [],
})

const steps = [
  { id: 1, title: 'Product information', sectionId: 'product-information' },
  { id: 2, title: 'Pricing', sectionId: 'product-variants' },
  { id: 3, title: 'Product specification', sectionId: 'product-specification' },
]

const activeStepId = ref(steps[0].id)

const hasSelectedCategory = computed(() => Boolean(productForm.categoryId))

const productTypes = [
  {
    value: 'SIMPLE',
    label: 'Simple',
    icon: 'inventory_2',
    description: 'Single price and stock',
  },
  {
    value: 'VARIABLE',
    label: 'Variable',
    icon: 'layers',
    description: 'Multiple variants',
  },
  {
    value: 'DIGITAL',
    label: 'Digital',
    icon: 'download',
    description: 'No physical stock',
  },
  {
    value: 'BUNDLE',
    label: 'Bundle',
    icon: 'apps',
    description: 'Grouped products package',
  },
]

const isVariableProduct = computed(() => productForm.productType === 'VARIABLE')
const isDigitalProduct = computed(() => productForm.productType === 'DIGITAL')
const isBundleProduct = computed(() => productForm.productType === 'BUNDLE')

const bundledProducts = ref([])
const isLoadingBundled = ref(false)

const loadBundledProducts = async (ids) => {
  if (!ids || !ids.length) {
    bundledProducts.value = []
    return
  }
  try {
    isLoadingBundled.value = true
    const responses = await Promise.all(
      ids.map((id) =>
        productStore.getProductById(id).catch((err) => {
          logger.warn(`Failed to fetch bundled product ${id}`, err)
          return null
        })
      )
    )
    bundledProducts.value = responses
      .filter((res) => res && res.data)
      .map((res) => res.data)
  } catch (err) {
    logger.error('Failed to load bundled products', err)
  } finally {
    isLoadingBundled.value = false
  }
}
const pricingSectionTitle = computed(() => isVariableProduct.value ? 'Variants' : 'Pricing')
const inventoryFieldsLocked = computed(() => Boolean(productForm.inventoryFieldsLocked))

const isUnitSetupValid = ref(true)

const unitSetup = computed({
  get: () => ({
    unitTrackingMode: productForm.unitTrackingMode,
    unitCategory: productForm.unitCategory,
    unitTiers: productForm.unitTiers,
    stockEntryUnitKey: productForm.stockEntryUnitKey,
  }),
  set: (value) => {
    productForm.unitTrackingMode = value.unitTrackingMode
    productForm.unitCategory = value.unitCategory
    productForm.unitTiers = value.unitTiers
    productForm.stockEntryUnitKey = value.stockEntryUnitKey
  },
})

// FIXED_WEIGHT/FIXED_VOLUME products always store stock in a fixed base unit (grams/ml)
// server-side. These let the merchant log quantities in the unit they actually stock in
// (e.g. litres, kg) while we convert to/from the base unit behind the scenes.
const isFixedUnitsMode = computed(() => Boolean(FIXED_UNIT_OPTIONS[productForm.unitTrackingMode]))
const activeStockUnit = computed(() => getStockUnitOption(productForm.unitTrackingMode, productForm.stockEntryUnitKey))
const stockUnitSuffix = computed(() => (isFixedUnitsMode.value && activeStockUnit.value ? ` (${activeStockUnit.value.key})` : ''))

function toBaseQuantity(displayValue) {
  if (!isFixedUnitsMode.value || displayValue === '' || displayValue === null || displayValue === undefined) return displayValue
  const parsed = Number(displayValue)
  if (!Number.isFinite(parsed)) return displayValue
  return Math.round(parsed * (activeStockUnit.value?.multiplier || 1))
}

function fromBaseQuantity(baseValue) {
  if (!isFixedUnitsMode.value || baseValue === '' || baseValue === null || baseValue === undefined) return baseValue
  const parsed = Number(baseValue)
  if (!Number.isFinite(parsed)) return baseValue
  const converted = parsed / (activeStockUnit.value?.multiplier || 1)
  return Number.isInteger(converted) ? converted : Number(converted.toFixed(2))
}

// These hold what the merchant is actually typing (e.g. "2.5" kg) as their own state
// rather than a computed round-trip through the base unit. A round-trip getter would
// re-derive from the converted base value on every keystroke, which snaps back to a
// whole number mid-type (e.g. after "2." it recomputes to "2") and swallows the
// decimal point before the rest of the fraction can be typed.
const displayQuantity = ref(fromBaseQuantity(productForm.quantity))
const displayReorderLevel = ref(fromBaseQuantity(productForm.reorderLevel))
const displayReorderQty = ref(fromBaseQuantity(productForm.reorderQty))

watch(displayQuantity, (value) => { productForm.quantity = toBaseQuantity(value) })
watch(displayReorderLevel, (value) => { productForm.reorderLevel = toBaseQuantity(value) })
watch(displayReorderQty, (value) => { productForm.reorderQty = toBaseQuantity(value) })

// Re-derive the display values from the stored base quantity only when the active
// stock unit changes (switching kg<->g, or the mode loading in from hydration) - the
// one time we do want the base value to overwrite what's shown.
watch(activeStockUnit, () => {
  displayQuantity.value = fromBaseQuantity(productForm.quantity)
  displayReorderLevel.value = fromBaseQuantity(productForm.reorderLevel)
  displayReorderQty.value = fromBaseQuantity(productForm.reorderQty)
})

const DESCRIPTION_LIMITS = {
  min: 5,
  max: 5000,
}

const SUMMARY_LIMITS = {
  min: 5,
  max: 500,
}

const visibleSteps = computed(() =>
  hasSelectedCategory.value ? steps : steps.slice(0, 1)
)

const canSubmit = computed(() =>
  productForm.images.some((image) => image.fileId || image.url)
  && productForm.name.trim()
  && productForm.categoryId
  && (inventoryFieldsLocked.value || isUnitSetupValid.value)
)

const isVariantAttribute = (attribute) =>
  attribute?.isVariantDimension === true || attribute?.variantDimension === true

const productAttributeDefs = computed(() => {
  if (!currentTemplate.value?.attributeDefinitions) return []

  return currentTemplate.value.attributeDefinitions
    .filter((attribute) => !isVariantAttribute(attribute) && attribute.displayAs !== 'HIDDEN')
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
})

const variantAttributeDefs = computed(() => {
  if (!currentTemplate.value?.attributeDefinitions) return []

  return currentTemplate.value.attributeDefinitions
    .filter((attribute) => isVariantAttribute(attribute) && attribute.displayAs !== 'HIDDEN')
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
})

const variantSuggestionOptions = computed(() => {
  const options = []

  variantAttributeDefs.value.forEach((attribute) => {
    ;(attribute.options || []).forEach((option) => {
      if (option && !options.includes(String(option))) {
        options.push(String(option))
      }
    })
  })

  return options
})

const SELECTED_BRANDS_STORAGE_KEY = 'shopsynch:selected-product-brands'

const brandTooltip = 'Enter the manufacturer or brand name of the product.'
const colorFamilyTooltip = 'Main color category for product filters and search.'
const priceTooltip = 'Selling price charged to customers.'
const defaultCostPriceTooltip = 'Unit purchase or production cost used to calculate profit.'
const salePriceTooltip = 'Discounted selling price applied during the sale dates.'
const quantityTooltip = 'Current available stock in inventory.'
const newVariantQuantityTooltip = 'Initial stock units available for sale.'
const sellerSkuTooltip = 'Unique merchant code for internal stock tracking.'
const gtinBarcodeTooltip = 'Global barcode number such as UPC, EAN, or ISBN.'
const lowStockThresholdTooltip = 'Triggers a low stock alert when available stock reaches this quantity.'
const reorderQtyTooltip = 'Recommended restock quantity when stock is low.'

const recentTenantCategories = computed(() =>
  (categoryStore.merchantCategories.length ? categoryStore.merchantCategories : categoryStore.categories || []).map((category) => ({
    ...category,
    _source: 'tenant',
  }))
)

const systemCategories = computed(() =>
  (categoryStore.defaultCategories || []).map((category) => ({
    ...category,
    _source: 'system',
  }))
)

const hasCollections = computed(() => (collectionsStore.collections || []).length > 0)

const collectionOptions = computed(() => [
  { label: 'None', value: '' },
  ...(collectionsStore.collections || []).map((collection) => ({
    label: collection.name,
    value: collection.id,
  })),
])

const colorFamilyAttribute = {
  key: 'colorFamily',
  label: 'Color family',
  placeholder: 'Ex: Black, White, Red',
  type: 'STRING',
  description: colorFamilyTooltip,
  options: ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Grey', 'Silver', 'Gold', 'Brown'],
}

const weightAttribute = {
  key: 'weight',
  label: 'Weight (KG)',
  placeholder: 'Ex: 12kg',
  type: 'STRING',
  options: ['0.5kg', '1kg', '2kg', '5kg', '10kg', '12kg', '15kg', '20kg'],
}

function emptyVariant() {
  return {
    groupId: '',
    skuId: '',
    variation: '',
    attributes: {},
    sellerSku: '',
    systemSku: '',
    gtinBarcode: '',
    quantity: '',
    reorderLevel: '',
    reorderQty: '',
    price: '',
    costPrice: '',
    salesPrice: '',
    salesStartDate: '',
    salesEndDate: '',
    isGeneratingSku: false,
  }
}

function getInventoryRecordForSku(inventoryRecords, skuId = null) {
  const records = Array.isArray(inventoryRecords) ? inventoryRecords : []
  if (skuId) {
    return records.find((record) => String(record?.skuId || '') === String(skuId)) || null
  }

  return records.find((record) => !record?.skuId) || records[0] || null
}

function normalizeBrandKey(value) {
  return String(value || '').trim().toLowerCase()
}

function cleanBrandName(value) {
  return String(value || '').trim()
}

function loadSelectedBrandStats() {
  if (import.meta.server) return

  try {
    const stored = JSON.parse(localStorage.getItem(SELECTED_BRANDS_STORAGE_KEY) || '[]')
    const parsedStats = Array.isArray(stored)
      ? stored
        .map((item) => ({
          name: cleanBrandName(item?.name),
          count: Number(item?.count) || 0,
          lastSelectedAt: item?.lastSelectedAt || '',
        }))
        .filter((item) => item.name)
      : []

    const statsByName = new Map()
    parsedStats.forEach((item) => {
      const key = normalizeBrandKey(item.name)
      const existing = statsByName.get(key)
      if (!existing) {
        statsByName.set(key, item)
        return
      }

      existing.count = (Number(existing.count) || 0) + (Number(item.count) || 0)
      if (new Date(item.lastSelectedAt || 0).getTime() > new Date(existing.lastSelectedAt || 0).getTime()) {
        existing.name = item.name
        existing.lastSelectedAt = item.lastSelectedAt
      }
    })

    selectedBrandStats.value = Array.from(statsByName.values()).sort((a, b) =>
      (Number(b.count) || 0) - (Number(a.count) || 0)
      || new Date(b.lastSelectedAt || 0).getTime() - new Date(a.lastSelectedAt || 0).getTime()
    )
  } catch (error) {
    logger.warn('Could not load selected product brands', error)
    selectedBrandStats.value = []
  }
}

function persistSelectedBrandStats() {
  if (import.meta.server) return
  localStorage.setItem(SELECTED_BRANDS_STORAGE_KEY, JSON.stringify(selectedBrandStats.value))
}

function recordSelectedBrand(value) {
  const name = cleanBrandName(value)
  const key = normalizeBrandKey(name)
  if (!key) return

  const existing = selectedBrandStats.value.find((item) => normalizeBrandKey(item.name) === key)
  if (existing) {
    existing.name = name
    existing.count = (Number(existing.count) || 0) + 1
    existing.lastSelectedAt = new Date().toISOString()
  } else {
    selectedBrandStats.value.push({
      name,
      count: 1,
      lastSelectedAt: new Date().toISOString(),
    })
  }

  selectedBrandStats.value = [...selectedBrandStats.value].sort((a, b) =>
    (Number(b.count) || 0) - (Number(a.count) || 0)
    || new Date(b.lastSelectedAt || 0).getTime() - new Date(a.lastSelectedAt || 0).getTime()
  )
  persistSelectedBrandStats()
}

function getBrandNamesFromResponse(response) {
  if (!Array.isArray(response?.data)) return []
  return response.data.map((brand) => brand.name)
}

function filterBrandMatches(names, query) {
  const search = normalizeBrandKey(query)
  return names.filter((name) => {
    const cleanName = cleanBrandName(name)
    if (!cleanName) return false
    return !search || normalizeBrandKey(cleanName).includes(search)
  })
}

const localBrandOptions = computed(() =>
  filterBrandMatches(
    [...selectedBrandStats.value].sort((a, b) =>
      (Number(b.count) || 0) - (Number(a.count) || 0)
      || new Date(b.lastSelectedAt || 0).getTime() - new Date(a.lastSelectedAt || 0).getTime()
    ).map((item) => item.name),
    brandQuery.value
  )
)

const visibleBrandOptions = computed(() => {
  const seen = new Set()

  return [...localBrandOptions.value, ...brandOptions.value]
    .map(cleanBrandName)
    .filter((name) => {
      const key = normalizeBrandKey(name)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 10)
})

const brandNameAttribute = computed(() => ({
  key: 'brandName',
  label: 'Brand name',
  placeholder: 'Ex: Nike, Samsung, Apple',
  type: 'STRING',
  description: brandTooltip,
  options: visibleBrandOptions.value,
}))

async function fetchBrandOptions(query) {
  const typedBrand = cleanBrandName(query)

  if (!typedBrand) {
    brandOptions.value = []
    isLoadingBrands.value = false
    return
  }

  isLoadingBrands.value = true

  try {
    const response = await get(endpoints.brands, { search: typedBrand })
    if (cleanBrandName(brandQuery.value) !== typedBrand) return

    brandOptions.value = filterBrandMatches(
      getBrandNamesFromResponse(response),
      typedBrand
    )
  } catch (error) {
    logger.error('Brand search failed', error)
    brandOptions.value = []
  } finally {
    if (cleanBrandName(brandQuery.value) === typedBrand) {
      isLoadingBrands.value = false
    }
  }
}

const debouncedFetchBrandOptions = debounce(fetchBrandOptions, 350)

function selectBrandSuggestion(option) {
  productForm.brandName = option
  recordSelectedBrand(option)
  selectedBrandRecordedKey.value = normalizeBrandKey(option)
}

function recordSubmittedBrand() {
  const brandName = getBrandName()
  const key = normalizeBrandKey(brandName)
  if (!key || key === selectedBrandRecordedKey.value) return

  recordSelectedBrand(brandName)
  selectedBrandRecordedKey.value = key
}

function getBrandName() {
  const direct = productForm.brandName || productForm.attributes.brandName || productForm.attributes.brand || productForm.attributes.Brand
  if (direct) return direct

  const brandAttribute = productAttributeDefs.value.find((attribute) =>
    [attribute.key, attribute.label, attribute.name].some((value) =>
      String(value || '').toLowerCase() === 'brand'
    )
  )

  return brandAttribute ? productForm.attributes[brandAttribute.key] || '' : ''
}

function cleanSkuAttributes() {
  return Object.fromEntries(
    Object.entries(productForm.attributes || {}).filter(([, value]) =>
      value !== '' && value !== null && value !== undefined
    ).concat([
      ['colorFamily', productForm.colorFamily],
      ['weight', productForm.weight],
    ]).filter(([, value]) =>
      value !== '' && value !== null && value !== undefined
    )
  )
}

function cleanObject(value) {
  if (Array.isArray(value)) {
    const cleanedArray = value
      .map((item) => item && typeof item === 'object' ? cleanObject(item) : item)
      .filter((item) =>
        item !== '' && item !== null && item !== undefined
        && !(Array.isArray(item) && item.length === 0)
        && !(item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 0)
      )

    return cleanedArray.length ? cleanedArray : undefined
  }

  if (!value || typeof value !== 'object') return value

  const out = {}
  Object.entries(value).forEach(([key, item]) => {
    const cleaned = item && typeof item === 'object' ? cleanObject(item) : item
    if (
      cleaned !== '' && cleaned !== null && cleaned !== undefined
      && !(Array.isArray(cleaned) && cleaned.length === 0)
      && !(cleaned && typeof cleaned === 'object' && !Array.isArray(cleaned) && Object.keys(cleaned).length === 0)
    ) {
      out[key] = cleaned
    }
  })

  return Object.keys(out).length ? out : undefined
}

function parseMoney(value) {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseInteger(value) {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number.parseInt(String(value).replace(/[^\d]/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseWeightKg(value) {
  return parseMoney(value)
}

function formatDateInput(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function getFirstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '')
}

function stringLooksLikeUrl(value) {
  return typeof value === 'string' && /^(https?:|data:|blob:|\/)/.test(value)
}

function buildExistingImages(product) {
  const imageIds = product.imageFileIds || product.imageIds || []
  const imageUrls = product.images || product.imageUrls || []
  const imageList = product.imageList || []
  const fallbackUrls = [product.image, product.thumbnail].filter(Boolean)

  return Array.from({ length: 4 }, (_, index) => {
    const imageListValue = imageList[index]
    const url = imageUrls[index]
      || (stringLooksLikeUrl(imageListValue) ? imageListValue : '')
      || fallbackUrls[index]
      || ''
    const fileId = imageIds[index]
      || (!stringLooksLikeUrl(imageListValue) ? imageListValue : null)
      || null

    return {
      fileId,
      url: url || null,
    }
  })
}

function getCategoryName(product) {
  if (typeof product.category === 'string') return product.category
  return product.categoryName || product.category?.name || ''
}

function hydrateProductForm(product, inventoryRecords = []) {
  isHydratingProduct.value = true
  productTenantId.value = product.tenantId || (Array.isArray(inventoryRecords) && inventoryRecords[0]?.tenantId) || ''
  const rootInventory = getInventoryRecordForSku(inventoryRecords)

  productForm.images = buildExistingImages(product)
  productForm.uploadingStates = [false, false, false, false]
  productForm.name = product.name || ''

  let resolvedCategoryId = product.categoryId || product.category?.id || ''
  let catName = getCategoryName(product)
  const allCategories = [
    ...(categoryStore.merchantCategories || []),
    ...(categoryStore.categories || []),
    ...(categoryStore.defaultCategories || []),
  ]
  if (!resolvedCategoryId && catName) {
    const matchedCategory = allCategories.find((cat) => {
      const idMatch = String(cat.id || '') === String(catName)
      const nameMatch = cat.name && String(cat.name).toLowerCase() === String(catName).toLowerCase()
      const slugMatch = cat.slug && String(cat.slug).toLowerCase() === String(catName).toLowerCase()
      return idMatch || nameMatch || slugMatch
    })
    if (matchedCategory) {
      resolvedCategoryId = matchedCategory.id
      if (!catName || catName === matchedCategory.id) {
        catName = matchedCategory.name || catName
      }
    }
  } else if (resolvedCategoryId && (!catName || catName === resolvedCategoryId)) {
    const matched = allCategories.find((c) => String(c.id) === String(resolvedCategoryId))
    if (matched?.name) {
      catName = matched.name
    }
  }

  productForm.categoryId = resolvedCategoryId
  productForm.categoryName = catName
  productForm.productType = product.productType || 'SIMPLE'
  productForm.brandName = product.brandName || product.brand || ''
  productForm.colorFamily = product.colorFamily || product.attributes?.colorFamily || ''
  productForm.weight = getFirstDefined(product.weightKg, product.weight, product.attributes?.weight) || ''
  productForm.attributes = { ...(product.attributes || {}) }
  productForm.description = product.description || ''
  productForm.summary = product.summary ? stripHtmlRegex(product.summary) : ''
  productForm.manufacturerDescription = product.manufacturerDescription || ''
  productForm.boxContents = product.boxContents || ''
  productForm.productWarranty = product.productWarranty || ''
  productForm.warrantyAddress = product.warrantyAddress || ''
  productForm.price = getFirstDefined(product.price, product.basePrice, product.effectivePrice) || ''
  productForm.costPrice = getFirstDefined(product.costPrice) ?? ''
  productForm.inventoryFieldsLocked = Boolean(product.inventoryFieldsLocked)
  productForm.bundledProductIds = Array.isArray(product.bundledProductIds) ? [...product.bundledProductIds] : []
  if (product.productType === 'BUNDLE' && productForm.bundledProductIds.length) {
    loadBundledProducts(productForm.bundledProductIds)
  }
  productForm.variantAttributeName = product.variantSchema?.primaryDimension
    || product.variantGroups?.[0]?.attributeName
    || ''
  productForm.unitTrackingMode = product.unitTrackingMode || 'SINGLE_UNIT'
  productForm.unitCategory = product.unitCategory || ''
  productForm.stockEntryUnitKey = product.stockEntryUnitKey || ''
  productForm.unitTiers = (product.unitTiers || []).map((tier) => ({
    unitKey: tier.unitKey || '',
    defaultLabel: tier.defaultLabel || '',
    multiplierFromBase: tier.multiplierFromBase,
    active: tier.active !== false,
  }))

  originalUnitTrackingMode.value = productForm.unitTrackingMode
  originalUnitCategory.value = productForm.unitCategory
  originalUnitTiers.value = JSON.parse(JSON.stringify(productForm.unitTiers))

  productForm.quantity = getFirstDefined(rootInventory?.availableQty, rootInventory?.onHandQty, product.quantityInStock, product.quantity) ?? ''
  productForm.reorderLevel = getFirstDefined(rootInventory?.reorderLevel, product.reorderLevel) ?? ''
  productForm.reorderQty = getFirstDefined(rootInventory?.reorderQty, product.reorderQty) ?? ''
  displayQuantity.value = fromBaseQuantity(productForm.quantity)
  displayReorderLevel.value = fromBaseQuantity(productForm.reorderLevel)
  displayReorderQty.value = fromBaseQuantity(productForm.reorderQty)
  productForm.sellerSku = product.sku || product.sellerSku || product.productCode || ''
  productForm.gtinBarcode = product.gtinBarcode || ''
  productForm.salesPrice = product.salesPrice || ''
  productForm.salesStartDate = formatDateInput(product.salesStartDate)
  productForm.salesEndDate = formatDateInput(product.salesEndDate)
  productForm.variants = (product.variantGroups || []).length
    ? product.variantGroups.flatMap((group) => {
        const skus = group.skus?.length ? group.skus : [{}]
        return skus.map((sku) => {
          const skuInventory = getInventoryRecordForSku(inventoryRecords, sku.id)
          return {
            groupId: group.id || '',
            skuId: sku.id || '',
            variation: group.attributeValue || '',
            attributes: { ...(sku.attributes || {}) },
            sellerSku: sku.sku || '',
            systemSku: sku.systemSku || '',
            gtinBarcode: sku.gtinBarcode || '',
            quantity: getFirstDefined(skuInventory?.availableQty, skuInventory?.onHandQty, sku.quantityInStock, sku.quantity) ?? '',
            reorderLevel: getFirstDefined(skuInventory?.reorderLevel, sku.reorderLevel) ?? '',
            reorderQty: getFirstDefined(skuInventory?.reorderQty, sku.reorderQty) ?? '',
            price: sku.price || '',
            costPrice: getFirstDefined(sku.costPrice) ?? '',
            salesPrice: sku.salesPrice || '',
            salesStartDate: formatDateInput(sku.salesStartDate),
            salesEndDate: formatDateInput(sku.salesEndDate),
            isGeneratingSku: false,
          }
        })
      })
    : [emptyVariant()]
}

function getPlainText(value) {
  if (!value) return ''
  const html = String(value)
  if (import.meta.server) return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  const parser = new DOMParser()
  return (parser.parseFromString(html, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim()
}

function cleanProductAttributes() {
  return cleanObject(productForm.attributes || {})
}

function getVariantAttributeName() {
  if (productForm.variantAttributeName) return productForm.variantAttributeName
  const primaryVariantAttribute = variantAttributeDefs.value[0]
  return primaryVariantAttribute?.label || primaryVariantAttribute?.key || 'Variation'
}

function isValidPrice(value) {
  const parsed = parseMoney(value)
  return parsed !== undefined && parsed > 0
}

function isValidOptionalCostPrice(value) {
  const parsed = parseMoney(value)
  return parsed === undefined || parsed >= 0
}

function getSaleValidationError(price, salesPrice, salesStartDate, salesEndDate) {
  const parsedPrice = parseMoney(price)
  const parsedSalesPrice = parseMoney(salesPrice)

  if (salesStartDate && salesEndDate && salesEndDate < salesStartDate) {
    return 'Sales end date cannot be before sales start date.'
  }

  if (parsedSalesPrice === undefined) return ''
  if (parsedPrice === undefined || parsedPrice <= 0) return 'Enter the base price before adding a sale price.'
  if (parsedSalesPrice >= parsedPrice) return 'Sale price must be lower than the base price.'
  return ''
}

function getSalePreview(price, salesPrice) {
  const parsedPrice = parseMoney(price)
  const parsedSalesPrice = parseMoney(salesPrice)
  if (parsedPrice === undefined || parsedSalesPrice === undefined || parsedSalesPrice >= parsedPrice) return ''

  const percent = Math.round(((parsedPrice - parsedSalesPrice) / parsedPrice) * 100)
  return `${percent}% off · ${formatToMoney(parsedSalesPrice)} sale price`
}

const rootSaleError = computed(() =>
  getSaleValidationError(productForm.price, productForm.salesPrice, productForm.salesStartDate, productForm.salesEndDate)
)

const rootSalePreview = computed(() =>
  getSalePreview(productForm.price, productForm.salesPrice)
)

function getVariantSaleError(variant) {
  return getSaleValidationError(variant.price, variant.salesPrice, variant.salesStartDate, variant.salesEndDate)
}

function getVariantSalePreview(variant) {
  return getSalePreview(variant.price, variant.salesPrice)
}

// Price is always entered per base unit (the smallest unit the merchant sells in - e.g.
// ml, gram, or the first custom tier), matching what the POS/backend already assume when
// multiplying by a sale quantity. These make that unit explicit in the field label and show
// the equivalent price in bigger units (litre, kg, or a bigger custom tier) so a merchant can
// cross-check against what they actually paid in bulk.
const BIGGER_FIXED_UNIT_LABELS = { FIXED_WEIGHT: 'kg', FIXED_VOLUME: 'litre' }

const baseUnitLabel = computed(() => {
  const fixedOptions = FIXED_UNIT_OPTIONS[productForm.unitTrackingMode]
  if (fixedOptions) return fixedOptions[0].key
  if (productForm.unitTrackingMode === 'CUSTOM_TIERED') {
    return productForm.unitTiers[0]?.defaultLabel?.trim() || ''
  }
  return ''
})

const priceFieldLabel = computed(() => baseUnitLabel.value ? `Price per ${baseUnitLabel.value} (₦)` : 'Price (₦)')
const costPriceFieldLabel = computed(() => baseUnitLabel.value ? `Cost price per ${baseUnitLabel.value} (₦)` : 'Cost price (₦)')
const rootQuantityFieldLabel = computed(() => `Current stock${stockUnitSuffix.value}`)

function getUnitConversionHint(price) {
  const parsedPrice = parseMoney(price)
  if (parsedPrice === undefined) return ''

  const fixedOptions = FIXED_UNIT_OPTIONS[productForm.unitTrackingMode]
  if (fixedOptions) {
    const biggerUnit = fixedOptions[1]
    // Only worth showing if the merchant actually chose to log stock in the bigger unit -
    // otherwise this would surface a unit (kg/litre) they never selected anywhere on the page.
    if (productForm.stockEntryUnitKey !== biggerUnit.key) return ''
    return `≈ ${formatToMoney(parsedPrice * biggerUnit.multiplier)} per ${BIGGER_FIXED_UNIT_LABELS[productForm.unitTrackingMode]}`
  }

  if (productForm.unitTrackingMode === 'CUSTOM_TIERED') {
    const biggerTiers = productForm.unitTiers.filter((tier, index) =>
      index > 0 && tier.active !== false && tier.defaultLabel?.trim()
    )
    if (!biggerTiers.length) return ''
    return biggerTiers
      .map((tier) => `≈ ${formatToMoney(parsedPrice * (Number(tier.multiplierFromBase) || 1))} per ${tier.defaultLabel.trim()}`)
      .join(' · ')
  }

  return ''
}

const rootPriceHint = computed(() => getUnitConversionHint(productForm.price))
const getDefaultCostPriceHint = (price) => getUnitConversionHint(price)
const rootCostPriceHint = computed(() => getUnitConversionHint(productForm.costPrice))
const stockQuantityEditNote = 'Stock quantity is read-only here. Use Inventory stock adjustments to update quantity.'
const newVariantQuantityNote = 'Initial stock for this new SKU.'
const isExistingVariant = (variant) => Boolean(variant?.skuId)
const getVariantQuantityLabel = (variant) => isExistingVariant(variant) ? 'Current stock' : 'Initial quantity'
const getVariantQuantityHint = (variant) => isExistingVariant(variant) ? stockQuantityEditNote : newVariantQuantityNote

function buildProductPayload() {
  const uploadedImages = productForm.images.filter((image) => image?.fileId)
  const attributeName = getVariantAttributeName()
  const filledVariants = isVariableProduct.value && hasUserProvidedVariantData()
    ? productForm.variants.filter((variant) =>
        variant.variation?.trim()
        || variant.price?.toString().trim()
        || variant.costPrice?.toString().trim()
        || variant.quantity?.toString().trim()
        || variant.reorderLevel?.toString().trim()
        || variant.reorderQty?.toString().trim()
        || variant.sellerSku?.trim()
        || variant.gtinBarcode?.trim()
      )
    : []

  const payload = {
    name: productForm.name.trim(),
    categoryId: productForm.categoryId,
    brandName: getBrandName(),
    colorFamily: productForm.colorFamily,
    weightKg: parseWeightKg(productForm.weight),
    description: productForm.description,
    summary: productForm.summary,
    manufacturerDescription: productForm.manufacturerDescription,
    boxContents: productForm.boxContents,
    productWarranty: productForm.productWarranty,
    warrantyAddress: productForm.warrantyAddress,
    image: uploadedImages[0]?.fileId,
    thumbnail: uploadedImages[0]?.fileId,
    imageList: uploadedImages.map((image) => image.fileId),
    productType: productForm.productType,
    attributes: cleanProductAttributes(),
  }

  if (productForm.productType === 'SIMPLE') {
    payload.price = parseMoney(productForm.price)
    payload.costPrice = parseMoney(productForm.costPrice)
    payload.reorderLevel = parseInteger(productForm.reorderLevel)
    payload.reorderQty = parseInteger(productForm.reorderQty)
    payload.sku = productForm.sellerSku
    payload.gtinBarcode = productForm.gtinBarcode
    payload.salesPrice = parseMoney(productForm.salesPrice)
    payload.salesStartDate = productForm.salesStartDate
    payload.salesEndDate = productForm.salesEndDate
    payload.clearSale = !String(productForm.salesPrice || '').trim()
  } else if (productForm.productType === 'DIGITAL') {
    payload.price = parseMoney(productForm.price)
    payload.sku = productForm.sellerSku
    payload.gtinBarcode = productForm.gtinBarcode
    payload.salesPrice = parseMoney(productForm.salesPrice)
    payload.salesStartDate = productForm.salesStartDate
    payload.salesEndDate = productForm.salesEndDate
    payload.clearSale = !String(productForm.salesPrice || '').trim()
  } else if (productForm.productType === 'BUNDLE') {
    payload.price = parseMoney(productForm.price)
    payload.costPrice = parseMoney(productForm.costPrice)
    payload.sku = productForm.sellerSku
    payload.gtinBarcode = productForm.gtinBarcode
    payload.salesPrice = parseMoney(productForm.salesPrice)
    payload.salesStartDate = productForm.salesStartDate
    payload.salesEndDate = productForm.salesEndDate
    payload.clearSale = !String(productForm.salesPrice || '').trim()
    payload.bundledProductIds = productForm.bundledProductIds || []
  } else if (productForm.productType === 'VARIABLE' && filledVariants.length) {
    const groupsByValue = new Map()

    filledVariants.forEach((variant) => {
      const attributeValue = variant.variation?.trim()
      if (!attributeValue) return

      if (!groupsByValue.has(attributeValue)) {
        groupsByValue.set(attributeValue, {
          id: variant.groupId,
          attributeName,
          attributeValue,
          skus: [],
        })
      }

      groupsByValue.get(attributeValue).skus.push(cleanObject({
        id: variant.skuId,
        price: parseMoney(variant.price),
        costPrice: parseMoney(variant.costPrice),
        quantityInStock: isExistingVariant(variant) ? undefined : parseInteger(variant.quantity),
        reorderLevel: parseInteger(variant.reorderLevel),
        reorderQty: parseInteger(variant.reorderQty),
        sku: variant.sellerSku,
        gtinBarcode: variant.gtinBarcode,
        salesPrice: parseMoney(variant.salesPrice),
        salesStartDate: variant.salesStartDate,
        salesEndDate: variant.salesEndDate,
        clearSale: !String(variant.salesPrice || '').trim(),
        attributes: cleanObject(variant.attributes || {}),
      }))
    })

    payload.variantGroups = Array.from(groupsByValue.values())
  }

  if (productForm.productType !== 'DIGITAL') {
    if (productForm.unitTrackingMode !== originalUnitTrackingMode.value) {
      payload.unitTrackingMode = productForm.unitTrackingMode
    }
    if (productForm.unitCategory !== originalUnitCategory.value) {
      payload.unitCategory = productForm.unitCategory
    }
    if (productForm.unitTrackingMode === 'CUSTOM_TIERED') {
      const formattedTiers = productForm.unitTiers.map((tier, index) => ({
        tierOrder: index,
        unitKey: tier.unitKey,
        defaultLabel: tier.defaultLabel,
        multiplierFromBase: Number(tier.multiplierFromBase),
        active: tier.active !== false,
      }))
      if (JSON.stringify(formattedTiers) !== JSON.stringify(originalUnitTiers.value)) {
        payload.unitTiers = formattedTiers
      }
    }
  }

  return cleanObject(payload)
}

function hasUserProvidedVariantData() {
  if (!isVariableProduct.value) return false

  return productForm.variants.some((variant) =>
    variant.variation?.trim()
    || variant.price?.toString().trim()
    || variant.costPrice?.toString().trim()
    || variant.quantity?.toString().trim()
    || variant.reorderLevel?.toString().trim()
    || variant.reorderQty?.toString().trim()
    || variant.sellerSku?.trim()
    || variant.gtinBarcode?.trim()
  )
}

function validateFinalPayload() {
  stepErrors.images = productForm.images.some((image) => image.fileId || image.url) ? '' : 'Upload at least one product image.'
  stepErrors.name = productForm.name.trim() ? '' : 'Product name is required.'
  stepErrors.categoryId = productForm.categoryId ? '' : 'Select a category.'
  stepErrors.description = ''
  stepErrors.summary = ''

  const descriptionLength = getPlainText(productForm.description).length
  const summaryLength = getPlainText(productForm.summary).length

  if (!descriptionLength) {
    stepErrors.description = 'Product description is required.'
  } else if (descriptionLength < DESCRIPTION_LIMITS.min || descriptionLength > DESCRIPTION_LIMITS.max) {
    stepErrors.description = `Description must be between ${DESCRIPTION_LIMITS.min} and ${DESCRIPTION_LIMITS.max} characters.`
  }

  if (summaryLength && (summaryLength < SUMMARY_LIMITS.min || summaryLength > SUMMARY_LIMITS.max)) {
    stepErrors.summary = `Summary must be between ${SUMMARY_LIMITS.min} and ${SUMMARY_LIMITS.max} characters.`
  }

  if (
    stepErrors.images
    || stepErrors.name
    || stepErrors.categoryId
    || stepErrors.description
    || stepErrors.summary
  ) {
    toastStore.error('Please fix the highlighted product information fields.')
    return false
  }

  if (productForm.productType === 'SIMPLE') {
    if (!isValidPrice(productForm.price)) {
      toastStore.error('Simple products need a price.')
      return false
    }

    if (!isValidOptionalCostPrice(productForm.costPrice)) {
      toastStore.error('Cost price cannot be less than zero.')
      return false
    }

    if (rootSaleError.value) {
      toastStore.error(rootSaleError.value)
      return false
    }
  } else if (productForm.productType === 'DIGITAL') {
    if (!isValidPrice(productForm.price)) {
      toastStore.error('Digital products need a price.')
      return false
    }

    if (rootSaleError.value) {
      toastStore.error(rootSaleError.value)
      return false
    }
  } else if (productForm.productType === 'BUNDLE') {
    if (!isValidPrice(productForm.price)) {
      toastStore.error('Bundle products need a price.')
      return false
    }

    if (!isValidOptionalCostPrice(productForm.costPrice)) {
      toastStore.error('Cost price cannot be less than zero.')
      return false
    }

    if (rootSaleError.value) {
      toastStore.error(rootSaleError.value)
      return false
    }
  } else if (productForm.productType === 'VARIABLE') {
    const hasInvalidVariant = productForm.variants.some((variant) =>
      !variant.variation?.trim()
      || !isValidPrice(variant.price)
      || !isValidOptionalCostPrice(variant.costPrice)
      || getVariantSaleError(variant)
      || (!isExistingVariant(variant) && (variant.quantity === '' || variant.quantity === null || variant.quantity === undefined || Number(variant.quantity) < 0))
    )

    if (hasInvalidVariant) {
      toastStore.error('Each variant needs a variation, valid price, non-negative cost price, and valid initial stock quantity for new variants.')
      return false
    }
  }

  return true
}

function buildVariantSkuPayload(variant) {
  const primaryVariantAttribute = variantAttributeDefs.value[0]
  const payload = {
    productName: productForm.name,
    brandName: getBrandName(),
    categoryName: productForm.categoryName,
    variantGroupAttributeName: primaryVariantAttribute?.label || primaryVariantAttribute?.key || 'Variation',
    variantGroupAttributeValue: variant.variation,
    skuAttributes: cleanSkuAttributes(),
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value && typeof value === 'object') return Object.keys(value).length > 0
      return value !== '' && value !== null && value !== undefined
    })
  )
}

function canGenerateVariantSku(variant) {
  return Boolean(
    isVariableProduct.value
    && productForm.name.trim()
    && productForm.categoryName
    && variant.variation?.trim()
    && getBrandName()
  )
}

function readGeneratedSku(response) {
  const value = response?.data?.sku || response?.data?.value || response?.sku || response?.data
  return typeof value === 'string' ? value : ''
}

async function generateVariantSellerSku(index) {
  const variant = productForm.variants[index]
  if (!variant) return
  if (!canGenerateVariantSku(variant)) return

  variant.isGeneratingSku = true

  try {
    const tenantId = productTenantId.value
    const url = tenantId
      ? endpoints.skus.generate.replace(':tenantId', tenantId)
      : endpoints.skus.generate
    const response = await post(url, buildVariantSkuPayload(variant))
    const generatedSku = readGeneratedSku(response)

    if (generatedSku) {
      variant.sellerSku = generatedSku
    }
  } catch (error) {
    logger.error('Variant SKU generation failed', error)
    toastStore.error('We could not generate the SKU. Please try again.')
  } finally {
    variant.isGeneratingSku = false
  }
}

function getVisibleVariantSuggestions(variant) {
  const options = variantSuggestionOptions.value
  const search = String(variant.variation || '').trim().toLowerCase()

  if (options.length <= 10) return options
  if (!search) return []

  return options
    .filter((option) => option.toLowerCase().includes(search))
    .slice(0, 10)
}

function addVariant() {
  productForm.variants.push(emptyVariant())
}

function removeVariant(index) {
  if (productForm.variants.length === 1) {
    productForm.variants[0] = emptyVariant()
    return
  }

  productForm.variants.splice(index, 1)
}

function resetRootPricingFields() {
  productForm.price = ''
  productForm.costPrice = ''
  productForm.quantity = ''
  productForm.reorderLevel = ''
  productForm.reorderQty = ''
  productForm.sellerSku = ''
  productForm.gtinBarcode = ''
  productForm.salesPrice = ''
  productForm.salesStartDate = ''
  productForm.salesEndDate = ''
}

function resetVariantFields() {
  productForm.variants = [emptyVariant()]
}

function getStepTitle(step) {
  return step.id === 2 ? pricingSectionTitle.value : step.title
}

function getTemplateCategoryId(categoryId) {
  const selectedCategory = [
    ...(categoryStore.categories || []),
    ...(categoryStore.defaultCategories || []),
  ].find((category) => String(category?.id || '') === String(categoryId || ''))

  return selectedCategory?.systemCategoryId || selectedCategory?.id || categoryId
}

async function loadCategoryTemplate(categoryId) {
  if (!categoryId) {
    currentTemplate.value = null
    productForm.attributes = {}
    templateLoadingError.value = ''
    noCategoryTemplate.value = false
    return
  }

  try {
    templateLoadingError.value = ''
    noCategoryTemplate.value = false

    const templateCategoryId = getTemplateCategoryId(categoryId)
    const template = await productTemplateStore.getCachedTemplateByCategory(templateCategoryId)
    currentTemplate.value = template
    noCategoryTemplate.value = !template

    if (!template?.attributeDefinitions) {
      if (!isHydratingProduct.value) {
        productForm.attributes = {}
      }
      return
    }

    const seededAttributes = {}
    template.attributeDefinitions
      .filter((attribute) => !isVariantAttribute(attribute))
      .forEach((attribute) => {
        seededAttributes[attribute.key] = productForm.attributes[attribute.key] ?? ''
      })

    productForm.attributes = { ...(productForm.attributes || {}), ...seededAttributes }
  } catch (error) {
    logger.error('Failed to load product template', error)
    currentTemplate.value = null
    productForm.attributes = {}
    noCategoryTemplate.value = false
    templateLoadingError.value = 'We could not load the category attributes. Please try again.'
  }
}

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024

async function handleFileUpload(event, index) {
  const file = event.target.files?.[0]
  if (!file) return

  stepErrors.images = ''

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    stepErrors.images = 'Image size must not exceed 1MB.'
    event.target.value = ''
    return
  }

  productForm.uploadingStates[index] = true

  try {
    const payload = new FormData()
    payload.append('file', file)
    if (productTenantId.value) {
      payload.append('tenantId', productTenantId.value)
    }

    const response = await post(endpoints.files.uploadSingle, payload, { silent: true })
    if (response?.data) {
      productForm.images[index] = {
        fileId: response.data.id,
        url: response.data.url,
      }
    } else if (response?.message) {
      stepErrors.images = response.message
    }
  } catch (error) {
    logger.error('Image upload failed', error)
    stepErrors.images = error?.data?.message || error?.response?._data?.message || error?.message || 'We could not upload your image. Please try again.'
  } finally {
    productForm.uploadingStates[index] = false
    event.target.value = ''
  }
}

function removeImage(index) {
  productForm.images[index] = emptyImage()
  stepErrors.images = ''
}

async function handleCategorySelect(category) {
  if (!category?.id) return

  isResolvingCategory.value = true
  try {
    let selectedCategory = category

    if (category._source === 'system') {
      const response = await categoryStore.createCategory({ categoryId: category.id })
      selectedCategory = response?.data || category
      await categoryStore.getCategories()
    }

    productForm.categoryId = selectedCategory.id
    productForm.categoryName = selectedCategory.name || category.name
    stepErrors.categoryId = ''
  } catch (error) {
    logger.error('Failed to resolve category selection', error)
    toastStore.error('We could not select the category. Please try again.')
  } finally {
    isResolvingCategory.value = false
  }
}

function openAddCategoryDrawer() {
  isCategoryDrawerOpen.value = false
  isAddCategoryDrawerOpen.value = true
}

function getSectionOffset() {
  if (import.meta.server) return 0

  const sectionNav = document.querySelector('.product-section-nav')
  if (sectionNav) {
    return Math.round(sectionNav.getBoundingClientRect().bottom + 24)
  }

  return window.matchMedia('(min-width: 1024px)').matches ? 210 : 240
}

function updateActiveStep() {
  if (import.meta.server) return

  const offset = getSectionOffset()
  let currentStep = visibleSteps.value[0]

  visibleSteps.value.forEach((step) => {
    const section = document.getElementById(step.sectionId)
    if (section && section.getBoundingClientRect().top <= offset) {
      currentStep = step
    }
  })

  activeStepId.value = currentStep.id
}

function scrollToStep(step) {
  if (import.meta.server) return

  const section = document.getElementById(step.sectionId)
  if (!section) return

  activeStepId.value = step.id
  section.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

async function handleCategoryCreated(category) {
  await categoryStore.getCategories()
  isAddCategoryDrawerOpen.value = false
  if (category?.id) {
    await handleCategorySelect({ ...category, _source: 'tenant' })
  } else {
    isCategoryDrawerOpen.value = true
  }
}

async function submitProductInformation() {
  if (!validateFinalPayload()) return

  isSubmitting.value = true
  errorStore.resetErrors()

  try {
    const response = await productStore.updateProduct(route.params.id, buildProductPayload())
    recordSubmittedBrand()

    const productId = response?.data?.id || route.params.id
    if (productId && productForm.collectionId !== initialCollectionId.value) {
      try {
        if (initialCollectionId.value) {
          await collectionsStore.dissociateProduct(initialCollectionId.value, productId)
        }
        if (productForm.collectionId) {
          await collectionsStore.associateProducts(productForm.collectionId, [productId])
        }
        initialCollectionId.value = productForm.collectionId
      } catch (collectionError) {
        logger.error('Failed to update product collection association', collectionError)
      }
    }

    toastStore.success('Product updated successfully')

    if (productId) {
      await router.push(`/dashboard/product/${productId}`)
    } else {
      await router.push('/dashboard/product')
    }
  } catch (error) {
    logger.error('Product update failed', error)
    const serverMessage = error?.data?.message || error?.response?._data?.message || errorStore.message
    if (!serverMessage) {
      toastStore.error('We could not update the product. Please try again.')
    }
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  errorStore.resetErrors()
  loadSelectedBrandStats()

  if (!merchantsStore.merchants?.length) {
    try {
      await merchantsStore.fetchMerchants({ limit: 100 })
    } catch (e) {
      logger.error('Failed to fetch merchants', e)
    }
  }
  await Promise.all([
    categoryStore.getCategories(),
    categoryStore.getDefaultCategories(),
    collectionsStore.getCollections(),
  ])

  try {
    isLoadingProduct.value = true
    const [response, inventoryRecords] = await Promise.all([
      productStore.getProductById(route.params.id),
      inventoryStore.getProductInventory(route.params.id),
    ])
    if (response?.data) {
      hydrateProductForm(response.data, inventoryRecords)

      // Fetch this merchant's tenant categories so the category drawer can
      // preselect the correct category (the product's categoryId is a TenantCategory
      // ID specific to this merchant, not a platform category ID).
      const tenantId = productTenantId.value
      if (tenantId) {
        try {
          await categoryStore.getMerchantCategories(tenantId)
          // Re-run hydration now that merchant categories are available so
          // categoryId / categoryName resolve correctly from the tenant list.
          hydrateProductForm(response.data, inventoryRecords)
        } catch (e) {
          logger.warn('Could not load merchant categories, category may not preselect', e)
        }
      }

      if (hasCollections.value) {
        for (const collection of collectionsStore.collections) {
          if (collection.productCount > 0) {
            try {
              const res = await collectionsStore.getCollectionById(collection.id)
              const products = res?.data?.products || []
              const isMember = products.some((p) => String(p.id || p.productId) === String(route.params.id))
              if (isMember) {
                productForm.collectionId = collection.id
                initialCollectionId.value = collection.id
                break
              }
            } catch (e) {
              logger.error('Error checking collection membership:', e)
            }
          }
        }
      }
      await nextTick()
      isHydratingProduct.value = false
    } else {
      toastStore.error('The requested product could not be found.')
      await router.push('/dashboard/product')
      return
    }
  } catch (error) {
    isHydratingProduct.value = false
    logger.error('Failed to load product for editing', error)
    toastStore.error('We could not load the product details. Please try again.')
    await router.push('/dashboard/product')
    return
  } finally {
    isLoadingProduct.value = false
  }

  await nextTick()
  updateActiveStep()
  window.addEventListener('scroll', updateActiveStep, { passive: true })
  document.addEventListener('scroll', updateActiveStep, { passive: true, capture: true })
  window.addEventListener('resize', updateActiveStep)
})

onBeforeUnmount(() => {
  if (import.meta.server) return

  window.removeEventListener('scroll', updateActiveStep)
  document.removeEventListener('scroll', updateActiveStep, { capture: true })
  window.removeEventListener('resize', updateActiveStep)
})

watch(
  () => productForm.brandName,
  (value) => {
    brandQuery.value = cleanBrandName(value)
    debouncedFetchBrandOptions(brandQuery.value)
  },
  { immediate: true }
)

watch(
  () => productForm.categoryId,
  async (categoryId) => {
    await loadCategoryTemplate(categoryId)
    await nextTick()
    updateActiveStep()
  }
)

watch(
  () => productForm.productType,
  (type) => {
    if (isHydratingProduct.value) return

    if (type === 'VARIABLE') {
      resetRootPricingFields()
      return
    }

    resetVariantFields()
    if (type === 'DIGITAL') {
      productForm.quantity = ''
    }
  }
)
</script>

<template>
  <div class="min-h-[calc(100vh-114px)] bg-[#EDEFF2] text-[#000]">
    <div class="product-section-nav sticky top-[120px] z-[40] bg-white px-[1.6rem] py-[2rem] shadow-sm lg:top-[114px] lg:px-[4rem]">
      <div class="mx-auto flex max-w-[106rem] items-center gap-[1.6rem] overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <template
          v-for="(step, index) in visibleSteps"
          :key="step.id"
        >
          <button
            type="button"
            class="flex shrink-0 min-h-[44px] items-center gap-[1.2rem] rounded-[8px] py-[0.8rem] px-[1rem] text-left transition touch-manipulation cursor-pointer"
            :aria-current="activeStepId === step.id ? 'step' : undefined"
            @click="scrollToStep(step)"
          >
            <span
              class="flex h-[2.4rem] w-[2.4rem] items-center justify-center rounded-full border text-[1.4rem] font-[600]"
              :class="activeStepId === step.id ? 'border-primary bg-primary text-white' : 'border-[#AAB7C4] text-[#AAB7C4]'"
            >
              {{ step.id }}
            </span>
            <span
              class="text-[1.5rem] font-[700] whitespace-nowrap"
              :class="activeStepId === step.id ? 'text-primary' : 'text-[#AAB7C4]'"
            >
              {{ getStepTitle(step) }}
            </span>
          </button>
          <div
            v-if="index < visibleSteps.length - 1"
            class="h-px min-w-[12rem] flex-1"
            :class="activeStepId > step.id ? 'bg-primary' : 'bg-[#CBD5E1]'"
          />
        </template>
      </div>
    </div>

    <form
      class="flex min-h-[calc(100vh-24rem)] flex-col px-[1.6rem] py-[3.2rem] lg:px-[4rem]"
      @submit.prevent="submitProductInformation"
    >
      <div class="flex-1">
        <section
          id="product-information"
          class="scroll-mt-[24rem]"
        >
          <div class="mb-[2.8rem] flex flex-col gap-[1.2rem] sm:flex-row sm:items-center sm:justify-between">
            <h1 class="text-[2.6rem] font-[700] leading-[3.2rem]">
              Edit Product Information
            </h1>
          </div>

          <!-- Merchant Store Banner -->
          <div
            v-if="productTenantId"
            class="mb-[2rem] p-4 bg-slate-50 border border-slate-200 rounded-[10px] flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[2.2rem] text-slate-500">storefront</span>
              <div>
                <p class="text-[1.2rem] font-semibold uppercase tracking-wider text-slate-500">Merchant Store</p>
                <p class="text-[1.5rem] font-bold text-slate-900">{{ currentMerchantName || productTenantId }}</p>
              </div>
            </div>
            <span class="font-mono text-[1.2rem] text-slate-400 bg-white px-2 py-1 border border-slate-200 rounded">{{ productTenantId }}</span>
          </div>

          <div
            data-tour="product-gallery"
            class="mb-[2rem]"
          >
          <div class="grid grid-cols-2 gap-[1.6rem] sm:grid-cols-4">
            <div
              v-for="(_, index) in 4"
              :key="index"
              class="relative"
            >
              <label
                class="group flex aspect-[1.28] min-h-[12rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2px] border border-dashed border-primary bg-[#F8FAFC] text-center transition hover:bg-white"
                :class="productForm.uploadingStates[index] ? 'pointer-events-none opacity-70' : ''"
              >
                <template v-if="productForm.images[index]?.url">
                  <img
                    :src="productForm.images[index].url"
                    class="h-full w-full object-cover"
                    alt=""
                  >
                  <span class="absolute inset-x-0 bottom-0 bg-black/55 py-[0.8rem] text-[1.2rem] font-[600] text-white opacity-0 transition group-hover:opacity-100">
         
                    <span >Change image</span>
                  </span>
                </template>

                <template v-else>
                  <span
                    v-if="productForm.uploadingStates[index]"
                    class="mb-[1rem] h-[2.8rem] w-[2.8rem] animate-spin rounded-full border-2 border-primary border-t-transparent"
                  />
                  <span
                    v-else
                    class="material-symbols-outlined mb-[1.6rem] text-[3.8rem] text-primary"
                  >
                    image
                  </span>
                  <span v-if="index == 0">Main image</span>
                  <span v-else>Add image</span>
                  <span class="text-[1.4rem] font-[400] leading-[2.2rem] text-[#7A7A7A]">
                    PNG, JPG
                  </span>
                </template>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  @change="handleFileUpload($event, index)"
                >
              </label>

              <button
                v-if="productForm.images[index]?.url"
                type="button"
                class="absolute right-[0.8rem] top-[0.8rem] flex h-[2.8rem] w-[2.8rem] items-center justify-center rounded-full bg-white text-[#D92D20] shadow-sm"
                aria-label="Remove image"
                @click="removeImage(index)"
              >
                <span class="material-symbols-outlined text-[1.8rem]" aria-hidden="true">delete</span>
              </button>
            </div>
          </div>

          <p
            v-if="stepErrors.images || errorStore.validationErrors?.image || errorStore.validationErrors?.imageList"
            class="mt-[1rem] text-[1.2rem] font-[500] text-rose-500"
          >
            {{ stepErrors.images || errorStore.validationErrors?.image || errorStore.validationErrors?.imageList }}
          </p>
          <p class="mt-[1.6rem] text-[1.4rem] leading-[2.2rem] text-[#7A7A7A]">
            Image needs to be between 500x500 and 2000x2000 pixels. White backgrounds are recommended. No watermarks. Maximum image size 1MB.
          </p>
          </div>

          <div class="grid grid-cols-1 gap-[2rem] lg:grid-cols-2">
          <AppInput
            v-model="productForm.name"
            data-tour="product-name"
            name="product-name"
            label="Product Name"
            placeholder="EX: Wireless headphone"
            :error="stepErrors.name || errorStore.validationErrors?.name"
            input-class="!h-[5.6rem] !rounded-[10px] !border-[#D9D9D9] !bg-white !px-[1.8rem] !text-[1.6rem] !text-[#1B1B19] placeholder:!text-[#BDBDBD] focus:!border-primary focus:!ring-2 focus:!ring-primary/10"
            @update:model-value="stepErrors.name = ''"
          />

          <div>
            <label class="mb-[0.8rem] block text-[1.8rem] font-[400] text-[#1B1B19]">
              Category
            </label>
            <button
              id="product-category-button"
              data-tour="product-category"
              type="button"
              class="flex h-[5.6rem] w-full items-center justify-between rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-left text-[1.6rem] outline-none transition hover:border-primary"
              :class="[
                productForm.categoryName ? 'text-[#1B1B19]' : 'text-[#BDBDBD]',
                (stepErrors.categoryId || errorStore.validationErrors?.categoryId) ? '!border-rose-500 ring-2 ring-rose-100' : ''
              ]"
              @click="isCategoryDrawerOpen = true"
            >
              <span>{{ productForm.categoryName || 'Category' }}</span>
              <span class="material-symbols-outlined text-[3rem] text-[#1B1B19]">chevron_right</span>
            </button>
            <p
              v-if="stepErrors.categoryId || errorStore.validationErrors?.categoryId"
              class="mt-[0.8rem] text-[1.2rem] font-[500] text-rose-500"
            >
              {{ stepErrors.categoryId || errorStore.validationErrors?.categoryId }}
            </p>
          </div>
          </div>

          <div
            v-if="hasSelectedCategory"
            class="mt-[2rem] grid grid-cols-1 gap-[2rem] md:grid-cols-2 xl:grid-cols-3"
          >
          <div class="space-y-[0.8rem]">
            <TemplateAttributeField
              v-model="productForm.brandName"
              :attribute="brandNameAttribute"
              :error="errorStore.validationErrors?.brandName || errorStore.validationErrors?.brand"
              @option-selected="selectBrandSuggestion"
            />
            <p
              v-if="isLoadingBrands"
              class="text-[1.2rem] font-[500] text-[#7A7A7A]"
            >
              Searching brands...
            </p>
          </div>

          <TemplateAttributeField
            v-model="productForm.colorFamily"
            :attribute="colorFamilyAttribute"
            :error="errorStore.validationErrors?.colorFamily"
          />

          <TemplateAttributeField
            v-model="productForm.weight"
            :attribute="weightAttribute"
            :error="errorStore.validationErrors?.weight || errorStore.validationErrors?.weightKg"
          />

          <div v-if="hasCollections">
            <BaseSelectInput
              v-model="productForm.collectionId"
              label="Collection"
              name="collectionId"
              placeholder="Select a collection (optional)"
              :options="collectionOptions"
              :error="errorStore.validationErrors?.collectionId"
            />
          </div>
          </div>

          <div
            v-if="hasSelectedCategory"
            class="mt-[3.2rem] space-y-[3.2rem]"
          >
          <DashboardProductRichTextEditor
            v-model="productForm.description"
            data-tour="product-description"
            label="Product Description"
            placeholder="Include only product-related information- write clearly and concisely - make sure the description matches your product images - Testimonial or quotes of any kind are not allowed - No promotional messages or promoting other products except the product it's self"
            :min-length="DESCRIPTION_LIMITS.min"
            :max-length="DESCRIPTION_LIMITS.max"
            :error="stepErrors.description || errorStore.validationErrors?.description"
            @update:model-value="stepErrors.description = ''"
          />

          <BaseTextArea
            v-model="productForm.summary"
            label="Summary"
            placeholder="Short product summary shown in listings. Keep it clear and concise."
            :minlength="SUMMARY_LIMITS.min"
            :maxlength="SUMMARY_LIMITS.max"
            :error="stepErrors.summary || errorStore.validationErrors?.summary"
            @update:model-value="stepErrors.summary = ''"
          />
          </div>
        </section>

        <section
          v-if="hasSelectedCategory && !isDigitalProduct"
          id="product-unit-setup"
          class="mt-[3.2rem] scroll-mt-[24rem]"
        >
          <h2 class="mb-[2rem] text-[2.4rem] font-[700] leading-[3rem] text-[#000]">
            Unit Setup
          </h2>

          <p
            v-if="inventoryFieldsLocked"
            class="mb-[1.6rem] rounded-[8px] border border-amber-200 bg-amber-50 px-[1.4rem] py-[1rem] text-[1.3rem] font-[600] leading-[2rem] text-amber-800"
          >
            Unit setup is locked. This product has stock history. You cannot change units.
          </p>

          <DashboardProductUnitTierBuilder
            v-model="unitSetup"
            :tenant-id="productTenantId"
            :locked="inventoryFieldsLocked"
            @update:is-valid="isUnitSetupValid = $event"
          />
        </section>

        <section
          v-if="hasSelectedCategory"
          id="product-variants"
          class="mt-[3.2rem] scroll-mt-[24rem]"
        >
          <h2 class="mb-[1.8rem] text-[2.4rem] font-[700] leading-[3rem] text-[#000]">
            {{ pricingSectionTitle }}
          </h2>

          <div class="mb-[2.4rem]">
            <label class="mb-[1rem] block text-[1.8rem] font-[400] text-[#1B1B19]">
              Product type
            </label>
            <div class="grid grid-cols-1 gap-[1.2rem] sm:grid-cols-2 lg:grid-cols-4">
              <button
                v-for="type in productTypes"
                :key="type.value"
                type="button"
                class="flex min-h-[8.8rem] items-center gap-[1.6rem] rounded-[10px] border bg-white p-[1.6rem] text-left transition hover:border-primary cursor-pointer"
                :class="productForm.productType === type.value ? 'border-primary bg-primary/5' : 'border-[#D9D9D9]'"
                @click="productForm.productType = type.value"
              >
                <span
                  class="material-symbols-outlined inline-flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-[8px] text-[2.2rem] leading-none"
                  :class="productForm.productType === type.value ? 'bg-primary text-white' : 'bg-[#F1F5F9] text-[#64748B]'"
                >
                  {{ type.icon }}
                </span>
                <span class="min-w-0">
                  <span
                    class="block text-[1.5rem] font-[700] leading-[2rem]"
                    :class="productForm.productType === type.value ? 'text-primary' : 'text-[#1B1B19]'"
                  >
                    {{ type.label }}
                  </span>
                  <span class="mt-[0.4rem] block text-[1.3rem] leading-[1.8rem] text-[#7A7A7A]">
                    {{ type.description }}
                  </span>
                </span>
              </button>
            </div>
          </div>

          <article
            v-if="!isVariableProduct"
            class="rounded-[10px] bg-white px-[2.4rem] py-[2rem]"
          >
            <div class="grid grid-cols-1 gap-[1.6rem] md:grid-cols-2 xl:grid-cols-4 items-start">
              <AppMoneyInput
                v-model="productForm.price"
                data-tour="product-price"
                name="root-price"
                :label="priceFieldLabel"
                placeholder="0.00"
                :tooltip="priceTooltip"
                :hint="rootPriceHint"
                :error="errorStore.validationErrors?.price"
                input-class="product-field"
              />

              <AppMoneyInput
                v-if="!isDigitalProduct"
                v-model="productForm.costPrice"
                name="root-cost-price"
                :label="costPriceFieldLabel"
                placeholder="0.00"
                :tooltip="defaultCostPriceTooltip"
                :hint="rootCostPriceHint"
                :error="errorStore.validationErrors?.costPrice"
                input-class="product-field"
              />

              <AppInput
                v-if="!isDigitalProduct && !isBundleProduct"
                v-model="displayQuantity"
                data-tour="product-inventory"
                name="root-quantity"
                :label="rootQuantityFieldLabel"
                type="number"
                :allow-decimal="isFixedUnitsMode"
                placeholder="Current stock"
                :readonly="true"
                :tooltip="quantityTooltip"
                :hint="stockQuantityEditNote"
                :error="errorStore.validationErrors?.quantity || errorStore.validationErrors?.quantityInStock"
                input-class="product-field"
              />

              <AppInput
                v-model="productForm.sellerSku"
                name="root-seller-sku"
                label="Seller SKU"
                placeholder="Enter SKU"
                :tooltip="sellerSkuTooltip"
                :error="errorStore.validationErrors?.sku || errorStore.validationErrors?.sellerSku"
                input-class="product-field"
              />

              <AppInput
                v-if="!isDigitalProduct && !isBundleProduct"
                v-model="displayReorderLevel"
                name="root-reorder-level"
                :label="`Low stock threshold${stockUnitSuffix}`"
                type="number"
                :allow-decimal="isFixedUnitsMode"
                placeholder="Default: 2"
                :tooltip="lowStockThresholdTooltip"
                :error="errorStore.validationErrors?.reorderLevel"
                input-class="product-field"
              />

              <AppInput
                v-if="!isDigitalProduct && !isBundleProduct"
                v-model="displayReorderQty"
                name="root-reorder-qty"
                :label="`Restock quantity${stockUnitSuffix}`"
                type="number"
                :allow-decimal="isFixedUnitsMode"
                placeholder="Optional"
                :tooltip="reorderQtyTooltip"
                :error="errorStore.validationErrors?.reorderQty"
                input-class="product-field"
              />

              <AppInput
                v-model="productForm.gtinBarcode"
                name="root-gtin-barcode"
                label="GTIN Barcode"
                placeholder="Enter barcode"
                :tooltip="gtinBarcodeTooltip"
                :error="errorStore.validationErrors?.gtinBarcode"
                input-class="product-field"
              />

              <AppMoneyInput
                v-model="productForm.salesPrice"
                name="root-sales-price"
                label="Sale price (₦)"
                placeholder="0.00"
                :tooltip="salePriceTooltip"
                :error="rootSaleError || errorStore.validationErrors?.salesPrice"
                input-class="product-field"
              />

              <div>
                <div class="flex items-center justify-between min-h-[2.4rem] mb-[0.8rem]">
                  <label
                    for="root-sales-start-date"
                    class="block text-[1.8rem] font-[400] leading-[2.4rem] text-[#1B1B19]"
                  >
                    Sale start date
                  </label>
                </div>
                <input
                  id="root-sales-start-date"
                  v-model="productForm.salesStartDate"
                  type="date"
                  class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] text-[#1B1B19] outline-none transition placeholder:text-[#BDBDBD] focus:border-primary focus:ring-2 focus:ring-primary/10 product-field"
                >
              </div>

              <div>
                <div class="flex items-center justify-between min-h-[2.4rem] mb-[0.8rem]">
                  <label
                    for="root-sales-end-date"
                    class="block text-[1.8rem] font-[400] leading-[2.4rem] text-[#1B1B19]"
                  >
                    Sale end date
                  </label>
                </div>
                <input
                  id="root-sales-end-date"
                  v-model="productForm.salesEndDate"
                  type="date"
                  class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] text-[#1B1B19] outline-none transition placeholder:text-[#BDBDBD] focus:border-primary focus:ring-2 focus:ring-primary/10 product-field"
                >
              </div>
            </div>
            <p
              v-if="rootSalePreview"
              class="mt-[1.2rem] rounded-[8px] bg-emerald-50 px-[1.4rem] py-[1rem] text-[1.3rem] font-[700] text-emerald-700"
            >
              {{ rootSalePreview }}
            </p>
          </article>

          <!-- Bundle Products Included Section (When editing a BUNDLE product) -->
          <article
            v-if="isBundleProduct"
            class="mt-[2rem] rounded-[10px] bg-white px-[2.4rem] py-[2rem] border border-slate-200 space-y-4"
          >
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span class="material-symbols-outlined text-primary text-lg">apps</span>
                  <span>Included Bundle Products ({{ bundledProducts.length }})</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Stock for this bundle is fulfilled from the individual component products below.
                </p>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoadingBundled" class="py-8 text-center text-slate-400 space-y-2">
              <span class="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
              <p class="text-xs">Loading component products...</p>
            </div>

            <!-- List of component products -->
            <div v-else-if="bundledProducts.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="item in bundledProducts"
                :key="item.id"
                class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50"
              >
                <img
                  :src="item.thumbnail || item.image || '/placeholder-img.png'"
                  :alt="item.name"
                  class="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200 shrink-0"
                >
                <div class="min-w-0 flex-1">
                  <NuxtLink
                    :to="`/dashboard/product/${item.id}`"
                    target="_blank"
                    class="text-xs font-bold text-slate-900 hover:text-primary transition-colors truncate block"
                  >
                    {{ item.name }}
                  </NuxtLink>
                  <p class="text-[11px] text-slate-400 font-mono">
                    SKU: {{ item.sku || '—' }}
                  </p>
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-xs font-bold text-slate-700">
                      {{ formatToMoney(item.effectivePrice || item.price) }}
                    </span>
                    <span
                      class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      :class="(item.quantityInStock ?? item.quantity ?? 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                    >
                      {{ (item.quantityInStock ?? item.quantity ?? 0) > 0 ? `${item.quantityInStock ?? item.quantity} in stock` : 'Out of stock' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
              No products found for this bundle.
            </div>
          </article>

          <template v-else>
          <div class="space-y-[1.6rem]">
            <article
              v-for="(variant, index) in productForm.variants"
              :key="index"
              class="rounded-[10px] bg-white px-[2.4rem] py-[2rem]"
            >
              <div class="mb-[1.6rem] flex items-center justify-between gap-[1.6rem]">
                <p class="text-[1.4rem] font-[600] text-[#616161]">
                  Variant {{ index + 1 }}
                </p>
                <button
                  type="button"
                  class="text-[1.3rem] font-[600] text-rose-500 transition hover:text-rose-600"
                  @click="removeVariant(index)"
                >
                  Remove
                </button>
              </div>

              <div class="grid grid-cols-1 gap-[1.6rem] md:grid-cols-2 xl:grid-cols-4 items-start">
                <div>
                  <AppInput
                    v-model="variant.variation"
                    :name="`variation-${index}`"
                    label="Variation"
                    placeholder="Enter variation"
                    input-class="product-field"
                  />
                  <div
                    v-if="getVisibleVariantSuggestions(variant).length"
                    class="mt-[0.8rem] flex flex-wrap gap-[0.8rem]"
                  >
                    <button
                      v-for="option in getVisibleVariantSuggestions(variant)"
                      :key="option"
                      type="button"
                      class="rounded-full border px-[1.2rem] py-[0.6rem] text-[1.3rem] font-[500] transition-colors"
                      :class="variant.variation === option
                        ? 'border-primary bg-primary text-white'
                        : 'border-[#D9D9D9] bg-white text-[#1B1B19] hover:border-primary hover:text-primary'"
                      @click="variant.variation = option"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>

                <div>
                  <div class="mb-[0.8rem] flex items-center justify-between min-h-[2.4rem] gap-[1.2rem]">
                    <div class="flex items-center gap-[0.8rem]">
                      <label
                        :for="`seller-sku-${index}`"
                        class="block text-[1.8rem] font-[400] leading-[2.4rem] text-[#1B1B19]"
                      >
                        Seller SKU
                      </label>
                      <span
                        v-tooltip="{ text: sellerSkuTooltip, position: 'center' }"
                        class="material-symbols-outlined cursor-help text-[1.8rem] text-gray-400"
                      >
                        info
                      </span>
                    </div>
                    <button
                      type="button"
                      class="inline-flex h-[2.4rem] items-center justify-center rounded-[6px] border border-primary px-[0.8rem] text-[1.2rem] font-[600] text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="variant.isGeneratingSku || !canGenerateVariantSku(variant)"
                      @click="generateVariantSellerSku(index)"
                    >
                      <span
                        v-if="variant.isGeneratingSku"
                        class="mr-[0.4rem] h-[1rem] w-[1rem] animate-spin rounded-full border-2 border-current border-t-transparent"
                      />
                      Generate
                    </button>
                  </div>
                  <AppInput
                    v-model="variant.sellerSku"
                    :name="`seller-sku-${index}`"
                    placeholder="Enter SKU"
                    input-class="product-field"
                  />
                </div>

                <AppInput
                  v-model="variant.gtinBarcode"
                  :name="`gtin-barcode-${index}`"
                  label="GTIN Barcode"
                  placeholder="Enter barcode"
                  :tooltip="gtinBarcodeTooltip"
                  input-class="product-field"
                />

                <AppInput
                  v-model="variant.quantity"
                  :name="`quantity-${index}`"
                  :label="getVariantQuantityLabel(variant)"
                  type="number"
                  :placeholder="isExistingVariant(variant) ? 'Current stock' : 'Enter quantity'"
                  :readonly="isExistingVariant(variant)"
                  :tooltip="isExistingVariant(variant) ? quantityTooltip : newVariantQuantityTooltip"
                  :hint="getVariantQuantityHint(variant)"
                  input-class="product-field"
                />

                <AppInput
                  v-model="variant.reorderLevel"
                  :name="`reorder-level-${index}`"
                  label="Low stock threshold"
                  type="number"
                  placeholder="Default: 2"
                  :tooltip="lowStockThresholdTooltip"
                  input-class="product-field"
                />

                <AppInput
                  v-model="variant.reorderQty"
                  :name="`reorder-qty-${index}`"
                  label="Restock quantity"
                  type="number"
                  placeholder="Optional"
                  :tooltip="reorderQtyTooltip"
                  input-class="product-field"
                />

                <AppMoneyInput
                  v-model="variant.price"
                  :name="`price-${index}`"
                  :label="priceFieldLabel"
                  placeholder="0.00"
                  :tooltip="priceTooltip"
                  :hint="getUnitConversionHint(variant.price)"
                  input-class="product-field"
                />

                <AppMoneyInput
                  v-model="variant.costPrice"
                  :name="`cost-price-${index}`"
                  :label="costPriceFieldLabel"
                  placeholder="0.00"
                  :tooltip="defaultCostPriceTooltip"
                  :hint="getDefaultCostPriceHint(variant.costPrice)"
                  input-class="product-field"
                />

                <AppMoneyInput
                  v-model="variant.salesPrice"
                  :name="`sales-price-${index}`"
                  label="Sale price (₦)"
                  placeholder="0.00"
                  :tooltip="salePriceTooltip"
                  :error="getVariantSaleError(variant)"
                  input-class="product-field"
                />

                <div>
                  <div class="flex items-center justify-between min-h-[2.4rem] mb-[0.8rem]">
                    <label
                      :for="`sales-start-date-${index}`"
                      class="block text-[1.8rem] font-[400] leading-[2.4rem] text-[#1B1B19]"
                    >
                      Sale start date
                    </label>
                  </div>
                  <input
                    :id="`sales-start-date-${index}`"
                    v-model="variant.salesStartDate"
                    type="date"
                    class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] text-[#1B1B19] outline-none transition placeholder:text-[#BDBDBD] focus:border-primary focus:ring-2 focus:ring-primary/10 product-field text-[#7A7A7A]"
                  >
                </div>

                <div>
                  <div class="flex items-center justify-between min-h-[2.4rem] mb-[0.8rem]">
                    <label
                      :for="`sales-end-date-${index}`"
                      class="block text-[1.8rem] font-[400] leading-[2.4rem] text-[#1B1B19]"
                    >
                      Sale end date
                    </label>
                  </div>
                  <input
                    :id="`sales-end-date-${index}`"
                    v-model="variant.salesEndDate"
                    type="date"
                    class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] text-[#1B1B19] outline-none transition placeholder:text-[#BDBDBD] focus:border-primary focus:ring-2 focus:ring-primary/10 product-field text-[#7A7A7A]"
                  >
                </div>
              </div>

              <p
                v-if="getVariantSalePreview(variant)"
                class="mt-[1.2rem] rounded-[8px] bg-emerald-50 px-[1.4rem] py-[1rem] text-[1.3rem] font-[700] text-emerald-700"
              >
                {{ getVariantSalePreview(variant) }}
              </p>

              <p
                v-if="variant.systemSku"
                class="mt-[1.2rem] text-[1.2rem] font-[500] text-[#7A7A7A]"
              >
                System SKU: {{ variant.systemSku }}
              </p>
            </article>
          </div>

          <button
            type="button"
            class="mt-[2.4rem] flex h-[5.6rem] w-full items-center justify-center gap-[1rem] rounded-[10px] border border-[#D9D9D9] bg-white text-[1.6rem] font-[500] text-primary transition hover:border-primary"
            @click="addVariant"
          >
            <span class="material-symbols-outlined text-[2.4rem]">add</span>
            Add Variant
          </button>
          </template>
        </section>

        <section
          v-if="hasSelectedCategory"
          id="product-specification"
          class="mt-[3.2rem] scroll-mt-[24rem]"
        >
          <h2 class="mb-[2rem] text-[2.4rem] font-[700] leading-[3rem] text-[#000]">
            Product Specification
          </h2>

          <section
            v-if="productTemplateStore.isLoading"
            class="rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] py-[1.6rem] text-[1.4rem] text-[#616161]"
          >
            Loading category attributes...
          </section>

          <section
            v-else-if="templateLoadingError"
            class="rounded-[10px] border border-rose-200 bg-rose-50 px-[1.8rem] py-[1.6rem] text-[1.4rem] font-[500] text-rose-600"
          >
            {{ templateLoadingError }}
          </section>

          <section
            v-else-if="noCategoryTemplate"
            class="rounded-[10px] border border-amber-200 bg-amber-50 px-[1.8rem] py-[1.6rem] text-[1.4rem] font-[500] text-amber-700"
          >
            This category does not have extra attributes configured yet. You can still continue with the general product fields.
          </section>

          <section
            v-if="productAttributeDefs.length"
            class="grid grid-cols-1 gap-[2rem] md:grid-cols-2"
          >
            <TemplateAttributeField
              v-for="attribute in productAttributeDefs"
              :key="attribute.key"
              v-model="productForm.attributes[attribute.key]"
              :attribute="attribute"
            />
          </section>

          <section class="mt-[2.4rem] space-y-[2.4rem]">
            <DashboardProductRichTextEditor
              v-model="productForm.manufacturerDescription"
              label="From the Manufacturer"
              placeholder="Ex: Made with high - quality materials for durability and performance. [Text from the manufacturer describing the product]"
            />

            <DashboardProductRichTextEditor
              v-model="productForm.boxContents"
              label="What's in the box"
              placeholder="Ex: 1x Headphone, 1x Charging Cable, 1x User Manual [Contents included with the product in the package]"
            />

            <DashboardProductRichTextEditor
              v-model="productForm.productWarranty"
              label="Product warranty"
              placeholder="Ex: 1 year limited warranty [Warranty terms covering the product]"
            />

            <DashboardProductRichTextEditor
              v-model="productForm.warrantyAddress"
              label="Warranty address"
              placeholder="Ex: 123 Service St, City [Address for warranty-related services]"
            />
          </section>
        </section>
      </div>

      <footer
        v-if="hasSelectedCategory"
        class="mt-[4rem] border-t border-[#BDBDBD] pt-[2.4rem] flex flex-col items-end"
      >
        <div v-if="errorStore.message" class="mb-4 text-red-500 text-[1.4rem] font-medium max-w-[40rem] text-right">
          {{ errorStore.message }}
        </div>
        <BaseButton
          data-tour="product-save"
          type="submit"
          variant="primary"
          class="ml-auto h-[5.6rem] w-full max-w-[18rem] rounded-[10px] text-[1.6rem]"
          :disabled="!canSubmit || isSubmitting || isLoadingProduct"
          :loading="isSubmitting"
        >
          Update product
        </BaseButton>
      </footer>
    </form>

    <DashboardProductCategorySelectDrawer
      v-model:open="isCategoryDrawerOpen"
      :recent-categories="recentTenantCategories"
      :system-categories="systemCategories"
      :selected-category-id="productForm.categoryId"
      :loading="categoryStore.isLoading || isResolvingCategory"
      @select="handleCategorySelect"
      @add-category="openAddCategoryDrawer"
    />

    <DashboardAddCategoryDrawer
      v-model:open="isAddCategoryDrawerOpen"
      custom-only
      @success="handleCategoryCreated"
    />
  </div>
</template>

<style scoped>
.product-field {
  height: 5.6rem;
  width: 100%;
  border-radius: 10px;
  border: 1px solid #d9d9d9;
  background: #fff;
  padding: 0 1.6rem;
  font-size: 1.6rem;
  color: #1b1b19;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.product-field::placeholder {
  color: #bdbdbd;
}

.product-field:focus {
  border-color: #003366;
  box-shadow: 0 0 0 2px rgb(0 51 102 / 10%);
}
</style>
