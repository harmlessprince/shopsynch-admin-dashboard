<script setup>
import { computed } from 'vue'
import filterXSS from 'xss'

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
  fallback: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'rich',
    validator: (val) => ['rich', 'plain'].includes(val),
  },
})

const sanitizedHtml = computed(() => {
  if (!props.content) return props.fallback
  return filterXSS(props.content)
})

const plainText = computed(() => {
  if (!props.content) return props.fallback
  let text = props.content
  if (import.meta.server) {
    text = String(text).replace(/<[^>]*>/g, '')
  } else {
    try {
      const parser = new DOMParser()
      text = parser.parseFromString(text, 'text/html').body.textContent || ''
    } catch {
      text = String(text).replace(/<[^>]*>/g, '')
    }
  }
  return text.trim() || props.fallback
})
</script>

<template>
  <div v-if="variant === 'rich'" class="product-rich-text-content" v-html="sanitizedHtml" />
  <span v-else class="product-plain-text-content">{{ plainText }}</span>
</template>

<style scoped>
.product-rich-text-content :deep(p) {
  margin-bottom: 0.8rem;
}
.product-rich-text-content :deep(ul), .product-rich-text-content :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 0.8rem;
  list-style-position: inside;
}
.product-rich-text-content :deep(ul) {
  list-style-type: disc;
}
.product-rich-text-content :deep(ol) {
  list-style-type: decimal;
}
.product-rich-text-content :deep(strong) {
  font-weight: bold;
}
.product-rich-text-content :deep(em) {
  font-style: italic;
}
.product-rich-text-content :deep(u) {
  text-decoration: underline;
}
.product-rich-text-content :deep(a) {
  color: var(--color-primary, #000);
  text-decoration: underline;
}
</style>
