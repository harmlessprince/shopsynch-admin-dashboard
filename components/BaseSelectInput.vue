<script setup lang="ts">
import { ref } from 'vue'

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
}

const props = withDefaults(defineProps<Props>(), {
    inputClass: ''
})

defineEmits(['update:modelValue'])

const selectRef = ref<HTMLSelectElement | null>(null)

defineExpose({
    focus: () => {
        selectRef.value?.focus()
    }
})

</script>

<template>
    <div class="w-full">
        <label v-if="label" class="block text-md font-normal text-slate-700 mb-2">
            <div class="flex justify-between">
                {{ label }}
                
                <slot name="right-label" />
            </div>
        </label>
        <div class="relative">
            <span v-if="prefix"
                class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold z-10 pointer-events-none">
                {{ prefix }}
            </span>

            <select
                ref="selectRef"
                :value="modelValue"
                @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"

                class="w-full h-14 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none cursor-pointer text-slate-700"
                :class="[
                    prefix ? 'pl-10 pr-10' : 'px-4 pr-10',
                    error ? 'border-rose-500 focus:ring-rose-500' : '',
                    modelValue === '' || modelValue === undefined ? 'text-slate-400' : 'text-slate-700',
                    inputClass
                ]">
                <option v-if="placeholder" value="" disabled :selected="modelValue === '' || modelValue === undefined">
                    {{ placeholder }}
                </option>
                <option v-for="option in options" :key="option.value" :value="option.value">
                    {{ option.label }}
                </option>
            </select>

            <!-- Custom chevron icon -->
            <span class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clip-rule="evenodd" />
                </svg>
            </span>
        </div>

        <p v-if="error" class="text-xs text-rose-500 mt-1.5 font-medium">{{ error }}</p>
        <p v-else-if="hint" class="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">{{ hint }}</p>
    </div>
</template>