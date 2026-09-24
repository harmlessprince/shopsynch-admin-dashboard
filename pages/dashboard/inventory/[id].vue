<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInventoryStore } from '~/stores/inventory.store.js'
import { useStoreStore } from '~/stores/store.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { formatDate, formatToMoney, logger } from '~/utils/helpers.js'
import AppMoneyInput from '~/components/AppMoneyInput.vue'
import FifoBatchDrawer from '~/components/Dashboard/FifoBatchDrawer.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth-middleware',
  name: 'dashboard-inventory-id',
  pageTitle: 'Inventory Detail & Restock',
})

useHead({
  title: 'Inventory Detail & Restock - ShopSynch Admin',
})

const route = useRoute()
const router = useRouter()
const inventoryStore = useInventoryStore()
const storeStore = useStoreStore()
const toastStore = useToastStore()

const isWeightedAverage = computed(() => {
  const method = inventoryStore.currentItem?.costingMethod || storeStore.storeSettings?.costingMethod || 'WEIGHTED_AVERAGE'
  return method === 'WEIGHTED_AVERAGE'
})
const isFifoDrawerOpen = ref(false)

const inventoryId = route.params.id

// Data state
const loading = ref(true)
const logsLoading = ref(true)

async function loadData() {
  loading.value = true
  logsLoading.value = true
  try {
    await Promise.all([
      inventoryStore.fetchInventoryById(inventoryId),
      inventoryStore.fetchInventoryLogsById(inventoryId),
    ])
  } catch (err) {
    logger.error('Failed to load inventory details', err)
    if (!isHttpError(err)) {
      toastStore.error(err.message || 'Failed to load inventory details')
    }
  } finally {
    loading.value = false
    logsLoading.value = false
  }
}

onMounted(() => loadData())

const item = computed(() => inventoryStore.currentItem)
const logs = computed(() => inventoryStore.currentItemLogs ?? [])

const productSummary = computed(() => item.value?.product ?? {})

const currentStockPrice = computed(() => firstPresent(
  productSummary.value.basePrice,
  item.value?.basePrice,
  item.value?.price,
))

const currentUnitCost = computed(() => firstPresent(
  item.value?.avgUnitCost,
  productSummary.value.costPrice,
  item.value?.unitCost,
  item.value?.costPrice,
))

const currentSalePrice = computed(() => firstPresent(
  productSummary.value.effectivePrice,
  productSummary.value.salesPrice,
  productSummary.value.newPrice,
  item.value?.effectivePrice,
  item.value?.salesPrice,
  item.value?.newPrice,
))

const hasPromotionalPrice = computed(() => {
  if (currentSalePrice.value == null || currentStockPrice.value == null) return false
  return Number(currentSalePrice.value) < Number(currentStockPrice.value)
})

const unitLabel = computed(() => {
  if (!item.value) return 'Units'
  if (item.value.baseUnitLabel) return item.value.baseUnitLabel
  if (item.value.baseUnitKey) return item.value.baseUnitKey
  if (item.value.onHandBreakdown && item.value.onHandBreakdown.length > 0 && item.value.onHandBreakdown[0].unitLabel) {
    return item.value.onHandBreakdown[0].unitLabel
  }
  if (item.value.availableBreakdown && item.value.availableBreakdown.length > 0 && item.value.availableBreakdown[0].unitLabel) {
    return item.value.availableBreakdown[0].unitLabel
  }
  if (item.value.unitCategory) {
    const uc = String(item.value.unitCategory).toLowerCase()
    return uc.charAt(0).toUpperCase() + uc.slice(1)
  }
  return 'Units'
})

// Status helper
function getStatusBadge(itemData) {
  if (!itemData) return { label: 'Unknown', class: 'bg-slate-100 text-slate-600' }
  const avail = itemData.availableQty ?? 0
  const reorder = itemData.reorderLevel ?? 0
  if (avail <= 0) return { label: 'Out of Stock', class: 'bg-red-100 text-red-700' }
  if (reorder > 0 && avail <= reorder) return { label: 'Low Stock', class: 'bg-orange-100 text-orange-700' }
  return { label: 'In Stock', class: 'bg-green-100 text-green-700' }
}

function formatVariantAttributes(attrs) {
  if (!attrs || typeof attrs !== 'object') return 'No variants'
  const entries = Object.entries(attrs).filter(([, v]) => v != null && v !== '')
  if (!entries.length) return 'No variants'
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
}

