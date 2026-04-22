<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useProductStore } from '~/stores/products.store.js'
import { useProductTemplateStore } from '~/stores/productTemplate.store.js'
import { useCategoryStore } from '~/stores/category.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { useErrorStore } from '~/stores/error.store.js'
import { useApiService } from '~/services/apiService.js'
import { endpoints } from '~/utils/endpoints.js'
import { formatToMoney, logger } from '~/utils/helpers.js'
import TemplateAttributeField from './TemplateAttributeField.vue'

const props = defineProps({
  open: { type: Boolean, required: true },
  product: { type: Object, default: null }
})

const emit = defineEmits(['update:open', 'success'])

const STORAGE_KEY = 'shopsynch_product_form_v2'

const productStore = useProductStore()
const productTemplateStore = useProductTemplateStore()
const categoryStore = useCategoryStore()
const toastStore = useToastStore()
const errorStore = useErrorStore()
const { post } = useApiService()

const currentStep = ref(1)
const isSubmitting = ref(false)
const currentTemplate = ref(null)
const templateLoadingError = ref(null)
const noCategoryTemplate = ref(false)
const bundledIdInput = ref('')
const activeVariantGroupIndex = ref(0)

const PRODUCT_TYPES = [
  { value: 'SIMPLE',   label: 'Simple',   icon: 'inventory_2',  desc: 'Single price & stock' },
  { value: 'VARIABLE', label: 'Variable', icon: 'layers',       desc: 'Multiple variants (color, size…)' },
  { value: 'DIGITAL',  label: 'Digital',  icon: 'download',     desc: 'No physical stock' },
  { value: 'BUNDLE',   label: 'Bundle',   icon: 'apps',         desc: 'Package of other products' },
]

const steps = [
  { id: 1, title: 'Gallery' },
  { id: 2, title: 'Details' },
  { id: 3, title: 'Pricing & Variants' },
]

// ─── Form State ──────────────────────────────────────────────────────────────

const emptyImage = () => ({ fileId: null, url: null })

const form = reactive({
  name: '',
  description: '',
  summary: '',
  categoryId: '',
  productType: 'SIMPLE',
  price: 0,
  discount: 0,
  quantityInStock: 0,
  sku: '',
  bundledProductIds: [],
  attributes: {},
  variantGroups: [],
  features: [],
  specifications: [],
  images: [emptyImage(), emptyImage(), emptyImage(), emptyImage()],
  uploadingStates: [false, false, false, false],
  selectedPrimaryDimKey: '',
})

// ─── Computed ─────────────────────────────────────────────────────────────────

const categories = computed(() =>
  categoryStore.categories.map(c => ({ label: c.name, value: c.id }))
)

const isVariantAttribute = (attribute) =>
  attribute?.isVariantDimension === true || attribute?.variantDimension === true

// Template variant dimensions — these drive the variant group builder
const variantDimensions = computed(() => {
  if (!currentTemplate.value?.attributeDefinitions) return []
  return currentTemplate.value.attributeDefinitions
    .filter(isVariantAttribute)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
})

// Primary variant dimension — variable products must use a selected template attribute
const primaryVariantDim = computed(() => {
  if (!variantDimensions.value.length) return null
  if (form.productType === 'VARIABLE' && form.selectedPrimaryDimKey) {
    return variantDimensions.value.find(d => d.key === form.selectedPrimaryDimKey) ?? null
  }
  return form.productType === 'VARIABLE' ? null : variantDimensions.value[0]
})

// Secondary variant dimensions — all variant dims except the primary
const secondaryVariantDims = computed(() => {
  if (!primaryVariantDim.value) return variantDimensions.value
  return variantDimensions.value.filter(d => d.key !== primaryVariantDim.value.key)
})

// Effective primary axis key — always comes from template attributes
const effectivePrimaryKey = computed(() =>
  primaryVariantDim.value?.key || ''
)

// Effective secondary axis keys — always come from template attributes
const effectiveSecondaryKeys = computed(() =>
  secondaryVariantDims.value.map(d => d.key)
)

const usedSecondaryKeys = computed(() => {
  const used = new Set()
  form.variantGroups.forEach(group => {
    group.skus.forEach(sku => {
      Object.entries(sku.attributes || {}).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) used.add(key)
      })
    })
  })
  return [...used]
})

// Product-level template attributes (non-variant, non-hidden)
const productAttributeDefs = computed(() => {
  if (!currentTemplate.value?.attributeDefinitions) return []
  return currentTemplate.value.attributeDefinitions
    .filter(a => !isVariantAttribute(a) && a.displayAs !== 'HIDDEN')
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
})

// Group product-level attributes by section for rendering
const attributesBySection = computed(() => {
  const grouped = {}
  productAttributeDefs.value.forEach(attr => {
    const section = attr.section || ''
    if (!grouped[section]) grouped[section] = []
    grouped[section].push(attr)
  })
  return Object.entries(grouped).map(([name, attrs]) => ({ name, attrs }))
})

// Allowed product types from the loaded template (empty = all)
const allowedProductTypes = computed(() => {
  if (!currentTemplate.value?.productTypes?.length) return PRODUCT_TYPES
  return PRODUCT_TYPES.filter(t => currentTemplate.value.productTypes.includes(t.value))
})

