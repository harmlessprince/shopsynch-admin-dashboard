<script setup lang="ts">
import { ref, computed } from 'vue'

interface SelectOption {
    label: string
    value: string | number
}

interface Props {
    modelValue: string | number
    options: SelectOption[]
    label?: string
    placeholder?: string
    error?: string
    hint?: string
    prefix?: string
    inputClass?: string
    name?: string
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    inputClass: '',
    name: undefined
})

defineEmits(['update:modelValue'])

const selectRef = ref<HTMLSelectElement | null>(null)

defineExpose({
    focus: () => {
        selectRef.value?.focus()
    }
})

const defaultId = useId()
const selectId = computed(() => props.name || defaultId)
</script>

<template>
    <div class="w-full">
        <label v-if="label" :for="selectId" class="ds-label mb-[6px]">
            <div class="flex justify-between">
                {{ label }}
                
                <slot name="right-label" />
            </div>
        </label>
        <div class="relative">
            <span
v-if="prefix"
                class="absolute left-[12px] top-1/2 -translate-y-1/2 text-ink-muted font-medium z-10 pointer-events-none">
                {{ prefix }}
            </span>

            <select
                :id="selectId"
                ref="selectRef"
                :value="modelValue"
                :name="name || selectId"
                :disabled="disabled"
                :aria-invalid="!!error"
                :aria-describedby="error ? selectId + '-error' : hint ? selectId + '-hint' : undefined"
                class="ds-input appearance-none cursor-pointer pr-[40px] disabled:cursor-not-allowed"

                :class="[
                    prefix ? 'pl-[40px]' : '',
                    error ? 'ds-input--error' : '',
                    modelValue === '' || modelValue === undefined ? 'text-ink-muted' : 'text-ink',
                    inputClass
                ]"
                @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
                <option v-if="placeholder" value="" disabled :selected="modelValue === '' || modelValue === undefined">
                    {{ placeholder }}
                </option>
                <option v-for="option in options" :key="option.value" :value="option.value" :selected="option.value == modelValue">
                    {{ option.label }}
                </option>
            </select>

            <!-- Custom chevron icon -->
            <span class="material-symbols-outlined ds-field-icon absolute right-[12px] top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">expand_more</span>
        </div>

        <p v-if="error" :id="selectId + '-error'" class="ds-helper ds-helper--error">{{ error }}</p>
        <p v-else-if="hint" :id="selectId + '-hint'" class="ds-helper">{{ hint }}</p>
    </div>
</template>
