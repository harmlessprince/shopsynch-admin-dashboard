<script setup>
import { useApiService } from '~/services/apiService.js'
import { endpoints } from '~/utils/endpoints.js'
import { debounce, formatToMoney, logger, FIXED_UNIT_OPTIONS, getStockUnitOption } from '~/utils/helpers.js'
import { useErrorStore } from '~/stores/error.store.js'
import { useCollectionsStore } from '~/stores/collections.store.js'
import { useAdminMerchantsStore } from '~/stores/adminMerchants.store.js'
import TemplateAttributeField from '~/components/Dashboard/TemplateAttributeField.vue'
import BaseSelectInput from '~/components/BaseSelectInput.vue'
import BaseTextArea from '~/components/BaseTextArea.vue'
import BaseButton from '~/components/BaseButton.vue'
import SearchableSelectInput from '~/components/SearchableSelectInput.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth-middleware',
  name: 'dashboard-products-create',
  noPadding: true,
  pageTitle: 'Add product',
  headerBack: true,
  search: { description: 'Add a new product to your catalog', keywords: ['new product', 'add item', 'create', 'create product'] },
})

useHead({
  title: 'Add Product - ShopSynch Admin',
})

const categoryStore = useCategoryStore()
const productTemplateStore = useProductTemplateStore()
const toastStore = useToastStore()
const merchantsStore = useAdminMerchantsStore()
const collectionsStore = useCollectionsStore()
const errorStore = useErrorStore()
const { get, post } = useApiService()
const router = useRouter()
const route = useRoute()

const selectedTenantId = ref(route.query.tenantId ? String(route.query.tenantId) : '')
const merchantOptions = computed(() =>
  (merchantsStore.merchants || []).map((m) => ({
    value: m.id || m.tenantId,
    label: `${m.businessTradingName || m.name || 'Untitled Store'} (${m.code || (m.id ? m.id.substring(0, 8) : '')})`,
  }))
)

const isCategoryDrawerOpen = ref(false)
const isAddCategoryDrawerOpen = ref(false)
const isSubmitting = ref(false)
const isUnitSetupValid = ref(true)
const isResolvingCategory = ref(false)
const currentTemplate = ref(null)
const templateLoadingError = ref('')
const noCategoryTemplate = ref(false)
const hasTriedSubmit = ref(false)
const highlightedFieldKeys = ref(new Set())
const scrolledPastSectionIds = ref(new Set())
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
  selectedVariantDimensionKeys: [],
  customVariantAttributeName: '',
  unitTrackingMode: 'SINGLE_UNIT',
  unitCategory: '',
  unitTiers: [],
  stockEntryUnitKey: '',
  variants: [
    {
      variation: '',
      customAttributeValue: '',
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
      isCollapsed: false,
    },
  ],
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
]

const isVariableProduct = computed(() => productForm.productType === 'VARIABLE')
const isDigitalProduct = computed(() => productForm.productType === 'DIGITAL')

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
// stock unit changes (switching kg<->g, or the mode loading in) - the one time we do
// want the base value to overwrite what's shown, since the unit itself just changed.
watch(activeStockUnit, () => {
  displayQuantity.value = fromBaseQuantity(productForm.quantity)
  displayReorderLevel.value = fromBaseQuantity(productForm.reorderLevel)
  displayReorderQty.value = fromBaseQuantity(productForm.reorderQty)
})

const pricingSectionTitle = computed(() => isVariableProduct.value ? 'Variants' : 'Pricing')

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

const canSubmit = computed(() => missingRequiredFields.value.length === 0 && isUnitSetupValid.value)

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

const selectedVariantDimensions = computed(() =>
  productForm.selectedVariantDimensionKeys
    .map((key) => variantAttributeDefs.value.find((attribute) => attribute.key === key))
    .filter(Boolean)
)

const isTemplateVariantMode = computed(() => selectedVariantDimensions.value.length > 0)
const isCustomVariantMode = computed(() => !isTemplateVariantMode.value)

const SELECTED_BRANDS_STORAGE_KEY = 'shopsynch:selected-product-brands'

const brandTooltip = 'Enter the manufacturer or brand name of the product.'
const colorFamilyTooltip = 'Main color category for product filters and search.'
const priceTooltip = 'Selling price charged to customers.'
const defaultCostPriceTooltip = 'Unit purchase or production cost used to calculate profit.'
const salePriceTooltip = 'Discounted selling price applied during the sale dates.'
const quantityTooltip = 'Initial units available for sale in inventory.'
const sellerSkuTooltip = 'Unique merchant code for internal stock tracking.'
const gtinBarcodeTooltip = 'Global barcode number such as UPC, EAN, or ISBN.'
const lowStockThresholdTooltip = 'Triggers a low stock alert when available stock reaches this quantity.'
const reorderQtyTooltip = 'Recommended restock quantity when stock is low.'

