<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="updateStoreSettingsModal"
    name="updateStoreSettingsModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[720px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[12px] shadow-xl overflow-hidden border border-[#E0E0E0]">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div class="flex items-center gap-[1.2rem]">
            <div class="w-[4rem] h-[4rem] rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[2.2rem]">store</span>
            </div>
            <div>
              <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">Update Store Settings</h2>
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
        <div class="flex border-b border-slate-200 bg-slate-50 px-[2.4rem] overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            :class="[
              'flex items-center gap-[0.6rem] py-[1.2rem] px-[1.6rem] font-[600] text-[1.3rem] border-b-2 -mb-[1px] transition-all whitespace-nowrap cursor-pointer',
              activeTab === tab.id
                ? 'border-primary text-primary bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            ]"
            @click="activeTab = tab.id"
          >
            <span class="material-symbols-outlined text-[1.8rem]">{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- Form Body -->
        <form class="p-[2.4rem] flex flex-col gap-y-[2rem]" @submit.prevent="handleSubmit(close)">
          <!-- TAB 1: CONFIGURATION -->
          <div v-show="activeTab === 'config'" class="space-y-[2rem]">
            <!-- Domain / Subdomain -->
            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">
                Store Domain / Web Address <span class="text-red-500">*</span>
              </label>
              <div
                class="flex items-center h-12 border rounded-xl overflow-hidden focus-within:ring-2 transition-all"
                :class="subdomainError ? 'border-red-500 focus-within:ring-red-500/20' : 'border-slate-200 focus-within:border-primary focus-within:ring-primary/20'"
              >
                <div class="h-full bg-slate-50 flex items-center px-4 shrink-0 border-r border-slate-200 text-[1.3rem] font-[500] text-slate-600">
                  https://
                </div>
                <div class="flex-1 h-full relative">
                  <input
                    v-model="form.subdomain"
                    type="text"
                    placeholder="mystore"
                    class="w-full h-full px-3 pr-8 text-[1.3rem] text-[#1B1B19] outline-none border-none bg-transparent"
                    required
                  >
                  <div v-if="isCheckingSlug" class="absolute right-3 top-1/2 -translate-y-1/2">
                    <span class="animate-spin material-symbols-outlined text-[1.6rem] text-primary">progress_activity</span>
                  </div>
                </div>
                <div class="h-full bg-slate-50 flex items-center px-4 shrink-0 border-l border-slate-200 text-[1.3rem] font-[500] text-slate-500">
                  .shopsynch.com/
                </div>
              </div>
              <span v-if="subdomainError" class="text-[1.2rem] text-red-600 font-[500]">
                {{ subdomainError }}
              </span>
              <p class="text-[1.2rem] text-slate-500">Unique storefront address for customers and public access.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-[1.6rem]">
              <!-- Timezone -->
              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Store Timezone</label>
                <select
                  v-model="form.timezone"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none bg-white"
                >
                  <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                  <option value="Africa/Accra">Africa/Accra (GMT+0)</option>
                  <option value="Africa/Nairobi">Africa/Nairobi (GMT+3)</option>
                  <option value="Europe/London">Europe/London (GMT+0/+1)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                </select>
              </div>

              <!-- Currency -->
              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Store Currency</label>
                <select
                  v-model="form.currency"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none bg-white"
                >
                  <option value="NGN">NGN (₦) - Nigerian Naira</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GHS">GHS (₵) - Ghanaian Cedi</option>
                  <option value="KES">KES (KSh) - Kenyan Shilling</option>
                </select>
              </div>

              <!-- Costing Method -->
              <div class="flex flex-col gap-y-[0.6rem] sm:col-span-2">
                <div class="flex items-center justify-between">
                  <label class="font-[600] text-[1.3rem] text-[#0F172A]">Inventory Costing Method</label>
                  <span
                    v-if="storeSettings?.costingMethodLocked"
                    class="rounded-full bg-amber-100 px-2.5 py-0.5 text-[1.1rem] font-[700] text-amber-800"
                  >
                    Permanently Locked
                  </span>
                </div>
                <select
                  v-model="form.costingMethod"
                  :disabled="storeSettings?.costingMethodLocked"
                  :class="[
                    'h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none bg-white',
                    storeSettings?.costingMethodLocked ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''
                  ]"
                >
                  <option value="WEIGHTED_AVERAGE">Weighted Average Costing (Recommended)</option>
                  <option value="FIFO">First-In, First-Out (FIFO)</option>
                </select>
                <p v-if="storeSettings?.costingMethodLocked" class="text-[1.2rem] text-amber-700">
                  This merchant's inventory costing method is permanently locked and cannot be changed.
                </p>
                <p v-else class="text-[1.2rem] text-slate-500">
                  Note: Once saved, inventory costing method is locked to preserve accounting integrity.
                </p>
              </div>
            </div>
          </div>

          <!-- TAB 2: BRANDING -->
          <div v-show="activeTab === 'branding'" class="space-y-[2rem]">
            <!-- Logo Upload -->
            <div class="flex flex-col gap-y-[0.8rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center justify-between">
                <span>Store Logo</span>
                <span v-if="uploadingLogo" class="text-[1.2rem] text-primary">Uploading...</span>
              </label>

              <div class="flex items-center gap-[1.6rem] p-[1.4rem] border border-slate-200 rounded-xl bg-slate-50/50">
                <div class="w-[64px] h-[64px] rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    v-if="form.logoUrl"
                    :src="form.logoUrl"
                    alt="Logo preview"
                    class="w-full h-full object-contain p-1"
                  >
                  <span v-else class="material-symbols-outlined text-[2.8rem] text-slate-300">image</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <input
                      v-model="form.logoUrl"
                      type="text"
                      placeholder="Logo URL or upload image"
                      class="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none bg-white"
                    >
                    <label class="h-10 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 cursor-pointer flex items-center gap-1.5 text-[1.2rem] font-semibold text-slate-700 shrink-0">
                      <span class="material-symbols-outlined text-[1.6rem]">upload_file</span>
                      <span>Upload</span>
                      <input type="file" class="hidden" accept="image/*" @change="uploadLogo" >
                    </label>
                    <button
                      v-if="form.logoUrl"
                      type="button"
                      class="h-10 px-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer flex items-center"
                      title="Clear logo"
                      @click="form.logoUrl = ''"
                    >
                      <span class="material-symbols-outlined text-[1.6rem]">delete</span>
                    </button>
                  </div>
                  <p class="mt-1 text-[1.1rem] text-slate-500">Recommended size: 512x512px. PNG or JPG format.</p>
                </div>
              </div>
            </div>

            <!-- Brand Colors -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-[1.6rem]">
              <!-- Primary Color -->
              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Primary Brand Color</label>
                <div class="flex items-center gap-2 h-12 border border-slate-200 rounded-xl px-2 bg-white focus-within:border-primary">
                  <input
                    v-model="form.primaryColor"
                    type="color"
                    class="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  >
                  <input
                    v-model="form.primaryColor"
                    type="text"
                    placeholder="#003366"
                    class="flex-1 h-full outline-none text-[1.3rem] text-[#1B1B19] uppercase font-mono"
                  >
                </div>
              </div>

              <!-- Accent Color -->
              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Accent Brand Color</label>
                <div class="flex items-center gap-2 h-12 border border-slate-200 rounded-xl px-2 bg-white focus-within:border-primary">
                  <input
                    v-model="form.accentColor"
                    type="color"
                    class="w-8 h-8 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  >
                  <input
                    v-model="form.accentColor"
                    type="text"
                    placeholder="#FF6B00"
                    class="flex-1 h-full outline-none text-[1.3rem] text-[#1B1B19] uppercase font-mono"
                  >
                </div>
              </div>

              <!-- Font Family -->
              <div class="flex flex-col gap-y-[0.6rem] sm:col-span-2">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">Store Font Family</label>
                <select
                  v-model="form.fontFamily"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none bg-white"
                >
                  <option value="Inter">Inter (Clean & Modern)</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans (Friendly & Geometric)</option>
                  <option value="Roboto">Roboto (Versatile)</option>
                  <option value="Poppins">Poppins (Bold & Rounded)</option>
                  <option value="Cabinet Grotesk">Cabinet Grotesk (Editorial & Expressive)</option>
                  <option value="Geist">Geist (Minimalist)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- TAB 3: SOCIAL MEDIA -->
          <div v-show="activeTab === 'social'" class="space-y-[1.6rem]">
            <p class="text-[1.3rem] text-slate-600">
              Configure profile links displayed on the merchant storefront header and footer.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-[1.6rem]">
              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[1.6rem] text-pink-600">photo_camera</span>
                  Instagram URL
                </label>
                <input
                  v-model="form.instagramUrl"
                  type="text"
                  placeholder="https://instagram.com/store"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[1.6rem] text-blue-600">thumb_up</span>
                  Facebook URL
                </label>
                <input
                  v-model="form.facebookUrl"
                  type="text"
                  placeholder="https://facebook.com/store"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[1.6rem] text-slate-800">tag</span>
                  X (Twitter) URL
                </label>
                <input
                  v-model="form.twitterUrl"
                  type="text"
                  placeholder="https://x.com/store"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[1.6rem] text-red-600">smart_display</span>
                  YouTube Channel URL
                </label>
                <input
                  v-model="form.youtubeUrl"
                  type="text"
                  placeholder="https://youtube.com/@store"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[1.6rem] text-blue-700">work</span>
                  LinkedIn URL
                </label>
                <input
                  v-model="form.linkedinUrl"
                  type="text"
                  placeholder="https://linkedin.com/company/store"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>

              <div class="flex flex-col gap-y-[0.6rem]">
                <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[1.6rem] text-slate-900">videocam</span>
                  TikTok URL
                </label>
                <input
                  v-model="form.tiktokUrl"
                  type="text"
                  placeholder="https://tiktok.com/@store"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
                >
              </div>
            </div>
          </div>

          <!-- TAB 4: SEO & SEARCH -->
          <div v-show="activeTab === 'seo'" class="space-y-[2rem]">
            <!-- SEO Title -->
            <div class="flex flex-col gap-y-[0.6rem]">
              <div class="flex justify-between items-center">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">SEO Meta Title</label>
                <span
                  class="text-[1.1rem] font-[500]"
                  :class="form.seoTitle.length >= 50 && form.seoTitle.length <= 60 ? 'text-green-600' : 'text-slate-400'"
                >
                  {{ form.seoTitle.length }} / 60 chars (Recommended: 50-60)
                </span>
              </div>
              <input
                v-model="form.seoTitle"
                type="text"
                maxlength="255"
                placeholder="e.g. Acme Stores - Quality Shoes & Accessories in Lagos"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>

            <!-- SEO Description -->
            <div class="flex flex-col gap-y-[0.6rem]">
              <div class="flex justify-between items-center">
                <label class="font-[600] text-[1.3rem] text-[#0F172A]">SEO Meta Description</label>
                <span
                  class="text-[1.1rem] font-[500]"
                  :class="form.seoDescription.length >= 150 && form.seoDescription.length <= 160 ? 'text-green-600' : 'text-slate-400'"
                >
                  {{ form.seoDescription.length }} / 160 chars (Recommended: 150-160)
                </span>
              </div>
              <textarea
                v-model="form.seoDescription"
                rows="3"
                maxlength="500"
                placeholder="Brief summary of the store for Google and Bing search snippets..."
                class="w-full rounded-xl border border-slate-200 p-3 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              />
            </div>

            <!-- SEO Keywords -->
            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Search Keywords (Comma Separated)</label>
              <input
                v-model="form.seoKeywords"
                type="text"
                maxlength="500"
                placeholder="e.g. shoes, sneakers, fashion, lagos"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none"
              >
            </div>

            <!-- Google Site Verification -->
            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A]">Google Search Console Verification Code</label>
              <input
                v-model="form.googleSiteVerification"
                type="text"
                maxlength="255"
                placeholder="e.g. google1234567890abcdef.html or meta code"
                class="h-12 rounded-xl border border-slate-200 px-4 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none font-mono"
              >
            </div>

            <!-- Social Share Image -->
            <div class="flex flex-col gap-y-[0.8rem]">
              <label class="font-[600] text-[1.3rem] text-[#0F172A] flex items-center justify-between">
                <span>Social Share Image (OpenGraph)</span>
                <span v-if="uploadingShareImage" class="text-[1.2rem] text-primary">Uploading...</span>
              </label>

              <div class="flex items-center gap-[1.6rem] p-[1.4rem] border border-slate-200 rounded-xl bg-slate-50/50">
                <div class="w-[80px] h-[50px] rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    v-if="form.socialShareImage"
                    :src="form.socialShareImage"
                    alt="OG Preview"
                    class="w-full h-full object-cover"
                  >
                  <span v-else class="material-symbols-outlined text-[2.4rem] text-slate-300">share</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <input
                      v-model="form.socialShareImage"
                      type="text"
                      placeholder="Image URL or upload"
                      class="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-[1.3rem] text-[#1B1B19] focus:border-primary focus:outline-none bg-white"
                    >
                    <label class="h-10 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 cursor-pointer flex items-center gap-1.5 text-[1.2rem] font-semibold text-slate-700 shrink-0">
                      <span class="material-symbols-outlined text-[1.6rem]">upload_file</span>
                      <span>Upload</span>
                      <input type="file" class="hidden" accept="image/*" @change="uploadShareImage" >
                    </label>
                    <button
                      v-if="form.socialShareImage"
                      type="button"
                      class="h-10 px-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer flex items-center"
                      title="Clear image"
                      @click="form.socialShareImage = ''"
                    >
                      <span class="material-symbols-outlined text-[1.6rem]">delete</span>
                    </button>
                  </div>
                  <p class="mt-1 text-[1.1rem] text-slate-500">Preview image shown when sharing links on WhatsApp, Twitter, Facebook. Recommended: 1200x630px.</p>
                </div>
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
              :disabled="isSubmitting || isCheckingSlug || !!slugValidationError"
              class="h-[44px] px-[2.4rem] rounded-[8px] bg-primary text-white text-[1.4rem] font-[700] hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.6rem]"
            >
              <span v-if="isSubmitting" class="animate-spin material-symbols-outlined text-[1.8rem]">progress_activity</span>
              <span v-else class="material-symbols-outlined text-[1.8rem]">check</span>
              <span>{{ isSubmitting ? 'Saving...' : 'Update Store Settings' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { VueFinalModal } from 'vue-final-modal'
import { useAdminMerchantsStore } from '~/stores/adminMerchants.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { useErrorStore } from '~/stores/error.store.js'
import { handleFileUpload } from '~/utils/helpers.js'
import { useSlugAvailability } from '~/composables/useSlugAvailability.js'

const props = defineProps({
  tenantId: { type: String, required: true },
  merchant: { type: Object, default: null },
  storeSettings: { type: Object, default: null },
})

const emit = defineEmits(['updated', 'closed'])

const adminMerchantsStore = useAdminMerchantsStore()
const toastStore = useToastStore()
const errorStore = useErrorStore()

const activeTab = ref('config')
const isSubmitting = ref(false)
const uploadingLogo = ref(false)
const uploadingShareImage = ref(false)

const tabs = [
  { id: 'config', label: 'Configuration', icon: 'settings' },
  { id: 'branding', label: 'Branding', icon: 'palette' },
  { id: 'social', label: 'Social Media', icon: 'language' },
  { id: 'seo', label: 'SEO & Search', icon: 'search' },
]

const {
  isCheckingSlug,
  slugValidationError,
  validateSlug,
  debouncedValidateSlug,
} = useSlugAvailability()

const currentSubdomain = computed(() => props.storeSettings?.slug || props.merchant?.slug || '')
const subdomainError = computed(() => slugValidationError.value || errorStore.validationErrors?.subdomain)

const form = reactive({
  subdomain: '',
  timezone: 'Africa/Lagos',
  currency: 'NGN',
  costingMethod: 'WEIGHTED_AVERAGE',
  logoUrl: '',
  primaryColor: '#003366',
  accentColor: '#FF6B00',
  fontFamily: 'Inter',
  instagramUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  youtubeUrl: '',
  linkedinUrl: '',
  tiktokUrl: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  googleSiteVerification: '',
  socialShareImage: '',
})

function populateForm(settings, merchant) {
  form.subdomain = settings?.slug || merchant?.slug || ''
  form.timezone = settings?.timezone || merchant?.timezone || 'Africa/Lagos'
  form.currency = settings?.currency || merchant?.currency || 'NGN'
  form.costingMethod = settings?.costingMethod || 'WEIGHTED_AVERAGE'

  if (settings?.branding) {
    form.logoUrl = settings.branding.logoUrl || merchant?.logo || ''
    form.primaryColor = settings.branding.primaryColor || '#003366'
    form.accentColor = settings.branding.accentColor || '#FF6B00'
    form.fontFamily = settings.branding.fontFamily || 'Inter'
  } else {
    form.logoUrl = merchant?.logo || ''
    form.primaryColor = merchant?.primaryColor || '#003366'
    form.accentColor = merchant?.accentColor || '#FF6B00'
    form.fontFamily = merchant?.fontFamily || 'Inter'
  }

  if (settings?.contact) {
    form.instagramUrl = settings.contact.instagramUrl || ''
    form.facebookUrl = settings.contact.facebookUrl || ''
    form.twitterUrl = settings.contact.twitterUrl || ''
    form.youtubeUrl = settings.contact.youtubeUrl || ''
    form.linkedinUrl = settings.contact.linkedinUrl || ''
    form.tiktokUrl = settings.contact.tiktokUrl || ''
  } else {
    form.instagramUrl = merchant?.instagramUrl || ''
    form.facebookUrl = merchant?.facebookUrl || ''
    form.twitterUrl = merchant?.twitterUrl || ''
    form.youtubeUrl = merchant?.youtubeUrl || ''
    form.linkedinUrl = merchant?.linkedinUrl || ''
    form.tiktokUrl = merchant?.tiktokUrl || ''
  }

  if (settings?.seo) {
    form.seoTitle = settings.seo.title || ''
    form.seoDescription = settings.seo.description || ''
    form.seoKeywords = settings.seo.keywords || ''
    form.googleSiteVerification = settings.seo.googleSiteVerification || ''
    form.socialShareImage = settings.seo.socialShareImage || ''
  } else {
    form.seoTitle = merchant?.seoTitle || ''
    form.seoDescription = merchant?.seoDescription || ''
    form.seoKeywords = merchant?.seoKeywords || ''
    form.googleSiteVerification = merchant?.googleSiteVerification || ''
    form.socialShareImage = merchant?.socialShareImage || ''
  }
}

watch(
  () => [props.storeSettings, props.merchant],
  ([newSettings, newMerchant]) => {
    if (newSettings || newMerchant) {
      populateForm(newSettings, newMerchant)
    }
  },
  { immediate: true }
)

watch(
  () => form.subdomain,
  (newSlug) => {
    if (!newSlug || newSlug === currentSubdomain.value) {
      slugValidationError.value = ''
      return
    }
    debouncedValidateSlug(newSlug, { currentSlug: currentSubdomain.value })
  }
)

async function uploadLogo(event) {
  uploadingLogo.value = true
  try {
    const url = await handleFileUpload(event, props.tenantId)
    if (url) {
      form.logoUrl = url
      toastStore.success('Store logo uploaded successfully', '')
    }
  } catch {
    toastStore.error('Logo upload failed', '')
  } finally {
    uploadingLogo.value = false
  }
}

async function uploadShareImage(event) {
  uploadingShareImage.value = true
  try {
    const url = await handleFileUpload(event, props.tenantId)
    if (url) {
      form.socialShareImage = url
      toastStore.success('Social share image uploaded successfully', '')
    }
  } catch {
    toastStore.error('Social share image upload failed', '')
  } finally {
    uploadingShareImage.value = false
  }
}

function handleClose(close) {
  if (close && typeof close === 'function') {
    close()
  }
  emit('closed')
}

async function handleSubmit(close) {
  if (isCheckingSlug.value) return

  if (form.subdomain && form.subdomain !== currentSubdomain.value) {
    const isSlugValid = await validateSlug(form.subdomain, { currentSlug: currentSubdomain.value })
    if (!isSlugValid) {
      activeTab.value = 'config'
      return
    }
  }

  isSubmitting.value = true
  errorStore.resetErrors()

  try {
    const payload = {
      subdomain: form.subdomain || undefined,
      timezone: form.timezone || undefined,
      currency: form.currency || undefined,
      logoUrl: form.logoUrl || undefined,
      primaryColor: form.primaryColor || undefined,
      accentColor: form.accentColor || undefined,
      fontFamily: form.fontFamily || undefined,
      instagramUrl: form.instagramUrl || undefined,
      facebookUrl: form.facebookUrl || undefined,
      twitterUrl: form.twitterUrl || undefined,
      youtubeUrl: form.youtubeUrl || undefined,
      linkedinUrl: form.linkedinUrl || undefined,
      tiktokUrl: form.tiktokUrl || undefined,
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
      seoKeywords: form.seoKeywords || undefined,
      googleSiteVerification: form.googleSiteVerification || undefined,
      socialShareImage: form.socialShareImage || undefined,
    }

    // Only send costingMethod if it's not locked
    if (!props.storeSettings?.costingMethodLocked && form.costingMethod) {
      payload.costingMethod = form.costingMethod
    }

    await adminMerchantsStore.updateStoreSettings(props.tenantId, payload)
    emit('updated')
    handleClose(close)
  } catch {
    // Validation errors (422) are captured by global fetch interceptor into errorStore
    if (errorStore.validationErrors?.subdomain) {
      activeTab.value = 'config'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>