// ─── Template Loading ─────────────────────────────────────────────────────────

async function loadTemplate(categoryId) {
  if (!categoryId) {
    currentTemplate.value = null
    form.attributes = {}
    templateLoadingError.value = null
    noCategoryTemplate.value = false
    return
  }
  try {
    templateLoadingError.value = null
    noCategoryTemplate.value = false
    const template = await productTemplateStore.getCachedTemplateByCategory(categoryId)
    currentTemplate.value = template
    noCategoryTemplate.value = !template
    form.selectedPrimaryDimKey = form.variantGroups[0]?.attributeName || ''
    if (template) {
      // Seed non-variant attribute keys, preserving existing values
      const seeded = {}
      template.attributeDefinitions
        .filter(a => !isVariantAttribute(a))
        .forEach(a => { seeded[a.key] = form.attributes[a.key] ?? '' })
      form.attributes = seeded

      // Constrain productType to what the template supports
      if (template.productTypes?.length && !template.productTypes.includes(form.productType)) {
        form.productType = template.productTypes[0]
      }
    }
  } catch (e) {
    logger.error('Failed to load template', e)
    templateLoadingError.value = 'Could not load category attributes'
    currentTemplate.value = null
  }
}

watch(() => form.categoryId, (id) => loadTemplate(id))

// When switching product type, reset primary dim selection; seed first group for VARIABLE
watch(() => form.productType, (type) => {
  form.selectedPrimaryDimKey = ''
  if (type !== 'VARIABLE') {
    form.variantGroups = []
    activeVariantGroupIndex.value = 0
  }
})

// Sync attributeName on all existing groups when user picks a different primary dim
watch(() => form.selectedPrimaryDimKey, (newKey) => {
  if (newKey) {
    form.variantGroups.forEach(g => {
      g.attributeName = newKey
      g.skus.forEach(syncSkuAttributeKeys)
    })
  }
})

// ─── Image Uploads ─────────────────────────────────────────────────────────────

async function handleFileUpload(event, index) {
  const file = event.target.files[0]
  if (!file) return
  form.uploadingStates[index] = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await post(endpoints.files.uploadSingle, fd)
    if (res?.data) {
      form.images[index] = { fileId: res.data.id, url: res.data.url }
    }
  } catch (e) {
    logger.error('Image upload failed', e)
  } finally {
    form.uploadingStates[index] = false
  }
}

async function handleVariantImageUpload(event, groupIndex) {
  const file = event.target.files[0]
  if (!file) return
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await post(endpoints.files.uploadSingle, fd)
    if (res?.data) {
      form.variantGroups[groupIndex].image = { fileId: res.data.id, url: res.data.url }
    }
  } catch (e) {
    logger.error('Variant image upload failed', e)
  }
}

// ─── Variant Groups ────────────────────────────────────────────────────────────

function makeEmptySku() {
  const attrs = {}
  effectiveSecondaryKeys.value.forEach(k => { attrs[k] = '' })
  return { price: 0, quantityInStock: 0, discount: 0, sku: '', attributes: attrs }
}

function syncSkuAttributeKeys(sku) {
  const attrs = {}
  effectiveSecondaryKeys.value.forEach(k => { attrs[k] = sku.attributes?.[k] ?? '' })
  sku.attributes = attrs
}

function addVariantGroup() {
  if (!effectivePrimaryKey.value) {
    toastStore.error('Select a variation attribute before adding groups')
    return
  }

  form.variantGroups.push({
    attributeName: effectivePrimaryKey.value,
    attributeValue: '',
    image: null,
    colorId: '',
    skus: [makeEmptySku()],
  })
  activeVariantGroupIndex.value = form.variantGroups.length - 1
}

function removeVariantGroup(i) {
  form.variantGroups.splice(i, 1)
  if (form.variantGroups.length === 0) {
    activeVariantGroupIndex.value = 0
    return
  }
  activeVariantGroupIndex.value = Math.min(activeVariantGroupIndex.value, form.variantGroups.length - 1)
}

function isOptionSelected(optionValue) {
  return form.variantGroups.some(g => g.attributeValue === optionValue)
}

function toggleVariantOption(optionValue) {
  if (!effectivePrimaryKey.value) {
    toastStore.error('Select a variation attribute before adding variants')
    return
  }

  const idx = form.variantGroups.findIndex(g => g.attributeValue === optionValue)
  if (idx >= 0) {
    form.variantGroups.splice(idx, 1)
    if (form.variantGroups.length === 0) {
      activeVariantGroupIndex.value = 0
    } else {
      activeVariantGroupIndex.value = Math.min(activeVariantGroupIndex.value, form.variantGroups.length - 1)
    }
  } else {
    form.variantGroups.push({
      attributeName: effectivePrimaryKey.value,
      attributeValue: optionValue,
      image: null,
      colorId: '',
      skus: [makeEmptySku()],
    })
    activeVariantGroupIndex.value = form.variantGroups.length - 1
  }
}

function setActiveVariantGroup(index) {
  activeVariantGroupIndex.value = index
}

function addSku(groupIndex) { form.variantGroups[groupIndex].skus.push(makeEmptySku()) }
function removeSku(groupIndex, skuIndex) { form.variantGroups[groupIndex].skus.splice(skuIndex, 1) }

