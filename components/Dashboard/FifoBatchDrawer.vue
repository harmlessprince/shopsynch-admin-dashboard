<script setup>
import { ref, computed, watch } from 'vue'
import { useInventoryStore } from '~/stores/inventory.store.js'
import { formatDate, formatToMoney, logger } from '~/utils/helpers.js'
import Drawer from '~/components/Drawer.vue'
import Spinner from '~/components/Spinner.vue'

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  inventoryId: {
    type: String,
    default: '',
  },
  inventoryItem: {
    type: Object,
    default: () => null,
  },
  costingMethod: {
    type: String,
    default: 'FIFO',
  },
})

const emit = defineEmits(['update:open'])

const inventoryStore = useInventoryStore()

const loading = ref(false)
const batches = ref([])

const isFifo = computed(() => {
  return (props.costingMethod || props.inventoryItem?.costingMethod || 'FIFO') === 'FIFO'
})

// Identify the topmost active batch (Next to deplete)
const nextToDepleteIndex = computed(() => {
  return batches.value.findIndex(b => b.open || Number(b.remainingQty ?? 0) > 0)
})

const nextToDepleteBatch = computed(() => {
  if (nextToDepleteIndex.value === -1) return null
  return batches.value[nextToDepleteIndex.value]
})

async function loadBatches() {
  if (!props.inventoryId) return
  loading.value = true
  batches.value = []
  try {
    const res = await inventoryStore.fetchInventoryBatches(props.inventoryId)
    if (res?.data) {
      batches.value = Array.isArray(res.data) ? res.data : res.data.items || []
    }
  } catch (err) {
    logger.error('Failed to load inventory batches', err)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.inventoryId],
  ([isOpen, id]) => {
    if (isOpen && id) {
      loadBatches()
    }
  },
  { immediate: true }
)

function getBatchStatus(batch, index) {
  const isOpen = batch.open || Number(batch.remainingQty ?? 0) > 0
  if (!isOpen) {
    return {
      label: 'Depleted',
      badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
    }
  }
  if (index === nextToDepleteIndex.value) {
    return {
      label: 'Next to Deplete',
      badgeClass: 'bg-green-100 text-green-800 font-bold border border-green-300',
      isCurrentBasis: true,
    }
  }
  return {
    label: 'Active Lot',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  }
}
</script>

