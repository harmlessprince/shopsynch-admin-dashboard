<template>
  <div class="space-y-[0.8rem]">
    <div
      v-if="attribute.label"
      class="flex items-start justify-between gap-[1rem]"
    >
      <label
        :for="attribute.key"
        class="block text-[1.4rem] font-[400] text-[#1B1B19]"
      >
        {{ attribute.label }}
        <span
          v-if="attribute.required"
          class="text-rose-500"
        >*</span>
      </label>
      <span
        v-if="attribute.description || attribute.tooltip"
        v-tooltip="{ text: attribute.description || attribute.tooltip, position: 'center' }"
        class="material-symbols-outlined cursor-help text-[1.8rem] text-gray-400"
      >
        info
      </span>
    </div>

    <input
      v-if="attribute.type !== 'BOOLEAN'"
      :id="attribute.key"
      :name="attribute.key"
      :type="attribute.type === 'NUMBER' ? 'number' : 'text'"
      :value="inputValue"
      :placeholder="inputPlaceholder"
      class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] text-[#1B1B19] outline-none transition placeholder:text-[#BDBDBD] focus:border-primary focus:ring-2 focus:ring-primary/10"
      @input="handleInput"
    >

    <label
      v-else
      class="flex h-[5.6rem] items-center gap-[1.2rem] rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] text-[#1B1B19]"
    >
      <input
        :name="attribute.key"
        type="checkbox"
        class="h-[1.8rem] w-[1.8rem] rounded border-[#D9D9D9] text-primary focus:ring-primary"
        :checked="modelValue === true || modelValue === 'true'"
        @change="$emit('update:modelValue', $event.target.checked)"
      >
      {{ attribute.placeholder || `Mark ${attribute.label}` }}
    </label>

    <p
      v-if="attribute.unit && attribute.type !== 'BOOLEAN'"
      class="text-[1.2rem] text-[#7A7A7A]"
    >
      {{ attribute.unit }}
    </p>

    <div
      v-if="visibleOptions.length"
      class="flex flex-wrap gap-[0.8rem]"
    >
      <button
        v-for="option in visibleOptions"
        :key="option"
        type="button"
        class="rounded-full border px-[1.2rem] py-[0.6rem] text-[1.3rem] font-[500] transition-colors"
        :class="String(modelValue || '') === String(option)
          ? 'border-primary bg-primary text-white'
          : 'border-[#D9D9D9] bg-white text-[#1B1B19] hover:border-primary hover:text-primary'"
        @click="selectOption(option)"
      >
        {{ option }}
      </button>
    </div>

    <p
      v-if="error"
      class="text-[1.2rem] font-[500] text-rose-500"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  attribute: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: [String, Number, Boolean, Array],
    default: null,
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'option-selected'])

const inputValue = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue.join(', ')
  return props.modelValue ?? ''
})

const inputPlaceholder = computed(() => {
  if (props.attribute.placeholder) return props.attribute.placeholder
  if (props.attribute.options?.length) return `Enter or select ${props.attribute.label}`
  return ''
})

const normalizedOptions = computed(() =>
  (props.attribute.options || [])
    .map((option) => String(option))
    .filter(Boolean)
)

const visibleOptions = computed(() => {
  const options = normalizedOptions.value
  const search = String(inputValue.value || '').trim().toLowerCase()

  if (options.length <= 10) return options
  if (!search) return []

  return options
    .filter((option) => option.toLowerCase().includes(search))
    .slice(0, 10)
})

function handleInput(event) {
  emit('update:modelValue', event.target.value)
}

function selectOption(option) {
  emit('update:modelValue', option)
  emit('option-selected', option)
}
</script>