function firstPresent(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== '') ?? null
}

function formatMoneyOrDash(value) {
  return value !== null && value !== undefined && value !== '' ? formatToMoney(value) : '—'
}

function isHttpError(err) {
  return Boolean(err?.response?.status || err?.statusCode)
}

// Restock / Stock Adjustment Form State
const ADJUST_ACTIONS = [
  { label: 'Received (Restock)', value: 'RECEIVED', note: 'Adds received units to on-hand and available stock.' },
  { label: 'Sold', value: 'SOLD', note: 'Deducts sold units from on-hand and available stock.' },
  { label: 'Damaged', value: 'DAMAGED', note: 'Deducts damaged units from available stock.' },
  { label: 'Returned', value: 'RETURNED', note: 'Adds customer returned units back to available stock.' },
  { label: 'Transferred In', value: 'TRANSFERRED_IN', note: 'Adds units transferred from another location.' },
  { label: 'Transferred Out', value: 'TRANSFERRED_OUT', note: 'Deducts units transferred to another location.' },
]

const form = reactive({
  action: 'RECEIVED',
  qty: 1,
  unitCost: null,
  reference: '',
  notes: '',
  submitting: false,
})

const currentActionNote = computed(() => ADJUST_ACTIONS.find((a) => a.value === form.action)?.note ?? '')

async function handleAdjustmentSubmit() {
  if (form.qty < 1) {
    toastStore.error('Adjustment quantity must be at least 1')
    return
  }
  form.submitting = true
  try {
    const payload = {
      qty: Number(form.qty),
      action: form.action,
      reference: form.reference?.trim() || null,
      notes: form.notes?.trim() || null,
      version: item.value?.version,
    }
    if (form.action === 'RECEIVED' && form.unitCost !== null && form.unitCost !== '' && !isNaN(Number(form.unitCost))) {
      payload.unitCost = Number(form.unitCost)
    }
    const response = await inventoryStore.adjustStock(inventoryId, payload)
    toastStore.success(response?.message || 'Stock adjusted successfully.')
    // Reset form fields
    form.qty = 1
    form.unitCost = null
    form.reference = ''
    form.notes = ''
    // Refresh page data
    await loadData()
  } catch (err) {
    logger.error('Stock adjustment failed', err)
    if (!isHttpError(err)) {
      toastStore.error(err.message || 'Failed to adjust stock')
    }
  } finally {
    form.submitting = false
  }
}

// Movement log helpers
function actionBadgeClass(action) {
  const map = {
    RECEIVED: 'bg-green-100 text-green-700',
    RELEASED: 'bg-blue-100 text-blue-700',
    RETURNED: 'bg-indigo-100 text-indigo-700',
    TRANSFERRED_IN: 'bg-teal-100 text-teal-700',
    SOLD: 'bg-slate-100 text-slate-700',
    RESERVED: 'bg-amber-100 text-amber-700',
    DAMAGED: 'bg-red-100 text-red-700',
    TRANSFERRED_OUT: 'bg-purple-100 text-purple-700',
  }
  return map[action] ?? 'bg-slate-100 text-slate-600'
}

function formatQtyChange(change) {
  if (change == null) return '—'
  const num = Number(change)
  if (num > 0) return `+${num}`
  return `${num}`
}

function getAdjustedByLabel(log) {
  return firstPresent(log?.adjustedByName, log?.adjustedByEmail, log?.adjustedBy) || 'System'
}

function qtyChangeClass(change) {
  if (change == null) return 'text-slate-600'
  const num = Number(change)
  if (num > 0) return 'text-green-600 font-bold'
  if (num < 0) return 'text-red-600 font-bold'
  return 'text-slate-600 font-semibold'
}
</script>

