<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useCategoryStore } from '~/stores/category.store.js'
import { useWarehouseStore } from '~/stores/warehouse.store.js'

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

const categoryStore = useCategoryStore()
const warehouseStore = useWarehouseStore()

const localFilters = reactive({
  category: '',
  status: '',
  minPrice: '',
  maxPrice: '',
  availability: '',
  warehouse: '',
  stockStatus: '',
  sort: '',
})

// Sync localFilters with initialFilters when the drawer opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      Object.assign(localFilters, {
        category: props.initialFilters.category || '',
        status: props.initialFilters.status || '',
        minPrice: props.initialFilters.minPrice || '',
        maxPrice: props.initialFilters.maxPrice || '',
        availability: props.initialFilters.availability || '',
        warehouse: props.initialFilters.warehouse || '',
        stockStatus: props.initialFilters.stockStatus || '',
        sort: props.initialFilters.sort || '',
      })
    }
  }
)

const categoryOptions = computed(() =>
  (categoryStore.categories || []).map(c => ({ label: c.name, value: c.name }))
)

const warehouseOptions = computed(() =>
  (warehouseStore.warehouses || []).map(wh => ({ label: wh.name, value: wh.id }))
)

const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
]

const stockStatusOptions = [
  { label: 'In Stock', value: 'IN_STOCK' },
  { label: 'Low Stock', value: 'LOW_STOCK' },
  { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
]

const availabilityOptions = [
  { label: 'Available', value: 'true' },
  { label: 'Unavailable', value: 'false' },
]

const sortOptions = [
  { label: 'Newest First', value: 'CREATED_AT:DESC' },
  { label: 'Oldest First', value: 'CREATED_AT:ASC' },
  { label: 'Price: Low to High', value: 'PRICE:ASC' },
  { label: 'Price: High to Low', value: 'PRICE:DESC' },
]

// Responsive drawer side
const isMobile = ref(false)
onMounted(() => {
  if (!categoryStore.categories.length) categoryStore.getCategories()
  if (!warehouseStore.warehouses.length) warehouseStore.getWarehouses()

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
  Object.assign(localFilters, { category: '', status: '', minPrice: '', maxPrice: '', availability: '', warehouse: '', stockStatus: '', sort: '' })
  emit('reset')
  emit('update:open', false)
}
</script>

<template>
  <Drawer :open="open" :side="drawerSide" content-class="p-0" @update:open="$emit('update:open', $event)">
    <div class="flex flex-col h-full" :class="isMobile ? 'max-h-[80vh]' : 'h-full'">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
        <h2 class="text-[1.8rem] font-[500] text-[#000]">Filter Products</h2>
        <button
          @click="$emit('update:open', false)"
          class="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
        >
          <span class="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Category -->
        <BaseSelectInput
          v-model="localFilters.category"
          label="Category"
          placeholder="All categories"
          :options="categoryOptions"
        />

        <!-- Status -->
        <BaseSelectInput
          v-model="localFilters.status"
          label="Status"
          placeholder="All statuses"
          :options="statusOptions"
        />

        <!-- Availability -->
        <BaseSelectInput
          v-model="localFilters.availability"
          label="Availability"
          placeholder="All"
          :options="availabilityOptions"
        />

        <!-- Warehouse -->
        <BaseSelectInput
          v-model="localFilters.warehouse"
          label="Warehouse"
          placeholder="All warehouses"
          :options="warehouseOptions"
        />

        <!-- Stock Status (v2 Inventory) -->
        <BaseSelectInput
          v-model="localFilters.stockStatus"
          label="Stock Status"
          placeholder="All stock levels"
          :options="stockStatusOptions"
        />

        <!-- Price Range -->
        <div>
          <p class="block text-md font-normal text-black mb-2">Price Range</p>
          <div class="flex gap-4">
            <AppInput
              v-model="localFilters.minPrice"
              label="Min Price"
              type="number"
              placeholder="0"
              name="minPrice"
              inputClass="text-md"
            />
            <AppInput
              v-model="localFilters.maxPrice"
              label="Max Price"
              type="number"
              placeholder="Any"
              name="maxPrice"
              inputClass="text-md"
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
