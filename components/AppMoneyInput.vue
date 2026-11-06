<script setup>
import { computed, ref, nextTick } from 'vue'
import { Field } from 'vee-validate'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: null
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
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
  disabled: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: 'money'
  },
  tooltip: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const inputRef = ref(null)

defineExpose({
  focus: () => {
    inputRef.value?.focus()
  }
})

const defaultId = useId()
const inputId = computed(() => {
  return props.name && props.name !== 'money' ? props.name : defaultId
})

function getMoneyNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const cleanValue = String(value).replace(/,/g, '').trim()
  if (cleanValue.includes('.')) {
    const parsed = Number(cleanValue)
    return Number.isFinite(parsed) ? parsed : null
  }

  const digits = cleanValue.replace(/\D/g, '')
  return digits ? Number(digits) : null
}

const isFocused = ref(false)
// Raw text while typing, so "12." and "12.0" survive re-rendering
const typed = ref(null)

// Two decimals at rest (₦245,000.00); grouped text, up to 2 decimals, while typing
const displayValue = computed(() => {
  if (isFocused.value && typed.value !== null) return typed.value
  const parsed = getMoneyNumber(props.modelValue)
  if (parsed === null) return ''
  if (isFocused.value) return parsed.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

function handleInput(event, handleChange) {
  const input = event.target
  const cursorPosition = input.selectionStart || 0
  const originalValue = input.value

  // Count digits and the decimal point before the cursor
  const charsBeforeCursor = (originalValue.slice(0, cursorPosition).match(/[\d.]/g) || []).length
  const [intPart = '', ...rest] = originalValue.replace(/[^\d.]/g, '').split('.')
  const hasDot = rest.length > 0
  const decimals = rest.join('').slice(0, 2)
  const intDigits = intPart.replace(/^0+(?=\d)/, '')

  if (!intDigits && !decimals && !hasDot) {
    input.value = ''
    typed.value = null
    handleChange(null)
    emit('update:modelValue', null)
    return
  }

  const groupedInt = Number(intDigits || '0').toLocaleString('en-US')
  const formatted = groupedInt + (hasDot ? '.' + decimals : '')
  input.value = formatted
  typed.value = formatted

  const numValue = Number((intDigits || '0') + (decimals ? '.' + decimals : ''))
  handleChange(numValue)
  emit('update:modelValue', numValue)

  // Calculate new cursor position
  let newCursorPos = formatted.length
  let charCount = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/[\d.]/.test(formatted[i])) charCount++
    if (charCount === charsBeforeCursor) {
      newCursorPos = i + 1
      break
    }
  }
  if (charsBeforeCursor === 0) newCursorPos = 0

  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.setSelectionRange(newCursorPos, newCursorPos)
    }
  })
}

function handleFocus(event) {
  const input = event.target
  isFocused.value = true
  emit('focus', event)
  // Focusing drops the trailing ".00", which rewrites the text and clears any selection, so reselect it
  nextTick(() => input.select())
}

function handleKeydown(event) {
  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End'
  ]

  const isDigit = /^\d$/.test(event.key)
  const isDot = event.key === '.' && !event.target.value.includes('.')
  const isAllowed = allowedKeys.includes(event.key)
  const isCtrlCmd = event.ctrlKey || event.metaKey

  if (!isDigit && !isDot && !isAllowed && !isCtrlCmd) {
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
    <Field
      v-slot="{ errors, handleBlur, handleChange }"
      :name="name"
      :model-value="modelValue"
    >
      <div class="relative">
        <span class="absolute inset-y-[1px] left-[1px] flex items-center px-[12px] rounded-l-[5px] bg-canvas border-r border-hairline text-[14px] font-medium text-ink pointer-events-none" aria-hidden="true">
          ₦
        </span>
        <input
          ref="inputRef"
          :value="displayValue"
          type="text"
          inputmode="decimal"
          :placeholder="placeholder"
          :maxlength="maxlength"
          :minlength="minlength"
          :name="name"
          :id="inputId"
          @input="handleInput($event, handleChange)"
          :aria-invalid="!!(error || (errors && errors.length))"
          @blur="isFocused = false; typed = null; handleBlur($event); emit('blur', $event)"
          :aria-describedby="(error || (errors && errors.length)) ? inputId + '-error' : hint ? inputId + '-hint' : undefined"
          @focus="handleFocus($event)"
          class="ds-input pl-[52px] text-right font-medium tabular-nums"
          @keydown="handleKeydown"
          :class="[
            (error || (errors && errors.length)) ? 'ds-input--error' : '',
            inputClass
          ]"
          :readonly="readonly"
          :disabled="disabled"
        >
      </div>
      <p v-if="error || (errors && errors.length)" :id="inputId + '-error'" class="ds-helper ds-helper--error">
        {{ error || (errors && errors[0]) }}
      </p>
      <p v-else-if="hint" :id="inputId + '-hint'" class="ds-helper">{{ hint }}</p>
    </Field>
  </div>
</template>