<template>
  <Drawer :open="open" content-class="bg-white p-0 w-full" @update:open="emit('update:open', $event)">
    <div class="flex flex-col h-full bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-[2rem] font-bold text-primary">FIFO Batch & Lot Ledger</h2>
            <span
              class="px-2.5 py-0.5 rounded-full text-[1.1rem] font-bold uppercase tracking-wider"
              :class="isFifo ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'"
            >
              {{ isFifo ? 'FIFO Mode' : 'Weighted Avg' }}
            </span>
          </div>
          <p v-if="inventoryItem" class="text-[1.3rem] text-slate-500 mt-1">
            {{ inventoryItem.productName || inventoryItem.product?.name || 'Inventory Item' }}
            <span v-if="inventoryItem.sku"> (SKU: {{ inventoryItem.sku }})</span>
            <span v-if="inventoryItem.inventoryCode" class="font-mono text-[1.2rem] text-slate-400"> ({{ inventoryItem.inventoryCode }})</span>
            <span v-if="inventoryItem.branchName || inventoryItem.warehouseName"> • {{ inventoryItem.branchName || inventoryItem.warehouseName }}</span>
          </p>
        </div>
        <button
          type="button"
          aria-label="Close drawer"
          class="p-2 hover:bg-slate-50 rounded-full focus:ring-2 focus:ring-primary focus:outline-none"
          @click="emit('update:open', false)"
        >
          <span class="material-symbols-outlined text-slate-400" aria-hidden="true">close</span>
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
          <Spinner width="40px" height="40px" />
          <p class="text-[1.4rem] text-slate-400 mt-3">Loading batch lots...</p>
        </div>

        <!-- Weighted-Average Notice -->
        <div
          v-else-if="!isFifo"
          class="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2"
        >
          <div class="flex items-center gap-2 font-bold text-[1.5rem]">
            <span class="material-symbols-outlined text-[2rem] text-amber-600">info</span>
            <span>Weighted Average Costing Active</span>
          </div>
          <p class="text-[1.35rem] leading-relaxed text-amber-800">
            This store is configured with <strong>Weighted Average</strong> costing. Stock is costed using a blended unit cost basis rather than individual FIFO batch lots.
          </p>
        </div>

        <!-- Empty State for FIFO -->
        <div
          v-else-if="!batches.length"
          class="flex flex-col items-center justify-center py-16 text-center bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200"
        >
          <span class="material-symbols-outlined text-slate-300 text-[5rem]">layers_clear</span>
          <p class="text-[1.6rem] font-bold text-primary mt-3">No Batch Lots Found</p>
          <p class="text-[1.3rem] text-slate-400 mt-1 max-w-md">
            No stock batches have been recorded yet for this item. Inbound purchase receipts will create chronological lots here.
          </p>
        </div>

        <!-- Batch Ledger Presentation -->
        <template v-else>
          <!-- Current Active Basis Banner -->
          <div
            v-if="nextToDepleteBatch"
            class="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[2rem] text-emerald-600">arrow_forward</span>
                <span class="text-[1.4rem] font-bold">Current Active COGS Basis</span>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[1.1rem] font-bold bg-emerald-200 text-emerald-900">
                Next In Line
              </span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[1.3rem]">
              <div>
                <p class="text-emerald-700 text-[1.1rem] font-semibold uppercase">Unit Cost</p>
                <p class="text-[1.6rem] font-extrabold text-emerald-950 tabular-nums">
                  {{ formatToMoney(nextToDepleteBatch.unitCost ?? 0) }}
                </p>
              </div>
              <div>
                <p class="text-emerald-700 text-[1.1rem] font-semibold uppercase">Remaining</p>
                <p class="text-[1.6rem] font-extrabold text-emerald-950 tabular-nums">
                  {{ nextToDepleteBatch.remainingQty ?? 0 }} units
                </p>
              </div>
              <div>
                <p class="text-emerald-700 text-[1.1rem] font-semibold uppercase">Received</p>
                <p class="font-medium text-emerald-900">
                  {{ formatDate(nextToDepleteBatch.receivedDate) }}
                </p>
              </div>
              <div>
                <p class="text-emerald-700 text-[1.1rem] font-semibold uppercase">Ref / PO</p>
                <p class="font-medium text-emerald-900 truncate">
                  {{ nextToDepleteBatch.reference || '—' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Chronological Lots Table -->
          <div class="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div class="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 class="text-[1.4rem] font-bold text-primary">All Inbound Batches (Oldest First)</h3>
              <span class="text-[1.2rem] font-semibold text-slate-500">
                {{ batches.length }} batch{{ batches.length !== 1 ? 'es' : '' }}
              </span>
            </div>

            <div class="overflow-x-auto [-webkit-overflow-scrolling:touch]">
              <table class="w-full text-[1.3rem]">
                <thead class="bg-[#F8FAFC] border-b border-[#E0E0E0] text-[1.2rem] font-[600] uppercase tracking-wider text-[#616161]">
                  <tr>
                    <th class="py-3.5 px-4 text-left font-bold">#</th>
                    <th class="py-3.5 px-4 text-left font-bold">Received Date</th>
                    <th class="py-3.5 px-4 text-left font-bold">Ref / PO</th>
                    <th class="py-3.5 px-4 text-right font-bold">Unit Cost</th>
                    <th class="py-3.5 px-4 text-right font-bold">Original</th>
                    <th class="py-3.5 px-4 text-right font-bold">Remaining</th>
                    <th class="py-3.5 px-4 text-center font-bold">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="(batch, idx) in batches"
                    :key="batch.id || idx"
                    class="hover:bg-slate-50/80 transition-colors"
                    :class="idx === nextToDepleteIndex ? 'bg-emerald-50/40 font-semibold' : ''"
                  >
                    <td class="py-3.5 px-4 text-slate-400 font-mono text-[1.1rem]">
                      {{ idx + 1 }}
                    </td>
                    <td class="py-3.5 px-4 text-primary whitespace-nowrap">
                      {{ formatDate(batch.receivedDate) }}
                    </td>
                    <td class="py-3.5 px-4 text-slate-600 truncate max-w-[120px]">
                      {{ batch.reference || '—' }}
                    </td>
                    <td class="py-3.5 px-4 text-right font-bold text-primary tabular-nums whitespace-nowrap">
                      {{ formatToMoney(batch.unitCost ?? 0) }}
                    </td>
                    <td class="py-3.5 px-4 text-right text-slate-600 tabular-nums">
                      {{ batch.originalQty ?? 0 }}
                    </td>
                    <td
                      class="py-3.5 px-4 text-right font-bold tabular-nums"
                      :class="Number(batch.remainingQty ?? 0) > 0 ? 'text-emerald-700' : 'text-slate-400'"
                    >
                      {{ batch.remainingQty ?? 0 }}
                    </td>
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        class="inline-flex items-center px-2.5 py-1 rounded-full text-[1.1rem] font-semibold"
                        :class="getBatchStatus(batch, idx).badgeClass"
                      >
                        {{ getBatchStatus(batch, idx).label }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-gray-100 bg-slate-50/50 flex justify-end">
        <BaseButton variant="outline" class="min-w-[120px]" @click="emit('update:open', false)">
          Close
        </BaseButton>
      </div>
    </div>
  </Drawer>
</template>
