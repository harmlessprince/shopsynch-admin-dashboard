<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  block?: boolean
  bold?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button',
  block: false,
  bold: false
})

const variants = {
  primary: 'bg-primary text-white hover:brightness-[.95] active:brightness-90 shadow-sm',
  secondary: 'bg-secondary text-white hover:bg-secondary/90 active:scale-95',
  outline: 'border border-hairline bg-surface text-ink hover:bg-canvas active:bg-[#F2F4F7]',
  ghost: 'text-ink hover:bg-canvas active:bg-[#F2F4F7]',
  danger: 'bg-danger text-white hover:brightness-[.95] active:bg-danger-strong',
  link: 'text-primary hover:underline'
}

const sizes = {
  sm: 'h-[40px] px-[16px] text-[14px] [&_.material-symbols-outlined]:text-[18px]',
  md: 'h-[48px] px-[20px] text-[15px] [&_.material-symbols-outlined]:text-[20px]',
  lg: 'h-[56px] px-[24px] text-[16px] [&_.material-symbols-outlined]:text-[22px]'
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-[8px] rounded-btn transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
    :class="[
      variants[variant] || variants.primary,
      sizes[size] || sizes.md,
      block ? 'w-full' : '',
      bold ? 'font-bold' : 'font-medium'
    ]"
  >
    <div v-if="loading" class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"/>
    <slot v-else />
  </button>
</template>
