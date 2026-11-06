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
  allowCreate?: boolean
  customValue?: string
  createLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: 'Select an option',
  error: '',
  hint: '',
  prefix: '',
  inputClass: '',
  searchPlaceholder: 'Search...',
  disabled: false,
  allowCreate: false,
  customValue: '',
  createLabel: 'Create'
})

const emit = defineEmits(['update:modelValue', 'update:customValue', 'create'])

const isOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() =>
  (props.options || []).find(o => o.value === props.modelValue)
)

const selectedLabel = computed(() =>
  selectedOption.value?.label || props.customValue || ''
)

const trimmedSearchQuery = computed(() => searchQuery.value.trim())

const filteredOptions = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return props.options || []
  return (props.options || []).filter(o => o.label.toLowerCase().includes(q))
})

const canCreateOption = computed(() =>
  props.allowCreate && trimmedSearchQuery.value.length > 0 && filteredOptions.value.length === 0
)

function openDropdown() {
  if (props.disabled) return
  isOpen.value = true
  searchQuery.value = props.customValue || ''
  setTimeout(() => searchInputRef.value?.focus(), 50)
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
}

function selectOption(option: SelectOption) {
  emit('update:modelValue', option.value)
  if (props.allowCreate) emit('update:customValue', '')
  closeDropdown()
}

function createOption() {
  if (!canCreateOption.value) return
  emit('update:modelValue', '')
  emit('update:customValue', trimmedSearchQuery.value)
  emit('create', trimmedSearchQuery.value)
  closeDropdown()
}

function clearSelection(e: MouseEvent) {
  e.stopPropagation()
  emit('update:modelValue', '')
  if (props.allowCreate) emit('update:customValue', '')
  closeDropdown()
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') document.addEventListener('mousedown', handleClickOutside)
})
onUnmounted(() => {
  if (typeof document !== 'undefined') document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div class="w-full" ref="containerRef" :class="{ 'opacity-50 pointer-events-none': disabled }">
    <label v-if="label" class="ds-label mb-[6px]">
      {{ label }}
    </label>

    <div class="relative">
      <!-- Trigger button -->
      <span
        v-if="prefix"
        class="absolute left-[12px] top-1/2 -translate-y-1/2 text-ink-muted font-medium z-10 pointer-events-none"
      >
        {{ prefix }}
      </span>

      <button
        type="button"
        @click="isOpen ? closeDropdown() : openDropdown()"
        :disabled="disabled"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-invalid="!!error"
        :aria-controls="isOpen ? 'searchable-select-options' : undefined"
        :aria-describedby="error ? 'error-msg' : hint ? 'hint-msg' : undefined"
        :aria-label="selectedLabel || label || placeholder || 'Select an option'"
        class="ds-input flex items-center text-left pr-[64px]"
        :class="[
          prefix ? 'pl-[40px]' : '',
          error ? 'ds-input--error' : '',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          inputClass
        ]"
      >
        <span class="truncate" :class="selectedLabel ? 'text-ink' : 'text-ink-muted'">
          {{ selectedLabel || (placeholder ?? 'Select an option') }}
        </span>
      </button>

      <!-- Action area (Clear or Chevron) -->
      <div class="absolute right-[12px] top-1/2 -translate-y-1/2 flex items-center gap-[4px]">
         <!-- Clear button -->
         <button 
           v-if="selectedLabel && !disabled" 
           type="button" 
           class="p-[2px] hover:bg-primary/5 rounded-input transition-colors text-ink-muted hover:text-ink cursor-pointer"
           @click.stop="clearSelection"
           aria-label="Clear selection"
         >
           <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
         </button>

         <!-- Chevron -->
         <span
           class="material-symbols-outlined ds-field-icon pointer-events-none transition-transform duration-200"
           :class="isOpen ? 'rotate-180' : ''"
           aria-hidden="true"
         >
           expand_more
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
          class="absolute z-50 mt-[8px] w-full bg-surface border border-hairline rounded-input shadow-overlay overflow-hidden"
        >
          <!-- Search input -->
          <div class="p-[8px] border-b border-hairline">
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true">
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
                :aria-label="searchPlaceholder"
                type="text"
                class="ds-input pl-[36px]"
              />
            </div>
          </div>

          <!-- Options list -->
          <ul id="searchable-select-options" role="listbox" class="max-h-[240px] overflow-y-auto py-[4px]">
            <li v-if="filteredOptions.length === 0 && !canCreateOption" class="px-[12px] py-[8px] text-[14px] text-ink-muted text-center" role="option" aria-selected="false">
              No results for "{{ searchQuery }}"
            </li>
            <li
              v-for="option in filteredOptions"
              :key="option.value"
              @click="selectOption(option)"
              role="option"
              :aria-selected="option.value === modelValue"
              class="flex items-center justify-between px-[12px] py-[8px] text-[14px] cursor-pointer transition-colors"
              :class="
                option.value === modelValue
                  ? 'bg-primary/10 text-ink font-semibold'
                  : 'text-ink hover:bg-primary/5'
              "
            >
              {{ option.label }}

              <!-- Checkmark for selected -->
              <svg
                v-if="option.value === modelValue"
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 shrink-0 text-primary"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clip-rule="evenodd"
                />
              </svg>
            </li>
            <li
              v-if="canCreateOption"
              @click="createOption"
              role="option"
              aria-selected="false"
              class="flex items-center gap-[8px] px-[12px] py-[8px] text-[14px] cursor-pointer transition-colors text-ink hover:bg-primary/5 font-semibold border-t border-hairline"
            >
              <span class="material-symbols-outlined text-base" aria-hidden="true">add</span>
              {{ createLabel }} "{{ trimmedSearchQuery }}"
            </li>
          </ul>
        </div>
      </Transition>
    </div>

    <p v-if="error" id="error-msg" class="ds-helper ds-helper--error">{{ error }}</p>
    <p v-else-if="hint" id="hint-msg" class="ds-helper">{{ hint }}</p>
  </div>
</template>
