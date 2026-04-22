<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useApiService } from '~/services/apiService.js'
import { useToastStore } from '~/stores/toast.store.js'
import { useProductTemplateStore } from '~/stores/productTemplate.store.js'
import { endpoints } from '~/utils/endpoints.js'
import { logger } from '~/utils/helpers.js'
import TemplateAttributeField from './TemplateAttributeField.vue'

const props = defineProps({
  open: { type: Boolean, required: true },
  product: { type: Object, required: true }
})

const emit = defineEmits(['update:open', 'success'])

const { post } = useApiService()
const toastStore = useToastStore()
const productTemplateStore = useProductTemplateStore()

const isSubmitting = ref(false)
const template = ref(null)

const isVariantAttribute = (attribute) =>
  attribute?.isVariantDimension === true || attribute?.variantDimension === true

const variantDimensions = computed(() => {
  if (!template.value?.attributeDefinitions) return []
  return template.value.attributeDefinitions
    .filter(isVariantAttribute)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
})

// Derived from template
const primaryDim = computed(() => {
  if (!variantDimensions.value.length) return null

  const existingPrimaryKey = props.product.variantGroups?.[0]?.attributeName
  return variantDimensions.value.find(a => a.key === existingPrimaryKey)
    || variantDimensions.value[0]
})

const secondaryDims = computed(() => {
  if (!primaryDim.value) return []
  return variantDimensions.value.filter(a => a.key !== primaryDim.value.key)
})

const attributeName = computed(() => primaryDim.value?.key || '')
const attributeLabel = computed(() => primaryDim.value?.label || 'Variant Name')
const primaryOptions = computed(() => primaryDim.value?.options || [])
const selectedOptionValues = computed(() =>
  new Set((props.product.variantGroups || []).map(group => group.attributeValue))
)

const usedSecondaryKeys = computed(() => {
  const used = new Set()
  const groups = [...(props.product.variantGroups || []), group]
  groups.forEach(variantGroup => {
    const skus = variantGroup.skus || []
    skus.forEach(sku => {
      Object.entries(sku.attributes || {}).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) used.add(key)
      })
    })
  })
  return [...used]
})

// Form state
const group = reactive({
  attributeValue: '',
  image: null, // { fileId, url }
  skus: [makeEmptySku()],
})

function makeEmptySku() {
  const attrs = {}
  secondaryDims.value.forEach(d => { attrs[d.key] = '' })
  return { price: 0, quantityInStock: 0, discount: 0, sku: '', attributes: attrs }
}

function resetGroup() {
  group.attributeValue = ''
  group.image = null
  group.skus = [makeEmptySku()]
}

function addSku() {
  group.skus.push(makeEmptySku())
}

function removeSku(i) {
  group.skus.splice(i, 1)
}

// Load template when drawer opens
watch(() => props.open, async (open) => {
  if (!open) return
  if (props.product.categoryId) {
    try {
      template.value = await productTemplateStore.getCachedTemplateByCategory(props.product.categoryId)
    } catch (e) {
      logger.error('Failed to load template for variant drawer', e)
      template.value = null
    }
  }
  resetGroup()
})

// Image upload
async function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await post(endpoints.files.uploadSingle, fd)
    if (res?.data) {
      group.image = { fileId: res.data.id, url: res.data.url }
    }
  } catch (e) {
    logger.error('Variant image upload failed', e)
    toastStore.error('Image upload failed')
  }
}

// Submit
async function save() {
  if (!primaryDim.value) {
    toastStore.error('This category has no attributes configured for variations')
    return
  }

  if (!group.attributeValue.trim()) {
    toastStore.error(`${attributeLabel.value} is required`)
    return
  }

  if (selectedOptionValues.value.has(group.attributeValue.trim())) {
    toastStore.error(`${group.attributeValue.trim()} already exists`)
    return
  }

  const groupsToValidate = [
    ...(props.product.variantGroups || []),
    {
      attributeName: attributeName.value,
      attributeValue: group.attributeValue.trim(),
      skus: group.skus
    }
  ]

  for (const variantGroup of groupsToValidate) {
    for (const sku of variantGroup.skus || []) {
      const missingKey = usedSecondaryKeys.value.find(key => {
        const value = sku.attributes?.[key]
        return value === '' || value === null || value === undefined
      })

      if (missingKey) {
        const dim = secondaryDims.value.find(d => d.key === missingKey)
        toastStore.error(`${variantGroup.attributeValue} is missing ${dim?.label || missingKey} on one SKU`)
        return
      }
    }
  }

  isSubmitting.value = true
  try {
    const payload = {
      attributeName: attributeName.value,
      attributeValue: group.attributeValue.trim(),
      skus: group.skus.map(s => {
        const attrs = Object.fromEntries(
          Object.entries(s.attributes || {}).filter(([, v]) => v !== '' && v != null)
        )
        return {
          price: Number(s.price),
          quantityInStock: Number(s.quantityInStock),
          ...(s.discount ? { discount: Number(s.discount) } : {}),
          ...(s.sku?.trim() ? { sku: s.sku.trim() } : {}),
          ...(Object.keys(attrs).length > 0 ? { attributes: attrs } : {}),
        }
      }),
    }
    if (group.image?.fileId) payload.image = group.image.fileId

    const url = endpoints.variantGroups.add.replace(':productId', props.product.id)
    const response = await post(url, payload)

    if (response?.status || response?.data) {
      toastStore.success('Variant added successfully')
      emit('success')
      close()
    }
  } catch (e) {
    logger.error('Failed to add variant group', e)
  } finally {
    isSubmitting.value = false
  }
}