<template>
  <div class="text-dashboard_text_color text-[1.6rem] leading-[22.5px] font-[400] pb-[4rem]">
    <DashboardContainer>
      <!-- Back Navigation Header -->
      <div class="mb-[2.4rem] flex items-center justify-between gap-4">
        <button
          type="button"
          class="flex h-[4rem] w-[4rem] items-center justify-center rounded-[8px] border border-slate-200 text-[#292D32] transition-colors hover:bg-white"
          aria-label="Go back"
          @click="router.back()"
        >
          <span class="material-symbols-outlined text-[2.4rem]">arrow_back</span>
        </button>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/dashboard/inventory"
            class="px-[1.6rem] py-[0.8rem] text-[1.3rem] font-semibold border border-slate-200 rounded-xl hover:bg-white transition-colors"
          >
            All Inventory
          </NuxtLink>
        </div>
      </div>

      <!-- Main Loading Skeleton -->
      <div v-if="loading" class="space-y-6">
        <div class="h-[12rem] bg-white border border-slate-100 rounded-2xl animate-pulse" />
        <div class="grid grid-cols-4 gap-4">
          <div v-for="n in 4" :key="n" class="h-[10rem] bg-white border border-slate-100 rounded-2xl animate-pulse" />
        </div>
        <div class="h-[25rem] bg-white border border-slate-100 rounded-2xl animate-pulse" />
      </div>

      <!-- Item Detail View -->
      <div v-else-if="item" class="space-y-[2.4rem]">
        <!-- Product & Inventory Header Card -->
        <div class="bg-white border border-slate-100 rounded-2xl p-[2.4rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-start gap-[1.6rem]">
            <img
              v-if="item.productImage"
              :src="item.productImage"
              class="w-[6rem] h-[6rem] rounded-xl object-cover border border-slate-100 flex-shrink-0"
              alt=""
            >
            <div v-else class="w-[6rem] h-[6rem] rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-slate-400 text-[2.8rem]">inventory_2</span>
            </div>

            <div>
              <div class="flex items-center gap-3 flex-wrap">
                <h1 class="text-[2rem] font-bold text-primary">{{ item.productName || 'Inventory Item' }}</h1>
                <span class="px-[1rem] py-[0.3rem] rounded-lg text-[1.2rem] font-bold" :class="getStatusBadge(item).class">
                  {{ getStatusBadge(item).label }}
                </span>
              </div>

              <div class="flex items-center gap-x-4 gap-y-1 flex-wrap text-[1.3rem] text-slate-500 mt-2">
                <span>SKU: <strong class="text-primary">{{ item.sku || 'No SKU' }}</strong></span>
                <span>•</span>
                <span>Branch: <strong class="text-primary">{{ item.branchName || item.warehouseName || 'Main Branch' }}</strong></span>
                <span v-if="item.productCode">•</span>
                <span v-if="item.productCode">Product Code: <strong class="text-primary">{{ item.productCode }}</strong></span>
                <span v-if="item.location">•</span>
                <span v-if="item.location">Location: <strong class="text-primary">{{ item.location }}</strong></span>
              </div>

              <div class="mt-2 text-[1.2rem] text-slate-500">
                Variants: <strong :class="item.variantAttributes && Object.keys(item.variantAttributes).length ? 'text-primary' : 'text-slate-500 font-normal'">{{ formatVariantAttributes(item.variantAttributes) }}</strong>
              </div>

              <div class="flex items-center gap-2 flex-wrap mt-2.5 text-[1.2rem]">
                <span class="px-2.5 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                  Unit: <strong>{{ unitLabel }}</strong>
                </span>
                <span v-if="item.unitTrackingMode" class="px-2.5 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-600">
                  {{ item.unitTrackingMode.replace('_', ' ') }}
                </span>
                <span
                  v-for="(bd, idx) in item.onHandBreakdown"
                  :key="idx"
                  class="px-2.5 py-0.5 rounded-md bg-primary/10 font-bold text-primary"
                >
                  {{ bd.quantity }} {{ bd.unitLabel || bd.unitKey }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              v-if="!isWeightedAverage"
              type="button"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-primary font-semibold text-[1.3rem] rounded-xl transition-colors flex items-center gap-2"
              @click="isFifoDrawerOpen = true"
            >
              <span class="material-symbols-outlined text-[1.8rem]">layers</span>
              <span>View FIFO Batches</span>
            </button>
            <span v-if="item.inventoryCode" class="text-[1.3rem] font-mono font-bold bg-slate-100 px-3 py-1.5 rounded-lg text-slate-800 border border-slate-200">
              {{ item.inventoryCode }}
            </span>
          </div>
        </div>

        <!-- Product Pricing Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-[1.6rem]">
          <div class="bg-white border border-slate-100 rounded-2xl p-[2rem] shadow-sm">
            <p class="text-[1.1rem] font-bold uppercase tracking-widest text-slate-400 mb-1">Current Unit Price</p>
            <p class="text-[2rem] font-extrabold text-primary tabular-nums">{{ formatMoneyOrDash(currentStockPrice) }}</p>
            <p class="text-[1.1rem] text-slate-400 mt-1">Standard selling price per {{ unitLabel }}</p>
          </div>

          <div class="bg-white border border-slate-100 rounded-2xl p-[2rem] shadow-sm">
            <p class="text-[1.1rem] font-bold uppercase tracking-widest text-slate-400 mb-1">Current Unit Cost</p>
            <p class="text-[2rem] font-extrabold text-primary tabular-nums">{{ formatMoneyOrDash(currentUnitCost) }}</p>
            <p class="text-[1.1rem] text-slate-400 mt-1">Cost basis used for stock valuation</p>
          </div>

          <div class="bg-white border border-slate-100 rounded-2xl p-[2rem] shadow-sm">
            <div class="flex items-center justify-between gap-3 mb-1">
              <p class="text-[1.1rem] font-bold uppercase tracking-widest text-slate-400">Current Sale Price</p>
              <span
                v-if="productSummary.discount"
                class="px-2 py-0.5 rounded-md bg-green-50 text-[1.1rem] font-bold text-green-700"
              >
                {{ productSummary.discount }}% off
              </span>
            </div>
            <p class="text-[2rem] font-extrabold text-primary tabular-nums">
              {{ hasPromotionalPrice ? formatMoneyOrDash(currentSalePrice) : 'No active sale' }}
            </p>
            <p class="text-[1.1rem] text-slate-400 mt-1">Effective promotional price for this item</p>
          </div>
        </div>

        <!-- Stock KPI Summary Cards -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 gap-[1.6rem]"
          :class="isWeightedAverage ? 'lg:grid-cols-5' : 'lg:grid-cols-4'"
        >
          <div class="bg-white border border-slate-100 rounded-2xl p-[2rem] shadow-sm">
            <p class="text-[1.1rem] font-bold uppercase tracking-widest text-slate-400 mb-1">On-Hand Stock</p>
            <p class="text-[2.4rem] font-extrabold text-primary tabular-nums">
              {{ item.onHandQty ?? 0 }} <span class="text-[1.3rem] font-bold text-slate-500">{{ unitLabel }}</span>
            </p>
            <p class="text-[1.1rem] text-slate-400 mt-1">Total physical stock in branch</p>
          </div>

          <div class="bg-white border border-slate-100 rounded-2xl p-[2rem] shadow-sm">
            <p class="text-[1.1rem] font-bold uppercase tracking-widest text-slate-400 mb-1">Available Stock</p>
            <p
              class="text-[2.4rem] font-extrabold tabular-nums"
              :class="(item.availableQty ?? 0) <= 0 ? 'text-red-600' : 'text-primary'"
            >
              {{ item.availableQty ?? 0 }} <span class="text-[1.3rem] font-bold text-slate-500">{{ unitLabel }}</span>
            </p>
            <p class="text-[1.1rem] text-slate-400 mt-1">Ready for sale (On-hand minus reserved)</p>
          </div>

          <div class="bg-white border border-slate-100 rounded-2xl p-[2rem] shadow-sm">
            <p class="text-[1.1rem] font-bold uppercase tracking-widest text-slate-400 mb-1">Reserved Stock</p>
            <p class="text-[2.4rem] font-extrabold text-amber-600 tabular-nums">
              {{ item.reservedQty ?? 0 }} <span class="text-[1.3rem] font-bold text-slate-500">{{ unitLabel }}</span>
            </p>
            <p class="text-[1.1rem] text-slate-400 mt-1">Held for pending customer orders</p>
          </div>

          <div v-if="isWeightedAverage" class="bg-white border border-slate-100 rounded-2xl p-[2rem] shadow-sm">
            <div class="flex items-center justify-between mb-1">
              <p class="text-[1.1rem] font-bold uppercase tracking-widest text-slate-400">Avg Unit Cost</p>
              <span class="material-symbols-outlined text-[1.6rem] text-slate-400 cursor-help" title="Blended average cost across all received stock batches.">help</span>
            </div>
            <p class="text-[2.4rem] font-extrabold text-primary tabular-nums">
              {{ item.avgUnitCost ? formatToMoney(item.avgUnitCost) : '—' }}
            </p>
            <p class="text-[1.1rem] text-slate-400 mt-1">Blended cost basis (Weighted Avg)</p>
          </div>

          <div class="bg-white border border-slate-100 rounded-2xl p-[2rem] shadow-sm">
            <p class="text-[1.1rem] font-bold uppercase tracking-widest text-slate-400 mb-1">Reorder Level / Qty</p>
            <p class="text-[2.4rem] font-extrabold text-primary tabular-nums">
              {{ item.reorderLevel ?? '—' }} <span v-if="item.reorderLevel" class="text-[1.3rem] font-bold text-slate-500">{{ unitLabel }}</span>
              <span class="text-[1.4rem] font-normal text-slate-400">/ {{ item.reorderQty ?? '—' }} <span v-if="item.reorderQty" class="text-[1.2rem] font-semibold text-slate-500">{{ unitLabel }}</span></span>
            </p>
            <p class="text-[1.1rem] text-slate-400 mt-1">Minimum threshold & target reorder quantity</p>
          </div>
        </div>

        <!-- Stock Adjustment / Restock Form Panel -->
        <div class="bg-white border border-slate-100 rounded-2xl p-[2.4rem] shadow-sm">
          <div class="mb-[2rem]">
            <h2 class="text-[1.8rem] font-bold text-primary">Perform Stock Adjustment / Restock</h2>
            <p class="text-[1.3rem] text-slate-400 mt-0.5">Receive new inventory, record sales, or report damaged items</p>
          </div>

          <form class="space-y-[2rem]" @submit.prevent="handleAdjustmentSubmit">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-[1.6rem]">
              <!-- Action -->
              <div>
                <label class="block text-[1.2rem] font-bold text-slate-600 uppercase tracking-widest mb-2">Adjustment Action</label>
                <select
                  v-model="form.action"
                  class="w-full h-[4.4rem] px-[1.4rem] text-[1.4rem] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-colors"
                >
                  <option v-for="act in ADJUST_ACTIONS" :key="act.value" :value="act.value">
                    {{ act.label }}
                  </option>
                </select>
                <p class="text-[1.1rem] text-slate-400 mt-1.5">{{ currentActionNote }}</p>
              </div>

              <!-- Quantity -->
              <div>
                <label class="block text-[1.2rem] font-bold text-slate-600 uppercase tracking-widest mb-2">
                  Quantity ({{ unitLabel }})
                </label>
                <input
                  v-model.number="form.qty"
                  type="number"
                  min="1"
                  step="1"
                  required
                  class="w-full h-[4.4rem] px-[1.4rem] text-[1.4rem] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-colors"
                  :placeholder="`Enter quantity in ${unitLabel}`"
                >
              </div>

              <!-- Reference -->
              <div>
                <label class="block text-[1.2rem] font-bold text-slate-600 uppercase tracking-widest mb-2">Reference / PO # (Optional)</label>
                <input
                  v-model="form.reference"
                  type="text"
                  class="w-full h-[4.4rem] px-[1.4rem] text-[1.4rem] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-colors"
                  placeholder="e.g. PO-2026-001, Invoice #12"
                >
              </div>
            </div>

            <!-- Unit Cost (Visible for RECEIVED / inbound stock receipts) -->
            <div v-if="form.action === 'RECEIVED'">
              <AppMoneyInput
                v-model="form.unitCost"
                label="Unit Cost / Purchase Price  (Optional)"
                placeholder="0.00"
                hint="Used to update weighted average cost basis or record FIFO batch lot cost."
              />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-[1.2rem] font-bold text-slate-600 uppercase tracking-widest mb-2">Reason / Notes (Optional)</label>
              <textarea
                v-model="form.notes"
                rows="2"
                class="w-full p-[1.4rem] text-[1.4rem] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-colors"
                placeholder="Reason for adjustment, supplier name, shipment details..."
              />
            </div>

            <!-- Submit button -->
            <div class="flex justify-end">
              <button
                type="submit"
                :disabled="form.submitting"
                class="px-[2.4rem] py-[1.2rem] bg-primary text-white text-[1.4rem] font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span v-if="form.submitting" class="material-symbols-outlined text-[1.8rem] animate-spin">progress_activity</span>
                <span>{{ form.submitting ? 'Updating stock...' : 'Confirm Stock Adjustment' }}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Movement History Table (InventoryLog) -->
        <div class="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div class="p-[2.4rem] border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-[1.8rem] font-bold text-primary">Stock Movement History</h2>
              <p class="text-[1.3rem] text-slate-400 mt-0.5">Audit log of all stock adjustments, orders, and reservations (`InventoryLog`)</p>
            </div>
            <span class="text-[1.2rem] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">
              {{ logs.length }} log entry{{ logs.length !== 1 ? 'ies' : '' }}
            </span>
          </div>

          <div v-if="logsLoading" class="p-[2.4rem] space-y-3">
            <div v-for="n in 5" :key="n" class="h-[4.5rem] bg-slate-50 rounded-xl animate-pulse" />
          </div>

          <div v-else-if="logs.length" class="overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <table class="w-full">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/50">
                  <th class="text-left px-[2.4rem] py-[1.4rem] text-[1.1rem] font-bold uppercase tracking-widest text-slate-400">Code</th>
                  <th class="text-left px-[1.6rem] py-[1.4rem] text-[1.1rem] font-bold uppercase tracking-widest text-slate-400">Date & Time</th>
                  <th class="text-left px-[1.6rem] py-[1.4rem] text-[1.1rem] font-bold uppercase tracking-widest text-slate-400">Action</th>
                  <th class="text-left px-[1.6rem] py-[1.4rem] text-[1.1rem] font-bold uppercase tracking-widest text-slate-400">Qty Change</th>
                  <th class="text-left px-[1.6rem] py-[1.4rem] text-[1.1rem] font-bold uppercase tracking-widest text-slate-400">Reference</th>
                  <th class="text-left px-[1.6rem] py-[1.4rem] text-[1.1rem] font-bold uppercase tracking-widest text-slate-400">Adjusted By</th>
                  <th class="text-left px-[1.6rem] py-[1.4rem] text-[1.1rem] font-bold uppercase tracking-widest text-slate-400">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="log in logs"
                  :key="log.id"
                  class="border-b border-slate-50 hover:bg-slate-50 transition-colors text-[1.3rem]"
                >
                  <td class="px-[2.4rem] py-[1.4rem] font-mono text-[1.2rem] font-bold text-slate-700 whitespace-nowrap">
                    {{ log.adjustmentCode || '—' }}
                  </td>
                  <td class="px-[1.6rem] py-[1.4rem] text-slate-500 whitespace-nowrap">
                    {{ formatDate(log.timestamp || log.createdAt) }}
                  </td>
                  <td class="px-[1.6rem] py-[1.4rem] whitespace-nowrap">
                    <span class="px-[1rem] py-[0.4rem] rounded-lg text-[1.1rem] font-bold" :class="actionBadgeClass(log.action)">
                      {{ log.action ?? '—' }}
                    </span>
                  </td>
                  <td class="px-[1.6rem] py-[1.4rem] whitespace-nowrap" :class="qtyChangeClass(log.qtyChange)">
                    {{ formatQtyChange(log.qtyChange) }} <span class="text-[1.15rem] font-normal text-slate-500">{{ unitLabel }}</span>
                  </td>
                  <td class="px-[1.6rem] py-[1.4rem] text-primary font-semibold whitespace-nowrap">
                    {{ log.reference || '—' }}
                  </td>
                  <td class="px-[1.6rem] py-[1.4rem] text-slate-500 whitespace-nowrap">
                    {{ getAdjustedByLabel(log) }}
                  </td>
                  <td class="px-[1.6rem] py-[1.4rem] text-slate-500 max-w-[25rem] truncate">
                    {{ log.notes || '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-[4rem] text-slate-400">
            <span class="material-symbols-outlined text-[4rem] mb-2">history</span>
            <p class="text-[1.4rem]">No movement history recorded yet for this item</p>
          </div>
        </div>
      </div>

      <!-- Item Not Found State -->
      <div v-else class="flex flex-col items-center justify-center py-[6rem] text-slate-400 bg-white border border-slate-100 rounded-2xl">
        <span class="material-symbols-outlined text-[4.8rem] mb-3">inventory_2</span>
        <p class="text-[1.6rem] font-bold text-primary mb-1">Inventory Record Not Found</p>
        <p class="text-[1.3rem] text-slate-400 mb-4">The requested inventory item could not be retrieved.</p>
        <NuxtLink
          to="/dashboard/inventory"
          class="px-[2rem] py-[1rem] bg-primary text-white text-[1.3rem] font-semibold rounded-xl"
        >
          Return to Inventory List
        </NuxtLink>
      </div>
    </DashboardContainer>

    <!-- FIFO Batch Lots Drawer -->
    <FifoBatchDrawer
      v-model:open="isFifoDrawerOpen"
      :inventory-id="inventoryId"
      :inventory-item="item"
      :costing-method="item?.costingMethod"
    />
  </div>
</template>
