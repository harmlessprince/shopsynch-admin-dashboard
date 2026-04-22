<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface SelectOption {
  label: string
  value: string | number
}

interface Props {
  modelValue: string | number
  options: SelectOption[]
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  error?: string
  hint?: string
  prefix?: string
  inputClass?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  inputClass: '',
  searchPlaceholder: 'Search...',
  disabled: false
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() =>
  props.options.find(o => o.value === props.modelValue)
)

const filteredOptions = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return props.options
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

function openDropdown() {
  if (props.disabled) return
  isOpen.value = true
  searchQuery.value = ''
  setTimeout(() => searchInputRef.value?.focus(), 50)
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
}

function selectOption(option: SelectOption) {
  emit('update:modelValue', option.value)
  closeDropdown()
}

function clearSelection(e: MouseEvent) {
  e.stopPropagation()
  emit('update:modelValue', '')
  closeDropdown()
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div class="w-full" ref="containerRef" :class="{ 'opacity-50 pointer-events-none': disabled }">
    <label v-if="label" class="block text-sm font-semibold text-slate-700 mb-2">
      {{ label }}
    </label>

    <div class="relative">
      <!-- Trigger button -->
      <span
        v-if="prefix"
        class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold z-10 pointer-events-none"
      >
        {{ prefix }}
      </span>

      <button
        type="button"
        @click="isOpen ? closeDropdown() : openDropdown()"
        :disabled="disabled"
        class="w-full h-14 rounded-xl border bg-white outline-none transition-all text-left flex items-center pr-10"
        :class="[
          prefix ? 'pl-10' : 'px-4',
          error
            ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
            : isOpen
              ? 'border-transparent ring-2 ring-primary'
              : 'border-slate-200',
          disabled ? 'bg-slate-50 cursor-not-allowed' : 'cursor-pointer',
          inputClass
        ]"
      >
        <span class="truncate pr-4" :class="selectedOption ? 'text-slate-700' : 'text-slate-400'">
          {{ selectedOption ? selectedOption.label : (placeholder ?? 'Select an option') }}
        </span>
      </button>

      <!-- Action area (Clear or Chevron) -->
      <div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
         <!-- Clear button -->
         <button 
           v-if="selectedOption && !disabled" 
           type="button" 
           class="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
           @click.stop="clearSelection"
         >
           <span class="material-symbols-outlined text-sm">close</span>
         </button>

         <!-- Chevron -->
         <span
           class="pointer-events-none text-slate-400 transition-transform duration-200"
           :class="isOpen ? 'rotate-180' : ''"
         >
           <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
             <path
               fill-rule="evenodd"
               d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
               clip-rule="evenodd"
             />
           </svg>
         </span>
      </div>

      <!-- Dropdown panel -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-1 scale-95"
      >
        <div
          v-if="isOpen"
          class="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          <!-- Search input -->
          <div class="p-2 border-b border-slate-100">
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                :placeholder="searchPlaceholder"
                type="text"
                class="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <!-- Options list -->
          <ul class="max-h-52 overflow-y-auto py-1">
            <li v-if="filteredOptions.length === 0" class="px-4 py-3 text-sm text-slate-400 text-center">
              No results for "{{ searchQuery }}"
            </li>
            <li
              v-for="option in filteredOptions"
              :key="option.value"
              @click="selectOption(option)"
              class="flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors"
              :class="
                option.value === modelValue
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              "
            >
              {{ option.label }}

              <!-- Checkmark for selected -->
              <svg
                v-if="option.value === modelValue"
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clip-rule="evenodd"
                />
              </svg>
            </li>
          </ul>
        </div>
      </Transition>
    </div>

    <p v-if="error" class="text-xs text-rose-500 mt-1.5 font-medium">{{ error }}</p>
    <p v-else-if="hint" class="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">{{ hint }}</p>
  </div>
</template>