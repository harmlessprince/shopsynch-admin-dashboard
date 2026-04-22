<script setup>
import { computed, reactive, watch } from 'vue'
import { useAuthStore } from '~/stores/auth.store.js'
import { useCategoryStore } from '~/stores/category.store.js'
import { useProductTemplateStore } from '~/stores/productTemplate.store.js'
import { useTenantStore } from '~/stores/tenant.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { logger } from '~/utils/helpers.js'

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  template: {
    type: Object,
    default: null,
  },
  categoryId: {
    type: String,
    default: '',
  },
  cloneSystemTemplate: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:open', 'success'])

const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const productTemplateStore = useProductTemplateStore()
const tenantStore = useTenantStore()
const toastStore = useToastStore()

const PRODUCT_TYPES = ['SIMPLE', 'VARIABLE', 'DIGITAL', 'BUNDLE']
const ATTRIBUTE_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'ENUM', 'MULTI_ENUM', 'COLOR']
const DISPLAY_AS_OPTIONS = ['TEXT', 'BADGE', 'COLOR_SWATCH', 'SIZE_CHART', 'SPEC_TABLE_ROW', 'HIDDEN']

const isSubmitting = ref(false)

const form = reactive({
  name: '',
  categoryId: '',
  productTypes: [],
  attributeDefinitions: [],
})

const isEditing = computed(() => !!props.template?.id && !!props.template?.tenantId && !props.cloneSystemTemplate)
const title = computed(() => {
  if (isEditing.value) return 'Edit Product Template'
  if (props.cloneSystemTemplate) return 'Create Store Override'
  return 'Create Product Template'
})

const categoryOptions = computed(() =>
  categoryStore.categories.map(category => ({ label: category.name, value: category.id }))
)

function activeTenantId() {
  return tenantStore.activeStore?.tenantId || authStore.user?.tenantId || authStore.user?.tenant?.id || ''
}

function emptyAttribute(order = form.attributeDefinitions.length + 1) {
  return {
    key: '',
    label: '',
    type: 'STRING',
    optionsText: '',
    unit: '',
    required: false,
    variantDimension: false,
    filterable: false,
    displayAs: 'TEXT',
    section: '',
    displayOrder: order,
    placeholder: '',
  }
}

function normalizeAttribute(attribute, index) {
  return {
    key: attribute.key || '',
    label: attribute.label || '',
    type: attribute.type || 'STRING',
    optionsText: Array.isArray(attribute.options) ? attribute.options.join(', ') : '',
    unit: attribute.unit || '',
    required: !!attribute.required,
    variantDimension: attribute.variantDimension === true || attribute.isVariantDimension === true,
    filterable: attribute.filterable === true || attribute.isFilterable === true,
    displayAs: attribute.displayAs || 'TEXT',
    section: attribute.section || '',
    displayOrder: attribute.displayOrder ?? index + 1,
    placeholder: attribute.placeholder || '',
  }
}

function resetForm() {
  form.name = ''
  form.categoryId = props.categoryId || ''
  form.productTypes = []
  form.attributeDefinitions = [emptyAttribute(1)]
}

function hydrateForm() {
  if (!props.template) {
    resetForm()
    return
  }

  form.name = props.template.name || ''
  form.categoryId = props.template.categoryId || props.categoryId || ''
  form.productTypes = [...(props.template.productTypes || [])]
  form.attributeDefinitions = (props.template.attributeDefinitions || []).map(normalizeAttribute)
  if (!form.attributeDefinitions.length) {
    form.attributeDefinitions = [emptyAttribute(1)]
  }
}

function addAttribute() {
  form.attributeDefinitions.push(emptyAttribute())
}

function removeAttribute(index) {
  form.attributeDefinitions.splice(index, 1)
  if (!form.attributeDefinitions.length) {
    form.attributeDefinitions.push(emptyAttribute(1))
  }
}