// ─── Features & Specs ──────────────────────────────────────────────────────────

const addFeature = () => form.features.push('')
const removeFeature = (i) => form.features.splice(i, 1)
const addSpecification = () => form.specifications.push({ key: '', value: '' })
const removeSpecification = (i) => form.specifications.splice(i, 1)

// ─── Bundle ────────────────────────────────────────────────────────────────────

function addBundledId() {
  const id = bundledIdInput.value.trim()
  if (id && !form.bundledProductIds.includes(id)) {
    form.bundledProductIds.push(id)
  }
  bundledIdInput.value = ''
}
function removeBundledId(i) { form.bundledProductIds.splice(i, 1) }

// ─── Payload Builder ───────────────────────────────────────────────────────────

function preparePayload(rawForm, publishStatus) {
  const clean = (obj) => {
    if (Array.isArray(obj)) {
      const arr = obj
        .map(v => v && typeof v === 'object' ? clean(v) : v)
        .filter(v =>
          v !== null && v !== undefined && v !== '' &&
          !(Array.isArray(v) && v.length === 0) &&
          !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)
        )
      return arr.length > 0 ? arr : undefined
    }
    const out = {}
    Object.keys(obj).forEach(k => {
      let v = obj[k]
      if (v && typeof v === 'object') v = clean(v)
      if (
        v !== null && v !== undefined && v !== '' &&
        !(Array.isArray(v) && v.length === 0) &&
        !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)
      ) out[k] = v
    })
    return out
  }

  const type = rawForm.productType || 'SIMPLE'
  const validImages = rawForm.images.filter(img => img?.fileId)

  const payload = {
    name: rawForm.name,
    description: rawForm.description || rawForm.summary,
    summary: rawForm.summary || undefined,
    image: validImages[0]?.fileId,
    thumbnail: validImages[0]?.fileId,
    imageList: validImages.length > 1 ? validImages.map(img => img.fileId) : undefined,
    features: rawForm.features.filter(f => f?.trim()),
    specifications: rawForm.specifications.filter(s => s.key && s.value),
    productType: type,
    categoryId: rawForm.categoryId,
    isArchived: publishStatus === 'DRAFT',
    attributes: Object.keys(rawForm.attributes || {}).some(k => rawForm.attributes[k])
      ? Object.fromEntries(Object.entries(rawForm.attributes).filter(([, v]) => v !== '' && v != null))
      : undefined,
  }

  if (type === 'SIMPLE') {
    payload.price = rawForm.price
    payload.discount = rawForm.discount || undefined
    payload.quantityInStock = rawForm.quantityInStock
    payload.sku = rawForm.sku || undefined
  } else if (type === 'DIGITAL') {
    payload.price = rawForm.price
    payload.discount = rawForm.discount || undefined
  } else if (type === 'BUNDLE') {
    payload.price = rawForm.price
    payload.bundledProductIds = rawForm.bundledProductIds
  } else if (type === 'VARIABLE') {
    payload.variantGroups = rawForm.variantGroups.map(vg => {
      const group = {
        attributeName: vg.attributeName,
        attributeValue: vg.attributeValue,
        skus: vg.skus.map(s => {
          const attrs = Object.fromEntries(
            Object.entries(s.attributes || {}).filter(([, v]) => v !== '' && v != null)
          )
          return {
            price: s.price,
            quantityInStock: s.quantityInStock,
            discount: s.discount || undefined,
            sku: s.sku || undefined,
            attributes: Object.keys(attrs).length > 0 ? attrs : undefined,
          }
        })
      }
      if (vg.image?.fileId) group.image = vg.image.fileId
      if (vg.colorId) group.colorId = vg.colorId
      return group
    })
  }

  return clean(payload)
}

// ─── Submit ────────────────────────────────────────────────────────────────────

function validateVariableProduct() {
  if (form.productType !== 'VARIABLE') return true

  if (!variantDimensions.value.length) {
    toastStore.error('This category has no attributes configured for variations')
    currentStep.value = 2
    return false
  }

  if (!primaryVariantDim.value) {
    toastStore.error('Select the attribute that defines the variant groups')
    currentStep.value = 2
    return false
  }

  if (!form.variantGroups.length) {
    toastStore.error(`Add at least one ${primaryVariantDim.value.label || primaryVariantDim.value.key} variant`)
    currentStep.value = 3
    return false
  }

  const requiredSecondaryKeys = usedSecondaryKeys.value
  const seenCombinations = new Set()

  for (const group of form.variantGroups) {
    if (group.attributeName !== primaryVariantDim.value.key || !group.attributeValue) {
      toastStore.error(`Every variant group must have a ${primaryVariantDim.value.label || primaryVariantDim.value.key} value`)
      currentStep.value = 3
      return false
    }

    if (!group.skus?.length) {
      toastStore.error(`${group.attributeValue} must have at least one SKU`)
      currentStep.value = 3
      return false
    }

    for (const sku of group.skus) {
      const missingKey = requiredSecondaryKeys.find(key => {
        const value = sku.attributes?.[key]
        return value === '' || value === null || value === undefined
      })

      if (missingKey) {
        const dim = secondaryVariantDims.value.find(d => d.key === missingKey)
        toastStore.error(`${group.attributeValue} is missing ${dim?.label || missingKey} on one SKU`)
        currentStep.value = 3
        return false
      }

      const comboKey = [
        group.attributeName,
        group.attributeValue,
        ...requiredSecondaryKeys.map(key => `${key}:${sku.attributes?.[key]}`)
      ].join('|')

      if (seenCombinations.has(comboKey)) {
        toastStore.error(`Duplicate variant combination found for ${group.attributeValue}`)
        currentStep.value = 3
        return false
      }

      seenCombinations.add(comboKey)
    }
  }

  return true
}

