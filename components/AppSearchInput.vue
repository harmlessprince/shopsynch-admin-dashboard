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
    class="flex items-center gap-x-[1.2rem] text-[#616161]"
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
            class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white py-2 pl-[1.8rem] pr-[4.8rem] text-[1.6rem] text-[#1B1B19] outline-none transition placeholder:text-[#BDBDBD] focus:border-primary focus:ring-2 focus:ring-primary/10"
            @keydown="handleKeydown"
          >
          <button
            type="button"
            class="absolute right-[0.6rem] top-1/2 -translate-y-1/2 flex h-[4rem] w-[4rem] items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
            :aria-label="searchText ? 'Clear search' : 'Close search'"
            @click="searchText ? clear() : toggle()"
          >
            <span class="material-symbols-outlined text-[2rem]" aria-hidden="true">close</span>
          </button>
        </div>
      </div>
      <button
        type="button"
        :data-tour="dataTour || undefined"
        class="flex min-h-[44px] min-w-[44px] items-center justify-center shrink-0 rounded-lg text-[#616161] hover:text-[#003366] focus:ring-2 focus:ring-primary focus:outline-none touch-manipulation transition-colors cursor-pointer"
        :class="isOpen ? 'opacity-100' : 'opacity-70'"
        :aria-label="isOpen ? 'Close search' : 'Open search'"
        :aria-expanded="isOpen"
        @click="toggle"
      >
        <span class="material-symbols-outlined text-[2.4rem]" aria-hidden="true">search</span>
      </button>
    </div>
  </div>
</template>
