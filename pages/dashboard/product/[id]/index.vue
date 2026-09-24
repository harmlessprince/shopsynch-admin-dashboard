<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '~/stores/products.store.js'
import { useInventoryStore } from '~/stores/inventory.store.js'
import { useProductTemplateStore } from '~/stores/productTemplate.store.js'
import { useStoreStore } from '~/stores/store.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { formatToMoney, logger } from '~/utils/helpers.js'
import ProductVariantsDrawer from '~/components/Dashboard/ProductVariantsDrawer.vue'
import ProductVariantDetailDrawer from '~/components/Dashboard/ProductVariantDetailDrawer.vue'
import ProductFeaturesDrawer from '~/components/Dashboard/ProductFeaturesDrawer.vue'
import ProductSpecificationsDrawer from '~/components/Dashboard/ProductSpecificationsDrawer.vue'
import ProductGalleryModal from '~/components/Dashboard/ProductGalleryModal.vue'
import ProductArchiveConfirmModal from '~/components/Dashboard/ProductArchiveConfirmModal.vue'
import ProfitBasisTooltip from '~/components/Dashboard/ProfitBasisTooltip.vue'
import DashboardProductRichTextContent from '~/components/Dashboard/ProductRichTextContent.vue'
import BaseButton from '~/components/BaseButton.vue'
import Spinner from '~/components/Spinner.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth-middleware',
  name: 'dashboard-product-detail',
  pageTitle: 'Product Details',
})

useHead({
  title: 'Product Detail - ShopSynch',
})

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const inventoryStore = useInventoryStore()
const productTemplateStore = useProductTemplateStore()
const storeStore = useStoreStore()
const toastStore = useToastStore()

const product = ref(null)
const inventoryRecords = ref([])
const currentTemplate = ref(null)
const loading = ref(true)
const activeImageIndex = ref(0)
const activeTab = ref('details')

// Drawer visibility states & selected variant
const selectedVariantDetail = ref(null)
const showVariantDetailDrawer = ref(false)
const showFeaturesDrawer = ref(false)
const showSpecsDrawer = ref(false)
const showVariantsDrawer = ref(false)
const showGalleryModal = ref(false)
const archiveModal = reactive({
  open: false,
  loading: false,
})

const productId = route.params.id

const bundledProducts = ref([])
const isLoadingBundled = ref(false)

const tabs = computed(() => [
  { key: 'details', label: 'Overview & Features' },
  { key: 'specifications', label: 'Specifications & Attributes' },
  ...(product.value?.productType === 'VARIABLE'
    ? [{ key: 'variants', label: 'Variants & SKUs', count: flattenedVariants.value.length }]
    : []),
  ...(product.value?.productType === 'BUNDLE'
    ? [{ key: 'bundle', label: 'Bundled Items', count: bundledProducts.value.length || product.value?.bundledProductIds?.length || 0 }]
    : []),
])

onMounted(async () => {
  await loadProduct()
})

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
    bundledProducts.value = responses.filter((r) => r?.data).map((r) => r.data)
  } catch (err) {
    logger.error('Failed to load bundled products', err)
  } finally {
    isLoadingBundled.value = false
  }
}

const loadProduct = async () => {
  try {
    loading.value = true
    const [response, inventory] = await Promise.all([
      productStore.getProductById(productId),
      inventoryStore.getProductInventory(productId),
    ])
    if (response?.data) {
      product.value = response.data
      inventoryRecords.value = Array.isArray(inventory) ? inventory : []
      await loadProductTemplate(response.data)
      if (response.data.productType === 'BUNDLE' && response.data.bundledProductIds?.length) {
        loadBundledProducts(response.data.bundledProductIds)
      }
    }
  } catch (error) {
    logger.error('Failed to fetch product details', error)
  } finally {
    loading.value = false
  }
}

const loadProductTemplate = async (productData) => {
  if (!productData?.categoryId) {
    currentTemplate.value = null
    return
  }

  try {
    currentTemplate.value = await productTemplateStore.getCachedTemplateByCategory(productData.categoryId)
  } catch (error) {
    logger.warn('Failed to fetch product template', error)
    currentTemplate.value = null
  }
}

const goBack = () => {
  router.push('/dashboard/product')
}

const goToEdit = () => {
  router.push(`/dashboard/product/${productId}/edit`)
}

const refreshProduct = async () => {
  await loadProduct()
}

const productIsArchived = computed(() =>
  Boolean(product.value?.isArchived ?? product.value?.archived)
)

const openArchiveModal = () => {
  archiveModal.open = true
}

const closeArchiveModal = () => {
  if (archiveModal.loading) return
  archiveModal.open = false
}

const confirmArchiveAction = async () => {
  if (!product.value || archiveModal.loading) return

  const isArchived = productIsArchived.value

  try {
    archiveModal.loading = true
    const response = isArchived
      ? await productStore.unarchiveProduct(product.value.id)
      : await productStore.archiveProduct(product.value.id)

    if (response?.status) {
      toastStore.showToast(
        response.message || `Product ${isArchived ? 'unarchived' : 'archived'} successfully`,
        'success'
      )
      archiveModal.open = false
      await refreshProduct()
    }
  } finally {
    archiveModal.loading = false
  }
}

const imageList = computed(() => {
  const images = product.value?.imageList?.length
    ? product.value.imageList
    : product.value?.images?.length
      ? product.value.images
      : []

  if (!images.length && product.value?.image) return [product.value.image]
  return images
})

const currentHeroImage = computed(() =>
  imageList.value[activeImageIndex.value] || product.value?.image || '/placeholder-img.png'
)

const activePrice = computed(() => {
  if (!product.value) return { price: 0, effectivePrice: 0, discount: 0, isOnSale: false }

  if (product.value.productType === 'VARIABLE') {
    const skus = product.value.variantGroups?.flatMap((group) => group.skus || []) || []
    const cheapest = skus.reduce((min, sku) => {
      const skuPrice = Number(resolveSalePrice(sku).effectivePrice || 0)
      const minPrice = Number(min ? resolveSalePrice(min).effectivePrice : Infinity)
      return skuPrice < minPrice ? sku : min
    }, null)

    return cheapest
      ? { ...resolveSalePrice(cheapest), fromLabel: true }
      : resolveSalePrice(product.value)
  }

  return resolveSalePrice(product.value)
})

const displayPrice = computed(() => activePrice.value.effectivePrice || activePrice.value.price || 0)
const hasDiscount = computed(() => Boolean(activePrice.value.isOnSale))

const discountPercent = computed(() => {
  if (activePrice.value.discount) return Math.round(activePrice.value.discount)
  if (!hasDiscount.value || !activePrice.value.price || !displayPrice.value) return 0
  return Math.round(((activePrice.value.price - displayPrice.value) / activePrice.value.price) * 100)
})

