<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="addBankAccountModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[540px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[12px] shadow-xl overflow-hidden border border-[#E0E0E0]">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div class="flex items-center gap-[1.2rem]">
            <div class="w-[4rem] h-[4rem] rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[2.2rem]">account_balance</span>
            </div>
            <div>
              <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">Add Settlement Bank Account</h2>
              <p class="text-[1.3rem] text-[#616161]">
                {{ merchant?.businessTradingName || merchant?.name || "Merchant" }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="p-[0.4rem] rounded-[6px] hover:bg-[#EBEBEB] transition-colors cursor-pointer text-[#616161]"
            @click="handleClose(close)"
          >
            <span class="material-symbols-outlined text-[2.4rem]">close</span>
          </button>
        </div>

        <!-- Body -->
        <form class="p-[2.4rem] flex flex-col gap-y-[2rem]" @submit.prevent="handleSubmit(close)">
          <!-- Bank Selection -->
          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="font-[600] text-[1.4rem] text-[#0F172A] flex items-center justify-between">
              <span>Select Bank <span class="text-red-500">*</span></span>
              <span v-if="adminMerchantsStore.banksLoading" class="text-[1.2rem] text-[#64748B] font-normal">Loading banks...</span>
            </label>
            <SearchableSelectInput
              v-model="form.bankCode"
              :options="bankOptions"
              placeholder="Search bank name..."
              search-placeholder="Type bank name..."
              :error="errors.bankCode"
            />
          </div>

          <!-- Account Number -->
          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="font-[600] text-[1.4rem] text-[#0F172A]">
              Account Number <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.accountNumber"
              type="text"
              maxlength="10"
              placeholder="10-digit NUBAN account number"
              class="w-full h-14 rounded-xl border border-slate-200 px-4 text-[1.4rem] text-[#1B1B19] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-mono"
              :class="{ 'border-rose-500': errors.accountNumber }"
            >
            <p v-if="errors.accountNumber" class="text-xs text-rose-500 font-medium">{{ errors.accountNumber }}</p>
          </div>

          <!-- Gateway Selection -->
          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="font-[600] text-[1.4rem] text-[#0F172A]">
              Payment Gateway <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.gateway"
              class="w-full h-14 rounded-xl border border-slate-200 px-4 text-[1.4rem] text-[#1B1B19] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all bg-white cursor-pointer"
            >
              <option value="PAYSTACK">Paystack</option>
              <option value="FLUTTERWAVE">Flutterwave</option>
            </select>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-x-[1.2rem] pt-[1.2rem] border-t border-[#E2E8F0]">
            <button
              type="button"
              class="h-[44px] px-[2rem] rounded-[8px] border border-[#CBD5E1] text-[1.4rem] font-[600] text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              @click="handleClose(close)"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || !isFormValid"
              class="h-[44px] px-[2.4rem] rounded-[8px] bg-primary text-white text-[1.4rem] font-[700] hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.6rem]"
            >
              <span v-if="isSubmitting" class="animate-spin material-symbols-outlined text-[1.8rem]">progress_activity</span>
              <span v-else class="material-symbols-outlined text-[1.8rem]">check</span>
              <span>{{ isSubmitting ? 'Verifying & Adding...' : 'Add Account' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { VueFinalModal } from 'vue-final-modal'
import { useAdminMerchantsStore } from '~/stores/adminMerchants.store.js'
import SearchableSelectInput from '~/components/SearchableSelectInput.vue'

const props = defineProps({
  tenantId: { type: String, required: true },
  merchant: { type: Object, default: null },
})

const emit = defineEmits(['added', 'closed'])

const adminMerchantsStore = useAdminMerchantsStore()

const form = ref({
  accountNumber: '',
  bankCode: '',
  gateway: 'PAYSTACK',
})

const errors = ref({
  accountNumber: '',
  bankCode: '',
})

const isSubmitting = ref(false)

const bankOptions = computed(() => {
  return adminMerchantsStore.banks.map((b) => ({
    label: `${b.name} (${b.code})`,
    value: b.code,
  }))
})

const isFormValid = computed(() => {
  return form.value.accountNumber.trim().length === 10 && Boolean(form.value.bankCode)
})

onMounted(async () => {
  if (!adminMerchantsStore.banks.length) {
    await adminMerchantsStore.fetchBanks()
  }
})

function handleClose(close) {
  if (close && typeof close === 'function') {
    close()
  }
  emit('closed')
}

async function handleSubmit(close) {
  errors.value = { accountNumber: '', bankCode: '' }

  if (!form.value.bankCode) {
    errors.value.bankCode = 'Please select a bank'
    return
  }

  const trimmedAccount = form.value.accountNumber.trim()
  if (!/^\d{10}$/.test(trimmedAccount)) {
    errors.value.accountNumber = 'Account number must be exactly 10 digits'
    return
  }

  isSubmitting.value = true
  try {
    await adminMerchantsStore.addBankAccount(props.tenantId, {
      accountNumber: trimmedAccount,
      bankCode: form.value.bankCode,
      gateway: form.value.gateway,
    })

    form.value.accountNumber = ''
    form.value.bankCode = ''
    emit('added')
    handleClose(close)
  } catch {
    // Errors handled by global fetch interceptor
  } finally {
    isSubmitting.value = false
  }
}
</script>
