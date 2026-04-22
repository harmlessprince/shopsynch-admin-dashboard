<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { PAYMENT_GATEWAYS, PAYMENT_METHODS } from '~/utils/dictionaries.js'

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
  paymentMethod: '',
  gateway: '',
  orderNumber: '',
  reference: '',
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      Object.assign(localFilters, {
        paymentMethod: props.initialFilters.paymentMethod || '',
        gateway: props.initialFilters.gateway || '',
        orderNumber: props.initialFilters.orderNumber || '',
        reference: props.initialFilters.reference || '',
      })
    }
  }
)

const gatewayOptions = PAYMENT_GATEWAYS
const paymentMethodOptions = PAYMENT_METHODS

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
  Object.assign(localFilters, { paymentMethod: '', gateway: '', orderNumber: '', reference: '' })
  emit('reset')
  emit('update:open', false)
}
</script>

<template>
  <Drawer :open="open" :side="drawerSide" content-class="p-0" @update:open="$emit('update:open', $event)">
    <div class="flex flex-col h-full" :class="isMobile ? 'max-h-[80vh]' : 'h-full'">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
        <h2 class="text-[1.8rem] font-[500] text-[#000]">Filter Payments</h2>
        <button
          class="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          @click="$emit('update:open', false)"
        >
          <span class="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 text-[1.6rem]">
        <!-- Payment Method -->
        <BaseSelectInput
          v-model="localFilters.paymentMethod"
          label="Payment Method"
          placeholder="All Methods"
          :options="paymentMethodOptions"
        />

        <!-- Gateway -->
        <BaseSelectInput
          v-model="localFilters.gateway"
          label="Gateway"
          placeholder="All Gateways"
          :options="gatewayOptions"
        />

        <!-- Order Number -->
        <AppInput
          v-model="localFilters.orderNumber"
          label="Order Number"
          type="text"
          placeholder="e.g. ORD-0001"
          name="orderNumber"
        />

        <!-- Reference -->
        <AppInput
          v-model="localFilters.reference"
          label="Payment Reference"
          type="text"
          placeholder="e.g. PAY-0047C6ED"
          name="reference"
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
