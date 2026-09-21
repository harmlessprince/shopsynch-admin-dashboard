<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="completeComplianceModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[780px] max-h-[92vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[12px] shadow-xl overflow-hidden border border-[#E0E0E0]">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div class="flex items-center gap-[1.2rem]">
            <div class="w-[4rem] h-[4rem] rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[2.2rem]">policy</span>
            </div>
            <div>
              <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">Complete Compliance on Behalf of Merchant</h2>
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

        <!-- Navigation Tabs -->
        <div class="flex border-b border-[#E0E0E0] bg-white px-[2.4rem]">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            :class="[
              'flex items-center gap-[0.8rem] py-[1.4rem] px-[1.2rem] text-[1.4rem] font-[600] border-b-2 transition-colors cursor-pointer',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            ]"
            @click="activeTab = tab.id"
          >
            <span class="material-symbols-outlined text-[1.8rem]">{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- Form Body -->
        <form class="p-[2.4rem] flex flex-col gap-y-[2rem]" @submit.prevent="handleSubmit(close)">
          <!-- TAB 1: Business Profile -->
          <div v-show="activeTab === 'profile'" class="space-y-[1.6rem]">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-[1.6rem]">
              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                  Business Trading Name <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.businessProfile.businessTradingName"
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
                  v-model="form.businessProfile.businessType"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none bg-white"
                  required
                >
                  <option value="starter">Starter Business (Unregistered)</option>
                  <option value="registered">Registered Business (CAC)</option>
                </select>
              </div>

              <div v-if="form.businessProfile.businessType === 'registered'" class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                  Registration Number (RC/BN) <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.businessProfile.businessRegistrationNumber"
                  type="text"
                  placeholder="e.g. RC-1234567"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                  required
                >
              </div>

              <div v-if="form.businessProfile.businessType === 'registered'" class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                  Tax Identification Number (TIN) <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.businessProfile.businessTaxIdNumber"
                  type="text"
                  placeholder="e.g. TIN-98765432"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                  required
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Industry Sector</label>
                <input
                  v-model="form.businessProfile.industry"
                  type="text"
                  placeholder="e.g. Retail, Fashion, Electronics"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Expected Monthly Income</label>
                <input
                  v-model="form.businessProfile.businessExpectedMonthlyIncome"
                  type="text"
                  placeholder="e.g. 500000"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Staff Size</label>
                <select
                  v-model="form.businessProfile.staffSize"
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
                  v-model="form.businessProfile.businessStorefrontUrl"
                  type="text"
                  placeholder="https://..."
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Business Description (min 10 characters)</label>
              <textarea
                v-model="form.businessProfile.businessDescription"
                rows="3"
                placeholder="Describe the goods/services sold by this business..."
                class="w-full rounded-xl border border-slate-200 p-3 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              />
            </div>

            <!-- CAC Document Upload -->
            <div v-if="form.businessProfile.businessType === 'registered'" class="flex flex-col gap-y-[0.6rem] border-t border-slate-100 pt-4">
              <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center justify-between">
                <span>CAC Registration Document <span class="text-red-500">*</span></span>
                <span v-if="uploadingDoc === 'cac'" class="text-[1.2rem] text-primary">Uploading...</span>
              </label>
              <div class="flex items-center gap-3">
                <input
                  v-model="form.businessProfile.cacDocumentUrl"
                  type="text"
                  placeholder="Document URL or upload file"
                  class="flex-1 h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                  required
                >
                <label class="h-12 px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center gap-2 text-[1.3rem] font-semibold text-slate-700">
                  <span class="material-symbols-outlined text-[1.8rem]">upload_file</span>
                  <span>Upload</span>
                  <input type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg" @change="uploadFile($event, 'cac')" >
                </label>
              </div>
            </div>
          </div>

          <!-- TAB 2: Business Contact -->
          <div v-show="activeTab === 'contact'" class="space-y-[1.6rem]">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-[1.6rem]">
              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                  Primary Phone Number <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.businessContact.businessPrimaryPhoneNumber"
                  type="text"
                  placeholder="e.g. +2348012345678"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                  required
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Secondary Phone Number</label>
                <input
                  v-model="form.businessContact.businessSecondaryPhoneNumber"
                  type="text"
                  placeholder="Optional alternate phone"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Support Email Address</label>
                <input
                  v-model="form.businessContact.businessSupportEmailAddress"
                  type="email"
                  placeholder="support@merchant.com"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">General Email Address</label>
                <input
                  v-model="form.businessContact.businessGeneralEmailAddress"
                  type="email"
                  placeholder="hello@merchant.com"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Country</label>
                <input
                  v-model="form.businessContact.businessCountry"
                  type="text"
                  placeholder="Nigeria"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">State</label>
                <input
                  v-model="form.businessContact.businessState"
                  type="text"
                  placeholder="Lagos"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">City</label>
                <input
                  v-model="form.businessContact.businessCity"
                  type="text"
                  placeholder="Ikeja"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>
            </div>

            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Business Address</label>
              <input
                v-model="form.businessContact.businessAddress"
                type="text"
                placeholder="12 Allen Avenue, Ikeja, Lagos"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>
          </div>

          <!-- TAB 3: Owner KYC -->
          <div v-show="activeTab === 'kyc'" class="space-y-[1.6rem]">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-[1.6rem]">
              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                  First Name <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.ownerKyc.firstName"
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
                  v-model="form.ownerKyc.lastName"
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
                  v-model="form.ownerKyc.phoneNumber"
                  type="text"
                  placeholder="e.g. +2348012345678"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                  required
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Date of Birth</label>
                <input
                  v-model="form.ownerKyc.dateOfBirth"
                  type="date"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Nationality</label>
                <input
                  v-model="form.ownerKyc.nationality"
                  type="text"
                  placeholder="Nigerian"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">ID Type</label>
                <select
                  v-model="form.ownerKyc.idType"
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
                  v-model="form.ownerKyc.idNumber"
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
                v-model="form.ownerKyc.address"
                type="text"
                placeholder="Residential street address"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                required
              >
            </div>

            <!-- KYC Documents -->
            <div class="space-y-[1.2rem] border-t border-slate-100 pt-4">
              <!-- ID Document -->
              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center justify-between">
                  <span>ID Document URL</span>
                  <span v-if="uploadingDoc === 'idDoc'" class="text-[1.2rem] text-primary">Uploading...</span>
                </label>
                <div class="flex items-center gap-3">
                  <input
                    v-model="form.ownerKyc.idDocumentUrl"
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

              <!-- Selfie / Profile Photo -->
              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center justify-between">
                  <span>Owner Selfie / Photo</span>
                  <span v-if="uploadingDoc === 'profile'" class="text-[1.2rem] text-primary">Uploading...</span>
                </label>
                <div class="flex items-center gap-3">
                  <input
                    v-model="form.ownerKyc.profileUrl"
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
                    v-model="form.ownerKyc.proofOfAddress"
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
          </div>

          <!-- Bottom Actions -->
          <div class="flex items-center justify-between pt-[1.6rem] border-t border-[#E2E8F0]">
            <div>
              <button
                v-if="activeTab !== 'profile'"
                type="button"
                class="px-[1.6rem] py-[0.8rem] rounded-[8px] border border-slate-300 text-[1.3rem] font-[600] text-slate-700 hover:bg-slate-50"
                @click="goToPrevTab"
              >
                Previous Tab
              </button>
            </div>

            <div class="flex items-center gap-[1.2rem]">
              <button
                type="button"
                class="h-[44px] px-[2rem] rounded-[8px] border border-[#CBD5E1] text-[1.4rem] font-[600] text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                @click="handleClose(close)"
              >
                Cancel
              </button>

              <button
                v-if="activeTab !== 'kyc'"
                type="button"
                class="h-[44px] px-[2.4rem] rounded-[8px] bg-primary text-white text-[1.4rem] font-[700] hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-[0.6rem]"
                @click="goToNextTab"
              >
                <span>Next</span>
                <span class="material-symbols-outlined text-[1.8rem]">arrow_forward</span>
              </button>

              <button
                v-else
                type="submit"
                :disabled="isSubmitting"
                class="h-[44px] px-[2.4rem] rounded-[8px] bg-emerald-600 text-white text-[1.4rem] font-[700] hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.6rem]"
              >
                <span v-if="isSubmitting" class="animate-spin material-symbols-outlined text-[1.8rem]">progress_activity</span>
                <span v-else class="material-symbols-outlined text-[1.8rem]">send</span>
                <span>{{ isSubmitting ? 'Submitting Compliance...' : 'Submit Compliance' }}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { VueFinalModal } from 'vue-final-modal'
import { useAdminMerchantsStore } from '~/stores/adminMerchants.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { handleFileUpload } from '~/utils/helpers.js'

const props = defineProps({
  tenantId: { type: String, required: true },
  merchant: { type: Object, default: null },
})

const emit = defineEmits(['completed', 'closed'])

const adminMerchantsStore = useAdminMerchantsStore()
const toastStore = useToastStore()

const tabs = [
  { id: 'profile', label: '1. Business Profile', icon: 'storefront' },
  { id: 'contact', label: '2. Business Contact', icon: 'contact_mail' },
  { id: 'kyc', label: '3. Owner KYC', icon: 'person' },
]

const activeTab = ref('profile')
const isSubmitting = ref(false)
const uploadingDoc = ref('')

const form = reactive({
  businessProfile: {
    businessTradingName: '',
    businessType: 'starter',
    businessRegistrationNumber: '',
    businessStorefrontUrl: '',
    businessDescription: '',
    industry: '',
    businessTaxIdNumber: '',
    businessExpectedMonthlyIncome: '',
    businessState: '',
    businessCountry: 'Nigeria',
    businessCity: '',
    businessAddress: '',
    cacDocumentUrl: '',
    staffSize: '',
  },
  businessContact: {
    businessCountry: 'Nigeria',
    businessCity: '',
    businessAddress: '',
    businessPrimaryPhoneNumber: '',
    businessSecondaryPhoneNumber: '',
    businessSupportEmailAddress: '',
    businessGeneralEmailAddress: '',
  },
  ownerKyc: {
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
  },
})

function populateForm(m) {
  if (!m) return
  form.businessProfile.businessTradingName = m.businessTradingName || ''
  form.businessProfile.businessType = m.businessType ? m.businessType.toLowerCase() : 'starter'
  form.businessProfile.businessRegistrationNumber = m.businessRegistrationNumber || ''
  form.businessProfile.businessStorefrontUrl = m.businessStorefrontUrl || ''
  form.businessProfile.businessDescription = m.businessDescription || ''
  form.businessProfile.industry = m.industry || ''
  form.businessProfile.businessTaxIdNumber = m.businessTaxIdNumber || ''
  form.businessProfile.businessExpectedMonthlyIncome = m.businessExpectedMonthlyIncome ? String(m.businessExpectedMonthlyIncome) : ''
  form.businessProfile.businessState = m.businessState || ''
  form.businessProfile.businessCountry = m.businessCountry || 'Nigeria'
  form.businessProfile.businessCity = m.businessCity || ''
  form.businessProfile.businessAddress = m.businessAddress || ''
  form.businessProfile.cacDocumentUrl = m.cacDocumentUrl || ''
  form.businessProfile.staffSize = m.staffSize || ''

  form.businessContact.businessCountry = m.businessCountry || 'Nigeria'
  form.businessContact.businessCity = m.businessCity || ''
  form.businessContact.businessAddress = m.businessAddress || ''
  form.businessContact.businessPrimaryPhoneNumber = m.businessPrimaryPhoneNumber || ''
  form.businessContact.businessSecondaryPhoneNumber = m.businessSecondaryPhoneNumber || ''
  form.businessContact.businessSupportEmailAddress = m.businessSupportEmailAddress || ''
  form.businessContact.businessGeneralEmailAddress = m.businessGeneralEmailAddress || ''

  if (m.owner) {
    form.ownerKyc.fullName = m.owner.fullName || ''
    form.ownerKyc.firstName = m.owner.firstName || (m.owner.fullName ? m.owner.fullName.split(' ')[0] : '')
    form.ownerKyc.lastName = m.owner.lastName || (m.owner.fullName ? m.owner.fullName.split(' ').slice(1).join(' ') : '')
    form.ownerKyc.phoneNumber = m.owner.phoneNumber || ''
    form.ownerKyc.address = m.owner.address || ''
    form.ownerKyc.idNumber = m.owner.idNumber || ''
    form.ownerKyc.dateOfBirth = m.owner.dob || ''
    form.ownerKyc.nationality = m.owner.nationality || 'Nigerian'
    form.ownerKyc.idType = m.owner.idType || ''
    form.ownerKyc.idDocumentUrl = m.owner.idDocumentUrl || ''
    form.ownerKyc.profileUrl = m.owner.profileUrl || ''
    form.ownerKyc.proofOfAddress = m.owner.proofOfAddressUrl || m.owner.proofOfAddress || ''
  }
}

watch(
  () => props.merchant,
  (newM) => {
    if (newM) populateForm(newM)
  },
  { immediate: true }
)

function goToNextTab() {
  if (activeTab.value === 'profile') activeTab.value = 'contact'
  else if (activeTab.value === 'contact') activeTab.value = 'kyc'
}

function goToPrevTab() {
  if (activeTab.value === 'kyc') activeTab.value = 'contact'
  else if (activeTab.value === 'contact') activeTab.value = 'profile'
}

async function uploadFile(e, type) {
  uploadingDoc.value = type
  try {
    const url = await handleFileUpload(e)
    if (url) {
      if (type === 'cac') form.businessProfile.cacDocumentUrl = url
      else if (type === 'idDoc') form.ownerKyc.idDocumentUrl = url
      else if (type === 'profile') form.ownerKyc.profileUrl = url
      else if (type === 'proof') form.ownerKyc.proofOfAddress = url
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

async function handleSubmit(close) {
  // Sync fullName if not set
  if (!form.ownerKyc.fullName && (form.ownerKyc.firstName || form.ownerKyc.lastName)) {
    form.ownerKyc.fullName = `${form.ownerKyc.firstName} ${form.ownerKyc.lastName}`.trim()
  }

  // Basic validation check
  if (!form.businessProfile.businessTradingName) {
    activeTab.value = 'profile'
    toastStore.error('Please provide a business trading name.', '')
    return
  }
  if (!form.businessContact.businessPrimaryPhoneNumber) {
    activeTab.value = 'contact'
    toastStore.error('Please provide a primary contact phone number.', '')
    return
  }
  if (!form.ownerKyc.firstName || !form.ownerKyc.lastName || !form.ownerKyc.phoneNumber || !form.ownerKyc.address) {
    activeTab.value = 'kyc'
    toastStore.error('Please fill in required owner details (names, phone, address).', '')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      businessProfile: {
        businessTradingName: form.businessProfile.businessTradingName || undefined,
        businessType: form.businessProfile.businessType || undefined,
        businessRegistrationNumber: form.businessProfile.businessRegistrationNumber || undefined,
        businessStorefrontUrl: form.businessProfile.businessStorefrontUrl || undefined,
        businessDescription: form.businessProfile.businessDescription || undefined,
        industry: form.businessProfile.industry || undefined,
        businessTaxIdNumber: form.businessProfile.businessTaxIdNumber || undefined,
        businessExpectedMonthlyIncome: form.businessProfile.businessExpectedMonthlyIncome || undefined,
        businessState: form.businessProfile.businessState || undefined,
        businessCountry: form.businessProfile.businessCountry || undefined,
        businessCity: form.businessProfile.businessCity || undefined,
        businessAddress: form.businessProfile.businessAddress || undefined,
        cacDocumentUrl: form.businessProfile.cacDocumentUrl || undefined,
        staffSize: form.businessProfile.staffSize || undefined,
      },
      businessContact: {
        businessCountry: form.businessContact.businessCountry || undefined,
        businessCity: form.businessContact.businessCity || undefined,
        businessAddress: form.businessContact.businessAddress || undefined,
        businessPrimaryPhoneNumber: form.businessContact.businessPrimaryPhoneNumber || undefined,
        businessSecondaryPhoneNumber: form.businessContact.businessSecondaryPhoneNumber || undefined,
        businessSupportEmailAddress: form.businessContact.businessSupportEmailAddress || undefined,
        businessGeneralEmailAddress: form.businessContact.businessGeneralEmailAddress || undefined,
      },
      ownerKyc: {
        fullName: form.ownerKyc.fullName || `${form.ownerKyc.firstName} ${form.ownerKyc.lastName}`.trim(),
        firstName: form.ownerKyc.firstName,
        lastName: form.ownerKyc.lastName,
        phoneNumber: form.ownerKyc.phoneNumber,
        address: form.ownerKyc.address,
        idNumber: form.ownerKyc.idNumber || undefined,
        dateOfBirth: form.ownerKyc.dateOfBirth || undefined,
        nationality: form.ownerKyc.nationality || undefined,
        idType: form.ownerKyc.idType || undefined,
        idDocumentUrl: form.ownerKyc.idDocumentUrl || undefined,
        profileUrl: form.ownerKyc.profileUrl || undefined,
        proofOfAddress: form.ownerKyc.proofOfAddress || undefined,
      },
    }

    await adminMerchantsStore.completeCompliance(props.tenantId, payload)
    emit('completed')
    handleClose(close)
  } catch {
    // Handled by global fetch interceptor
  } finally {
    isSubmitting.value = false
  }
}
</script>