function toggleProductType(type) {
  if (form.productTypes.includes(type)) {
    form.productTypes = form.productTypes.filter(item => item !== type)
    return
  }
  form.productTypes.push(type)
}

function normalizeKey(index) {
  const attribute = form.attributeDefinitions[index]
  attribute.key = attribute.key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function normalizeKeys() {
  form.attributeDefinitions.forEach((_attribute, index) => normalizeKey(index))
}

function validateForm() {
  normalizeKeys()

  if (!form.name.trim()) {
    toastStore.error('Template name is required')
    return false
  }

  if (!form.categoryId) {
    toastStore.error('Select a category')
    return false
  }

  if (!activeTenantId()) {
    toastStore.error('Could not resolve the active store')
    return false
  }

  if (!form.attributeDefinitions.length) {
    toastStore.error('Add at least one attribute')
    return false
  }

  const keys = new Set()
  for (const attribute of form.attributeDefinitions) {
    if (!attribute.key || !attribute.label || !attribute.type) {
      toastStore.error('Each attribute needs a key, label, and type')
      return false
    }

    if (keys.has(attribute.key)) {
      toastStore.error(`${attribute.key} is duplicated`)
      return false
    }
    keys.add(attribute.key)

    const options = attribute.optionsText
      .split(',')
      .map(option => option.trim())
      .filter(Boolean)
    if (['ENUM', 'MULTI_ENUM'].includes(attribute.type) && !options.length) {
      toastStore.error(`${attribute.label} needs at least one option`)
      return false
    }
  }

  return true
}

function buildPayload() {
  return {
    name: form.name.trim(),
    categoryId: form.categoryId,
    tenantId: activeTenantId(),
    productTypes: form.productTypes,
    attributeDefinitions: form.attributeDefinitions.map(attribute => ({
      key: attribute.key,
      label: attribute.label,
      type: attribute.type,
      options: ['ENUM', 'MULTI_ENUM'].includes(attribute.type)
        ? attribute.optionsText.split(',').map(option => option.trim()).filter(Boolean)
        : [],
      unit: attribute.type === 'NUMBER' ? attribute.unit : '',
      required: attribute.required,
      variantDimension: attribute.variantDimension,
      filterable: attribute.filterable,
      displayAs: attribute.displayAs,
      section: attribute.section || '',
      displayOrder: Number(attribute.displayOrder) || 0,
      placeholder: attribute.placeholder || '',
    })),
  }
}

async function submit() {
  if (isSubmitting.value || !validateForm()) return

  isSubmitting.value = true
  try {
    const payload = buildPayload()
    const response = isEditing.value
      ? await productTemplateStore.updateTemplate(props.template.id, payload)
      : await productTemplateStore.createTemplate(payload)

    if (response?.status) {
      productTemplateStore.clearCategoryCache(payload.categoryId)
      toastStore.success(isEditing.value ? 'Template updated successfully' : 'Template created successfully')
      emit('success')
      close()
    }
  } catch (error) {
    logger.error('Failed to save product template', error)
  } finally {
    isSubmitting.value = false
  }
}

function close() {
  emit('update:open', false)
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    hydrateForm()
  }
)
</script>

