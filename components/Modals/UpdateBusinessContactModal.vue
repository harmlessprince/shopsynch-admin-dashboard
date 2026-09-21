<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="updateBusinessContactModal"
    name="updateBusinessContactModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[680px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[12px] shadow-xl overflow-hidden border border-[#E0E0E0]">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div class="flex items-center gap-[1.2rem]">
            <div class="w-[4rem] h-[4rem] rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[2.2rem]">contact_mail</span>
            </div>
            <div>
              <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">Update Business Contact</h2>
              <p class="text-[1.3rem] text-[#616161]">
                {{ merchant?.businessTradingName || merchant?.name || "Merchant" }}
                <span v-if="merchant?.code" class="text-primary font-[500]">· {{ merchant.code }}</span>
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

        <!-- Form Body -->
        <form class="p-[2.4rem] flex flex-col gap-y-[2rem]" @submit.prevent="handleSubmit(close)">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-[1.6rem]">
            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                Primary Phone Number <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.businessPrimaryPhoneNumber"
                type="text"
                placeholder="e.g. +2348012345678"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                required
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Secondary Phone Number</label>
              <input
                v-model="form.businessSecondaryPhoneNumber"
                type="text"
                placeholder="Optional alternate phone"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Support Email Address</label>
              <input
                v-model="form.businessSupportEmailAddress"
                type="email"
                placeholder="support@merchant.com"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">General Email Address</label>
              <input
                v-model="form.businessGeneralEmailAddress"
                type="email"
                placeholder="hello@merchant.com"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Country</label>
              <input
                v-model="form.businessCountry"
                type="text"
                placeholder="Nigeria"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">City</label>
              <input
                v-model="form.businessCity"
                type="text"
                placeholder="Ikeja"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>
          </div>

          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="font-[600] text-[1.3rem] text-[#0F172A]">Business Address</label>
            <input
              v-model="form.businessAddress"
              type="text"
              placeholder="12 Allen Avenue, Ikeja, Lagos"
              class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
            >
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-[1.2rem] pt-[1.6rem] border-t border-[#E2E8F0]">
            <button
              type="button"
              class="h-[44px] px-[2rem] rounded-[8px] border border-[#CBD5E1] text-[1.4rem] font-[600] text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              @click="handleClose(close)"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="h-[44px] px-[2.4rem] rounded-[8px] bg-primary text-white text-[1.4rem] font-[700] hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.6rem]"
            >
              <span v-if="isSubmitting" class="animate-spin material-symbols-outlined text-[1.8rem]">progress_activity</span>
              <span v-else class="material-symbols-outlined text-[1.8rem]">check</span>
              <span>{{ isSubmitting ? 'Saving...' : 'Update Business Contact' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { VueFinalModal, useModal } from 'vue-final-modal'
import { useAdminMerchantsStore } from '~/stores/adminMerchants.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import ConfirmModal from '~/components/Modals/ConfirmModal.vue'

const props = defineProps({
  tenantId: { type: String, required: true },
  merchant: { type: Object, default: null },
})

const emit = defineEmits(['updated', 'closed'])

const adminMerchantsStore = useAdminMerchantsStore()
const toastStore = useToastStore()

const isSubmitting = ref(false)

const form = reactive({
  businessCountry: 'Nigeria',
  businessCity: '',
  businessAddress: '',
  businessPrimaryPhoneNumber: '',
  businessSecondaryPhoneNumber: '',
  businessSupportEmailAddress: '',
  businessGeneralEmailAddress: '',
})

function populateForm(m) {
  if (!m) return
  form.businessCountry = m.businessCountry || 'Nigeria'
  form.businessCity = m.businessCity || ''
  form.businessAddress = m.businessAddress || ''
  form.businessPrimaryPhoneNumber = m.businessPrimaryPhoneNumber || ''
  form.businessSecondaryPhoneNumber = m.businessSecondaryPhoneNumber || ''
  form.businessSupportEmailAddress = m.businessSupportEmailAddress || ''
  form.businessGeneralEmailAddress = m.businessGeneralEmailAddress || ''
}

watch(
  () => props.merchant,
  (newM) => {
    if (newM) populateForm(newM)
  },
  { immediate: true }
)

function generateRandomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function handleClose(close) {
  if (close && typeof close === 'function') {
    close()
  }
  emit('closed')
}

async function executeSubmit(close) {
  isSubmitting.value = true
  try {
    const payload = {
      businessCountry: form.businessCountry || undefined,
      businessCity: form.businessCity || undefined,
      businessAddress: form.businessAddress || undefined,
      businessPrimaryPhoneNumber: form.businessPrimaryPhoneNumber || undefined,
      businessSecondaryPhoneNumber: form.businessSecondaryPhoneNumber || undefined,
      businessSupportEmailAddress: form.businessSupportEmailAddress || undefined,
      businessGeneralEmailAddress: form.businessGeneralEmailAddress || undefined,
    }

    await adminMerchantsStore.updateBusinessContact(props.tenantId, payload)
    emit('updated')
    handleClose(close)
  } catch {
    // Handled by global fetch interceptor
  } finally {
    isSubmitting.value = false
  }
}

function handleSubmit(close) {
  if (!form.businessPrimaryPhoneNumber) {
    toastStore.error('Please provide a primary contact phone number.', '')
    return
  }

  const m = props.merchant
  const isUnderReview = ['AWAITING_APPROVAL', 'UNDER_REVIEW'].includes(m?.complianceReviewStatus)
  const isApproved = m?.complianceReviewStatus === 'APPROVED' || m?.kybCompleted
  const isPrefilled = m?.contactDetailFilled || Boolean(m?.businessPrimaryPhoneNumber)

  if (isUnderReview || isApproved || isPrefilled) {
    const randomCode = generateRandomCode()
    const statusLabel = isApproved ? 'approved' : isUnderReview ? 'under review' : 'already prefilled'

    const confirmModal = useModal({
      component: ConfirmModal,
      attrs: {
        modalTitle: 'Confirm Business Contact Update',
        prompt: `This section is currently ${statusLabel}. Updating it will modify recorded contact details for this merchant.`,
        challengeText: randomCode,
        challengeInstructions: 'Please enter the confirmation code below to apply this update:',
        confirmLabel: 'Confirm & Update',
        variant: 'primary',
        onConfirm() {
          confirmModal.close()
          executeSubmit(close)
        },
      },
    })
    confirmModal.open()
  } else {
    executeSubmit(close)
  }
}
</script>
