<script setup lang="ts">
interface Props {
  modelValue: string
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
  textareaClass: '',
  readonly: false,
  rows: 4,
  resize: 'y'
})

const emit = defineEmits(['update:modelValue'])

function handleInput(event: Event) {
  const textarea = event.target as HTMLTextAreaElement
  emit('update:modelValue', textarea.value)
}
</script>

<template>
  <div class="w-full">
    <div v-if="label || maxlength" class="flex items-center justify-between mb-2">
      <label v-if="label" class="block text-sm font-semibold text-slate-700">
        {{ label }}
      </label>
      <span v-if="maxlength" class="text-xs text-slate-400 font-medium">
        {{ String(modelValue).length }} / {{ maxlength }}
      </span>
    </div>

    <textarea
      :value="modelValue"
      @input="handleInput"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :minlength="minlength"
      :name="name"
      :rows="rows"
      :readonly="readonly"
      class="w-full rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
      :class="[
        error ? 'border-rose-500 focus:ring-rose-500' : '',
        resize === 'none' ? 'resize-none' : '',
        resize === 'y' ? 'resize-y' : '',
        resize === 'x' ? 'resize-x' : '',
        resize === 'both' ? 'resize' : '',
        textareaClass
      ]"
    />

    <p v-if="error" class="text-xs text-rose-500 mt-1.5 font-medium">{{ error }}</p>
    <p v-else-if="hint" class="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">{{ hint }}</p>
  </div>
</template>