async function submit(publishStatus = 'PUBLISHED') {
  if (isSubmitting.value) return
  if (!validateVariableProduct()) return

  isSubmitting.value = true
  try {
    const payload = preparePayload(form, publishStatus)
    logger.log('V2 Product Payload:', payload)

    let response
    if (props.product?.id) {
      response = await productStore.updateProduct(props.product.id, payload)
    } else {
      response = await productStore.createProduct(payload)
    }

    if (response?.status) {
      localStorage.removeItem(STORAGE_KEY)
      resetForm()
      toastStore.success(`Product ${publishStatus === 'DRAFT' ? 'saved as draft' : 'published'} successfully`)
      emit('success')
      emit('update:open', false)
    }
  } catch (e) {
    logger.error('Product submission failed', e)
  } finally {
    isSubmitting.value = false
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

function resetForm() {
  form.name = ''
  form.description = ''
  form.summary = ''
  form.categoryId = ''
  form.productType = 'SIMPLE'
  form.price = 0
  form.discount = 0
  form.quantityInStock = 0
  form.sku = ''
  form.bundledProductIds = []
  form.attributes = {}
  form.variantGroups = []
  form.features = []
  form.specifications = []
  form.images = [emptyImage(), emptyImage(), emptyImage(), emptyImage()]
  form.uploadingStates = [false, false, false, false]
  form.selectedPrimaryDimKey = ''
  currentTemplate.value = null
  templateLoadingError.value = null
  noCategoryTemplate.value = false
  currentStep.value = 1
  activeVariantGroupIndex.value = 0
}

onMounted(async () => {
  await categoryStore.getCategories()
})

// Re-initialize the form every time the drawer opens so edit mode always
// reflects the current product (not a stale localStorage draft).
watch(() => props.open, async (open) => {
  if (!open) return

  if (props.product) {
    const p = props.product
    form.name = p.name || ''
    form.description = p.description || ''
    form.summary = p.summary || ''
    form.categoryId = p.categoryId || ''
    form.productType = p.productType || 'SIMPLE'
    form.price = p.price || 0
    form.discount = p.discount || 0
    form.quantityInStock = p.quantityInStock || 0
    form.sku = p.sku || ''
    form.attributes = p.attributes || {}
    form.features = p.features || []
    form.specifications = p.specifications || []
    form.bundledProductIds = p.bundledProductIds || []
    form.images = Array.from({ length: 4 }, (_, i) => ({
      fileId: p.imageFileIds?.[i] || null,
      url: p.images?.[i] || null,
    }))
    form.variantGroups = (p.variantGroups || []).map(vg => ({
      attributeName: vg.attributeName,
      attributeValue: vg.attributeValue,
      image: vg.imageFileId ? { fileId: vg.imageFileId, url: vg.image } : null,
      colorId: vg.colorMeta?.id || '',
      skus: (vg.skus || []).map(s => ({
        price: s.price,
        quantityInStock: s.quantityInStock,
        discount: s.discount || 0,
        sku: s.sku || '',
        attributes: s.attributes || {},
      }))
    }))
    // Derive manual dims and selected primary dim from existing variant data
    if (form.variantGroups.length > 0) {
      const existingPrimaryKey = form.variantGroups[0].attributeName || ''
      form.selectedPrimaryDimKey = existingPrimaryKey
      activeVariantGroupIndex.value = 0
    } else {
      form.selectedPrimaryDimKey = ''
      activeVariantGroupIndex.value = 0
    }
    currentStep.value = 1
  } else {
    resetForm()
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) Object.assign(form, JSON.parse(saved))
    } catch (e) {
      logger.error('Failed to restore draft', e)
    }
  }
})

// Persist draft for new products
watch(form, (val) => {
  if (!props.product) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...val,
      uploadingStates: [false, false, false, false],
    }))
  }
}, { deep: true })

const nextStep = () => { if (currentStep.value < steps.length) currentStep.value++ }
const prevStep = () => { if (currentStep.value > 1) currentStep.value-- }
const close = () => emit('update:open', false)
</script>

