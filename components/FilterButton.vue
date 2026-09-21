<script setup>
import { computed } from 'vue'

const props = defineProps({
  hasActiveFilters: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: '',
  },
  defaultLabel: {
    type: String,
    default: 'Filters',
  },
  activeLabel: {
    type: String,
    default: 'Filters applied',
  },
  icon: {
    type: String,
    default: 'filter_alt',
  },
  dataTour: {
    type: String,
    default: '',
  },
  showClear: {
    type: Boolean,
    default: true,
  },
  clearAriaLabel: {
    type: String,
    default: 'Clear filters',
  },
  containerClass: {
    type: [String, Array, Object],
    default: '',
  },
  buttonClass: {
    type: [String, Array, Object],
    default: '',
  },
})

const emit = defineEmits(['click', 'open', 'reset', 'clear'])

const displayLabel = computed(() => {
  if (props.label) return props.label
  return props.hasActiveFilters ? props.activeLabel : props.defaultLabel
})

function handleClick(event) {
  emit('click', event)
  emit('open', event)
}

function handleReset(event) {
  emit('reset', event)
  emit('clear', event)
}
</script>

<template>
  <div
    class="flex w-full items-center gap-2 lg:w-auto"
    :class="containerClass"
  >
    <button
      type="button"
      :data-tour="dataTour || undefined"
      class="flex min-h-[4.8rem] w-full items-center justify-center gap-2 rounded-lg px-[1.6rem] text-[1.3rem] font-semibold transition-all lg:w-auto cursor-pointer"
      :class="[
        hasActiveFilters
          ? 'bg-primary text-white'
          : 'bg-slate-50 border border-slate-200 text-secondary hover:text-primary',
        buttonClass,
      ]"
      @click="handleClick"
    >
      <span class="material-symbols-outlined text-[1.4rem]">{{ icon }}</span>
      {{ displayLabel }}
    </button>
    <button
      v-if="hasActiveFilters && showClear"
      type="button"
      class="flex h-[4.8rem] w-[4.8rem] shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
      :aria-label="clearAriaLabel"
      @click.stop="handleReset"
    >
      <span class="material-symbols-outlined text-[1.8rem]">close</span>
    </button>
  </div>
</template>