<template>
  <Drawer :open="open" @update:open="$emit('update:open', $event)" content-class="bg-white p-0 w-full">
    <div class="flex flex-col h-full bg-white">
      <div class="flex items-center justify-between p-6 border-b border-gray-100">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">{{ title }}</h2>
          <p class="text-sm text-slate-500 mt-1">Build the category attributes used by product forms and variant groups.</p>
        </div>
        <button @click="close" class="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-8 space-y-8">
        <div class="grid md:grid-cols-2 gap-5">
          <AppInput v-model="form.name" name="template-name" label="Template Name" placeholder="e.g. Smartphones" />
          <SearchableSelectInput
            v-model="form.categoryId"
            label="Category"
            :options="categoryOptions"
            placeholder="Select category"
            :disabled="isEditing"
          />
        </div>

        <div class="space-y-3">
          <div>
            <p class="text-sm font-semibold text-slate-700">Product Types</p>
            <p class="text-xs text-slate-400 mt-1">Leave all unchecked to apply this template to every product type.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="type in PRODUCT_TYPES"
              :key="type"
              type="button"
              class="px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all"
              :class="form.productTypes.includes(type)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'"
              @click="toggleProductType(type)"
            >
              {{ type }}
            </button>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-700">Attributes</p>
              <p class="text-xs text-slate-400 mt-1">Mark attributes as variant dimensions when they should drive variable products.</p>
            </div>
            <BaseButton variant="outline" size="sm" class="rounded-xl" @click="addAttribute">
              <span class="material-symbols-outlined text-[1.8rem]">add</span>
              Add Attribute
            </BaseButton>
          </div>

          <div
            v-for="(attribute, index) in form.attributeDefinitions"
            :key="index"
            class="border border-slate-200 rounded-xl p-4 space-y-4"
          >
            <div class="flex items-center justify-between">
              <p class="text-xs font-black text-slate-400 uppercase tracking-[0.16em]">Attribute {{ index + 1 }}</p>
              <button type="button" class="text-rose-500 hover:text-rose-600" @click="removeAttribute(index)">
                <span class="material-symbols-outlined text-[2rem]">delete</span>
              </button>
            </div>

            <div class="grid md:grid-cols-2 gap-4">
              <AppInput v-model="attribute.key" :name="`attr-key-${index}`" label="Key" placeholder="ram_size" @blur="normalizeKey(index)" />
              <AppInput v-model="attribute.label" :name="`attr-label-${index}`" label="Label" placeholder="RAM Size" />
            </div>

            <div class="grid md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                <select v-model="attribute.type" class="w-full h-14 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-primary">
                  <option v-for="type in ATTRIBUTE_TYPES" :key="type" :value="type">{{ type }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Display As</label>
                <select v-model="attribute.displayAs" class="w-full h-14 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-primary">
                  <option v-for="option in DISPLAY_AS_OPTIONS" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
              <AppInput v-model="attribute.displayOrder" :name="`attr-order-${index}`" label="Display Order" type="number" placeholder="1" />
            </div>

            <AppInput
              v-if="['ENUM', 'MULTI_ENUM'].includes(attribute.type)"
              v-model="attribute.optionsText"
              :name="`attr-options-${index}`"
              label="Options"
              placeholder="Red, Blue, Green"
              hint="Separate options with commas"
            />

            <div class="grid md:grid-cols-3 gap-4">
              <AppInput
                v-if="attribute.type === 'NUMBER'"
                v-model="attribute.unit"
                :name="`attr-unit-${index}`"
                label="Unit"
                placeholder="kg"
              />
              <AppInput v-model="attribute.section" :name="`attr-section-${index}`" label="Section" placeholder="Performance" />
              <AppInput v-model="attribute.placeholder" :name="`attr-placeholder-${index}`" label="Placeholder" placeholder="Enter value" />
            </div>

            <div class="flex flex-wrap gap-5 pt-2">
              <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                <input v-model="attribute.required" type="checkbox" class="rounded border-slate-300 text-primary focus:ring-primary">
                Required
              </label>
              <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                <input v-model="attribute.variantDimension" type="checkbox" class="rounded border-slate-300 text-primary focus:ring-primary">
                Used for variants
              </label>
              <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                <input v-model="attribute.filterable" type="checkbox" class="rounded border-slate-300 text-primary focus:ring-primary">
                Filterable
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-gray-100 bg-slate-50/50 flex gap-4 justify-end">
        <BaseButton variant="outline" class="min-w-[120px]" @click="close">Cancel</BaseButton>
        <BaseButton :loading="isSubmitting" class="min-w-[160px]" @click="submit">
          {{ isEditing ? 'Update Template' : 'Save Template' }}
        </BaseButton>
      </div>
    </div>
  </Drawer>
</template>
