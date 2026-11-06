<script setup>
import { computed, ref, useAttrs } from 'vue'
import { Field } from 'vee-validate'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  error: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  prefix: {
    type: String,
    default: ''
  },
  maxlength: {
    type: Number,
    default: undefined
  },
  minlength: {
    type: Number,
    default: undefined
  },
  inputClass: {
    type: String,
    default: ''
  },
  readonly: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: 'input'
  },
  tooltip: {
    type: String,
    default: ''
  },
  allowDecimal: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'keyup'])
const attrs = useAttrs()

const inputRef = ref(null)

defineExpose({
  focus: () => {
    inputRef.value?.focus()
  }
})

const defaultId = useId()
const inputId = computed(() => {
  return props.name && props.name !== 'input' ? props.name : defaultId
})

const numericTypes = ['tel', 'number']

function handleInput(event) {
  const input = event.target
  let value = input.value

  if (numericTypes.includes(props.type)) {
    value = props.allowDecimal
      ? value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
      : value.replace(/\D/g, '')
    input.value = value
  }
  emit('update:modelValue', value)
}

function handleKeydown(event) {
  if (!numericTypes.includes(props.type)) return

  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End'
  ]

  const isDigit = /^\d$/.test(event.key)
  const isAllowed = allowedKeys.includes(event.key)
  const isCtrlCmd = event.ctrlKey || event.metaKey // allow copy/paste/select-all
  const isDecimalPoint = props.allowDecimal && event.key === '.' && !event.target.value.includes('.')

  if (!isDigit && !isAllowed && !isCtrlCmd && !isDecimalPoint) {
    event.preventDefault()
  }
}
</script>

<template>
  <div class="w-full">
    <div v-if="label || tooltip" class="flex items-center justify-between mb-[6px]">
      <label v-if="label" :for="inputId" class="ds-label">
        {{ label }}
      </label>
      <span
        v-if="tooltip"
        v-tooltip="{ text: tooltip, position: 'center' }"
        class="material-symbols-outlined text-ink-muted cursor-help text-[18px]"
        aria-hidden="true"
      >
        info
      </span>
    </div>

    <div class="relative">
      <span v-if="prefix" class="material-symbols-outlined ds-field-icon absolute left-[12px] top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
        {{ prefix }}
      </span>
      <Field
        v-slot="{ field, errors }"
        :name="name"
        :model-value="modelValue"
      >
        <input
          v-bind="{ ...field, ...attrs }"
          ref="inputRef"
          :value="modelValue"
          :type="type === 'number' ? 'text' : type"
          :placeholder="placeholder"
          :maxlength="maxlength"
          :id="inputId" 
          :minlength="minlength"
          :name="name"
          :aria-invalid="!!(error || (errors && errors.length))"
          :aria-describedby="(error || (errors && errors.length)) ? inputId + '-error' : hint ? inputId + '-hint' : undefined"
          @input="handleInput"
          class="ds-input"
          @keydown="handleKeydown"
          :class="[
            prefix ? 'pl-[40px]' : '',
            (error || (errors && errors.length)) ? 'ds-input--error' : '',
            inputClass
          ]"
          @keyup="emit('keyup', $event)"
          :readonly="readonly"
        >
        <p v-if="error || (errors && errors.length)" :id="inputId + '-error'" class="ds-helper ds-helper--error">
          {{ error || (errors && errors[0]) }}
        </p>
        <p v-else-if="hint" :id="inputId + '-hint'" class="ds-helper">{{ hint }}</p>
      </Field>
    </div>
  </div>
</template>
