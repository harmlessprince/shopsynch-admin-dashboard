<script setup>
import { ref } from 'vue'
import { Field } from 'vee-validate'

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
  }
})

const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)

defineExpose({
  focus: () => {
    inputRef.value?.focus()
  }
})

const numericTypes = ['tel', 'number']

function handleInput(event) {
  const input = event.target
  let value = input.value
  
  if (numericTypes.includes(props.type)) {
    value = value.replace(/\D/g, '')
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

  if (!isDigit && !isAllowed && !isCtrlCmd) {
    event.preventDefault()
  }
}
</script>

<template>
  <div class="w-full">
    <label v-if="label" :for="name" class="block text-md font-normal text-black mb-1">
      {{ label }}
    </label>
    <div class="relative">
      <span v-if="prefix" class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">
        {{ prefix }}
      </span>
      <Field
        :name="name"
        :modelValue="modelValue"
        v-slot="{ field, errors }"
      >
        <input
          v-bind="field"
          ref="inputRef"
          :value="modelValue"
          @input="handleInput"
          @keydown="handleKeydown"
          :type="type === 'number' ? 'text' : type" 
          :placeholder="placeholder"
          :maxlength="maxlength"
          :minlength="minlength"
          :name="name"
          :id="name"
          class="w-full h-14 rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          :class="[
            prefix ? 'pl-12 pr-4' : 'px-4',
            (error || (errors && errors.length)) ? 'border-rose-500 focus:ring-rose-500' : '',
            inputClass
          ]"
          :readonly="readonly"
        />
        <p v-if="error || (errors && errors.length)" class="text-xs text-rose-500 mt-1.5 font-medium">
          {{ error || (errors && errors[0]) }}
        </p>
        <p v-else-if="hint" class="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">{{ hint }}</p>
      </Field>
    </div>
  </div>
</template>

<style scoped>
.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #111;
}
</style>