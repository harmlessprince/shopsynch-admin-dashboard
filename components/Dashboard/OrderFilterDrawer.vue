<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

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
  paymentStatus: '',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
  sort: '',
})

// Sync localFilters with initialFilters when the drawer opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      Object.assign(localFilters, {
        paymentStatus: props.initialFilters.paymentStatus || '',
        dateFrom: props.initialFilters.dateFrom || '',
        dateTo: props.initialFilters.dateTo || '',
        minAmount: props.initialFilters.minAmount || '',
        maxAmount: props.initialFilters.maxAmount || '',
        sort: props.initialFilters.sort || '',
      })
    }
  }
)

const paymentStatusOptions = [
  { label: 'Paid', value: 'PAID' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
]

const sortOptions = [
  { label: 'Newest First', value: 'ORDER_DATE:DESC' },
  { label: 'Oldest First', value: 'ORDER_DATE:ASC' },
  { label: 'Price: Low to High', value: 'TOTAL_PRICE:ASC' },
  { label: 'Price: High to Low', value: 'TOTAL_PRICE:DESC' },
]

// Responsive drawer side
const isMobile = ref(false)
onMounted(() => {
  const mq = window.matchMedia('(max-width: 639px)')
  isMobile.value = mq.matches
  mq.addEventListener('change', e => { isMobile.value = e.matches })
})

const drawerSide = computed(() => isMobile.value ? 'bottom' : 'right')

function handleApply() {
  emit('apply', { ...localFilters })
  emit('update:open', false)
}

function handleReset() {
  Object.assign(localFilters, { paymentStatus: '', dateFrom: '', dateTo: '', minAmount: '', maxAmount: '', sort: '' })
  emit('reset')
  emit('update:open', false)
}
</script>

<template>
  <Drawer :open="open" :side="drawerSide" content-class="p-0" @update:open="$emit('update:open', $event)">
    <div class="flex flex-col h-full" :class="isMobile ? 'max-h-[80vh]' : 'h-full'">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
        <h2 class="text-[1.8rem] font-[500] text-[#000]">Filter Orders</h2>
        <button
          @click="$emit('update:open', false)"
          class="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
        >
          <span class="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 text-[1.6rem]">
        <!-- Payment Status -->
        <BaseSelectInput
          v-model="localFilters.paymentStatus"
          label="Payment Status"
          placeholder="All"
          :options="paymentStatusOptions"
        />

        <!-- Date Range -->
        <div>
          <p class="block text-md font-normal text-black mb-2">Date Range</p>
          <div class="flex flex-col gap-4">
            <AppInput
              v-model="localFilters.dateFrom"
              label="From"
              type="date"
              name="dateFrom"
            />
            <AppInput
              v-model="localFilters.dateTo"
              label="To"
              type="date"
              name="dateTo"
            />
          </div>
        </div>

        <!-- Amount Range -->
        <div>
          <p class="block text-md font-normal text-black mb-2">Amount Range</p>
          <div class="flex gap-4">
            <AppInput
              v-model="localFilters.minAmount"
              label="Min Amount"
              type="text"
              placeholder="0"
              name="minAmount"
              inputClass="text-sm"
            />
            <AppInput
              v-model="localFilters.maxAmount"
              label="Max Amount"
              type="text"
              placeholder="Any"
              name="maxAmount"
              inputClass="text-sm"
            />
          </div>
        </div>

        <!-- Sort By -->
        <BaseSelectInput
          v-model="localFilters.sort"
          label="Sort By"
          placeholder="Default (Newest First)"
          :options="sortOptions"
        />
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-[#EBEBEB] flex gap-4 mt-auto">
        <BaseButton
          type="button"
          variant="outline"
          class="flex-1 rounded-xl py-3 text-[1.4rem]"
          @click="handleReset"
        >
          Reset
        </BaseButton>
        <BaseButton
          type="button"
          variant="primary"
          class="flex-1 rounded-xl py-3 text-[1.4rem]"
          @click="handleApply"
        >
          Apply Filters
        </BaseButton>
      </div>
    </div>
  </Drawer>
</template>
