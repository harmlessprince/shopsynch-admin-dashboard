<script setup>
import { ref, watch, nextTick } from 'vue'
import { debounce } from '~/utils/helpers.js'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Search...',
  },
  debounceMs: {
    type: Number,
    default: 400,
  },
  dataTour: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(Boolean(props.modelValue))
const inputRef = ref(null)
const searchText = ref(props.modelValue)

const debouncedEmit = debounce((value) => emit('update:modelValue', value || ''), props.debounceMs)
watch(searchText, (value) => debouncedEmit(value))

// Keep in sync if a parent clears/sets the model directly (e.g. resetting all filters)
watch(() => props.modelValue, (value) => {
  if (value !== searchText.value) {
    searchText.value = value
    if (value) isOpen.value = true
  }
})

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => inputRef.value?.focus())
  } else {
    clear()
  }
}

function clear() {
  searchText.value = ''
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    isOpen.value = false
    clear()
  }
}
</script>

<template>
  <div
    class="flex items-center gap-x-[12px] text-ink-muted"
    :class="isOpen ? 'w-full sm:w-auto' : 'w-auto'"
  >
    <div
      class="flex items-center gap-2"
      :class="isOpen ? 'flex-1 sm:flex-none' : ''"
    >
      <div
        class="overflow-hidden transition-all duration-300 ease-in-out"
        :class="isOpen ? 'w-full sm:w-[32rem]' : 'w-0'"
      >
        <div class="relative">
          <input
            ref="inputRef"
            v-model="searchText"
            type="text"
            :placeholder="placeholder"
            :aria-label="placeholder || 'Search'"
            class="ds-input pr-[44px]"
            @keydown="handleKeydown"
          >
          <button
            type="button"
            class="absolute right-[6px] top-1/2 -translate-y-1/2 flex size-[32px] items-center justify-center rounded-[8px] text-ink-muted hover:bg-canvas focus-visible:outline-2 focus-visible:outline-ss-blue transition-colors duration-[120ms] cursor-pointer"
            :aria-label="searchText ? 'Clear search' : 'Close search'"
            @click="searchText ? clear() : toggle()"
          >
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>
      </div>
      <button
        type="button"
        :data-tour="dataTour || undefined"
        class="flex size-[40px] items-center justify-center shrink-0 rounded-btn text-ss-teal-strong hover:bg-canvas focus-visible:outline-2 focus-visible:outline-ss-blue touch-manipulation transition-colors duration-[120ms] cursor-pointer"
        :aria-label="isOpen ? 'Close search' : 'Open search'"
        :aria-expanded="isOpen"
        @click="toggle"
      >
        <span class="material-symbols-outlined text-[22px]" aria-hidden="true">
          search
        </span>
      </button>
    </div>
  </div>
</template>
