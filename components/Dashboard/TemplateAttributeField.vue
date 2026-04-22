<template>
  <div class="space-y-1">
    <!-- Text Label -->
    <label v-if="attribute.label" class="block text-sm font-medium text-gray-700">
      {{ attribute.label }}
      <span v-if="attribute.required" class="text-red-500">*</span>
    </label>

    <!-- Text Input (STRING, NUMBER with TEXT displayAs) -->
    <AppInput
      v-if="attribute.type === 'STRING' || (attribute.type === 'NUMBER' && displayAs !== 'SIZE_CHART')"
      :model-value="modelValue"
      :type="attribute.type === 'NUMBER' ? 'number' : 'text'"
      :placeholder="attribute.placeholder || ''"
      :name="attribute.key"
      @update:model-value="$emit('update:modelValue', $event)"
      :class="attribute.unit ? 'pr-12' : ''"
    />
    
    <!-- Helper text for unit -->
    <div v-if="attribute.unit && (attribute.type === 'NUMBER' || attribute.type === 'STRING')" class="text-xs text-gray-500">
      {{ attribute.unit }}
    </div>

    <!-- Boolean Toggle -->
    <div v-if="attribute.type === 'BOOLEAN'" class="flex items-center gap-3">
      <input
        type="checkbox"
        :checked="modelValue === true || modelValue === 'true'"
        @change="$emit('update:modelValue', $event.target.checked)"
        :name="attribute.key"
        class="w-4 h-4 rounded border-gray-300"
      />
      <span class="text-sm text-gray-600">{{ attribute.label }}</span>
    </div>

    <!-- Color Picker -->
    <div v-if="attribute.type === 'COLOR'" class="flex items-center gap-2">
      <input
        :value="modelValue || ''"
        :name="attribute.key"
        :placeholder="attribute.placeholder || 'e.g. Midnight Black, #1C1C1E'"
        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <input
        type="color"
        title="Pick a hex color"
        class="w-10 h-10 rounded cursor-pointer border border-gray-300 shrink-0"
        @change="$emit('update:modelValue', $event.target.value)"
      />
    </div>

    <!-- Enum - Dropdown (Single select) -->
    <select
      v-if="attribute.type === 'ENUM' && (!displayAs || displayAs !== 'BADGE' && displayAs !== 'SIZE_CHART')"
      :value="modelValue || ''"
      @change="$emit('update:modelValue', $event.target.value)"
      :name="attribute.key"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">{{ attribute.placeholder || `Select ${attribute.label}` }}</option>
      <option v-for="option in attribute.options" :key="option" :value="option">
        {{ option }}
      </option>
    </select>

    <!-- Enum - Badge/Pill style (Radio group) -->
    <div
      v-if="attribute.type === 'ENUM' && displayAs === 'BADGE'"
      class="flex flex-wrap gap-2"
    >
      <label
        v-for="option in attribute.options"
        :key="option"
        class="inline-flex items-center px-3 py-1.5 rounded-full border-2 cursor-pointer transition-colors"
        :class="[
          modelValue === option
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        ]"
      >
        <input
          type="radio"
          :value="option"
          :checked="modelValue === option"
          @change="$emit('update:modelValue', $event.target.value)"
          class="sr-only"
          :name="attribute.key"
        />
        <span class="text-sm font-medium">{{ option }}</span>
      </label>
    </div>

    <!-- Enum - Size Chart style (Button grid) -->
    <div
      v-if="attribute.type === 'ENUM' && displayAs === 'SIZE_CHART'"
      class="grid grid-cols-4 gap-2"
    >
      <button
        v-for="option in attribute.options"
        :key="option"
        type="button"
        @click="$emit('update:modelValue', option)"
        class="py-2 px-3 rounded-lg border-2 font-medium transition-all"
        :class="[
          modelValue === option
            ? 'border-blue-500 bg-blue-100 text-blue-700'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        ]"
      >
        {{ option }}
      </button>
    </div>

    <!-- Multi-Enum (Multiple select with checkboxes) -->
    <div v-if="attribute.type === 'MULTI_ENUM'" class="space-y-2">
      <label
        v-for="option in attribute.options"
        :key="option"
        class="flex items-center gap-2 cursor-pointer"
      >
        <input
          type="checkbox"
          :value="option"
          :checked="(modelValue || []).includes(option)"
          @change="handleMultiEnumChange"
          :name="`${attribute.key}-${option}`"
          class="w-4 h-4 rounded border-gray-300"
        />
        <span class="text-sm text-gray-700">{{ option }}</span>
      </label>
    </div>

    <!-- Error message -->
    <p v-if="error" class="text-xs text-red-500 mt-1">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppInput from '~/components/AppInput.vue'

const props = defineProps({
  attribute: {
    type: Object,
    required: true,
    // Expected structure: { key, label, type, options, unit, required, displayAs, placeholder, ... }
  },
  modelValue: {
    type: [String, Number, Boolean, Array],
    default: null
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const displayAs = computed(() => props.attribute.displayAs || 'TEXT')

/**
 * Handle multi-enum checkbox changes
 */
function handleMultiEnumChange(event) {
  const selected = Array.from(
    document.querySelectorAll(`input[name^="${props.attribute.key}-"]:checked`)
  ).map(el => el.value)

  emit('update:modelValue', selected)
}
</script>

<style scoped>
/* Smooth transitions for interactive elements */
input[type='checkbox'],
input[type='radio'] {
  @apply transition-colors;
}

button {
  @apply focus:outline-none focus:ring-2 focus:ring-offset-1;
}
</style>
