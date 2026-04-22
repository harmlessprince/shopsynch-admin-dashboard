<template>
  <div v-if="attributesBySection.length > 0" class="space-y-6">
    <!-- Section Groups -->
    <div v-for="section in attributesBySection" :key="section.name" class="space-y-4">
      <!-- Section Header -->
      <div
        v-if="section.name"
        class="flex items-center gap-3 pt-4 border-t border-slate-100"
      >
        <h3 class="text-sm font-semibold text-gray-900">{{ section.name }}</h3>
        <div class="flex-1 h-px bg-slate-100"></div>
      </div>

      <!-- Attributes in section -->
      <div class="grid gap-4" :class="section.attributes.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
        <TemplateAttributeField
          v-for="attribute in section.attributes"
          :key="attribute.key"
          :attribute="attribute"
          :model-value="formData[attribute.key]"
          :error="errors[attribute.key]"
          @update:model-value="$emit('update:attribute', attribute.key, $event)"
        />
      </div>
    </div>

    <!-- Variant Attributes Section (if applicable) -->
    <div
      v-if="variantDimensions.length > 0"
      class="space-y-4 pt-6 border-t-2 border-blue-100 bg-blue-50 p-4 rounded-lg"
    >
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-blue-600">layers</span>
        <h3 class="text-sm font-semibold text-blue-900">Variant Attributes</h3>
      </div>
      <p class="text-xs text-blue-700">These attributes will drive variant selection for customers</p>
      
      <div class="grid gap-4 grid-cols-2">
        <TemplateAttributeField
          v-for="attribute in variantDimensions"
          :key="attribute.key"
          :attribute="attribute"
          :model-value="formData[attribute.key]"
          :error="errors[attribute.key]"
          @update:model-value="$emit('update:attribute', attribute.key, $event)"
        />
      </div>
    </div>
  </div>

  <!-- No template message -->
  <div v-else class="py-8 text-center text-gray-500">
    <p class="text-sm">No additional attributes configured for this category</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TemplateAttributeField from './TemplateAttributeField.vue'

const props = defineProps({
  template: {
    type: Object,
    default: null
    // Expected: { attributeDefinitions: [...], ... }
  },
  formData: {
    type: Object,
    required: true
    // Map of attribute key -> value
  },
  errors: {
    type: Object,
    default: () => ({})
    // Map of attribute key -> error message
  }
})

const emit = defineEmits(['update:attribute'])

const isVariantAttribute = (attribute) =>
  attribute?.isVariantDimension === true || attribute?.variantDimension === true

/**
 * Group attributes by section and sort by displayOrder
 */
const attributesBySection = computed(() => {
  if (!props.template?.attributeDefinitions) {
    return []
  }

  const attributes = props.template.attributeDefinitions.filter(
    attr => attr.displayAs !== 'HIDDEN'
  )

  // Group by section
  const grouped = {}
  attributes.forEach(attr => {
    const section = attr.section || 'Other'
    if (!grouped[section]) {
      grouped[section] = []
    }
    grouped[section].push(attr)
  })

  // Sort each section by displayOrder
  Object.keys(grouped).forEach(section => {
    grouped[section].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
  })

  // Return as array with consistent order
  return Object.entries(grouped)
    .map(([name, attributes]) => ({ name, attributes }))
    .sort((a, b) => {
      // "Other" goes last
      if (a.name === 'Other') return 1
      if (b.name === 'Other') return -1
      return a.name.localeCompare(b.name)
    })
})

/**
 * Attributes that are variant dimensions (for variant product type)
 */
const variantDimensions = computed(() => {
  if (!props.template?.attributeDefinitions) {
    return []
  }

  return props.template.attributeDefinitions
    .filter(isVariantAttribute)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
})
</script>
