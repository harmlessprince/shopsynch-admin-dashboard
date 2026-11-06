<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  maxlength?: number
  minlength?: number
  textareaClass?: string
  readonly?: boolean
  name?: string
  rows?: number
  resize?: 'none' | 'y' | 'x' | 'both'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  error: '',
  hint: '',
  maxlength: undefined,
  minlength: undefined,
  textareaClass: '',
  readonly: false,
  name: undefined,
  rows: 4,
  resize: 'y'
})

const emit = defineEmits(['update:modelValue'])

const textareaRef = ref<HTMLTextAreaElement | null>(null)

defineExpose({
  focus: () => {
    textareaRef.value?.focus()
  }
})

const defaultId = useId()
const textareaId = computed(() => props.name || defaultId)
const charCount = computed(() => (props.modelValue ? String(props.modelValue).length : 0))

function handleInput(event: Event) {
  const textarea = event.target as HTMLTextAreaElement
  emit('update:modelValue', textarea.value)
}
</script>

<template>
  <div class="w-full">
    <div v-if="label || maxlength" class="flex items-center justify-between mb-[6px]">
      <label v-if="label" :for="textareaId" class="ds-label">
        {{ label }}
      </label>
      <span v-if="maxlength" class="text-[12px] text-ink-muted tabular-nums">
        {{ charCount }} / {{ maxlength }}
      </span>
    </div>

    <textarea
      :id="textareaId"
      ref="textareaRef"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :minlength="minlength"
      :name="name || textareaId"
      :rows="rows"
      :readonly="readonly"
      :aria-invalid="!!error"
      :aria-describedby="error ? textareaId + '-error' : hint ? textareaId + '-hint' : undefined"
      class="ds-input"
      :class="[
        error ? 'ds-input--error' : '',
        resize === 'none' ? 'resize-none' : '',
        resize === 'y' ? 'resize-y' : '',
        resize === 'x' ? 'resize-x' : '',
        resize === 'both' ? 'resize' : '',
        textareaClass
      ]"
      @input="handleInput"
    />

    <p v-if="error" :id="textareaId + '-error'" class="ds-helper ds-helper--error">{{ error }}</p>
    <p v-else-if="hint" :id="textareaId + '-hint'" class="ds-helper">{{ hint }}</p>
  </div>
</template>