const close = () => emit('update:open', false)
</script>

<template>
  <Drawer :open="open" @update:open="$emit('update:open', $event)" content-class="bg-white p-0 w-full max-w-2xl">
    <div class="flex flex-col h-full bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50/50">
        <div class="space-y-1">
          <h2 class="text-2xl font-black text-black tracking-tight">Add New Variant</h2>
          <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">{{ props.product.name }}</p>
        </div>
        <button @click="close" class="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-rose-500 shadow-sm border border-transparent hover:border-slate-100">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

	      <div class="flex-1 overflow-y-auto p-10 space-y-10">

          <div v-if="!primaryDim" class="p-4 border border-slate-200 rounded-xl bg-slate-50">
            <p class="text-sm text-slate-600">
              This category has no attributes marked for variations. Add a variant attribute to the category template before creating product variants.
            </p>
          </div>

	        <!-- Variant basics: image + name -->
	        <div v-else class="flex gap-8 items-start">
          <div class="space-y-3">
            <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest pl-1">Variant Image</p>
            <div
              class="w-32 h-32 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all overflow-hidden relative group"
              @click="$refs.variantImg.click()"
            >
              <img v-if="group.image?.url" :src="group.image.url" class="w-full h-full object-cover">
              <template v-else>
                <span class="material-symbols-outlined text-slate-300 text-3xl mb-1">add_a_photo</span>
                <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">Upload</span>
              </template>
              <input ref="variantImg" type="file" class="hidden" accept="image/*" @change="handleImageUpload">
              <div v-if="group.image?.url" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="text-[10px] text-white font-black uppercase tracking-widest">Change</span>
              </div>
            </div>
          </div>

	          <div class="flex-1 space-y-6 pt-6">
              <div v-if="primaryOptions.length > 0" class="space-y-2">
                <p class="text-sm font-medium text-gray-700">{{ attributeLabel }}</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="option in primaryOptions"
                    :key="option"
                    type="button"
                    :disabled="selectedOptionValues.has(option)"
                    @click="group.attributeValue = option"
                    class="px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    :class="group.attributeValue === option
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'"
                  >
                    {{ option }}
                  </button>
                </div>
              </div>
	            <AppInput
                v-else
	              v-model="group.attributeValue"
	              name="variant-value"
	              :placeholder="primaryDim.placeholder || `Enter ${attributeLabel}`"
	              :label="attributeLabel"
	            />
	          </div>
	        </div>

        <!-- SKU tiers -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-sm font-black text-black tracking-tight">Price & Stock</p>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Define pricing and stock for each SKU</p>
            </div>
            <button @click="addSku" class="px-4 py-2 bg-primary/5 text-primary hover:bg-primary/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              + Add SKU
            </button>
          </div>

          <div class="space-y-6">
            <div
              v-for="(s, si) in group.skus"
              :key="si"
              class="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm relative border-l-4 border-l-primary"
            >
              <button
                v-if="group.skus.length > 1"
                @click="removeSku(si)"
                class="absolute -right-3 -top-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors z-10"
              >
                <span class="material-symbols-outlined text-lg">close</span>
              </button>

              <div class="grid grid-cols-2 gap-x-6 gap-y-6">
                <AppInput v-model="s.price" type="number" :name="`price-${si}`" placeholder="0" label="Price (₦)" />
                <AppInput v-model="s.sku" :name="`sku-${si}`" placeholder="Enter SKU" label="SKU Identifier" />
                <AppInput v-model="s.quantityInStock" type="number" :name="`qty-${si}`" placeholder="1" label="Stock Quantity" />
                <AppInput v-model="s.discount" type="number" :name="`disc-${si}`" placeholder="0" label="Discount %" />

                <!-- Secondary dimension attributes from template -->
                <template v-if="secondaryDims.length > 0">
                  <div class="col-span-2 pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                    <TemplateAttributeField
                      v-for="dim in secondaryDims"
                      :key="dim.key"
                      :attribute="dim"
                      :model-value="s.attributes[dim.key]"
                      @update:model-value="s.attributes[dim.key] = $event"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-8 border-t border-gray-100 bg-slate-50/50 flex gap-4 justify-end items-center">
        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mr-auto">
          Adding to {{ props.product.variantGroups?.length || 0 }} existing variant groups
        </p>
        <BaseButton variant="outline" @click="close" class="min-w-[140px]">Cancel</BaseButton>
	        <BaseButton :loading="isSubmitting" :disabled="!primaryDim" @click="save" class="min-w-[140px]">Create Variant</BaseButton>
      </div>
    </div>
  </Drawer>
</template>
