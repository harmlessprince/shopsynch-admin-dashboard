<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="updateOwnerKycModal"
    name="updateOwnerKycModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[680px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[12px] shadow-xl overflow-hidden border border-[#E0E0E0]">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div class="flex items-center gap-[1.2rem]">
            <div class="w-[4rem] h-[4rem] rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[2.2rem]">verified_user</span>
            </div>
            <div>
              <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">Update KYC / Identity Details</h2>
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
                First Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.firstName"
                type="text"
                placeholder="First name"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                required
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                Last Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.lastName"
                type="text"
                placeholder="Last name"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                required
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                Owner Phone Number <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.phoneNumber"
                type="text"
                placeholder="e.g. +2348012345678"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                required
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Date of Birth</label>
              <input
                v-model="form.dateOfBirth"
                type="date"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Nationality</label>
              <input
                v-model="form.nationality"
                type="text"
                placeholder="Nigerian"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">ID Type</label>
              <select
                v-model="form.idType"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none bg-white"
              >
                <option value="">Select ID Type</option>
                <option value="NATIONAL_ID">National ID / NIN</option>
                <option value="PASSPORT">International Passport</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
                <option value="VOTERS_CARD">Voter's Card</option>
              </select>
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">ID Number</label>
              <input
                v-model="form.idNumber"
                type="text"
                placeholder="ID document number"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>
          </div>

          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="font-[600] text-[1.3rem] text-[#0F172A]">
              Residential Address <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.address"
              type="text"
              placeholder="Residential street address"
              class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              required
            >
          </div>

          <!-- Document Uploads -->
          <div class="space-y-[1.2rem] border-t border-slate-100 pt-4">
            <!-- ID Document -->
            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center justify-between">
                <span>ID Document URL</span>
                <span v-if="uploadingDoc === 'idDoc'" class="text-[1.2rem] text-primary">Uploading...</span>
              </label>
              <div class="flex items-center gap-3">
                <input
                  v-model="form.idDocumentUrl"
                  type="text"
                  placeholder="URL or upload ID document"
                  class="flex-1 h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
                <label class="h-12 px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center gap-2 text-[1.3rem] font-semibold text-slate-700">
                  <span class="material-symbols-outlined text-[1.8rem]">upload_file</span>
                  <span>Upload</span>
                  <input type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg" @change="uploadFile($event, 'idDoc')" >
                </label>
              </div>
            </div>

            <!-- Selfie / Photo -->
            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center justify-between">
                <span>Owner Selfie / Photo</span>
                <span v-if="uploadingDoc === 'profile'" class="text-[1.2rem] text-primary">Uploading...</span>
              </label>
              <div class="flex items-center gap-3">
                <input
                  v-model="form.profileUrl"
                  type="text"
                  placeholder="URL or upload selfie"
                  class="flex-1 h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
                <label class="h-12 px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center gap-2 text-[1.3rem] font-semibold text-slate-700">
                  <span class="material-symbols-outlined text-[1.8rem]">upload_file</span>
                  <span>Upload</span>
                  <input type="file" class="hidden" accept=".png,.jpg,.jpeg" @change="uploadFile($event, 'profile')" >
                </label>
              </div>
            </div>

            <!-- Proof of Address -->
            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center justify-between">
                <span>Proof of Address Document</span>
                <span v-if="uploadingDoc === 'proof'" class="text-[1.2rem] text-primary">Uploading...</span>
              </label>
              <div class="flex items-center gap-3">
                <input
                  v-model="form.proofOfAddress"
                  type="text"
                  placeholder="URL or upload utility bill / bank statement"
                  class="flex-1 h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
                <label class="h-12 px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center gap-2 text-[1.3rem] font-semibold text-slate-700">
                  <span class="material-symbols-outlined text-[1.8rem]">upload_file</span>
                  <span>Upload</span>
                  <input type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg" @change="uploadFile($event, 'proof')" >
                </label>
              </div>
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
              <span>{{ isSubmitting ? 'Saving...' : 'Update KYC Details' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { VueFinalModal, useVfm } from 'vue-final-modal'
import { useAdminMerchantsStore } from '~/stores/adminMerchants.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { handleFileUpload } from '~/utils/helpers.js'
import ConfirmModal from '~/components/Modals/ConfirmModal.vue'

const props = defineProps({
  tenantId: { type: String, required: true },
  merchant: { type: Object, default: null },
})

const emit = defineEmits(['updated', 'closed'])

const vfm = useVfm()
const adminMerchantsStore = useAdminMerchantsStore()
const toastStore = useToastStore()

const isSubmitting = ref(false)
const uploadingDoc = ref('')

const form = reactive({
  fullName: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  address: '',
  idNumber: '',
  dateOfBirth: '',
  nationality: 'Nigerian',
  idType: '',
  idDocumentUrl: '',
  profileUrl: '',
  proofOfAddress: '',
})

function populateForm(m) {
  if (!m || !m.owner) return
  const o = m.owner
  form.fullName = o.fullName || ''
  form.firstName = o.firstName || (o.fullName ? o.fullName.split(' ')[0] : '')
  form.lastName = o.lastName || (o.fullName ? o.fullName.split(' ').slice(1).join(' ') : '')
  form.phoneNumber = o.phoneNumber || ''
  form.address = o.address || ''
  form.idNumber = o.idNumber || ''
  form.dateOfBirth = o.dateOfBirth || o.dob || ''
  form.nationality = o.nationality || 'Nigerian'
  form.idType = o.idType || ''
  form.idDocumentUrl = o.idDocumentUrl || ''
  form.profileUrl = o.profileUrl || ''
  form.proofOfAddress = o.proofOfAddress || o.proofOfAddressUrl || ''
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

async function uploadFile(e, type) {
  uploadingDoc.value = type
  try {
    const url = await handleFileUpload(e, props.tenantId)
    if (url) {
      if (type === 'idDoc') form.idDocumentUrl = url
      else if (type === 'profile') form.profileUrl = url
      else if (type === 'proof') form.proofOfAddress = url
      toastStore.success('File uploaded successfully', '')
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
    const fullName = form.fullName || `${form.firstName} ${form.lastName}`.trim()
    const payload = {
      fullName,
      firstName: form.firstName,
      lastName: form.lastName,
      phoneNumber: form.phoneNumber,
      address: form.address,
      idNumber: form.idNumber || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      nationality: form.nationality || undefined,
      idType: form.idType || undefined,
      idDocumentUrl: form.idDocumentUrl || undefined,
      profileUrl: form.profileUrl || undefined,
      proofOfAddress: form.proofOfAddress || undefined,
    }

    await adminMerchantsStore.updateOwnerKyc(props.tenantId, payload)
    emit('updated')
    handleClose(close)
  } catch {
    // Handled by global fetch interceptor
  } finally {
    isSubmitting.value = false
  }
}

function handleSubmit(close) {
  if (!form.firstName || !form.lastName || !form.phoneNumber || !form.address) {
    toastStore.error('Please fill in required owner details (names, phone, address).', '')
    return
  }

  const m = props.merchant
  const isUnderReview = ['AWAITING_APPROVAL', 'UNDER_REVIEW'].includes(m?.complianceReviewStatus)
  const isApproved = m?.complianceReviewStatus === 'APPROVED' || m?.kycCompleted
  const isPrefilled = m?.kycDetailFilled || Boolean(m?.owner?.idType || m?.owner?.idNumber || m?.owner?.address)

  if (isUnderReview || isApproved || isPrefilled) {
    const randomCode = generateRandomCode()
    const statusLabel = isApproved ? 'approved' : isUnderReview ? 'under review' : 'already prefilled'

    vfm.open(
      {
        component: ConfirmModal,
        on: {
          confirm(closeConfirm) {
            closeConfirm()
            executeSubmit(close)
          },
        },
      },
      {
        modalTitle: 'Confirm KYC Update',
        prompt: `This section is currently ${statusLabel}. Updating it will modify owner identity verification data.`,
        challengeText: randomCode,
        challengeInstructions: 'Please enter the confirmation code below to apply this update:',
        confirmLabel: 'Confirm & Update',
        variant: 'primary',
      }
    )
  } else {
    executeSubmit(close)
  }
}
</script>
