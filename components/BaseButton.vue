<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  block?: boolean,
  radius?: string,
  bold?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button',
  block: false,
  radius: '100px'
})

const variants = {
  primary: 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95',
  secondary: 'bg-secondary text-white hover:bg-secondary/90 active:scale-95',
  outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 active:scale-95',
  ghost: 'active:scale-95',
  danger: 'bg-rose-500 text-white shadow-lg shadow-rose-200 hover:bg-rose-600 active:scale-95'
}

const sizes = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-14 px-6 text-base',
  lg: 'h-16 px-8 text-lg'
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none"
    :class="[
      variants[variant],
      sizes[size],
      block ? 'w-full' : '',
      bold ? 'font-bold' : 'font-medium'
    ]"
  >
    <div v-if="loading" class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
    <slot v-else />
  </button>
</template>
