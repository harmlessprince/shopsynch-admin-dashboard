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

const displayValue = computed(() => {
  const parsed = getMoneyNumber(props.modelValue)
  if (parsed === null) return ''
  return parsed.toLocaleString('en-US')
})

function handleInput(event, handleChange) {
  const input = event.target
  const cursorPosition = input.selectionStart || 0
  const originalValue = input.value

  // Count how many digits existed before the cursor
  const digitsBeforeCursor = (originalValue.slice(0, cursorPosition).match(/\d/g) || []).length
  const digits = originalValue.replace(/\D/g, '')

  if (!digits) {
    input.value = ''
    handleChange(null)
    emit('update:modelValue', null)
    return
  }

  const numValue = Number(digits)
  const formatted = numValue.toLocaleString('en-US')
  input.value = formatted

  handleChange(numValue)
  emit('update:modelValue', numValue)

  // Calculate new cursor position
  let newCursorPos = 0
  let digitCount = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      digitCount++
    }
    if (digitCount === digitsBeforeCursor) {
      newCursorPos = i + 1
      break
    }
  }
  if (digitCount < digitsBeforeCursor) {
    newCursorPos = formatted.length
  }

  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.setSelectionRange(newCursorPos, newCursorPos)
    }
  })
}

function handleKeydown(event) {
  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End'
  ]

  const isDigit = /^\d$/.test(event.key)
  const isAllowed = allowedKeys.includes(event.key)
  const isCtrlCmd = event.ctrlKey || event.metaKey

  if (!isDigit && !isAllowed && !isCtrlCmd) {
    event.preventDefault()
  }
}
</script>

<template>
  <div class="w-full">
    <div v-if="label || tooltip" class="flex items-center justify-between min-h-[2.4rem] mb-[0.8rem]">
      <label v-if="label" :for="inputId" class="block text-[1.8rem] font-[400] leading-[2.4rem] text-[#1B1B19]">
        {{ label }}
      </label>
      <span
        v-if="tooltip"
        class="material-symbols-outlined text-gray-400 cursor-help text-[1.8rem]"
        :title="tooltip"
        aria-hidden="true"
      >
        info
      </span>
    </div>
    <div class="relative">
      <span v-if="prefix" class="material-symbols-outlined absolute left-[1.8rem] top-1/2 -translate-y-1/2 text-[1.8rem] font-bold text-[#1B1B19] pointer-events-none" aria-hidden="true">
        {{ prefix }}
      </span>
      <Field
        :name="name"
        :modelValue="modelValue"
        v-slot="{ errors, handleBlur, handleChange }"
      >
        <input
          ref="inputRef"
          :value="displayValue"
          @input="handleInput($event, handleChange)"
          @blur="handleBlur($event); emit('blur', $event)"
          @focus="emit('focus', $event)"
          @keydown="handleKeydown"
          type="text"
          inputmode="numeric"
          :placeholder="placeholder"
          :maxlength="maxlength"
          :minlength="minlength"
          :name="name"
          :id="inputId"
          :aria-invalid="!!(error || (errors && errors.length))"
          :aria-describedby="(error || (errors && errors.length)) ? inputId + '-error' : hint ? inputId + '-hint' : undefined"
          class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white text-[1.6rem] text-[#1B1B19] outline-none transition placeholder:text-[#BDBDBD] focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
          :class="[
            prefix ? 'pl-[4.6rem] pr-[1.8rem]' : 'px-[1.8rem]',
            (error || (errors && errors.length)) ? 'border-rose-500 focus:ring-rose-500' : '',
            inputClass
          ]"
          :readonly="readonly"
          :disabled="disabled"
        />
        <p v-if="error || (errors && errors.length)" :id="inputId + '-error'" class="text-xs text-rose-500 mt-1.5 font-medium">
          {{ error || (errors && errors[0]) }}
        </p>
        <p v-else-if="hint" :id="inputId + '-hint'" class="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">{{ hint }}</p>
      </Field>
    </div>
  </div>
</template>
