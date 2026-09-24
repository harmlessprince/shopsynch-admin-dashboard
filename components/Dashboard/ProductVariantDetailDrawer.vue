<script setup>
import { computed } from 'vue'
import { formatToMoney } from '~/utils/helpers.js'
import { useToastStore } from '~/stores/toast.store.js'
import Drawer from '~/components/Drawer.vue'
import BaseButton from '~/components/BaseButton.vue'
import ProfitBasisTooltip from '~/components/Dashboard/ProfitBasisTooltip.vue'

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  variant: {
    type: Object,
    default: null,
  },
  productName: {
    type: String,
    default: '',
  },
  unitLabel: {
    type: String,
    default: 'Units',
  },
})

const emit = defineEmits(['update:open'])
const toastStore = useToastStore()

const close = () => {
  emit('update:open', false)
}

const copyToClipboard = async (text, label) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(String(text))
    toastStore.showToast(`${label} copied to clipboard`, 'success')
  } catch {
    toastStore.showToast(`Failed to copy ${label}`, 'error')
  }
}

const humanizeKey = (key = '') =>
  String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const statusClass = computed(() => {
  const status = props.variant?.inventoryStatus
  if (status === 'out-of-stock') return 'bg-rose-50 text-rose-700 border border-rose-200'
  if (status === 'low-stock') return 'bg-amber-50 text-amber-800 border border-amber-200'
  return 'bg-emerald-50 text-emerald-800 border border-emerald-200'
})

const statusDotColor = computed(() => {
  const status = props.variant?.inventoryStatus
  if (status === 'out-of-stock') return 'bg-rose-500'
  if (status === 'low-stock') return 'bg-amber-500'
  return 'bg-emerald-500'
})

const statusLabel = computed(() => {
  const status = props.variant?.inventoryStatus
  if (status === 'out-of-stock') return 'Sold Out'
  if (status === 'low-stock') return 'Low Stock Alert'
  return 'Active · In Stock'
})

const attributeEntries = computed(() => {
  if (!props.variant?.attributes) return []
  return Object.entries(props.variant.attributes).filter(([_, v]) => v !== null && v !== undefined && v !== '')
})
</script>

<template>
  <Drawer content-class="bg-white p-0 w-full max-w-xl" :open="open" @update:open="$emit('update:open', $event)">
    <div v-if="variant" class="flex flex-col h-full bg-white">
      <!-- Drawer Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-200">
        <div class="min-w-0 pr-4">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-widest text-primary">Variant Details</span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold" :class="statusClass">
              <span class="w-1.5 h-1.5 rounded-full" :class="statusDotColor" />
              {{ statusLabel }}
            </span>
          </div>
          <h2 class="text-xl font-bold text-slate-900 tracking-tight truncate mt-1" :title="variant.displayName">
            {{ variant.displayName }}
          </h2>
          <p v-if="productName" class="text-xs text-slate-400 truncate mt-0.5">Parent: {{ productName }}</p>
        </div>
        <button
          type="button"
          class="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
          aria-label="Close drawer"
          @click="close"
        >
          <span class="material-symbols-outlined text-2xl" aria-hidden="true">close</span>
        </button>
      </div>

      <!-- Drawer Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Hero Visual & Key Identifiers -->
        <div class="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div class="w-20 h-20 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
            <img
              :src="variant.displayImage || variant.image || '/placeholder-img.png'"
              :alt="variant.displayName"
              class="w-full h-full object-contain"
            >
          </div>
          <div class="min-w-0 space-y-1">
            <div class="flex items-center gap-1.5 font-mono text-sm text-slate-800">
              <span class="text-slate-400 text-xs">SKU:</span>
              <strong class="font-bold truncate">{{ variant.sku?.sku || variant.sku || '—' }}</strong>
              <button
                v-if="variant.sku?.sku || variant.sku"
                type="button"
                class="text-slate-400 hover:text-primary cursor-pointer transition-colors"
                title="Copy SKU"
                @click="copyToClipboard(variant.sku?.sku || variant.sku, 'Variant SKU')"
              >
                <span class="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
            <p v-if="variant.gtinBarcode" class="font-mono text-xs text-slate-500">
              Barcode: {{ variant.gtinBarcode }}
            </p>
          </div>
        </div>

        <!-- Pricing & Margin Card -->
        <div class="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
          <p class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Pricing & Profitability</p>
          <div class="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <span class="text-2xl font-black text-primary tabular-nums tracking-tight">
                {{ formatToMoney(variant.effectivePrice || variant.price || 0) }}
              </span>
              <span
                v-if="variant.isOnSale && variant.price"
                class="ml-2 text-sm font-semibold text-slate-400 line-through tabular-nums"
              >
                {{ formatToMoney(variant.price) }}
              </span>
            </div>
            <div v-if="variant.profit !== null && variant.profit !== undefined">
              <ProfitBasisTooltip :profit="variant.profit" size="sm" />
            </div>
          </div>
        </div>

        <!-- Inventory Stock & Thresholds Card -->
        <div class="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Inventory Levels</p>
            <NuxtLink
              v-if="variant.inventory?.id"
              :to="`/dashboard/inventory/${variant.inventory.id}`"
              class="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              title="Open full inventory ledger"
            >
              <span>Ledger Record</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </NuxtLink>
          </div>

          <div class="grid grid-cols-3 gap-2.5 text-center">
            <div class="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available</p>
              <p class="text-lg font-black tabular-nums mt-0.5" :class="variant.availableQty > 0 ? 'text-emerald-700' : 'text-rose-600'">
                {{ variant.availableQty ?? 0 }}
              </p>
            </div>
            <div class="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reorder Alert</p>
              <p class="text-lg font-black text-slate-800 tabular-nums mt-0.5">
                {{ variant.reorderLevel ?? '—' }}
              </p>
            </div>
            <div class="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Restock Target</p>
              <p class="text-lg font-black text-slate-800 tabular-nums mt-0.5">
                {{ variant.reorderQty ?? '—' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Variant Attributes -->
        <div v-if="attributeEntries.length" class="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
          <p class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Attributes & Options</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="([key, val]) in attributeEntries"
              :key="key"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold"
            >
              <span class="text-slate-500">{{ humanizeKey(key) }}:</span>
              <strong class="font-bold text-slate-900">{{ val }}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- Drawer Footer -->
      <div class="p-5 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
        <BaseButton variant="outline" class="h-10 text-xs px-4" @click="close">
          Close
        </BaseButton>
        <NuxtLink
          v-if="variant.inventory?.id"
          :to="`/dashboard/inventory/${variant.inventory.id}`"
          class="h-10 px-4 rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-primary font-bold text-xs transition-all inline-flex items-center gap-1.5 shadow-2xs"
        >
          <span class="material-symbols-outlined text-base">inventory</span>
          <span>View Inventory Ledger</span>
        </NuxtLink>
      </div>
    </div>
  </Drawer>
</template>
