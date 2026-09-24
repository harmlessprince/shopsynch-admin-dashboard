<script setup>
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    required: true,
  },
  placeholder: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: '',
  },
  minLength: {
    type: Number,
    default: undefined,
  },
  maxLength: {
    type: Number,
    default: undefined,
  },
})

const emit = defineEmits(['update:modelValue'])

const toolbar = [
  [{ size: [] }],
  [{ color: [] }, { background: [] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image'],
]

const plainTextLength = computed(() => {
  if (!props.modelValue) return 0
  if (import.meta.server) return String(props.modelValue).replace(/<[^>]*>/g, '').trim().length

  const parser = new DOMParser()
  return (parser.parseFromString(props.modelValue, 'text/html').body.textContent || '').trim().length
})

function updateContent(value) {
  emit('update:modelValue', value || '')
}
</script>

<template>
  <div>
    <label class="mb-[0.8rem] block text-[1.8rem] font-[400] text-[#1B1B19]">
      {{ label }}
    </label>

    <ClientOnly>
      <QuillEditor
        :content="modelValue"
        content-type="html"
        theme="snow"
        :placeholder="placeholder"
        :toolbar="toolbar"
        class="product-rich-text-editor"
        :class="error ? 'product-rich-text-editor--error' : ''"
        @update:content="updateContent"
      />

      <template #fallback>
        <textarea
          :value="modelValue"
          :placeholder="placeholder"
          class="min-h-[12rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] py-[1.6rem] text-[1.6rem] text-[#1B1B19] outline-none placeholder:text-[#98A2B3]"
          :class="error ? 'border-rose-300' : ''"
          @input="updateContent($event.target.value)"
        />
      </template>
    </ClientOnly>

    <div
      v-if="error || maxLength"
      class="mt-[0.8rem] flex items-center justify-between gap-[1.2rem]"
    >
      <p class="min-w-0 text-[1.2rem] font-[500] text-rose-500">
        {{ error }}
      </p>
      <p
        v-if="maxLength"
        class="shrink-0 text-[1.2rem] font-[500]"
        :class="plainTextLength > maxLength ? 'text-rose-500' : 'text-[#7A7A7A]'"
      >
        {{ plainTextLength }} / {{ maxLength }}
      </p>
    </div>
  </div>
</template>

<style scoped>
:deep(.product-rich-text-editor) {
  background: #fff;
  border-radius: 10px;
}

:deep(.product-rich-text-editor .ql-container) {
  min-height: 11.2rem;
  border-color: #d9d9d9;
  border-radius: 10px 10px 0 0;
  font-size: 1.6rem;
}

:deep(.product-rich-text-editor .ql-editor) {
  min-height: 11.2rem;
  padding: 1.6rem 1.8rem;
}

:deep(.product-rich-text-editor .ql-editor.ql-blank::before) {
  color: #98a2b3;
  font-style: normal;
  left: 1.8rem;
  right: 1.8rem;
}

:deep(.product-rich-text-editor .ql-toolbar) {
  border-color: #d9d9d9;
  border-radius: 0 0 4px 4px;
}

:deep(.product-rich-text-editor--error .ql-container),
:deep(.product-rich-text-editor--error .ql-toolbar) {
  border-color: #fda4af;
}
</style>