const flattenedVariants = computed(() => {
  if (!product.value?.variantGroups) return []

  const all = []
  product.value.variantGroups.forEach((group) => {
    ;(group.skus || []).forEach((sku) => {
      const attrStr = Object.values(sku.attributes || {}).filter(Boolean).join(' / ')
      const inventory = getInventoryRecordForSku(sku.id)
      all.push({
        variantGroup: group,
        sku,
        inventory,
        availableQty: getInventoryQuantity(inventory, sku.quantityInStock),
        reorderLevel: getInventoryThreshold(
          inventory,
          getFirstDefined(
            sku.reorderLevel,
            sku.lowStockThreshold,
            sku.threshold,
            sku.minimumStockLevel,
            sku.minStockLevel
          )
        ),
        reorderQty: getInventoryReorderQty(
          inventory,
          getFirstDefined(sku.reorderQty, sku.restockQuantity, sku.restockQty)
        ),
        displayName: `${group.attributeValue}${attrStr ? ` (${attrStr})` : ''}`,
        image: group.image || product.value.image || '/placeholder-img.png',
      })
    })
  })
  return all
})

const variantStats = computed(() => {
  if (!flattenedVariants.value.length) return null
  let inStock = 0
  let lowStock = 0
  let outOfStock = 0

  flattenedVariants.value.forEach((v) => {
    const s = getInventoryStatus(v.availableQty, v.reorderLevel)
    if (s === 'out-of-stock') outOfStock++
    else if (s === 'low-stock') lowStock++
    else inStock++
  })

  return {
    total: flattenedVariants.value.length,
    inStock,
    lowStock,
    outOfStock,
  }
})

const selectVariant = (item) => {
  const status = getInventoryStatus(item.availableQty, item.reorderLevel)
  selectedVariantDetail.value = {
    ...item.variantGroup,
    ...item.sku,
    availableQty: item.availableQty,
    reorderLevel: item.reorderLevel,
    reorderQty: item.reorderQty,
    inventoryStatus: status,
    displayName: item.displayName,
    displayImage: item.variantGroup.image || product.value.image || '/placeholder-img.png',
  }
  showVariantDetailDrawer.value = true
}

function getInventoryRecordForSku(skuId = null) {
  if (skuId) {
    return inventoryRecords.value.find((record) => String(record?.skuId || '') === String(skuId)) || null
  }
  return inventoryRecords.value.find((record) => !record?.skuId) || inventoryRecords.value[0] || null
}

function getInventoryQuantity(record, fallback = 0) {
  return Number(
    getFirstDefined(
      record?.availableQty,
      record?.onHandQty,
      record?.quantityInStock,
      record?.quantity,
      fallback,
      0
    )
  )
}

function getInventoryThreshold(record, fallback = null) {
  const value = getFirstDefined(
    record?.reorderLevel,
    record?.lowStockThreshold,
    record?.threshold,
    record?.minimumStockLevel,
    record?.minStockLevel,
    fallback
  )
  return value === null || value === undefined || value === '' ? null : Number(value)
}

function getInventoryReorderQty(record, fallback = null) {
  const value = getFirstDefined(record?.reorderQty, record?.restockQuantity, record?.restockQty, fallback)
  return value === null || value === undefined || value === '' ? null : Number(value)
}

function getInventoryStatus(quantity, threshold) {
  if (quantity <= 0) return 'out-of-stock'
  if (threshold !== null && threshold > 0 && quantity <= threshold) return 'low-stock'
  return 'in-stock'
}

const rootInventoryRecord = computed(() => getInventoryRecordForSku())

const rootInventoryQuantity = computed(() =>
  getInventoryQuantity(rootInventoryRecord.value, product.value?.quantityInStock ?? product.value?.quantity)
)

const rootReorderLevel = computed(() =>
  getInventoryThreshold(
    rootInventoryRecord.value,
    getFirstDefined(
      product.value?.reorderLevel,
      product.value?.lowStockThreshold,
      product.value?.threshold,
      product.value?.minimumStockLevel,
      product.value?.minStockLevel
    )
  )
)

const rootReorderQty = computed(() =>
  getInventoryReorderQty(
    rootInventoryRecord.value,
    getFirstDefined(
      product.value?.reorderQty,
      product.value?.restockQuantity,
      product.value?.restockQty
    )
  )
)

// ─── Bundle Computations ───────────────────────────────────────────────────
const bundleTotalStandalonePrice = computed(() => {
  return bundledProducts.value.reduce((sum, p) => {
    const itemPrice = Number(p.effectivePrice || p.price || 0)
    return sum + itemPrice
  }, 0)
})

const bundlePackagePrice = computed(() => {
  return Number(product.value?.effectivePrice || product.value?.price || 0)
})

const bundleSavings = computed(() => {
  const diff = bundleTotalStandalonePrice.value - bundlePackagePrice.value
  return diff > 0 ? diff : 0
})

const bundleSavingsPercent = computed(() => {
  if (!bundleTotalStandalonePrice.value || bundleTotalStandalonePrice.value <= 0) return 0
  return Math.round((bundleSavings.value / bundleTotalStandalonePrice.value) * 100)
})

const bundleFulfillableStock = computed(() => {
  if (!bundledProducts.value.length) return 0
  const stocks = bundledProducts.value.map((p) => {
    if (p.productType === 'DIGITAL') return Infinity
    return Number(p.quantityInStock ?? p.quantity ?? 0)
  })
  const min = Math.min(...stocks)
  return min === Infinity ? 0 : Math.max(0, min)
})

const constrainingBundledItem = computed(() => {
  if (!bundledProducts.value.length) return null
  let minItem = null
  let minStock = Infinity
  for (const item of bundledProducts.value) {
    if (item.productType === 'DIGITAL') continue
    const stock = Number(item.quantityInStock ?? item.quantity ?? 0)
    if (stock < minStock) {
      minStock = stock
      minItem = item
    }
  }
  return minItem
})

const getBundledItemImage = (item) => {
  return item.thumbnail || item.image || (item.images && item.images[0]) || '/placeholder-img.png'
}

const rootInventoryStatus = computed(() => {
  if (product.value?.productType === 'DIGITAL') return 'in-stock'

  if (product.value?.productType === 'VARIABLE') {
    if (inventoryTotal.value <= 0) return 'out-of-stock'
    return flattenedVariants.value.some(
      (variant) => getInventoryStatus(variant.availableQty, variant.reorderLevel) === 'low-stock'
    )
      ? 'low-stock'
      : 'in-stock'
  }

  if (product.value?.productType === 'BUNDLE') {
    if (!bundledProducts.value.length) return 'in-stock'
    if (bundleFulfillableStock.value <= 0) return 'out-of-stock'
    if (bundleFulfillableStock.value <= 5) return 'low-stock'
    return 'in-stock'
  }

  return getInventoryStatus(rootInventoryQuantity.value, rootReorderLevel.value)
})

const stockStatusLabel = computed(() => {
  if (rootInventoryStatus.value === 'out-of-stock') return 'Out of Stock'
  if (rootInventoryStatus.value === 'low-stock') return 'Low Stock Alert'
  return 'In Stock'
})

