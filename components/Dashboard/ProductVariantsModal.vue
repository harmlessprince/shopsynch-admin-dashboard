<script setup>
import { VueFinalModal } from 'vue-final-modal'
import Spinner from '~/components/Spinner.vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  productName: {
    type: String,
    default: '',
  },
  variants: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:open'])

function getStatus(item) {
  const qty = Number(item?.availableQty ?? 0)
  const reorderLevel = Number(item?.reorderLevel ?? 0)
  if (qty <= 0) return 'out-of-stock'
  if (reorderLevel > 0 && qty <= reorderLevel) return 'low-stock'
  return 'in-stock'
}

function resolveRowUnitLabel(item) {
  if (!item) return 'Units'
  if (item.baseUnitLabel) return item.baseUnitLabel
  if (item.baseUnitKey) return item.baseUnitKey
  if (item.onHandBreakdown?.[0]?.unitLabel) return item.onHandBreakdown[0].unitLabel
  if (item.availableBreakdown?.[0]?.unitLabel) return item.availableBreakdown[0].unitLabel
  if (item.unitCategory) {
    return item.unitCategory.charAt(0).toUpperCase() + item.unitCategory.slice(1).toLowerCase()
  }
  return 'Units'
}

function formatUnitBreakdown(breakdown) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return ''
  return breakdown
    .map(b => `${b.quantity ?? 0} ${b.unitLabel || b.unitKey || 'units'}`)
    .join(' · ')
}

function formatVariantAttributes(attrs) {
  if (!attrs || typeof attrs !== 'object') return ''
  return Object.entries(attrs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' / ')
}
</script>

<template>
  <VueFinalModal
    :model-value="open"
    class="flex items-center justify-center p-4"
    content-class="relative bg-white rounded-2xl shadow-xl w-[calc(100vw-3.2rem)] sm:w-full max-w-2xl p-6 space-y-4 max-h-[85vh] flex flex-col overflow-hidden"
    overlay-class="bg-black/40 backdrop-blur-sm"
    :lock-scroll="false"
    @update:model-value="(val) => emit('update:open', val)"
    @click-outside="emit('update:open', false)"
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
      <div>
        <h3 class="text-[1.8rem] font-bold text-primary">{{ productName || 'Product Variants' }}</h3>
        <p class="text-[1.3rem] text-slate-400">All variant SKU stock records across branches</p>
      </div>
      <button
        type="button"
        aria-label="Close modal"
        class="p-2 hover:bg-slate-50 rounded-full focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
        @click="emit('update:open', false)"
      >
        <span class="material-symbols-outlined text-slate-400" aria-hidden="true">close</span>
      </button>
    </div>

    <!-- Body -->
    <div v-if="loading" class="flex-1 flex items-center justify-center py-12">
      <Spinner width="40px" height="40px" />
    </div>

    <div v-else-if="!variants || variants.length === 0" class="flex-1 flex flex-col items-center justify-center py-12 text-center">
      <span class="material-symbols-outlined text-slate-300 text-[5rem]">layers</span>
      <p class="text-[1.4rem] text-slate-400 mt-3">No variant records found for this product.</p>
    </div>

    <div v-else class="overflow-y-auto space-y-3 flex-1 pr-1">
      <div
        v-for="v in variants"
        :key="v.id"
        class="border border-slate-100 rounded-xl p-4 space-y-2 hover:border-slate-200 transition-colors"
      >
        <div class="flex items-center justify-between">
          <span class="font-mono text-[1.3rem] font-bold text-primary">{{ v.inventoryCode || v.skuId || v.id }}</span>
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[1.1rem] font-semibold"
            :class="{
              'bg-green-50 text-green-700': getStatus(v) === 'in-stock',
              'bg-amber-50 text-amber-700': getStatus(v) === 'low-stock',
              'bg-red-50 text-red-600': getStatus(v) === 'out-of-stock',
            }"
          >
            {{ getStatus(v) === 'in-stock' ? 'In Stock' : getStatus(v) === 'low-stock' ? 'Low Stock' : 'Out of Stock' }}
          </span>
        </div>
        <p v-if="v.variantAttributes && Object.keys(v.variantAttributes).length" class="text-[1.2rem] text-slate-500">
          {{ formatVariantAttributes(v.variantAttributes) }}
        </p>
        <div class="grid grid-cols-3 gap-3 mt-1 text-[1.3rem]">
          <div class="bg-slate-50 rounded-lg p-2 text-center">
            <p class="text-slate-400 text-[1.1rem] font-semibold uppercase tracking-wide">On Hand</p>
            <p class="font-bold text-primary text-[1.6rem]">{{ v.onHandQty ?? 0 }} {{ resolveRowUnitLabel(v) }}</p>
            <p v-if="formatUnitBreakdown(v.onHandBreakdown)" class="text-slate-400 text-[1.1rem]">{{ formatUnitBreakdown(v.onHandBreakdown) }}</p>
          </div>
          <div class="bg-slate-50 rounded-lg p-2 text-center">
            <p class="text-slate-400 text-[1.1rem] font-semibold uppercase tracking-wide">Reserved</p>
            <p class="font-bold text-amber-600 text-[1.6rem]">{{ v.reservedQty ?? 0 }} {{ resolveRowUnitLabel(v) }}</p>
            <p v-if="formatUnitBreakdown(v.reservedBreakdown)" class="text-slate-400 text-[1.1rem]">{{ formatUnitBreakdown(v.reservedBreakdown) }}</p>
          </div>
          <div class="bg-slate-50 rounded-lg p-2 text-center">
            <p class="text-slate-400 text-[1.1rem] font-semibold uppercase tracking-wide">Available</p>
            <p class="font-bold text-[1.6rem]" :class="v.availableQty <= 0 ? 'text-red-500' : 'text-green-600'">{{ v.availableQty ?? 0 }} {{ resolveRowUnitLabel(v) }}</p>
            <p v-if="formatUnitBreakdown(v.availableBreakdown)" class="text-slate-400 text-[1.1rem]">{{ formatUnitBreakdown(v.availableBreakdown) }}</p>
          </div>
        </div>
        <p class="text-[1.2rem] text-slate-400">{{ v.branchName || v.warehouseName || 'No branch' }}</p>
      </div>
    </div>
  </VueFinalModal>
</template>
