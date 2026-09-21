<script setup>
import { reactive, computed, onMounted, watch, ref } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  initialFilters: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:open', 'apply', 'reset'])

const localFilters = reactive({
  status: '',
  inventoryCode: '',
  minOnHandQty: '',
  maxOnHandQty: '',
  minReservedQty: '',
  maxReservedQty: '',
})

// Sync localFilters with initialFilters when the drawer opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      Object.assign(localFilters, {
        status: props.initialFilters.status || '',
        inventoryCode: props.initialFilters.inventoryCode || '',
        minOnHandQty: props.initialFilters.minOnHandQty || '',
        maxOnHandQty: props.initialFilters.maxOnHandQty || '',
        minReservedQty: props.initialFilters.minReservedQty || '',
        maxReservedQty: props.initialFilters.maxReservedQty || '',
      })
    }
  }
)

const statusOptions = [
  { label: 'In Stock', value: 'IN_STOCK' },
  { label: 'Low Stock', value: 'LOW_STOCK' },
  { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
]

// Responsive drawer side
const isMobile = ref(false)
onMounted(() => {
  if (typeof window !== 'undefined') {
    const mq = window.matchMedia('(max-width: 639px)')
    isMobile.value = mq.matches
    mq.addEventListener('change', e => { isMobile.value = e.matches })
  }
})

const drawerSide = computed(() => isMobile.value ? 'bottom' : 'right')

function handleApply() {
  emit('apply', { ...localFilters })
  emit('update:open', false)
}

function handleReset() {
  Object.assign(localFilters, {
    status: '',
    inventoryCode: '',
    minOnHandQty: '',
    maxOnHandQty: '',
    minReservedQty: '',
    maxReservedQty: '',
  })
  emit('reset')
  emit('update:open', false)
}
</script>

<template>
  <Drawer :open="open" :side="drawerSide" content-class="p-0" @update:open="$emit('update:open', $event)">
    <div class="flex flex-col h-full" :class="isMobile ? 'max-h-[80vh]' : 'h-full'">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
        <h2 class="text-[1.8rem] font-[500] text-[#000]">Filter Inventory</h2>
        <button
          type="button"
          aria-label="Close filters"
          class="p-1 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
          @click="$emit('update:open', false)"
        >
          <span class="material-symbols-outlined text-2xl" aria-hidden="true">close</span>
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 text-[1.6rem]">
        <!-- Status -->
        <BaseSelectInput
          v-model="localFilters.status"
          label="Status"
          placeholder="All statuses"
          :options="statusOptions"
        />

        <!-- Inventory Code -->
        <AppInput
          v-model="localFilters.inventoryCode"
          label="Inventory Code"
          type="text"
          placeholder="e.g. WH1-00042"
          name="inventoryCode"
        />

        <!-- On Hand Quantity Range -->
        <div>
          <p class="block text-md font-normal text-black mb-2">On Hand Quantity</p>
          <div class="flex gap-4">
            <AppInput
              v-model="localFilters.minOnHandQty"
              label="Min"
              type="number"
              placeholder="0"
              name="minOnHandQty"
            />
            <AppInput
              v-model="localFilters.maxOnHandQty"
              label="Max"
              type="number"
              placeholder="Any"
              name="maxOnHandQty"
            />
          </div>
        </div>

        <!-- Reserved Quantity Range -->
        <div>
          <p class="block text-md font-normal text-black mb-2">Reserved Quantity</p>
          <div class="flex gap-4">
            <AppInput
              v-model="localFilters.minReservedQty"
              label="Min"
              type="number"
              placeholder="0"
              name="minReservedQty"
            />
            <AppInput
              v-model="localFilters.maxReservedQty"
              label="Max"
              type="number"
              placeholder="Any"
              name="maxReservedQty"
            />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-[#EBEBEB] flex gap-4">
        <BaseButton
          type="button"
          variant="outline"
          class="flex-1 rounded-xl py-3"
          @click="handleReset"
        >
          Reset
        </BaseButton>
        <BaseButton
          type="button"
          variant="primary"
          class="flex-1 rounded-xl py-3"
          @click="handleApply"
        >
          Apply Filters
        </BaseButton>
      </div>
    </div>
  </Drawer>
</template>