const recentTenantCategories = computed(() =>
  (categoryStore.categories || []).map((category) => ({
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
    variation: '',
    customAttributeValue: '',
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
    isCollapsed: false,
  }
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

function getAttributeDisplayName(attribute) {
  return attribute?.label || attribute?.key || ''
}

function getVariantFieldValue(variant, attribute) {
  if (!variant || !attribute?.key) return ''
  return variant.attributes?.[attribute.key] ?? ''
}

function setVariantFieldValue(variant, attribute, value) {
  if (!variant || !attribute?.key) return
  variant.attributes = {
    ...(variant.attributes || {}),
    [attribute.key]: value,
  }
}

function getPrimaryVariantName() {
  if (isTemplateVariantMode.value) {
    return getAttributeDisplayName(selectedVariantDimensions.value[0])
  }

  return productForm.customVariantAttributeName.trim()
}

function getPrimaryVariantValue(variant) {
  if (isTemplateVariantMode.value) {
    return String(getVariantFieldValue(variant, selectedVariantDimensions.value[0]) || '').trim()
  }

  return String(variant.customAttributeValue || variant.variation || '').trim()
}

function buildVariantSkuAttributes(variant) {
  if (selectedVariantDimensions.value.length < 2) {
    return {}
  }

  const secondaryAttribute = selectedVariantDimensions.value[1]
  const secondaryValue = getVariantFieldValue(variant, secondaryAttribute)

  return cleanObject({
    [secondaryAttribute.key]: secondaryValue,
  }) || {}
}

function buildSkuGenerationAttributes(variant) {
  const selectedAttributes = Object.fromEntries(
    selectedVariantDimensions.value
      .map((attribute) => [attribute.key, getVariantFieldValue(variant, attribute)])
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )

  return cleanObject({
    ...cleanSkuAttributes(),
    ...selectedAttributes,
  }) || {}
}

function makeVariantSku(variant) {
  return cleanObject({
    price: parseMoney(variant.price),
    costPrice: parseMoney(variant.costPrice),
    quantityInStock: parseInteger(variant.quantity),
    reorderLevel: parseInteger(variant.reorderLevel),
    reorderQty: parseInteger(variant.reorderQty),
    sku: variant.sellerSku,
    gtinBarcode: variant.gtinBarcode,
    salesPrice: parseMoney(variant.salesPrice),
    salesStartDate: variant.salesStartDate,
    salesEndDate: variant.salesEndDate,
    attributes: buildVariantSkuAttributes(variant),
  })
}

function buildVariantGroups(filledVariants) {
  const groups = []
  const groupIndexByValue = new Map()
  const attributeName = getPrimaryVariantName()

  filledVariants.forEach((variant) => {
    const attributeValue = getPrimaryVariantValue(variant)
    if (!attributeName || !attributeValue) return

    if (!groupIndexByValue.has(attributeValue)) {
      groupIndexByValue.set(attributeValue, groups.length)
      groups.push({
        attributeName,
        attributeValue,
        skus: [],
      })
    }

    groups[groupIndexByValue.get(attributeValue)].skus.push(makeVariantSku(variant))
  })

  return groups
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
const costPriceFieldLabel = computed(() => baseUnitLabel.value ? `Initial cost price per ${baseUnitLabel.value} (₦) - optional` : 'Initial cost price (₦) - optional')

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
const initialCostPriceNote = 'Seeds starting inventory cost. Later real cost changes are made from stock adjustments.'
const joinHints = (...hints) => hints.filter(Boolean).join(' · ')
const getInitialCostPriceHint = (price) => joinHints(getUnitConversionHint(price), initialCostPriceNote)
const rootCostPriceHint = computed(() => getInitialCostPriceHint(productForm.costPrice))

function buildProductPayload() {
  const uploadedImages = productForm.images.filter((image) => image?.fileId)
  const filledVariants = isVariableProduct.value && hasUserProvidedVariantData()
    ? productForm.variants.filter((variant) =>
        getPrimaryVariantValue(variant)
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
    payload.quantityInStock = parseInteger(productForm.quantity)
    payload.reorderLevel = parseInteger(productForm.reorderLevel)
    payload.reorderQty = parseInteger(productForm.reorderQty)
    payload.sku = productForm.sellerSku
    payload.gtinBarcode = productForm.gtinBarcode
    payload.salesPrice = parseMoney(productForm.salesPrice)
    payload.salesStartDate = productForm.salesStartDate
    payload.salesEndDate = productForm.salesEndDate
  } else if (productForm.productType === 'DIGITAL') {
    payload.price = parseMoney(productForm.price)
    payload.sku = productForm.sellerSku
    payload.gtinBarcode = productForm.gtinBarcode
    payload.salesPrice = parseMoney(productForm.salesPrice)
    payload.salesStartDate = productForm.salesStartDate
    payload.salesEndDate = productForm.salesEndDate
  } else if (productForm.productType === 'VARIABLE' && filledVariants.length) {
    payload.variantGroups = buildVariantGroups(filledVariants)
  }

  if (productForm.productType !== 'DIGITAL') {
    payload.unitTrackingMode = productForm.unitTrackingMode
    payload.unitCategory = productForm.unitCategory
    if (productForm.unitTrackingMode === 'CUSTOM_TIERED') {
      payload.unitTiers = productForm.unitTiers.map((tier, index) => ({
        tierOrder: index,
        unitKey: tier.unitKey,
        defaultLabel: tier.defaultLabel,
        multiplierFromBase: Number(tier.multiplierFromBase),
        active: tier.active !== false,
      }))
    }
  }

  return cleanObject(payload)
}

function hasUserProvidedVariantData() {
  if (!isVariableProduct.value) return false

  return productForm.variants.some((variant) =>
    getPrimaryVariantValue(variant)
    || variant.price?.toString().trim()
    || variant.costPrice?.toString().trim()
    || variant.quantity?.toString().trim()
    || variant.reorderLevel?.toString().trim()
    || variant.reorderQty?.toString().trim()
    || variant.sellerSku?.trim()
    || variant.gtinBarcode?.trim()
  )
}

function hasFilledField(value, attribute = null) {
  if (Array.isArray(value)) return value.length > 0
  if (attribute?.type === 'BOOLEAN') return value === true || value === 'true'
  if (typeof value === 'number') return Number.isFinite(value)
  return String(value ?? '').trim().length > 0
}

function makeMissingField(key, label, message, sectionId, targetId, options = {}) {
  const section = steps.find((step) => step.sectionId === sectionId)

  return {
    key,
    label,
    message,
    sectionId,
    sectionTitle: section ? getStepTitle(section) : '',
    targetId,
    variantIndex: options.variantIndex,
    targetSelector: options.targetSelector,
  }
}

function getRequiredAttributeError(attribute) {
  if (!attribute?.required) return ''
  return hasFilledField(productForm.attributes[attribute.key], attribute)
    ? ''
    : `${getAttributeDisplayName(attribute)} is required.`
}

function getVariantCombinationKey(variant) {
  if (isTemplateVariantMode.value) {
    return selectedVariantDimensions.value
      .map((attribute) => `${attribute.key}:${String(getVariantFieldValue(variant, attribute) || '').trim()}`)
      .join('|')
  }

  return `${productForm.customVariantAttributeName.trim()}:${String(variant.customAttributeValue || '').trim()}`
}

const missingRequiredFields = computed(() => {
  const missing = []
  const descriptionLength = getPlainText(productForm.description).length
  const summaryLength = getPlainText(productForm.summary).length

  if (!productForm.images.some((image) => image.fileId)) {
    missing.push(makeMissingField(
      'images',
      'Product image',
      'Upload at least one product image.',
      'product-information',
      'product-images'
    ))
  }

  if (!productForm.name.trim()) {
    missing.push(makeMissingField(
      'name',
      'Product name',
      'Product name is required.',
      'product-information',
      'product-name'
    ))
  }

  if (!productForm.categoryId) {
    missing.push(makeMissingField(
      'categoryId',
      'Category',
      'Select a category.',
      'product-information',
      'product-category-button'
    ))
  }

  if (hasSelectedCategory.value) {
    if (!descriptionLength) {
      missing.push(makeMissingField(
        'description',
        'Product description',
        'Product description is required.',
        'product-information',
        'product-description'
      ))
    } else if (descriptionLength < DESCRIPTION_LIMITS.min || descriptionLength > DESCRIPTION_LIMITS.max) {
      missing.push(makeMissingField(
        'description',
        'Product description',
        `Description must be between ${DESCRIPTION_LIMITS.min} and ${DESCRIPTION_LIMITS.max} characters.`,
        'product-information',
        'product-description'
      ))
    }

    if (summaryLength && (summaryLength < SUMMARY_LIMITS.min || summaryLength > SUMMARY_LIMITS.max)) {
      missing.push(makeMissingField(
        'summary',
        'Summary',
        `Summary must be between ${SUMMARY_LIMITS.min} and ${SUMMARY_LIMITS.max} characters.`,
        'product-information',
        'product-summary'
      ))
    }

    productAttributeDefs.value.forEach((attribute) => {
      const error = getRequiredAttributeError(attribute)
      if (!error) return

      missing.push(makeMissingField(
        `attribute:${attribute.key}`,
        getAttributeDisplayName(attribute),
        error,
        'product-specification',
        attribute.key
      ))
    })

    if (!isVariableProduct.value) {
      if (!isValidPrice(productForm.price)) {
        missing.push(makeMissingField(
          'price',
          'Price',
          `${isDigitalProduct.value ? 'Digital' : 'Simple'} products need a price.`,
          'product-variants',
          'root-price'
        ))
      }

      if (!isValidOptionalCostPrice(productForm.costPrice)) {
        missing.push(makeMissingField(
          'costPrice',
          'Cost price',
          'Cost price cannot be less than zero.',
          'product-variants',
          'root-cost-price'
        ))
      }

      if (rootSaleError.value) {
        missing.push(makeMissingField(
          'salesPrice',
          'Sale price',
          rootSaleError.value,
          'product-variants',
          'root-sales-price'
        ))
      }

      if (!isDigitalProduct.value && parseInteger(productForm.quantity) === undefined) {
        missing.push(makeMissingField(
          'quantity',
          'Quantity',
          'Simple products need a quantity.',
          'product-variants',
          'root-quantity'
        ))
      }
    } else {
      if (isCustomVariantMode.value && !productForm.customVariantAttributeName.trim()) {
        missing.push(makeMissingField(
          'customVariantAttributeName',
          'Variant name',
          'Enter the variant name that controls pricing.',
          'product-variants',
          'custom-variant-attribute-name'
        ))
      }

      const seenCombinations = new Map()

      productForm.variants.forEach((variant, index) => {
        if (isTemplateVariantMode.value) {
          selectedVariantDimensions.value.forEach((attribute) => {
            if (String(getVariantFieldValue(variant, attribute) || '').trim()) return

            missing.push(makeMissingField(
              `variant:${index}:attribute:${attribute.key}`,
              `${getAttributeDisplayName(attribute)} for variant ${index + 1}`,
              `${getAttributeDisplayName(attribute)} is required for variant ${index + 1}.`,
              'product-variants',
              `${attribute.key}-${index}`,
              { variantIndex: index }
            ))
          })
        } else if (!String(variant.customAttributeValue || '').trim()) {
          missing.push(makeMissingField(
            `variant:${index}:customAttributeValue`,
            `Variant ${index + 1} value`,
            `Variant ${index + 1} needs a value.`,
            'product-variants',
            `custom-variant-value-${index}`,
            { variantIndex: index }
          ))
        }

        if (!isValidPrice(variant.price)) {
          missing.push(makeMissingField(
            `variant:${index}:price`,
            `Variant ${index + 1} price`,
            `Variant ${index + 1} needs a price.`,
            'product-variants',
            `price-${index}`,
            { variantIndex: index }
          ))
        }

        if (!isValidOptionalCostPrice(variant.costPrice)) {
          missing.push(makeMissingField(
            `variant:${index}:costPrice`,
            `Variant ${index + 1} cost price`,
            `Variant ${index + 1} cost price cannot be less than zero.`,
            'product-variants',
            `cost-price-${index}`,
            { variantIndex: index }
          ))
        }

        const variantSaleError = getVariantSaleError(variant)
        if (variantSaleError) {
          missing.push(makeMissingField(
            `variant:${index}:salesPrice`,
            `Variant ${index + 1} sale price`,
            variantSaleError,
            'product-variants',
            `sales-price-${index}`,
            { variantIndex: index }
          ))
        }

        if (parseInteger(variant.quantity) === undefined) {
          missing.push(makeMissingField(
            `variant:${index}:quantity`,
            `Variant ${index + 1} quantity`,
            `Variant ${index + 1} needs a quantity.`,
            'product-variants',
            `quantity-${index}`,
            { variantIndex: index }
          ))
        }

        const combinationKey = getVariantCombinationKey(variant)
        const combinationComplete = isTemplateVariantMode.value
          ? selectedVariantDimensions.value.length
            && selectedVariantDimensions.value.every((attribute) =>
              String(getVariantFieldValue(variant, attribute) || '').trim()
            )
          : productForm.customVariantAttributeName.trim() && String(variant.customAttributeValue || '').trim()

        if (!combinationComplete) return

        if (seenCombinations.has(combinationKey)) {
          missing.push(makeMissingField(
            `variant:${index}:duplicate`,
            `Variant ${index + 1}`,
            `Variant ${index + 1} duplicates variant ${seenCombinations.get(combinationKey) + 1}.`,
            'product-variants',
            isTemplateVariantMode.value
              ? `${selectedVariantDimensions.value[0]?.key}-${index}`
              : `custom-variant-value-${index}`,
            { variantIndex: index }
          ))
          return
        }

        seenCombinations.set(combinationKey, index)
      })
    }
  }

  return missing
})

const missingFieldsByKey = computed(() =>
  Object.fromEntries(missingRequiredFields.value.map((field) => [field.key, field]))
)

const missingFieldCountBySection = computed(() =>
  missingRequiredFields.value.reduce((counts, field) => {
    counts[field.sectionId] = (counts[field.sectionId] || 0) + 1
    return counts
  }, {})
)

const firstMissingField = computed(() => missingRequiredFields.value[0] || null)

function shouldShowFieldError(key, sectionId = '') {
  return Boolean(
    missingFieldsByKey.value[key]
    && (
      hasTriedSubmit.value
      || highlightedFieldKeys.value.has(key)
      || (sectionId && scrolledPastSectionIds.value.has(sectionId))
    )
  )
}

function getFieldError(key, sectionId = '') {
  return shouldShowFieldError(key, sectionId) ? missingFieldsByKey.value[key]?.message || '' : ''
}

function getVariantFieldError(index, key) {
  return getFieldError(`variant:${index}:${key}`, 'product-variants')
}

function getVariantAttributeError(index, attribute) {
  return getFieldError(`variant:${index}:attribute:${attribute.key}`, 'product-variants')
}

function getVariantCardError(index) {
  return missingRequiredFields.value.find((field) =>
    field.sectionId === 'product-variants' && field.variantIndex === index && shouldShowFieldError(field.key, field.sectionId)
  )?.message || ''
}

function validateFinalPayload() {
  hasTriedSubmit.value = true

  if (missingRequiredFields.value.length) {
    stepErrors.images = getFieldError('images', 'product-information')
    stepErrors.name = getFieldError('name', 'product-information')
    stepErrors.categoryId = getFieldError('categoryId', 'product-information')
    stepErrors.description = getFieldError('description', 'product-information')
    stepErrors.summary = getFieldError('summary', 'product-information')
    toastStore.error('Please complete the highlighted product fields.')
    return false
  }

  stepErrors.images = productForm.images.some((image) => image.fileId) ? '' : 'Upload at least one product image.'
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

    if (parseInteger(productForm.quantity) === undefined) {
      toastStore.error('Simple products need a quantity.')
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
  } else if (productForm.productType === 'VARIABLE') {
    if (isCustomVariantMode.value && !productForm.customVariantAttributeName.trim()) {
      toastStore.error('Enter the variant name that controls pricing.')
      return false
    }

    const seenCombinations = new Set()

    for (const variant of productForm.variants) {
      const missingSelectedDimension = selectedVariantDimensions.value.find((attribute) =>
        !String(getVariantFieldValue(variant, attribute) || '').trim()
      )

      if (
        (isTemplateVariantMode.value && missingSelectedDimension)
        || (isCustomVariantMode.value && !String(variant.customAttributeValue || '').trim())
        || !isValidPrice(variant.price)
        || !isValidOptionalCostPrice(variant.costPrice)
        || getVariantSaleError(variant)
        || parseInteger(variant.quantity) === undefined
      ) {
        toastStore.error(getVariantSaleError(variant) || 'Each variant needs its pricing attribute value, quantity, price, and a non-negative cost price when provided.')
        return false
      }

      const combinationKey = isTemplateVariantMode.value
        ? selectedVariantDimensions.value.map((attribute) => `${attribute.key}:${getVariantFieldValue(variant, attribute)}`).join('|')
        : `${productForm.customVariantAttributeName.trim()}:${variant.customAttributeValue}`

      if (seenCombinations.has(combinationKey)) {
        toastStore.error('Duplicate variant combinations are not allowed.')
        return false
      }

      seenCombinations.add(combinationKey)
    }
  }

  return true
}

function buildVariantSkuPayload(variant) {
  const skuAttributes = buildSkuGenerationAttributes(variant)
  const payload = {
    productName: productForm.name,
    brandName: getBrandName(),
    categoryName: productForm.categoryName,
    variantGroupAttributeName: getPrimaryVariantName(),
    variantGroupAttributeValue: getPrimaryVariantValue(variant),
    skuAttributes,
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
    && getPrimaryVariantName()
    && getPrimaryVariantValue(variant)
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
    const tenantId = selectedTenantId.value
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

function getVisibleVariantSuggestions(variant, attribute) {
  const options = (attribute?.options || [])
    .map((option) => String(option))
    .filter(Boolean)
  const search = String(getVariantFieldValue(variant, attribute) || '').trim().toLowerCase()

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
  productForm.selectedVariantDimensionKeys = []
  productForm.customVariantAttributeName = ''
  productForm.variants = [emptyVariant()]
}

function toggleVariantDimension(attribute) {
  if (!attribute?.key) return

  const index = productForm.selectedVariantDimensionKeys.indexOf(attribute.key)
  if (index >= 0) {
    productForm.selectedVariantDimensionKeys.splice(index, 1)
  } else if (productForm.selectedVariantDimensionKeys.length < 2) {
    productForm.selectedVariantDimensionKeys.push(attribute.key)
  }

  pruneVariantAttributes()
}

function pruneVariantAttributes() {
  const selectedKeys = new Set(productForm.selectedVariantDimensionKeys)

  productForm.variants.forEach((variant) => {
    variant.attributes = Object.fromEntries(
      Object.entries(variant.attributes || {}).filter(([key]) => selectedKeys.has(key))
    )
  })
}

function syncVariantDimensionsWithTemplate() {
  const allowedKeys = new Set(variantAttributeDefs.value.map((attribute) => attribute.key))
  productForm.selectedVariantDimensionKeys = productForm.selectedVariantDimensionKeys
    .filter((key) => allowedKeys.has(key))
    .slice(0, 2)
  pruneVariantAttributes()
}

function getVariantTitle(variant, index) {
  const segments = []

  if (isTemplateVariantMode.value) {
    selectedVariantDimensions.value.forEach((attribute) => {
      const value = String(getVariantFieldValue(variant, attribute) || '').trim()
      if (value) segments.push(`${getAttributeDisplayName(attribute)} (${value})`)
    })
  } else {
    const name = productForm.customVariantAttributeName.trim()
    const value = String(variant.customAttributeValue || '').trim()
    if (name && value) segments.push(`${name} (${value})`)
  }

  const quantity = parseInteger(variant.quantity)
  if (quantity !== undefined) segments.push(`Quantity (${quantity})`)

  return segments.length ? segments.join(', ') : `Variant ${index + 1}`
}

function toggleVariantCollapse(variant) {
  if (!variant) return
  variant.isCollapsed = !variant.isCollapsed
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
    productForm.selectedVariantDimensionKeys = []
    pruneVariantAttributes()
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
      productForm.attributes = {}
      productForm.selectedVariantDimensionKeys = []
      pruneVariantAttributes()
      return
    }

    const seededAttributes = {}
    template.attributeDefinitions
      .filter((attribute) => !isVariantAttribute(attribute))
      .forEach((attribute) => {
        seededAttributes[attribute.key] = productForm.attributes[attribute.key] ?? ''
      })

    productForm.attributes = seededAttributes
    syncVariantDimensionsWithTemplate()
  } catch (error) {
    logger.error('Failed to load product template', error)
    currentTemplate.value = null
    productForm.attributes = {}
    productForm.selectedVariantDimensionKeys = []
    pruneVariantAttributes()
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
    if (selectedTenantId.value) {
      payload.append('tenantId', selectedTenantId.value)
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

function addHighlightedField(key) {
  highlightedFieldKeys.value = new Set([...highlightedFieldKeys.value, key])
}

function markSectionScrolledPast(sectionId) {
  if (scrolledPastSectionIds.value.has(sectionId)) return
  scrolledPastSectionIds.value = new Set([...scrolledPastSectionIds.value, sectionId])
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
    if (section && section.getBoundingClientRect().bottom <= offset) {
      markSectionScrolledPast(step.sectionId)
    }
  })

  activeStepId.value = currentStep.id
}

function scrollToElement(element, block = 'start') {
  if (import.meta.server) return
  if (!element) return

  element.scrollIntoView({
    behavior: 'smooth',
    block,
  })
}

function focusFieldElement(element) {
  if (!element) return
  window.setTimeout(() => {
    const focusable = element.matches?.('input, textarea, select, button, [tabindex]')
      ? element
      : element.querySelector?.('input, textarea, select, button, [tabindex]')
    focusable?.focus?.({ preventScroll: true })
  }, 350)
}

function scrollToStep(step) {
  if (import.meta.server) return

  const section = document.getElementById(step.sectionId)
  if (!section) return

  activeStepId.value = step.id
  scrollToElement(section)
}

async function goToMissingField(field) {
  if (!field) return

  addHighlightedField(field.key)
  if (field.sectionId) markSectionScrolledPast(field.sectionId)

  if (field.variantIndex !== undefined) {
    const variant = productForm.variants[field.variantIndex]
    if (variant?.isCollapsed) {
      variant.isCollapsed = false
      await nextTick()
    }
  }

  const target = field.targetSelector
    ? document.querySelector(field.targetSelector)
    : document.getElementById(field.targetId)
  const section = document.getElementById(field.sectionId)
  const element = target || section

  scrollToElement(element)
  focusFieldElement(target || element)
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
    const tenantId = selectedTenantId.value
    const url = tenantId
      ? endpoints.admin.products.createForTenant.replace(':tenantId', tenantId)
      : endpoints.createProduct
    const payload = buildProductPayload()
    if (tenantId) {
      payload.tenantId = tenantId
    }
    const response = await post(url, payload)
    recordSubmittedBrand()

    const productId = response?.data?.id
    if (productId && productForm.collectionId) {
      try {
        await collectionsStore.associateProducts(productForm.collectionId, [productId])
      } catch (collectionError) {
        logger.error('Failed to associate product with collection', collectionError)
      }
    }

    toastStore.success('Product created successfully')

    if (productId) {
      await router.push(`/dashboard/product/${productId}`)
    } else {
      await router.push('/dashboard/product')
    }
  } catch (error) {
    logger.error('Product creation failed', error)
    toastStore.error('We could not create the product. Please try again.')
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
              :class="activeStepId === step.id || !missingFieldCountBySection[step.sectionId] ? 'border-primary bg-primary text-white' : 'border-[#AAB7C4] text-[#AAB7C4]'"
            >
              {{ step.id }}
            </span>
            <span
              class="text-[1.5rem] font-[700] whitespace-nowrap"
              :class="activeStepId === step.id || !missingFieldCountBySection[step.sectionId] ? 'text-primary' : 'text-[#AAB7C4]'"
            >
              {{ getStepTitle(step) }}
            </span>
            <span
              v-if="missingFieldCountBySection[step.sectionId]"
              class="inline-flex h-[2.2rem] min-w-[2.2rem] items-center justify-center rounded-full bg-amber-100 px-[0.7rem] text-[1.2rem] font-[700] text-amber-700"
            >
              {{ missingFieldCountBySection[step.sectionId] }}
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
              Product Information
            </h1>
          </div>

          <div
            id="product-images"
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
                :class="[
                  productForm.uploadingStates[index] ? 'pointer-events-none opacity-70' : '',
                  getFieldError('images', 'product-information') ? '!border-rose-500 bg-rose-50' : '',
                ]"
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
            v-if="stepErrors.images || getFieldError('images', 'product-information') || errorStore.validationErrors?.image || errorStore.validationErrors?.imageList"
            class="mt-[1rem] text-[1.2rem] font-[500] text-rose-500"
          >
            {{ stepErrors.images || getFieldError('images', 'product-information') || errorStore.validationErrors?.image || errorStore.validationErrors?.imageList }}
          </p>
          <p class="mt-[1.6rem] text-[1.4rem] leading-[2.2rem] text-[#7A7A7A]">
            Image needs to be between 500x500 and 2000x2000 pixels. White backgrounds are recommended. No watermarks. Maximum image size 1MB.
          </p>
          </div>

          <div class="mb-[2rem]">
            <SearchableSelectInput
              v-model="selectedTenantId"
              label="Merchant / Store"
              placeholder="Select a merchant store..."
              search-placeholder="Search merchants..."
              :options="merchantOptions"
            />
          </div>

          <div class="grid grid-cols-1 gap-[2rem] lg:grid-cols-2">
          <AppInput
            v-model="productForm.name"
            data-tour="product-name"
            tooltip="Product name"
            name="product-name"
            label="Product Name"
            placeholder="EX: Wireless headphone"
            :error="getFieldError('name', 'product-information') || errorStore.validationErrors?.name"
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
                (getFieldError('categoryId', 'product-information') || errorStore.validationErrors?.categoryId) ? '!border-rose-500 ring-2 ring-rose-100' : '',
              ]"
              @click="isCategoryDrawerOpen = true"
            >
              <span>{{ productForm.categoryName || 'Category' }}</span>
              <span class="material-symbols-outlined text-[3rem] text-[#1B1B19]">chevron_right</span>
            </button>
            <p
              v-if="getFieldError('categoryId', 'product-information') || errorStore.validationErrors?.categoryId"
              class="mt-[0.8rem] text-[1.2rem] font-[500] text-rose-500"
            >
              {{ getFieldError('categoryId', 'product-information') || errorStore.validationErrors?.categoryId }}
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
            id="product-description"
            v-model="productForm.description"
            data-tour="product-description"
            label="Product Description"
            placeholder="Include only product-related information- write clearly and concisely - make sure the description matches your product images - Testimonial or quotes of any kind are not allowed - No promotional messages or promoting other products except the product it's self"
            :min-length="DESCRIPTION_LIMITS.min"
            :max-length="DESCRIPTION_LIMITS.max"
            :error="getFieldError('description', 'product-information') || errorStore.validationErrors?.description"
            @update:model-value="stepErrors.description = ''"
          />

          <BaseTextArea
            id="product-summary"
            v-model="productForm.summary"
            label="Summary"
            placeholder="Short product summary shown in listings. Keep it clear and concise."
            :minlength="SUMMARY_LIMITS.min"
            :maxlength="SUMMARY_LIMITS.max"
            :error="getFieldError('summary', 'product-information') || errorStore.validationErrors?.summary"
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

          <DashboardProductUnitTierBuilder
            v-model="unitSetup"
            :tenant-id="selectedTenantId"
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
            <div class="grid grid-cols-1 gap-[1.2rem] md:grid-cols-3">
              <button
                v-for="type in productTypes"
                :key="type.value"
                type="button"
                class="flex min-h-[8.8rem] items-center gap-[1.6rem] rounded-[10px] border bg-white p-[1.6rem] text-left transition hover:border-primary"
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
                :error="getFieldError('price', 'product-variants') || errorStore.validationErrors?.price"
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
                :error="getFieldError('costPrice', 'product-variants') || errorStore.validationErrors?.costPrice"
                input-class="product-field"
              />

              <AppInput
                v-if="!isDigitalProduct"
                v-model="displayQuantity"
                data-tour="product-inventory"
                name="root-quantity"
                :label="`Quantity${stockUnitSuffix}`"
                type="number"
                :allow-decimal="isFixedUnitsMode"
                placeholder="Enter quantity"
                :tooltip="quantityTooltip"
                :error="getFieldError('quantity', 'product-variants') || errorStore.validationErrors?.quantity || errorStore.validationErrors?.quantityInStock"
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
                v-if="!isDigitalProduct"
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
                v-if="!isDigitalProduct"
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
                :error="rootSaleError || getFieldError('salesPrice', 'product-variants') || errorStore.validationErrors?.salesPrice"
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
                  class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] text-[#1B1B19] outline-none transition placeholder:text-[#BDBDBD] focus:border-primary focus:ring-2 focus:ring-primary/10 product-field text-[#7A7A7A]"
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
                  class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] text-[#1B1B19] outline-none transition placeholder:text-[#BDBDBD] focus:border-primary focus:ring-2 focus:ring-primary/10 product-field text-[#7A7A7A]"
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

          <template v-else>
          <article class="mb-[1.6rem] rounded-[10px] bg-white px-[2.4rem] py-[2rem]">
            <div
              v-if="variantAttributeDefs.length"
              class="space-y-[1.6rem]"
            >
              <div>
                <p class="text-[1.6rem] font-[600] text-[#1B1B19]">
                  Pricing attributes
                </p>
                <p class="mt-[0.4rem] text-[1.3rem] leading-[2rem] text-[#7A7A7A]">
                  Select up to two attributes that affect price, or leave blank to enter a custom variant name.
                </p>
              </div>

              <div class="flex flex-wrap gap-[1rem]">
                <button
                  v-for="attribute in variantAttributeDefs"
                  :key="attribute.key"
                  type="button"
                  class="inline-flex min-h-[4.4rem] items-center rounded-[8px] border px-[1.4rem] text-[1.4rem] font-[600] transition disabled:cursor-not-allowed disabled:opacity-50"
                  :class="productForm.selectedVariantDimensionKeys.includes(attribute.key)
                    ? 'border-primary bg-primary text-white'
                    : 'border-[#D9D9D9] bg-white text-[#1B1B19] hover:border-primary hover:text-primary'"
                  :disabled="!productForm.selectedVariantDimensionKeys.includes(attribute.key) && productForm.selectedVariantDimensionKeys.length >= 2"
                  @click="toggleVariantDimension(attribute)"
                >
                  {{ attribute.label || attribute.key }}
                </button>
              </div>
            </div>

            <div
              v-if="isCustomVariantMode"
              :class="variantAttributeDefs.length ? 'mt-[2rem]' : ''"
            >
              <AppInput
                v-model="productForm.customVariantAttributeName"
                name="custom-variant-attribute-name"
                label="Variant name"
                placeholder="Ex: Size, Shoe size, Material"
                :error="getFieldError('customVariantAttributeName', 'product-variants')"
                input-class="product-field"
              />
            </div>
          </article>

          <div class="space-y-[1.6rem]">
            <article
              v-for="(variant, index) in productForm.variants"
              :key="index"
              class="overflow-hidden rounded-[10px] bg-white"
              :class="getVariantCardError(index) ? 'ring-2 ring-rose-100' : ''"
            >
              <div class="flex min-h-[7rem] items-center justify-between gap-[1.6rem] border-b border-[#D9D9D9] px-[2.4rem] py-[1.6rem]">
                <button
                  type="button"
                  class="flex min-w-0 flex-1 items-center gap-[1.2rem] text-left"
                  :aria-expanded="!variant.isCollapsed"
                  @click="toggleVariantCollapse(variant)"
                >
                  <span class="flex h-[2.4rem] w-[2.4rem] shrink-0 rounded-[4px] border border-[#D9D9D9] bg-white" />
                  <span class="truncate text-[1.8rem] font-[700] leading-[2.4rem] text-[#1B1B19]">
                    {{ getVariantTitle(variant, index) }}
                  </span>
                  <span
                    v-if="getVariantCardError(index)"
                    class="hidden rounded-full bg-rose-50 px-[1rem] py-[0.4rem] text-[1.2rem] font-[600] text-rose-600 md:inline-flex"
                  >
                    Incomplete
                  </span>
                </button>

                <div class="flex shrink-0 items-center gap-[1.2rem]">
                  <button
                    type="button"
                    class="text-[1.3rem] font-[600] text-rose-500 transition hover:text-rose-600"
                    @click="removeVariant(index)"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    class="flex h-[3.2rem] w-[3.2rem] items-center justify-center text-[#616161] transition hover:text-[#1B1B19]"
                    :aria-label="variant.isCollapsed ? 'Expand variant' : 'Collapse variant'"
                    @click="toggleVariantCollapse(variant)"
                  >
                    <span class="material-symbols-outlined text-[2.8rem]" aria-hidden="true">
                      {{ variant.isCollapsed ? 'expand_more' : 'expand_less' }}
                    </span>
                  </button>
                </div>
              </div>

              <div
                v-show="!variant.isCollapsed"
                class="grid grid-cols-1 gap-[1.6rem] px-[2.4rem] py-[2rem] md:grid-cols-2 xl:grid-cols-4"
              >
                <div
                  v-if="isCustomVariantMode"
                >
                  <AppInput
                    v-model="variant.customAttributeValue"
                    :name="`custom-variant-value-${index}`"
                    :label="productForm.customVariantAttributeName || 'Variant value'"
                    placeholder="Enter value"
                    :error="getVariantFieldError(index, 'customAttributeValue') || getVariantFieldError(index, 'duplicate')"
                    input-class="product-field"
                  />
                </div>

                <template v-else>
                  <div
                    v-for="attribute in selectedVariantDimensions"
                    :key="attribute.key"
                  >
                    <AppInput
                      :model-value="getVariantFieldValue(variant, attribute)"
                      :name="`${attribute.key}-${index}`"
                      :label="attribute.label || attribute.key"
                      :placeholder="attribute.placeholder || `Enter ${attribute.label || attribute.key}`"
                      :error="getVariantAttributeError(index, attribute) || getVariantFieldError(index, 'duplicate')"
                      input-class="product-field"
                      @update:model-value="setVariantFieldValue(variant, attribute, $event)"
                    />
                    <div
                      v-if="getVisibleVariantSuggestions(variant, attribute).length"
                      class="mt-[0.8rem] flex flex-wrap gap-[0.8rem]"
                    >
                      <button
                        v-for="option in getVisibleVariantSuggestions(variant, attribute)"
                        :key="option"
                        type="button"
                        class="rounded-full border px-[1.2rem] py-[0.6rem] text-[1.3rem] font-[500] transition-colors"
                        :class="getVariantFieldValue(variant, attribute) === option
                          ? 'border-primary bg-primary text-white'
                          : 'border-[#D9D9D9] bg-white text-[#1B1B19] hover:border-primary hover:text-primary'"
                        @click="setVariantFieldValue(variant, attribute, option)"
                      >
                        {{ option }}
                      </button>
                    </div>
                  </div>
                </template>

                <div>
                  <div class="mb-[0.8rem] flex items-center justify-between gap-[1.2rem]">
                    <label
                      :for="`seller-sku-${index}`"
                      class="block text-[1.6rem] font-[400] text-[#1B1B19]"
                    >
                      Seller SKU
                    </label>
                    <span
                      v-tooltip="{ text: sellerSkuTooltip, position: 'center' }"
                      class="material-symbols-outlined cursor-help text-[1.8rem] text-gray-400"
                    >
                      info
                    </span>
                    <button
                      type="button"
                      class="inline-flex h-[2.8rem] items-center justify-center rounded-[6px] border border-primary px-[1rem] text-[1.2rem] font-[600] text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="variant.isGeneratingSku || !canGenerateVariantSku(variant)"
                      @click="generateVariantSellerSku(index)"
                    >
                      <span
                        v-if="variant.isGeneratingSku"
                        class="mr-[0.6rem] h-[1.2rem] w-[1.2rem] animate-spin rounded-full border-2 border-current border-t-transparent"
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
                  label="Quantity"
                  type="number"
                  placeholder="Enter quantity"
                  :tooltip="quantityTooltip"
                  :error="getVariantFieldError(index, 'quantity')"
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
                  :error="getVariantFieldError(index, 'price')"
                  input-class="product-field"
                />

                <AppMoneyInput
                  v-model="variant.costPrice"
                  :name="`cost-price-${index}`"
                  :label="costPriceFieldLabel"
                  placeholder="0.00"
                  :tooltip="defaultCostPriceTooltip"
                  :hint="getInitialCostPriceHint(variant.costPrice)"
                  :error="getVariantFieldError(index, 'costPrice')"
                  input-class="product-field"
                />

                <AppMoneyInput
                  v-model="variant.salesPrice"
                  :name="`sales-price-${index}`"
                  label="Sale price (₦)"
                  placeholder="0.00"
                  :tooltip="salePriceTooltip"
                  :error="getVariantSaleError(variant) || getVariantFieldError(index, 'salesPrice')"
                  input-class="product-field"
                />

                <div>
                  <label
                    :for="`sales-start-date-${index}`"
                    class="mb-[0.8rem] block text-[1.6rem] font-[400] text-[#B0B0B0]"
                  >
                    Sale start date
                  </label>
                  <input
                    :id="`sales-start-date-${index}`"
                    v-model="variant.salesStartDate"
                    type="date"
                    class="product-field text-[#7A7A7A]"
                  >
                </div>

                <div>
                  <label
                    :for="`sales-end-date-${index}`"
                    class="mb-[0.8rem] block text-[1.6rem] font-[400] text-[#B0B0B0]"
                  >
                    Sale end date
                  </label>
                  <input
                    :id="`sales-end-date-${index}`"
                    v-model="variant.salesEndDate"
                    type="date"
                    class="product-field text-[#7A7A7A]"
                  >
                </div>
              </div>

              <p
                v-if="getVariantSalePreview(variant)"
                class="mx-[2.4rem] mb-[1.6rem] rounded-[8px] bg-emerald-50 px-[1.4rem] py-[1rem] text-[1.3rem] font-[700] text-emerald-700"
              >
                {{ getVariantSalePreview(variant) }}
              </p>

              <p
                v-if="variant.systemSku && !variant.isCollapsed"
                class="px-[2.4rem] pb-[2rem] text-[1.2rem] font-[500] text-[#7A7A7A]"
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
              :error="getFieldError(`attribute:${attribute.key}`, 'product-specification')"
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

      <footer class="mt-[4rem] border-t border-[#BDBDBD] pt-[2.4rem]">
        <section
          v-if="missingRequiredFields.length"
          class="mb-[2rem] rounded-[10px] border border-amber-200 bg-amber-50 px-[1.6rem] py-[1.4rem]"
          aria-live="polite"
        >
          <div class="flex flex-col gap-[0.4rem] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-[1.5rem] font-[700] text-[#1B1B19]">
                Complete {{ missingRequiredFields.length }} {{ missingRequiredFields.length === 1 ? 'field' : 'fields' }} to submit
              </p>
              <p class="mt-[0.2rem] text-[1.3rem] leading-[2rem] text-[#7A7A7A]">
                Use the list below to jump to the next incomplete area.
              </p>
            </div>

            <button
              v-if="firstMissingField"
              type="button"
              class="inline-flex h-[3.8rem] items-center justify-center rounded-[8px] border border-amber-300 bg-white px-[1.2rem] text-[1.3rem] font-[700] text-amber-800 transition hover:border-amber-500"
              @click="goToMissingField(firstMissingField)"
            >
              Go to first
            </button>
          </div>

          <div class="mt-[1.2rem] grid grid-cols-1 gap-[0.8rem] md:grid-cols-2">
            <button
              v-for="field in missingRequiredFields"
              :key="field.key"
              type="button"
              class="flex min-h-[4.8rem] items-start gap-[1rem] rounded-[8px] bg-white px-[1.2rem] py-[1rem] text-left transition hover:ring-2 hover:ring-amber-200"
              @click="goToMissingField(field)"
            >
              <span class="material-symbols-outlined mt-[0.1rem] text-[1.9rem] text-amber-600">error</span>
              <span class="min-w-0">
                <span class="block text-[1.3rem] font-[700] leading-[1.8rem] text-[#1B1B19]">
                  {{ field.label }}
                </span>
                <span class="block text-[1.2rem] leading-[1.7rem] text-[#7A7A7A]">
                  {{ field.sectionTitle }} - {{ field.message }}
                </span>
              </span>
            </button>
          </div>
        </section>

        <div class="flex flex-col items-stretch gap-[1rem] sm:items-end">
          <p
            v-if="missingRequiredFields.length"
            class="text-[1.3rem] font-[500] text-[#7A7A7A]"
          >
            Submit unlocks after the required fields above are complete.
          </p>
          <BaseButton
            data-tour="product-save"
            type="submit"
            variant="primary"
            class="h-[5.6rem] w-full max-w-[18rem] rounded-[10px] text-[1.6rem]"
            :disabled="!canSubmit || isSubmitting"
            :loading="isSubmitting"
          >
            Submit
          </BaseButton>
        </div>
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