<template>
  <Drawer :open="open" @update:open="$emit('update:open', $event)" content-class="bg-white p-0 w-full">
    <div class="flex flex-col h-full bg-white">

      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 class="text-2xl font-bold text-black">{{ product ? 'Edit Product' : 'Add Product' }}</h2>
        <button @click="close" class="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Step Progress -->
      <div class="px-10 py-5 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <div
            v-for="step in steps"
            :key="step.id"
            class="flex items-center gap-2 flex-1"
          >
            <div class="flex items-center gap-2 shrink-0">
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors"
                :class="currentStep >= step.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'"
              >
                <span v-if="currentStep > step.id" class="material-symbols-outlined text-sm">check</span>
                <span v-else>{{ step.id }}</span>
              </div>
              <span
                class="text-xs font-bold hidden sm:block transition-colors"
                :class="currentStep >= step.id ? 'text-black' : 'text-slate-400'"
              >{{ step.title }}</span>
            </div>
            <div v-if="step.id < steps.length" class="flex-1 h-px bg-slate-100 mx-1">
              <div class="h-full bg-primary transition-all duration-500" :class="currentStep > step.id ? 'w-full' : 'w-0'" />
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-10 pb-10">

        <!-- ── STEP 1: Gallery ─────────────────────────────────────────────── -->
        <div v-if="currentStep === 1" class="space-y-6 pt-6">
          <p class="text-sm text-slate-500">Upload up to 4 product images. The first image becomes the main thumbnail.</p>

          <div class="grid grid-cols-2 gap-4">
            <label
              v-for="(_, index) in 4"
              :key="index"
              class="aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative group cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
              :class="[
                form.images[index]?.url ? 'border-primary' : 'border-slate-200',
                form.uploadingStates[index] ? 'pointer-events-none' : ''
              ]"
            >
              <!-- Uploading -->
              <div v-if="form.uploadingStates[index]" class="absolute inset-0 z-20 bg-white/80 flex flex-col items-center justify-center gap-2 rounded-2xl">
                <Spinner width="40px" height="40px" />
                <p class="text-[10px] font-bold text-primary uppercase tracking-widest">Uploading...</p>
              </div>

              <!-- Has image -->
              <template v-if="form.images[index]?.url">
                <img :src="form.images[index].url" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span class="text-white text-xs font-bold">Change</span>
                </div>
              </template>

              <!-- Empty slot -->
              <template v-else>
                <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                  <span class="material-symbols-outlined text-primary text-3xl">image</span>
                </div>
                <p class="text-xs font-bold text-black">{{ index === 0 ? 'Main image' : 'Extra image' }}</p>
                <p class="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">PNG / JPG</p>
              </template>

              <input type="file" class="opacity-0 absolute inset-0 w-full h-full cursor-pointer" accept="image/*" @change="handleFileUpload($event, index)" />
            </label>
          </div>
        </div>

        <!-- ── STEP 2: Details ─────────────────────────────────────────────── -->
        <div v-if="currentStep === 2" class="space-y-6 pt-6">

          <AppInput v-model="form.name" name="name" label="Product Name" placeholder="Enter product name" :error="errorStore.validationErrors?.name" />

          <div class="space-y-1">
            <label class="text-sm font-medium text-gray-700">Description</label>
            <BaseTextArea v-model="form.description" placeholder="Describe the product in detail (min 5 characters)" :error="errorStore.validationErrors?.description" />
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium text-gray-700">Summary <span class="text-slate-400 font-normal">(optional)</span></label>
            <BaseTextArea v-model="form.summary" placeholder="Short summary shown in listings" :error="errorStore.validationErrors?.summary" />
          </div>

          <div class="space-y-2">
            <SearchableSelectInput
              v-model="form.categoryId"
              label="Category"
              :options="categories"
              placeholder="Select a category"
              :error="errorStore.validationErrors?.categoryId"
            />

            <!-- No template for selected category -->
            <div v-if="noCategoryTemplate" class="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <span class="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">info</span>
              <p class="text-xs text-amber-700">
                This category doesn't have any extra fields set up yet. You can still add your product — just fill in the information below.
              </p>
            </div>

            <!-- Template loading error -->
            <p v-if="templateLoadingError" class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {{ templateLoadingError }}
            </p>
          </div>

          <!-- Product Type Selector -->
          <div class="space-y-3">
            <label class="text-sm font-semibold text-gray-900">Product Type</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="type in allowedProductTypes"
                :key="type.value"
                type="button"
                @click="form.productType = type.value"
                class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                :class="form.productType === type.value
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 bg-white hover:border-slate-300'"
              >
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  :class="form.productType === type.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'"
                >
                  <span class="material-symbols-outlined text-base">{{ type.icon }}</span>
                </div>
                <div>
                  <p class="text-sm font-bold" :class="form.productType === type.value ? 'text-primary' : 'text-black'">{{ type.label }}</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">{{ type.desc }}</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Template non-variant attributes (grouped by section) -->
          <div v-if="productAttributeDefs.length > 0" class="space-y-6 pt-4 border-t border-slate-100">
            <p class="text-sm font-semibold text-gray-900">Category Attributes</p>

            <div v-for="section in attributesBySection" :key="section.name" class="space-y-4">
              <div v-if="section.name" class="flex items-center gap-3">
                <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest">{{ section.name }}</h4>
                <div class="flex-1 h-px bg-slate-100" />
              </div>
              <div class="grid gap-4" :class="section.attrs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
                <TemplateAttributeField
                  v-for="attr in section.attrs"
                  :key="attr.key"
                  :attribute="attr"
                  :model-value="form.attributes[attr.key]"
                  :error="errorStore.validationErrors?.[attr.key]"
                  @update:model-value="form.attributes[attr.key] = $event"
                />
              </div>
            </div>
          </div>

          <!-- Primary variant dim selector (shown when VARIABLE and template has variant dims) -->
          <div
            v-if="form.productType === 'VARIABLE' && variantDimensions.length > 0"
            class="space-y-3 p-4 bg-blue-50 border border-blue-100 rounded-xl"
          >
            <div>
              <p class="text-sm font-semibold text-blue-900">Choose the Price-Determining Attribute</p>
              <p class="text-xs text-blue-700 mt-0.5">
                Pick the attribute used for variant groups. Other variant attributes can be filled on SKUs when needed.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="dim in variantDimensions"
                :key="dim.key"
                type="button"
                @click="form.selectedPrimaryDimKey = dim.key"
                class="px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all"
                :class="form.selectedPrimaryDimKey === dim.key
                  ? 'border-blue-500 bg-blue-100 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'"
              >
                {{ dim.label || dim.key }}
              </button>
            </div>
            <p v-if="!form.selectedPrimaryDimKey" class="text-xs text-amber-600">
              Please select an attribute above before building variant groups.
            </p>
          </div>
        </div>

        <!-- ── STEP 3: Pricing, Variants, Features & Specs ───────────────────── -->
        <div v-if="currentStep === 3" class="space-y-8 pt-6">

          <!-- SIMPLE ── Price / Stock / SKU -->
          <div v-if="form.productType === 'SIMPLE'" class="space-y-4">
            <p class="text-sm font-semibold text-gray-900">Pricing & Stock</p>
            <div class="grid grid-cols-2 gap-4">
              <AppInput v-model="form.price" type="number" name="price" label="Price (₦)" placeholder="0" :error="errorStore.validationErrors?.price" />
              <AppInput v-model="form.discount" type="number" name="discount" label="Discount %" placeholder="0" :error="errorStore.validationErrors?.discount" />
              <AppInput v-model="form.quantityInStock" type="number" name="quantityInStock" label="Quantity in Stock" placeholder="0" :error="errorStore.validationErrors?.quantityInStock" />
              <AppInput v-model="form.sku" name="sku" label="SKU" placeholder="e.g. SPK-001" :error="errorStore.validationErrors?.sku" />
            </div>
          </div>

          <!-- DIGITAL ── Price only -->
          <div v-else-if="form.productType === 'DIGITAL'" class="space-y-4">
            <p class="text-sm font-semibold text-gray-900">Pricing</p>
            <div class="grid grid-cols-2 gap-4">
              <AppInput v-model="form.price" type="number" name="price" label="Price (₦)" placeholder="0" :error="errorStore.validationErrors?.price" />
              <AppInput v-model="form.discount" type="number" name="discount" label="Discount %" placeholder="0" :error="errorStore.validationErrors?.discount" />
            </div>
          </div>

          <!-- BUNDLE ── Price + bundled product IDs -->
          <div v-else-if="form.productType === 'BUNDLE'" class="space-y-4">
            <p class="text-sm font-semibold text-gray-900">Bundle Pricing</p>
            <AppInput v-model="form.price" type="number" name="price" label="Bundle Price (₦)" placeholder="0" :error="errorStore.validationErrors?.price" />

            <div class="space-y-3">
              <p class="text-sm font-semibold text-gray-900">Bundled Products <span class="text-slate-400 font-normal">(min 2)</span></p>
              <div class="flex gap-2">
                <div class="flex-1">
                  <AppInput v-model="bundledIdInput" name="bundledId" placeholder="Paste a product ID and press Add" @keydown.enter.prevent="addBundledId" />
                </div>
                <button type="button" @click="addBundledId" class="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shrink-0">
                  Add
                </button>
              </div>
              <div v-if="form.bundledProductIds.length > 0" class="flex flex-wrap gap-2">
                <div
                  v-for="(id, i) in form.bundledProductIds"
                  :key="i"
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono text-slate-700"
                >
                  {{ id }}
                  <button type="button" @click="removeBundledId(i)" class="text-slate-400 hover:text-rose-500 transition-colors ml-1">
                    <span class="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              </div>
              <p v-else class="text-xs text-slate-400 italic">No products added yet.</p>
            </div>
          </div>

          <!-- VARIABLE ── Variant Groups Builder -->
          <div v-else-if="form.productType === 'VARIABLE'" class="space-y-5">

            <!-- No free-form axes: variation axes must be configured as template attributes -->
            <div v-if="variantDimensions.length === 0" class="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
              <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Variation Attributes Required</p>
              <p class="text-sm text-slate-600">
                This category has no attributes marked for variations. Add attributes like Color, Size, or Storage to the category template and mark them as variant dimensions before creating a variable product.
              </p>
            </div>

            <!-- Option-based: chip picker when primary dim has predefined options -->
            <template v-if="primaryVariantDim?.options?.length">
              <div>
                <p class="text-sm font-semibold text-gray-900">
                  Select {{ primaryVariantDim.label || primaryVariantDim.key }} variants to offer
                </p>
                <p class="text-xs text-slate-400 mt-0.5">
                  Tap each option you want to sell. Each creates a variant group where you set price and stock.
                  <template v-if="secondaryVariantDims.length > 0">
                    SKUs inside each group carry the
                    <strong>{{ secondaryVariantDims.map(d => d.label || d.key).join(', ') }}</strong>
                    sub-options.
                  </template>
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in primaryVariantDim.options"
                  :key="opt"
                  type="button"
                  @click="toggleVariantOption(opt)"
                  class="px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all"
                  :class="isOptionSelected(opt)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'"
                >
                  {{ opt }}
                </button>
              </div>
              <p v-if="form.variantGroups.length === 0" class="text-xs text-slate-400 italic">
                No variants selected yet. Tap options above to add them.
              </p>
            </template>

            <!-- Free-value groups when the selected variation attribute has no predefined options -->
            <template v-else-if="primaryVariantDim">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-gray-900">Variant Groups</p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Each group is a value for
                    <strong>{{ primaryVariantDim?.label || primaryVariantDim?.key || 'variant' }}</strong>
                    . Add SKUs inside each group for sub-options
                    <template v-if="secondaryVariantDims.length > 0">({{ secondaryVariantDims.map(d => d.label || d.key).join(', ') }})</template>.
                  </p>
                </div>
                <button
                  type="button"
                  @click="addVariantGroup"
                  class="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shrink-0"
                >
                  <span class="material-symbols-outlined text-base">add</span>
                  Add Group
                </button>
              </div>
              <div v-if="form.variantGroups.length === 0" class="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                <span class="material-symbols-outlined text-slate-300 text-5xl">layers</span>
                <p class="text-sm text-slate-400 mt-2">No variant groups yet. Add values for {{ primaryVariantDim.label || primaryVariantDim.key }} to start.</p>
              </div>
            </template>

            <div v-else-if="variantDimensions.length > 0" class="p-4 border border-amber-200 bg-amber-50 rounded-xl">
              <p class="text-sm text-amber-700">Select the variation attribute in the Details step before building variant groups.</p>
            </div>

            <!-- Variant Group Cards -->
            <div v-for="(group, gi) in form.variantGroups" :key="gi" class="border border-slate-200 rounded-2xl overflow-hidden">

              <!-- Group Header -->
              <div
                role="button"
                tabindex="0"
                class="w-full flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100 text-left cursor-pointer"
                @click="setActiveVariantGroup(gi)"
                @keydown.enter.prevent="setActiveVariantGroup(gi)"
                @keydown.space.prevent="setActiveVariantGroup(gi)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="material-symbols-outlined text-base text-slate-400 transition-transform"
                    :class="activeVariantGroupIndex === gi ? 'rotate-90' : ''"
                  >
                    chevron_right
                  </span>
                  <p class="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {{ primaryVariantDim?.label || primaryVariantDim?.key || group.attributeName || 'Variant' }}
                  </p>
                  <span class="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded">{{ group.attributeValue || `Group ${gi + 1}` }}</span>
                  <span class="text-[10px] font-bold text-slate-400">
                    {{ group.skus.length }} SKU{{ group.skus.length === 1 ? '' : 's' }}
                  </span>
                </div>
                <button
                  type="button"
                  @click.stop="primaryVariantDim?.options?.length ? toggleVariantOption(group.attributeValue) : removeVariantGroup(gi)"
                  class="text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <span class="material-symbols-outlined text-lg">{{ primaryVariantDim?.options?.length ? 'close' : 'delete' }}</span>
                </button>
              </div>

              <div v-if="activeVariantGroupIndex === gi" class="p-5 space-y-5">
                <!-- Group identity row: image always; value input only in free-text mode -->
                <div class="flex gap-4 items-start">

                  <!-- Variant image -->
                  <div class="shrink-0 space-y-1">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image</p>
                    <label class="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden relative group">
                      <img v-if="group.image?.url" :src="group.image.url" class="w-full h-full object-cover" />
                      <template v-else>
                        <span class="material-symbols-outlined text-slate-300 text-2xl">add_a_photo</span>
                      </template>
                      <div v-if="group.image?.url" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-base">edit</span>
                      </div>
                      <input type="file" class="hidden" accept="image/*" @change="handleVariantImageUpload($event, gi)" />
                    </label>
                  </div>

                  <!-- Attribute value input (free-text mode only — option-based value is fixed from chip selection) -->
                  <div v-if="!primaryVariantDim?.options?.length" class="flex-1 space-y-1">
                    <label class="text-sm font-medium text-gray-700">
                      {{ primaryVariantDim?.label || primaryVariantDim?.key || group.attributeName || 'Variant' }} Value
                    </label>
                    <input
                      v-model="group.attributeValue"
                      :name="`group-${gi}-value`"
                      :placeholder="primaryVariantDim?.placeholder || `Enter ${primaryVariantDim?.label || primaryVariantDim?.key || 'value'}`"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                  </div>
                </div>

                <!-- SKUs -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKUs</p>
                    <button type="button" @click="addSku(gi)" class="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1">
                      <span class="material-symbols-outlined text-sm">add</span> Add SKU
                    </button>
                  </div>

                  <div
                    v-for="(sku, si) in group.skus"
                    :key="si"
                    class="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 relative group/sku"
                  >
                    <button
                      v-if="group.skus.length > 1"
                      type="button"
                      @click="removeSku(gi, si)"
                      class="absolute -right-2 -top-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/sku:opacity-100 transition-opacity shadow-sm"
                    >
                      <span class="material-symbols-outlined text-[10px]">close</span>
                    </button>

                    <!-- Core SKU fields -->
                    <div class="grid grid-cols-2 gap-3">
                      <AppInput v-model="sku.price" type="number" :name="`g${gi}-s${si}-price`" label="Price (₦)" placeholder="0" />
                      <AppInput v-model="sku.quantityInStock" type="number" :name="`g${gi}-s${si}-qty`" label="Stock" placeholder="0" />
                      <AppInput v-model="sku.discount" type="number" :name="`g${gi}-s${si}-disc`" label="Discount %" placeholder="0" />
                      <AppInput v-model="sku.sku" :name="`g${gi}-s${si}-sku`" label="SKU Code" placeholder="e.g. RED-128GB" />
                    </div>

	                    <!-- Secondary variant dimension attributes (e.g. Storage, RAM) -->
	                    <div v-if="effectiveSecondaryKeys.length > 0" class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                        <TemplateAttributeField
                          v-for="dim in secondaryVariantDims"
                          :key="dim.key"
                          :attribute="dim"
                          :model-value="sku.attributes[dim.key]"
                          @update:model-value="sku.attributes[dim.key] = $event"
                        />
	                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Features ──────────────────────────────────────────────────── -->
          <div class="space-y-4 pt-4 border-t border-slate-100">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-gray-900">Key Features</p>
              <button type="button" @click="addFeature" class="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                <span class="material-symbols-outlined text-sm">add</span> Add Feature
              </button>
            </div>
            <div class="space-y-2">
              <div v-for="(_, i) in form.features" :key="i" class="flex gap-2 items-center">
                <div class="flex-1">
                  <AppInput v-model="form.features[i]" :name="`feature-${i}`" placeholder="e.g. Bluetooth 5.0, Waterproof IPX5" />
                </div>
                <button type="button" @click="removeFeature(i)" class="p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-full">
                  <span class="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
              <p v-if="form.features.length === 0" class="text-xs text-slate-400 italic">No features added yet.</p>
            </div>
          </div>

          <!-- ── Specifications ─────────────────────────────────────────────── -->
          <div class="space-y-4 pt-4 border-t border-slate-100 hidden">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-gray-900">Specifications</p>
              <button type="button" @click="addSpecification" class="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                <span class="material-symbols-outlined text-sm">add</span> Add Spec
              </button>
            </div>
            <div class="space-y-3">
              <div v-for="(spec, i) in form.specifications" :key="i" class="flex gap-3 items-start bg-slate-50 p-3 rounded-xl relative group">
                <div class="grid grid-cols-2 gap-3 flex-1">
                  <AppInput v-model="spec.key" :name="`spec-key-${i}`" placeholder="Label (e.g. Display)" label="Key" />
                  <AppInput v-model="spec.value" :name="`spec-val-${i}`" placeholder="Value (e.g. 15.6 inches)" label="Value" />
                </div>
                <button
                  type="button"
                  @click="removeSpecification(i)"
                  class="absolute -right-2 -top-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <span class="material-symbols-outlined text-[10px]">close</span>
                </button>
              </div>
              <p v-if="form.specifications.length === 0" class="text-xs text-slate-400 italic">No specifications added yet.</p>
            </div>
          </div>

          <!-- ── Review Summary ─────────────────────────────────────────────── -->
          <div class="pt-6 border-t border-slate-100 space-y-4">
            <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Review</p>
            <div class="flex gap-4 items-start p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <img
                :src="form.images[0]?.url || '/placeholder-img.png'"
                class="w-20 h-20 object-cover rounded-xl border border-slate-100 shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="font-black text-black text-base truncate">{{ form.name || 'Untitled Product' }}</p>
                <p class="text-xs text-slate-400 mt-1 line-clamp-2">{{ form.summary || form.description || 'No description' }}</p>
                <div class="flex items-center gap-4 mt-3 flex-wrap">
                  <span class="text-xs font-bold text-slate-500">
                    <span class="text-[10px] uppercase tracking-widest">Type</span>
                    <span class="ml-1 px-2 py-0.5 bg-primary/10 text-primary rounded font-black">{{ form.productType }}</span>
                  </span>
                  <span v-if="form.price > 0" class="text-sm font-black text-primary">{{ formatToMoney(form.price) }}</span>
                  <span v-if="form.productType === 'VARIABLE'" class="text-xs text-slate-500">
                    {{ form.variantGroups.length }} group{{ form.variantGroups.length !== 1 ? 's' : '' }}
                  </span>
                  <span v-if="form.categoryId" class="text-xs text-slate-500">
                    {{ categories.find(c => c.value === form.categoryId)?.label }}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-gray-100 bg-slate-50/50 flex gap-3 justify-end">
        <BaseButton v-if="currentStep > 1" variant="outline" @click="prevStep" class="min-w-[120px]">
          Previous
        </BaseButton>

        <BaseButton v-if="currentStep < steps.length" @click="nextStep" class="min-w-[120px]">
          Next
        </BaseButton>

        <template v-else>
          <BaseButton variant="outline" :disabled="isSubmitting" @click="submit('DRAFT')" class="min-w-[130px]">
            Save as Draft
          </BaseButton>
          <BaseButton :disabled="isSubmitting" @click="submit('PUBLISHED')" class="min-w-[130px]">
            <Spinner v-if="isSubmitting" width="16px" height="16px" class="mr-2" />
            Publish
          </BaseButton>
        </template>
      </div>

    </div>
  </Drawer>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar { width: 4px; }
.overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 99px; }
</style>
