<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="updateBusinessProfileModal"
    name="updateBusinessProfileModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[680px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[12px] shadow-xl overflow-hidden border border-[#E0E0E0]">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div class="flex items-center gap-[1.2rem]">
            <div class="w-[4rem] h-[4rem] rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[2.2rem]">storefront</span>
            </div>
            <div>
              <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">Update Business Profile</h2>
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
                Business Trading Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.businessTradingName"
                type="text"
                placeholder="e.g. Acme Stores"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                required
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                Business Type <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.businessType"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none bg-white"
                required
              >
                <option value="starter">Starter Business (Unregistered)</option>
                <option value="registered">Registered Business (CAC)</option>
              </select>
            </div>

            <div v-if="form.businessType === 'registered'" class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                Registration Number (RC/BN) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.businessRegistrationNumber"
                type="text"
                placeholder="e.g. RC-1234567"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                required
              >
            </div>

            <div v-if="form.businessType === 'registered'" class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                Tax Identification Number (TIN) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.businessTaxIdNumber"
                type="text"
                placeholder="e.g. TIN-98765432"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                required
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Industry Sector</label>
              <input
                v-model="form.industry"
                type="text"
                placeholder="e.g. Retail, Fashion, Electronics"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Expected Monthly Income</label>
              <input
                v-model="form.businessExpectedMonthlyIncome"
                type="text"
                placeholder="e.g. 500000"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Staff Size</label>
              <select
                v-model="form.staffSize"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none bg-white"
              >
                <option value="">Select staff size</option>
                <option value="1-5">1-5</option>
                <option value="6-20">6-20</option>
                <option value="21-50">21-50</option>
                <option value="50+">50+</option>
              </select>
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Storefront URL</label>
              <input
                v-model="form.businessStorefrontUrl"
                type="text"
                placeholder="https://..."
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>
          </div>

          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="font-[600] text-[1.3rem] text-[#0F172A]">Business Description</label>
            <textarea
              v-model="form.businessDescription"
              rows="3"
              placeholder="Describe the goods/services sold by this business..."
              class="w-full rounded-xl border border-slate-200 p-3 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
            />
          </div>

          <!-- CAC Document Upload -->
          <div v-if="form.businessType === 'registered'" class="flex flex-col gap-y-[0.6rem] border-t border-slate-100 pt-4">
            <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center justify-between">
              <span>CAC Registration Document <span class="text-red-500">*</span></span>
              <span v-if="uploadingDoc" class="text-[1.2rem] text-primary">Uploading...</span>
            </label>
            <div class="flex items-center gap-3">
              <input
                v-model="form.cacDocumentUrl"
                type="text"
                placeholder="Document URL or upload file"
                class="flex-1 h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                required
              >
              <label class="h-12 px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center gap-2 text-[1.3rem] font-semibold text-slate-700">
                <span class="material-symbols-outlined text-[1.8rem]">upload_file</span>
                <span>Upload</span>
                <input type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg" @change="uploadFile" >
              </label>
            </div>
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
              <span>{{ isSubmitting ? 'Saving...' : 'Update Business Profile' }}</span>
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
import { handleFileUpload } from '~/utils/helpers.js'
import ConfirmModal from '~/components/Modals/ConfirmModal.vue'

const props = defineProps({
  tenantId: { type: String, required: true },
  merchant: { type: Object, default: null },
})

const emit = defineEmits(['updated', 'closed'])

const adminMerchantsStore = useAdminMerchantsStore()
const toastStore = useToastStore()

const isSubmitting = ref(false)
const uploadingDoc = ref(false)

const form = reactive({
  businessTradingName: '',
  businessType: 'starter',
  businessRegistrationNumber: '',
  businessStorefrontUrl: '',
  businessDescription: '',
  industry: '',
  businessTaxIdNumber: '',
  businessExpectedMonthlyIncome: '',
  staffSize: '',
  cacDocumentUrl: '',
})

function populateForm(m) {
  if (!m) return
  form.businessTradingName = m.businessTradingName || ''
  form.businessType = m.businessType ? m.businessType.toLowerCase() : 'starter'
  form.businessRegistrationNumber = m.businessRegistrationNumber || ''
  form.businessStorefrontUrl = m.businessStorefrontUrl || ''
  form.businessDescription = m.businessDescription || ''
  form.industry = m.industry || ''
  form.businessTaxIdNumber = m.businessTaxIdNumber || ''
  form.businessExpectedMonthlyIncome = m.businessExpectedMonthlyIncome ? String(m.businessExpectedMonthlyIncome) : ''
  form.staffSize = m.staffSize || ''
  form.cacDocumentUrl = m.cacDocumentUrl || ''
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

async function uploadFile(e) {
  uploadingDoc.value = true
  try {
    const url = await handleFileUpload(e, props.tenantId)
    if (url) {
      form.cacDocumentUrl = url
      toastStore.success('CAC document uploaded successfully', '')
    }
  } catch {
    toastStore.error('File upload failed', '')
  } finally {
    uploadingDoc.value = ''
  }
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
      businessTradingName: form.businessTradingName || undefined,
      businessType: form.businessType || undefined,
      businessRegistrationNumber: form.businessRegistrationNumber || undefined,
      businessStorefrontUrl: form.businessStorefrontUrl || undefined,
      businessDescription: form.businessDescription || undefined,
      industry: form.industry || undefined,
      businessTaxIdNumber: form.businessTaxIdNumber || undefined,
      businessExpectedMonthlyIncome: form.businessExpectedMonthlyIncome || undefined,
      staffSize: form.staffSize || undefined,
      cacDocumentUrl: form.cacDocumentUrl || undefined,
    }

    await adminMerchantsStore.updateBusinessProfile(props.tenantId, payload)
    emit('updated')
    handleClose(close)
  } catch {
    // Handled by global fetch interceptor
  } finally {
    isSubmitting.value = false
  }
}

function handleSubmit(close) {
  if (!form.businessTradingName) {
    toastStore.error('Please provide a business trading name.', '')
    return
  }
  if (form.businessType === 'registered') {
    if (!form.businessRegistrationNumber) {
      toastStore.error('Please provide a CAC registration number.', '')
      return
    }
    if (!form.businessTaxIdNumber) {
      toastStore.error('Please provide a Tax ID Number (TIN).', '')
      return
    }
  }

  const m = props.merchant
  const isUnderReview = ['AWAITING_APPROVAL', 'UNDER_REVIEW'].includes(m?.complianceReviewStatus)
  const isApproved = m?.complianceReviewStatus === 'APPROVED' || m?.kybCompleted
  const isPrefilled = m?.kybDetailFilled || Boolean(m?.businessTradingName)

  if (isUnderReview || isApproved || isPrefilled) {
    const randomCode = generateRandomCode()
    const statusLabel = isApproved ? 'approved' : isUnderReview ? 'under review' : 'already prefilled'

    const confirmModal = useModal({
      component: ConfirmModal,
      attrs: {
        modalTitle: 'Confirm Business Profile Update',
        prompt: `This section is currently ${statusLabel}. Updating it will modify recorded verification data for this merchant.`,
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