const stockDotColor = computed(() => {
  if (rootInventoryStatus.value === 'out-of-stock') return 'bg-rose-500'
  if (rootInventoryStatus.value === 'low-stock') return 'bg-amber-500'
  return 'bg-emerald-500'
})

function getStatusClass(status) {
  if (status === 'out-of-stock') return 'bg-rose-50 text-rose-700 border border-rose-200'
  if (status === 'low-stock') return 'bg-amber-50 text-amber-800 border border-amber-200'
  return 'bg-emerald-50 text-emerald-800 border border-emerald-200'
}

const inventoryTotal = computed(() => {
  if (product.value?.productType === 'VARIABLE') {
    return flattenedVariants.value.reduce((sum, item) => sum + Number(item.availableQty || 0), 0)
  }
  if (product.value?.productType === 'BUNDLE') {
    return bundleFulfillableStock.value
  }
  return rootInventoryQuantity.value
})

const unitLabel = computed(() => {
  return (
    rootInventoryRecord.value?.baseUnitLabel ||
    rootInventoryRecord.value?.unitCategory ||
    product.value?.baseUnitLabel ||
    product.value?.unitCategory ||
    'Units'
  )
})

const attributeDefinitions = computed(() => currentTemplate.value?.attributeDefinitions || [])

const isVariantDefinition = (definition) =>
  Boolean(definition?.isVariantDimension ?? definition?.variantDimension)

const templateSections = computed(() => {
  const sections = {}

  attributeDefinitions.value
    .filter((definition) => !isVariantDefinition(definition) && definition.displayAs !== 'HIDDEN')
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .forEach((definition) => {
      const value = product.value?.attributes?.[definition.key]
      if (!hasRenderableValue(value)) return

      const section = definition.section || 'General'
      ;(sections[section] = sections[section] || []).push({ definition, value })
    })

  return Object.entries(sections).map(([name, rows]) => ({ name, rows }))
})

const templateAttributeKeys = computed(() => {
  const keys = new Set()
  templateSections.value.forEach((section) => {
    section.rows.forEach((row) => keys.add(row.definition.key))
  })
  return keys
})

const featureRows = computed(() => (product.value?.features || []).filter(Boolean))

const legacySpecificationRows = computed(() =>
  (product.value?.specifications || [])
    .map((spec) => ({
      label: spec.label || spec.key || spec.name,
      value: spec.value,
    }))
    .filter((row) => row.label && hasRenderableValue(row.value))
)

const extraAttributeRows = computed(() =>
  Object.entries(product.value?.attributes || {})
    .filter(([key, value]) => !templateAttributeKeys.value.has(key) && hasRenderableValue(value))
    .map(([key, value]) => ({ label: humanizeKey(key), value }))
)

const productSku = computed(() => getFirstDefined(product.value?.sku, product.value?.sellerSku))

const productBrand = computed(() => getFirstDefined(product.value?.brand, product.value?.brandName))

const productCategory = computed(() =>
  getFirstDefined(product.value?.category, product.value?.categoryName)
)

const productInfoRows = computed(() =>
  [
    { label: 'Brand', value: productBrand.value },
    { label: 'Category', value: productCategory.value },
    {
      label: 'Color family',
      value: getFirstDefined(product.value?.colorFamily, product.value?.attributes?.colorFamily),
    },
    {
      label: 'Weight',
      value: getFirstDefined(product.value?.weightKg, product.value?.weight, product.value?.attributes?.weight),
      unit: getFirstDefined(product.value?.weightKg) ? 'kg' : '',
    },
    { label: 'Base unit', value: unitLabel.value },
    { label: 'SKU', value: productSku.value },
    { label: 'GTIN Barcode', value: product.value?.gtinBarcode },
    { label: 'Product Type', value: product.value?.productType },
    { label: 'Status', value: productIsArchived.value ? 'Archived' : 'Active' },
    { label: 'Base Selling Price', value: product.value?.price, format: 'money' },
    { label: 'Cost Price', value: product.value?.costPrice, format: 'money' },
    { label: 'Sales Price', value: product.value?.salesPrice, format: 'money' },
    { label: 'Available Quantity', value: `${inventoryTotal.value} ${unitLabel.value}` },
    ...legacySpecificationRows.value,
    ...extraAttributeRows.value,
  ].filter((row) => hasRenderableValue(row.value))
)

const unitTiers = computed(() =>
  product.value?.unitTrackingMode !== 'SINGLE_UNIT' ? product.value?.unitTiers || [] : []
)

const selectTab = (key) => {
  activeTab.value = key
}

const hasRenderableValue = (value) => {
  if (value == null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return String(value).trim() !== ''
}

const getFirstDefined = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== '')

function isSaleActive(item) {
  if (item?.isOnSale !== undefined && item?.isOnSale !== null) return Boolean(item.isOnSale)

  const price = Number(item?.price || 0)
  const salesPrice = Number(item?.salesPrice || 0)
  if (!price || !salesPrice || salesPrice >= price) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = item?.salesStartDate ? new Date(item.salesStartDate) : null
  const end = item?.salesEndDate ? new Date(item.salesEndDate) : null
  if (start) start.setHours(0, 0, 0, 0)
  if (end) end.setHours(0, 0, 0, 0)

  return (!start || today >= start) && (!end || today <= end)
}

function resolveSalePrice(item) {
  const price = Number(item?.price || 0)
  const active = isSaleActive(item)
  const effectivePrice = Number(
    getFirstDefined(item?.effectivePrice, active ? item?.salesPrice : null, price) || 0
  )
  const discount = active
    ? getFirstDefined(
        item?.discount,
        price && effectivePrice ? ((price - effectivePrice) / price) * 100 : null
      )
    : null

  return {
    price,
    effectivePrice,
    discount,
    isOnSale: active,
  }
}

const humanizeKey = (key = '') =>
  String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const formatAttributeValue = (value, definition = {}) => {
  if (definition.format === 'money') return formatToMoney(value)
  if (definition.format === 'date') return formatDisplayDate(value)
  if (definition.type === 'BOOLEAN' || typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object' && value !== null) return Object.values(value).filter(Boolean).join(', ')

  const suffix = definition.unit ? ` ${definition.unit}` : ''
  return `${value}${suffix}`
}

const formatDisplayDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const copyToClipboard = async (text, label) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(String(text))
    toastStore.showToast(`${label} copied to clipboard`, 'success')
  } catch {
    toastStore.showToast(`Failed to copy ${label}`, 'error')
  }
}

const storefrontUrl = computed(() => {
  const slug = storeStore.storeSettings?.slug
  const productSlug = product.value?.slug || product.value?.id
  if (!slug || !productSlug) return null
  return `https://${slug}.shopsynch.com/products/${productSlug}`
})
</script>

<template>
  <DashboardContainer>
    <div v-if="loading" class="flex items-center justify-center min-h-[400px]">
      <Spinner width="64px" height="64px" />
    </div>

    <div v-else-if="product" class="space-y-6 pb-20">
      <!-- Breadcrumb & Clear Action Hierarchy Header -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div class="flex items-center gap-3 min-w-0">
          <button
            type="button"
            class="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-primary cursor-pointer shrink-0"
            title="Back to products"
            @click="goBack"
          >
            <span class="material-symbols-outlined text-2xl">arrow_back</span>
          </button>

          <div class="min-w-0 space-y-0.5">
            <!-- Breadcrumbs -->
            <nav class="flex items-center gap-1.5 text-xs font-medium text-slate-400" aria-label="Breadcrumb">
              <NuxtLink to="/dashboard/product" class="hover:text-primary transition-colors">Products</NuxtLink>
              <span class="text-slate-300">/</span>
              <span v-if="productCategory" class="text-slate-500 font-semibold">{{ productCategory }}</span>
              <span v-if="productCategory" class="text-slate-300">/</span>
              <span class="text-slate-700 font-bold truncate max-w-[200px]">{{ product.name }}</span>
            </nav>

            <div class="flex items-center gap-2.5 flex-wrap min-w-0">
              <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate max-w-lg lg:max-w-xl" :title="product.name">
                {{ product.name }}
              </h1>
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0"
                :class="getStatusClass(rootInventoryStatus)"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="stockDotColor" />
                {{ stockStatusLabel }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons: Clear Separation of Primary vs Secondary vs Destructive -->
        <div class="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <!-- Contextual Secondary Actions -->
          <NuxtLink
            v-if="rootInventoryRecord?.id"
            :to="`/dashboard/inventory/${rootInventoryRecord.id}`"
            class="h-10 px-3.5 rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-primary font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
            title="View Inventory Record"
          >
            <span class="material-symbols-outlined text-base">inventory</span>
            <span>Inventory</span>
          </NuxtLink>
          <NuxtLink
            v-else-if="product.productType === 'VARIABLE'"
            :to="`/dashboard/inventory?search=${encodeURIComponent(product.name)}`"
            class="h-10 px-3.5 rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-primary font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
            title="View Inventory Records"
          >
            <span class="material-symbols-outlined text-base">inventory</span>
            <span>Inventory</span>
          </NuxtLink>

          <a
            v-if="storefrontUrl"
            :href="storefrontUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="h-10 px-3.5 rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-primary font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
            title="View on Storefront"
          >
            <span class="material-symbols-outlined text-base">open_in_new</span>
            <span>Storefront</span>
          </a>

          <BaseButton
            variant="outline"
            class="h-10 px-3.5 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            @click="showGalleryModal = true"
          >
            <span class="material-symbols-outlined text-base">imagesmode</span>
            <span>Gallery</span>
          </BaseButton>

          <!-- Destructive / Status Action -->
          <BaseButton
            variant="outline"
            class="h-10 px-3.5 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            :class="!productIsArchived ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'text-slate-700'"
            @click="openArchiveModal"
          >
            <span class="material-symbols-outlined text-base">{{ productIsArchived ? 'unarchive' : 'archive' }}</span>
            <span>{{ productIsArchived ? 'Unarchive' : 'Archive' }}</span>
          </BaseButton>

          <!-- Dominant Primary CTA -->
          <BaseButton
            variant="primary"
            class="h-10 px-4 rounded-[10px] text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            @click="goToEdit"
          >
            <span class="material-symbols-outlined text-base">edit</span>
            <span>Edit Product</span>
          </BaseButton>
        </div>
      </div>

      <!-- TIER 1: Main Product Overview Canvas (Executive Glance) -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-6 bg-white rounded-xl border border-slate-200 p-6 sm:p-7">
        <!-- Left Column: Gallery & Media -->
        <div class="space-y-3">
          <div class="group relative aspect-square w-full rounded-xl border border-slate-200 bg-slate-50/50 p-6 flex items-center justify-center overflow-hidden">
            <!-- Main Hero Image -->
            <img
              :src="currentHeroImage"
              :alt="product.name"
              class="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
            >

            <!-- Zoom / Gallery Trigger Button -->
            <button
              type="button"
              aria-label="Expand image gallery"
              class="absolute bottom-3 right-3 p-2 rounded-lg bg-white/90 backdrop-blur-sm text-slate-700 shadow-sm border border-slate-200 opacity-80 group-hover:opacity-100 hover:bg-white transition-all cursor-pointer"
              @click="showGalleryModal = true"
            >
              <span class="material-symbols-outlined text-xl block">zoom_in</span>
            </button>
          </div>

          <!-- Thumbnails Strip -->
          <div v-if="imageList.length > 1" class="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              v-for="(img, index) in imageList"
              :key="`${img}-${index}`"
              type="button"
              :aria-label="`Show product image ${index + 1}`"
              :class="[
                'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-50 p-1 transition-all cursor-pointer',
                activeImageIndex === index
                  ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
              ]"
              @click="activeImageIndex = index"
            >
              <img :src="img" :alt="`${product.name} image ${index + 1}`" class="h-full w-full object-contain">
            </button>
          </div>
        </div>

        <!-- Right Column: Details, Price, Consolidated Inventory Health -->
        <div class="flex flex-col justify-between space-y-5">
          <div class="space-y-4">
            <!-- Meta Identifiers (Muted passive signals) -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary uppercase">
                {{ product.productType || 'SIMPLE' }} PRODUCT
              </span>
              <span v-if="productBrand" class="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                Brand: <strong class="text-slate-900 font-semibold">{{ productBrand }}</strong>
              </span>
              <span v-if="productCategory" class="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                Category: <strong class="text-slate-900 font-semibold">{{ productCategory }}</strong>
              </span>
              <span v-if="productSku" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700">
                <span>SKU: <strong class="text-slate-900 font-semibold">{{ productSku }}</strong></span>
                <button
                  type="button"
                  class="hover:text-primary cursor-pointer transition-colors"
                  title="Copy SKU"
                  @click="copyToClipboard(productSku, 'SKU')"
                >
                  <span class="material-symbols-outlined text-xs">content_copy</span>
                </button>
              </span>
            </div>

            <!-- Product Title -->
            <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
              {{ product.name }}
            </h2>

            <!-- Hero Price & Profit Block (Tabular Numerics) -->
            <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200/90">
              <div class="space-y-0.5">
                <p class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Selling Price</p>
                <div class="flex items-baseline gap-2.5 flex-wrap">
                  <span class="text-2xl sm:text-3xl font-black text-primary tabular-nums tracking-tight">
                    {{ activePrice.fromLabel ? 'from ' : '' }}{{ formatToMoney(displayPrice) }}
                  </span>
                  <span v-if="hasDiscount" class="text-base font-semibold text-slate-400 line-through tabular-nums">
                    {{ formatToMoney(activePrice.price) }}
                  </span>
                  <span v-if="discountPercent" class="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-extrabold text-rose-700">
                    {{ discountPercent }}% OFF
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <ProfitBasisTooltip
                  v-if="product.profit !== null && product.profit !== undefined"
                  :profit="product.profit"
                  size="md"
                />
                <span
                  v-else
                  class="text-xs font-medium text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200"
                  title="Add cost prices to track profit and gross margins"
                >
                  Cost Basis Not Set
                </span>
              </div>
            </div>

            <!-- Brief Summary Snippet -->
            <div v-if="product.summary || product.description" class="text-sm text-slate-600 leading-relaxed max-h-20 overflow-hidden relative">
              <DashboardProductRichTextContent :content="product.summary || product.description" variant="plain" />
            </div>
          </div>

          <!-- Consolidated Inventory Health Card -->
          <div class="rounded-xl bg-slate-50/80 border border-slate-200 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-xl">
                  {{ product.productType === 'BUNDLE' ? 'apps' : 'warehouse' }}
                </span>
                <h4 class="text-sm font-bold text-slate-900">
                  {{ product.productType === 'BUNDLE' ? 'Bundle Fulfillment Capacity' : 'Inventory Status' }}
                </h4>
              </div>
              <div class="flex items-center gap-1.5">
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold"
                  :class="getStatusClass(rootInventoryStatus)"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="stockDotColor" />
                  {{ stockStatusLabel }}
                </span>
                <span class="text-xs font-bold text-slate-700 tabular-nums">
                  ({{ inventoryTotal }} {{ product.productType === 'BUNDLE' ? 'bundles' : unitLabel }})
                </span>
              </div>
            </div>

            <!-- 3-Column Stock Breakdown (For BUNDLE vs Standard) -->
            <div v-if="product.productType === 'BUNDLE'" class="grid grid-cols-3 gap-2.5 text-center">
              <div class="bg-white rounded-lg p-2.5 border border-slate-200/80">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Items</p>
                <p class="text-base font-black text-slate-800 tabular-nums mt-0.5">
                  {{ bundledProducts.length }}
                </p>
              </div>
              <div class="bg-white rounded-lg p-2.5 border border-slate-200/80">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Can Fulfill</p>
                <p class="text-base font-black text-emerald-700 tabular-nums mt-0.5">
                  {{ bundleFulfillableStock }}
                </p>
              </div>
              <div class="bg-white rounded-lg p-2.5 border border-slate-200/80">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Items Value</p>
                <p class="text-base font-black text-slate-800 tabular-nums mt-0.5">
                  {{ formatToMoney(bundleTotalStandalonePrice) }}
                </p>
              </div>
            </div>
            <div v-else class="grid grid-cols-3 gap-2.5 text-center">
              <div class="bg-white rounded-lg p-2.5 border border-slate-200/80">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">On-Hand</p>
                <p class="text-base font-black text-slate-800 tabular-nums mt-0.5">
                  {{ rootInventoryRecord?.onHandQty ?? inventoryTotal }}
                </p>
              </div>
              <div class="bg-white rounded-lg p-2.5 border border-slate-200/80">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reserved</p>
                <p class="text-base font-black text-amber-600 tabular-nums mt-0.5">
                  {{ rootInventoryRecord?.reservedQty ?? 0 }}
                </p>
              </div>
              <div class="bg-white rounded-lg p-2.5 border border-slate-200/80">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available</p>
                <p class="text-base font-black text-emerald-700 tabular-nums mt-0.5">
                  {{ inventoryTotal }}
                </p>
              </div>
            </div>

            <!-- Footer: Thresholds or Bottleneck -->
            <div v-if="product.productType === 'BUNDLE'" class="flex items-center justify-between pt-1 border-t border-slate-200/70 text-xs text-slate-500">
              <span v-if="constrainingBundledItem" class="truncate max-w-[280px]">
                Bottleneck: <strong class="text-slate-700 font-bold">{{ constrainingBundledItem.name }}</strong> ({{ constrainingBundledItem.quantityInStock ?? constrainingBundledItem.quantity ?? 0 }})
              </span>
              <span v-else>Stock based on component availability</span>
              <button type="button" class="font-bold text-primary hover:underline cursor-pointer shrink-0" @click="selectTab('bundle')">
                View Components &rarr;
              </button>
            </div>
            <div v-else class="flex items-center justify-between pt-1 border-t border-slate-200/70 text-xs text-slate-500">
              <div class="flex items-center gap-3">
                <span>Alert at: <strong class="text-slate-700 font-bold tabular-nums">{{ rootReorderLevel ?? '—' }}</strong></span>
                <span>Restock: <strong class="text-slate-700 font-bold tabular-nums">{{ rootReorderQty ?? '—' }}</strong></span>
              </div>
              <NuxtLink
                v-if="rootInventoryRecord?.id"
                :to="`/dashboard/inventory/${rootInventoryRecord.id}`"
                class="inline-flex items-center gap-1 font-bold text-primary hover:underline"
              >
                <span class="material-symbols-outlined text-sm">history</span>
                <span>Stock Logs</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- TIER 2 & 3: Tabbed Progressive Disclosure Section -->
      <section class="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 space-y-6">
        <!-- Tab Navigation Bar -->
        <div class="flex border-b border-slate-200 gap-6 overflow-x-auto pb-px">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            :class="[
              'pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            ]"
            @click="selectTab(tab.key)"
          >
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.count !== undefined"
              class="px-2 py-0.5 rounded-full text-xs font-bold"
              :class="activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'"
            >
              {{ tab.count }}
            </span>
          </button>
        </div>

        <!-- TAB 1: Overview & Features -->
        <div v-if="activeTab === 'details'" class="space-y-6 pt-1">
          <!-- Full Rich Description -->
          <div class="space-y-2">
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-lg text-primary">description</span>
              <span>Full Description</span>
            </h3>
            <div class="rounded-xl border border-slate-200 bg-slate-50/40 p-5 text-sm leading-relaxed text-slate-700">
              <DashboardProductRichTextContent
                :content="product.description"
                variant="rich"
                fallback="No detailed description provided for this product yet."
              />
            </div>
          </div>

          <!-- Bundle Composition Summary (Overview Tier 2) -->
          <div v-if="product.productType === 'BUNDLE'" class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-lg text-primary">apps</span>
                <span>Included Products ({{ bundledProducts.length }})</span>
              </h3>
              <button
                type="button"
                class="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                @click="selectTab('bundle')"
              >
                <span>View Full Bundle Breakdown</span>
                <span class="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            <!-- Loading State -->
            <div v-if="isLoadingBundled" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div v-for="n in (product.bundledProductIds?.length || 2)" :key="n" class="h-24 rounded-xl bg-slate-100 animate-pulse" />
            </div>

            <!-- Products List Cards -->
            <div v-else-if="bundledProducts.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <NuxtLink
                v-for="item in bundledProducts"
                :key="item.id"
                :to="`/dashboard/product/${item.id}`"
                class="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <img
                  :src="getBundledItemImage(item)"
                  :alt="item.name"
                  class="w-12 h-12 rounded-lg object-contain bg-slate-50 border border-slate-100 shrink-0"
                >
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                    {{ item.name }}
                  </p>
                  <p class="text-[11px] text-slate-400 font-mono truncate">
                    SKU: {{ item.sku || '—' }}
                  </p>
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-xs font-bold text-slate-800 tabular-nums">
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
              </NuxtLink>
            </div>

            <div v-else class="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400 text-xs">
              No products found in this bundle.
            </div>
          </div>

          <!-- Two-Column Product Attribute & Features Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- General Specifications Card -->
            <div class="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h4 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <span class="material-symbols-outlined text-lg text-primary">tune</span>
                <span>Product Metadata</span>
              </h4>
              <dl class="space-y-2 text-xs">
                <div
                  v-for="row in productInfoRows"
                  :key="`${row.label}-${row.value}`"
                  class="flex justify-between items-center py-1 border-b border-slate-50 last:border-0"
                >
                  <dt class="text-slate-500 font-medium">{{ row.label }}:</dt>
                  <dd class="font-bold text-slate-900 text-right tabular-nums">
                    {{ formatAttributeValue(row.value, row) }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Key Features Card with Drawer Trigger Button -->
            <div class="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg text-primary">featured_play_list</span>
                  <span>Key Features</span>
                </h4>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline uppercase tracking-wider cursor-pointer"
                  title="Open Key Features Drawer"
                  @click="showFeaturesDrawer = true"
                >
                  <span class="material-symbols-outlined text-sm">edit</span>
                  <span>Manage Features</span>
                </button>
              </div>

              <ul v-if="featureRows.length" class="space-y-2 text-xs text-slate-600">
                <li v-for="feature in featureRows" :key="feature" class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">check_circle</span>
                  <span>{{ feature }}</span>
                </li>
              </ul>
              <div v-else class="text-center py-6 text-slate-400 space-y-2">
                <p class="text-xs">No bulleted key features added yet.</p>
                <BaseButton variant="outline" class="text-xs h-8 px-3 mx-auto" @click="showFeaturesDrawer = true">
                  + Add Features (Drawer)
                </BaseButton>
              </div>
            </div>
          </div>

          <!-- Unit setup if applicable -->
          <div v-if="unitTiers.length" class="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h4 class="text-sm font-bold text-slate-900">Multi-Tier Unit Setup</h4>
            <ul class="space-y-1.5 text-xs text-slate-600">
              <li
                v-for="tier in unitTiers"
                :key="tier.unitKey"
                class="flex items-center justify-between py-1 border-b border-slate-50 last:border-0"
              >
                <span class="font-semibold text-slate-800">{{ tier.defaultLabel || tier.unitKey }}</span>
                <span class="font-mono text-slate-700">{{ tier.multiplierFromBase }} {{ product.baseUnitLabel }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- TAB 2: Specifications & Attributes with Drawer Trigger Button -->
        <div v-else-if="activeTab === 'specifications'" class="space-y-6 pt-1">
          <div class="flex justify-end">
            <BaseButton
              variant="outline"
              class="h-9 text-xs"
              title="Open Specifications Drawer"
              @click="showSpecsDrawer = true"
            >
              <span class="material-symbols-outlined text-base mr-1.5">edit_note</span>
              <span>Manage Specifications</span>
            </BaseButton>
          </div>

          <!-- Template Sections -->
          <div v-if="templateSections.length" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="section in templateSections"
              :key="section.name"
              class="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
            >
              <h4 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">{{ section.name }}</h4>
              <dl class="space-y-2 text-xs">
                <div
                  v-for="row in section.rows"
                  :key="row.definition.key"
                  class="flex justify-between py-1 border-b border-slate-50 last:border-0"
                >
                  <dt class="text-slate-500">{{ row.definition.label }}:</dt>
                  <dd class="font-bold text-slate-900 text-right tabular-nums">
                    {{ formatAttributeValue(row.value, row.definition) }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- Rich Text Specifications (Box contents, warranty, etc.) -->
          <div
            v-if="product.manufacturerDescription || product.boxContents || product.productWarranty || product.warrantyAddress"
            class="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div v-if="product.manufacturerDescription" class="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
              <h4 class="text-sm font-bold text-slate-900">From the Manufacturer</h4>
              <div class="text-xs text-slate-600 leading-relaxed">
                <DashboardProductRichTextContent :content="product.manufacturerDescription" variant="rich" />
              </div>
            </div>

            <div v-if="product.boxContents" class="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
              <h4 class="text-sm font-bold text-slate-900">What's in the Box</h4>
              <div class="text-xs text-slate-600 leading-relaxed">
                <DashboardProductRichTextContent :content="product.boxContents" variant="rich" />
              </div>
            </div>

            <div v-if="product.productWarranty" class="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
              <h4 class="text-sm font-bold text-slate-900">Product Warranty</h4>
              <div class="text-xs text-slate-600 leading-relaxed">
                <DashboardProductRichTextContent :content="product.productWarranty" variant="rich" />
              </div>
            </div>

            <div v-if="product.warrantyAddress" class="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
              <h4 class="text-sm font-bold text-slate-900">Warranty Address</h4>
              <div class="text-xs text-slate-600 leading-relaxed">
                <DashboardProductRichTextContent :content="product.warrantyAddress" variant="rich" />
              </div>
            </div>
          </div>

          <div
            v-if="!templateSections.length && !(product.manufacturerDescription || product.boxContents || product.productWarranty || product.warrantyAddress)"
            class="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-500 space-y-2"
          >
            <span class="material-symbols-outlined text-4xl text-slate-300 mx-auto block">assignment</span>
            <p class="text-sm font-bold text-slate-700">No Custom Specifications Provided</p>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">
              Add box contents, warranty information, or category-specific attributes to give customers complete details.
            </p>
            <BaseButton variant="primary" class="h-9 px-4 text-xs mx-auto mt-2" @click="showSpecsDrawer = true">
              + Add Specifications (Drawer)
            </BaseButton>
          </div>
        </div>

        <!-- TAB 3: Variants & SKUs with Drawer Trigger Button -->
        <div v-else-if="activeTab === 'variants'" class="space-y-5 pt-1">
          <!-- Tier 2 Summary Header & Action -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 class="text-base font-bold text-slate-900">Product SKU Variations</h3>
              <p class="text-xs text-slate-500">Each SKU tracks independent stock levels, pricing, and variant attributes.</p>
            </div>
            <div class="flex items-center gap-3">
              <BaseButton
                variant="primary"
                class="h-9 px-4 text-xs font-bold flex items-center gap-1.5"
                title="Open Add Variant Drawer"
                @click="showVariantsDrawer = true"
              >
                <span class="material-symbols-outlined text-base">add</span>
                <span>Add Variant</span>
              </BaseButton>
            </div>
          </div>

          <!-- Tier 2 KPI Summary Chips (Quick glance into variant health) -->
          <div v-if="variantStats" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total SKUs</p>
              <p class="text-lg font-black text-slate-800 tabular-nums mt-0.5">{{ variantStats.total }}</p>
            </div>
            <div class="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40">
              <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-600">In Stock</p>
              <p class="text-lg font-black text-emerald-700 tabular-nums mt-0.5">{{ variantStats.inStock }}</p>
            </div>
            <div class="p-3 rounded-lg border border-amber-200 bg-amber-50/40">
              <p class="text-[11px] font-bold uppercase tracking-wider text-amber-600">Low Stock</p>
              <p class="text-lg font-black text-amber-700 tabular-nums mt-0.5">{{ variantStats.lowStock }}</p>
            </div>
            <div class="p-3 rounded-lg border border-rose-200 bg-rose-50/40">
              <p class="text-[11px] font-bold uppercase tracking-wider text-rose-600">Sold Out</p>
              <p class="text-lg font-black text-rose-700 tabular-nums mt-0.5">{{ variantStats.outOfStock }}</p>
            </div>
          </div>

          <!-- Zero State -->
          <div
            v-if="flattenedVariants.length === 0"
            class="py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl space-y-2"
          >
            <span class="material-symbols-outlined text-4xl text-slate-300 block mx-auto">layers</span>
            <p class="text-sm font-bold text-slate-700">No SKU Variations Configured</p>
            <p class="text-xs text-slate-400">Click "Add Variant" to create color, size, or custom variations.</p>
            <BaseButton variant="primary" class="h-9 px-4 text-xs mx-auto mt-2" @click="showVariantsDrawer = true">
              + Add Variant (Drawer)
            </BaseButton>
          </div>

          <!-- Tier 3: Variant Table with Explicit "View Variant" Drawer Button -->
          <div v-else class="rounded-xl border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th class="py-3 px-4">Variant Item</th>
                    <th class="py-3 px-4">Selling Price</th>
                    <th class="py-3 px-4">Margin</th>
                    <th class="py-3 px-4">Available Stock</th>
                    <th class="py-3 px-4">Attributes</th>
                    <th class="py-3 px-4 text-center">Status</th>
                    <th class="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="(variant, index) in flattenedVariants"
                    :key="index"
                    class="hover:bg-slate-50/70 transition-colors"
                  >
                    <!-- Thumbnail & Name -->
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <img
                          :src="variant.image"
                          :alt="variant.displayName"
                          class="w-9 h-9 rounded-lg object-contain bg-slate-50 border border-slate-200 shrink-0"
                        >
                        <div>
                          <p class="font-bold text-slate-900">{{ variant.displayName }}</p>
                          <p class="text-[11px] font-mono text-slate-400">SKU: {{ variant.sku?.sku || '—' }}</p>
                        </div>
                      </div>
                    </td>

                    <!-- Price -->
                    <td class="py-3 px-4 font-bold text-primary tabular-nums">
                      {{ formatToMoney(resolveSalePrice(variant.sku).effectivePrice) }}
                    </td>

                    <!-- Profit -->
                    <td class="py-3 px-4">
                      <ProfitBasisTooltip :profit="variant.sku?.profit" :show-explanation="false" size="sm" />
                    </td>

                    <!-- Available Qty -->
                    <td class="py-3 px-4">
                      <span
                        class="font-bold tabular-nums"
                        :class="variant.availableQty > 0 ? 'text-slate-900' : 'text-rose-600'"
                      >
                        {{ variant.availableQty > 0 ? `${variant.availableQty} ${unitLabel}` : 'Out of stock' }}
                      </span>
                      <span v-if="variant.reorderLevel !== null" class="block text-[11px] font-medium text-slate-400">
                        Alert: {{ variant.reorderLevel }}
                      </span>
                    </td>

                    <!-- Attributes -->
                    <td class="py-3 px-4">
                      <div v-if="variant.sku.attributes && Object.keys(variant.sku.attributes).length" class="flex flex-wrap gap-1">
                        <span
                          v-for="([key, val]) in Object.entries(variant.sku.attributes)"
                          :key="key"
                          class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700"
                        >
                          {{ key }}: {{ val }}
                        </span>
                      </div>
                      <span v-else class="text-slate-400">—</span>
                    </td>

                    <!-- Status -->
                    <td class="py-3 px-4 text-center">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
                        :class="getStatusClass(getInventoryStatus(variant.availableQty, variant.reorderLevel))"
                      >
                        {{
                          getInventoryStatus(variant.availableQty, variant.reorderLevel) === 'out-of-stock'
                            ? 'Sold Out'
                            : getInventoryStatus(variant.availableQty, variant.reorderLevel) === 'low-stock'
                              ? 'Low Stock'
                              : 'In Stock'
                        }}
                      </span>
                    </td>

                    <!-- Explicit "View Variant" Drawer Trigger Button -->
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          class="h-7 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Open Variant Details Drawer"
                          @click="selectVariant(variant)"
                        >
                          <span class="material-symbols-outlined text-sm text-primary">visibility</span>
                          <span>View Variant</span>
                        </button>
                        <NuxtLink
                          v-if="variant.inventory?.id"
                          :to="`/dashboard/inventory/${variant.inventory.id}`"
                          class="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-colors inline-flex items-center"
                          title="Open inventory ledger"
                        >
                          <span class="material-symbols-outlined text-base">inventory</span>
                        </NuxtLink>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 4: Bundle Components -->
        <div v-else-if="activeTab === 'bundle'" class="space-y-6 pt-1">
          <!-- Tier 2 Summary Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 class="text-base font-bold text-slate-900">Bundle Components & Fulfillment</h3>
              <p class="text-xs text-slate-500">
                This bundle package is fulfilled from the individual inventories of the products listed below.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <NuxtLink
                :to="`/dashboard/product/${productId}/edit`"
                class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
              >
                <span class="material-symbols-outlined text-sm">edit</span>
                <span>Edit Bundle</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Tier 2 Financial & Inventory Metric Chips -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Included Products</p>
              <p class="text-xl font-black text-slate-800 tabular-nums mt-0.5">{{ bundledProducts.length }}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">Component items</p>
            </div>

            <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Standalone Value</p>
              <p class="text-xl font-black text-slate-800 tabular-nums mt-0.5">
                {{ formatToMoney(bundleTotalStandalonePrice) }}
              </p>
              <p class="text-[11px] text-slate-400 mt-0.5">If bought separately</p>
            </div>

            <div class="p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <p class="text-[11px] font-bold uppercase tracking-wider text-primary">Bundle Price</p>
              <div class="flex items-baseline gap-2 mt-0.5">
                <p class="text-xl font-black text-primary tabular-nums">
                  {{ formatToMoney(bundlePackagePrice) }}
                </p>
                <span v-if="bundleSavingsPercent > 0" class="text-[11px] font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  Save {{ bundleSavingsPercent }}%
                </span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">
                {{ bundleSavings > 0 ? `Customer saves ${formatToMoney(bundleSavings)}` : 'Same as standalone' }}
              </p>
            </div>

            <div
              class="p-3.5 rounded-xl border"
              :class="bundleFulfillableStock > 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-wider"
                :class="bundleFulfillableStock > 0 ? 'text-emerald-600' : 'text-rose-600'"
              >
                Fulfillable Bundles
              </p>
              <p
                class="text-xl font-black tabular-nums mt-0.5"
                :class="bundleFulfillableStock > 0 ? 'text-emerald-700' : 'text-rose-700'"
              >
                {{ bundleFulfillableStock }}
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5 truncate">
                {{ constrainingBundledItem ? `Bottleneck: ${constrainingBundledItem.name}` : 'Ready to ship' }}
              </p>
            </div>
          </div>

          <!-- Bottleneck Warning Banner if any item has low/0 stock -->
          <div
            v-if="constrainingBundledItem && (constrainingBundledItem.quantityInStock ?? constrainingBundledItem.quantity ?? 0) <= 5"
            class="flex items-start gap-3 p-4 rounded-xl border"
            :class="(constrainingBundledItem.quantityInStock ?? constrainingBundledItem.quantity ?? 0) <= 0
              ? 'border-rose-200 bg-rose-50/50 text-rose-900'
              : 'border-amber-200 bg-amber-50/50 text-amber-900'"
          >
            <span class="material-symbols-outlined text-xl shrink-0 mt-0.5">
              {{ (constrainingBundledItem.quantityInStock ?? constrainingBundledItem.quantity ?? 0) <= 0 ? 'error' : 'warning' }}
            </span>
            <div class="text-xs space-y-1">
              <p class="font-bold">
                {{ (constrainingBundledItem.quantityInStock ?? constrainingBundledItem.quantity ?? 0) <= 0
                  ? 'Bundle Out of Stock: Component Depleted'
                  : 'Fulfillment Bottle-Neck Detected' }}
              </p>
              <p class="text-slate-600">
                <strong>{{ constrainingBundledItem.name }}</strong> only has
                <strong>{{ constrainingBundledItem.quantityInStock ?? constrainingBundledItem.quantity ?? 0 }} units</strong> remaining.
                Restocking this item will restore bundle availability.
              </p>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoadingBundled" class="py-12 text-center text-slate-400 space-y-3">
            <span class="material-symbols-outlined text-3xl animate-spin text-primary">progress_activity</span>
            <p class="text-xs font-medium">Loading bundled product information...</p>
          </div>

          <!-- Zero State -->
          <div
            v-else-if="!bundledProducts.length"
            class="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl space-y-2"
          >
            <span class="material-symbols-outlined text-4xl text-slate-300 block mx-auto">apps</span>
            <p class="text-sm font-bold text-slate-700">No Bundled Products Found</p>
            <p class="text-xs text-slate-400">This bundle doesn't currently reference any valid product IDs.</p>
          </div>

          <!-- Tier 3: Bundled Products Table -->
          <div v-else class="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th class="py-3 px-4">Component Product</th>
                    <th class="py-3 px-4">Type</th>
                    <th class="py-3 px-4">Individual Price</th>
                    <th class="py-3 px-4">Stock Available</th>
                    <th class="py-3 px-4 text-center">Fulfillment Status</th>
                    <th class="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="item in bundledProducts"
                    :key="item.id"
                    class="hover:bg-slate-50/70 transition-colors"
                  >
                    <!-- Product Info -->
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-3">
                        <img
                          :src="getBundledItemImage(item)"
                          :alt="item.name"
                          class="w-10 h-10 rounded-lg object-contain bg-slate-50 border border-slate-200 shrink-0"
                        >
                        <div class="min-w-0">
                          <NuxtLink
                            :to="`/dashboard/product/${item.id}`"
                            class="font-bold text-slate-900 hover:text-primary transition-colors truncate block"
                          >
                            {{ item.name }}
                          </NuxtLink>
                          <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span class="font-mono">SKU: {{ item.sku || '—' }}</span>
                            <span v-if="item.brand">· {{ item.brand }}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Product Type -->
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {{ item.productType || 'SIMPLE' }}
                      </span>
                    </td>

                    <!-- Price -->
                    <td class="py-3.5 px-4 font-bold text-slate-800 tabular-nums">
                      {{ formatToMoney(item.effectivePrice || item.price) }}
                    </td>

                    <!-- Stock -->
                    <td class="py-3.5 px-4">
                      <span
                        class="font-bold tabular-nums"
                        :class="(item.quantityInStock ?? item.quantity ?? 0) > 0 ? 'text-slate-900' : 'text-rose-600'"
                      >
                        {{ item.productType === 'DIGITAL' ? 'Unlimited' : `${item.quantityInStock ?? item.quantity ?? 0} units` }}
                      </span>
                      <span
                        v-if="constrainingBundledItem?.id === item.id && bundledProducts.length > 1"
                        class="block text-[10px] font-bold text-amber-600 mt-0.5"
                      >
                        Bottleneck item
                      </span>
                    </td>

                    <!-- Status -->
                    <td class="py-3.5 px-4 text-center">
                      <span
                        v-if="item.productType === 'DIGITAL'"
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700"
                      >
                        Digital Asset
                      </span>
                      <span
                        v-else-if="(item.quantityInStock ?? item.quantity ?? 0) <= 0"
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700"
                      >
                        Out of Stock
                      </span>
                      <span
                        v-else-if="(item.quantityInStock ?? item.quantity ?? 0) <= 5"
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700"
                      >
                        Low Stock
                      </span>
                      <span
                        v-else
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700"
                      >
                        In Stock
                      </span>
                    </td>

                    <!-- Actions -->
                    <td class="py-3.5 px-4 text-right">
                      <NuxtLink
                        :to="`/dashboard/product/${item.id}`"
                        class="h-7 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <span class="material-symbols-outlined text-sm text-primary">visibility</span>
                        <span>View Product</span>
                      </NuxtLink>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- Drawers (With explicit trigger buttons) & Modals -->
      <ProductVariantDetailDrawer
        v-model:open="showVariantDetailDrawer"
        :variant="selectedVariantDetail"
        :product-name="product.name"
        :unit-label="unitLabel"
      />

      <ProductFeaturesDrawer
        v-model:open="showFeaturesDrawer"
        :product="product"
        @success="refreshProduct"
      />

      <ProductSpecificationsDrawer
        v-model:open="showSpecsDrawer"
        :product="product"
        @success="refreshProduct"
      />

      <ProductVariantsDrawer
        v-model:open="showVariantsDrawer"
        :product="product"
        @success="refreshProduct"
      />

      <ProductGalleryModal
        v-model:open="showGalleryModal"
        :product="product"
        @success="refreshProduct"
      />

      <ProductArchiveConfirmModal
        :open="archiveModal.open"
        :product-name="product?.name"
        :is-archived="productIsArchived"
        :loading="archiveModal.loading"
        @cancel="closeArchiveModal"
        @confirm="confirmArchiveAction"
      />
    </div>

    <!-- Product Not Found State -->
    <div v-else class="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
      <span class="material-symbols-outlined text-5xl text-slate-300">inventory_2</span>
      <h3 class="text-lg font-bold text-slate-700">Product not found</h3>
      <p class="text-xs text-slate-400">The product you are looking for may have been deleted or does not exist.</p>
      <BaseButton variant="primary" @click="$router.push('/dashboard/product')">Return to Products</BaseButton>
    </div>
  </DashboardContainer>
</template>
