<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="sendReminderModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[680px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[12px] shadow-xl overflow-hidden border border-[#E0E0E0]">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div class="flex items-center gap-[1.2rem]">
            <div class="w-[4rem] h-[4rem] rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[2.2rem]">forward_to_inbox</span>
            </div>
            <div>
              <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">Send Onboarding Reminder</h2>
              <p class="text-[1.3rem] text-[#616161]">
                {{ merchant?.businessTradingName || merchant?.name || "Merchant" }}
                <span v-if="recipientEmail" class="text-primary font-[500]">· {{ recipientEmail }}</span>
              </p>
            </div>
          </div>
          <button class="p-[0.4rem] rounded-[6px] hover:bg-[#EBEBEB] transition-colors cursor-pointer text-[#616161]" @click="handleClose(close)">
            <span class="material-symbols-outlined text-[2.4rem]">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-[2.4rem] flex flex-col gap-y-[2.4rem]">
          <!-- Recent Notification History / Last Email Sent -->
          <div class="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[1.6rem]">
            <div class="flex items-center justify-between mb-[1.2rem]">
              <div class="flex items-center gap-[0.8rem]">
                <span class="material-symbols-outlined text-[1.8rem] text-[#003366]">history</span>
                <span class="font-[700] text-[1.3rem] uppercase tracking-wider text-[#0F172A]">Recent Email History</span>
              </div>
              <button
                v-if="deliveryLogs.length > 1"
                type="button"
                class="text-[1.2rem] font-[600] text-primary hover:underline"
                @click="showAllHistory = !showAllHistory"
              >
                {{ showAllHistory ? 'Show Less' : `View All (${deliveryLogs.length})` }}
              </button>
            </div>

            <!-- Loading State -->
            <div v-if="loadingLogs" class="py-[1.2rem] flex items-center justify-center text-[1.3rem] text-[#64748B]">
              <span class="animate-spin material-symbols-outlined mr-[0.8rem] text-[1.8rem] text-primary">progress_activity</span>
              Loading delivery history...
            </div>

            <!-- Empty State -->
            <div v-else-if="!deliveryLogs.length" class="text-[1.3rem] text-[#64748B] py-[0.6rem] italic">
              No previous reminder emails found for this merchant.
            </div>

            <!-- History List -->
            <div v-else class="space-y-[1rem]">
              <div
                v-for="(log, idx) in displayedLogs"
                :key="log.id || idx"
                class="bg-white rounded-[8px] border border-[#E2E8F0] p-[1.2rem] flex flex-col gap-[0.6rem]"
              >
                <div class="flex items-start justify-between gap-[1rem]">
                  <div>
                    <span class="font-[700] text-[1.3rem] text-[#0F172A]">
                      {{ log.metadata?.templateLabel || log.metadata?.templateCode || log.notificationType || "Onboarding Reminder" }}
                    </span>
                    <p v-if="log.metadata?.emailSubject" class="text-[1.2rem] text-[#475569] mt-[0.1rem]">
                      Subject: {{ log.metadata.emailSubject }}
                    </p>
                  </div>
                  <span
                    :class="log.status === 'SENT' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]'"
                    class="rounded-full px-[0.8rem] py-[0.2rem] text-[1.1rem] font-[700] shrink-0 uppercase"
                  >
                    {{ log.status }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-x-[1.6rem] gap-y-[0.4rem] text-[1.2rem] text-[#64748B] pt-[0.4rem] border-t border-[#F1F5F9]">
                  <span class="inline-flex items-center gap-[0.4rem]">
                    <span class="material-symbols-outlined text-[1.5rem]">schedule</span>
                    {{ formatDate(log.sentAt || log.createdAt) }}
                  </span>
                  <span class="inline-flex items-center gap-[0.4rem]">
                    <span class="material-symbols-outlined text-[1.5rem]">person</span>
                    Sent by: <strong class="text-[#0F172A] font-[600]">{{ log.metadata?.senderAdminName || log.metadata?.senderAdminEmail || "Administrator" }}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Template Selection -->
          <div class="flex flex-col gap-y-[1rem]">
            <label class="font-[700] text-[1.4rem] text-[#0F172A] flex items-center justify-between">
              <span>Select Email Template <span class="text-red-500">*</span></span>
              <span v-if="loadingTemplates" class="text-[1.2rem] text-[#64748B] font-normal">Loading templates...</span>
            </label>

            <!-- Template Options -->
            <div class="space-y-[1rem]">
              <label
                v-for="tmpl in availableTemplates"
                :key="tmpl.code"
                :class="[
                  'block p-[1.4rem] rounded-[10px] border transition-all cursor-pointer',
                  selectedTemplateCode === tmpl.code
                    ? 'border-[#003366] bg-[#F0F7FF] shadow-sm'
                    : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                ]"
              >
                <div class="flex items-start gap-[1.2rem]">
                  <input
                    v-model="selectedTemplateCode"
                    type="radio"
                    name="reminderTemplate"
                    :value="tmpl.code"
                    class="mt-[0.3rem] text-[#003366] focus:ring-[#003366] cursor-pointer"
                  >
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <p class="font-[700] text-[1.4rem] text-[#0F172A]">{{ tmpl.label }}</p>
                      <span class="text-[1.1rem] font-mono text-[#64748B] bg-slate-100 px-[0.6rem] py-[0.1rem] rounded">{{ tmpl.code }}</span>
                    </div>
                    <p class="text-[1.2rem] text-[#475569] mt-[0.4rem] font-[500]">
                      <span class="text-[#003366] font-[600]">Subject:</span> {{ tmpl.emailSubject }}
                    </p>
                    <p class="text-[1.2rem] text-[#64748B] mt-[0.3rem]">
                      {{ tmpl.message }}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <!-- Optional Custom Note -->
          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="font-[600] text-[1.4rem] text-[#0F172A]">
              Personalized Note from Support <span class="text-[#64748B] text-[1.2rem] font-normal">(Optional)</span>
            </label>
            <textarea
              v-model="customNote"
              rows="3"
              placeholder="e.g. Hi there, I noticed you were setting up your apparel collection. Feel free to reply directly to this email if you have any questions."
              class="w-full rounded-[8px] border border-[#CBD5E1] p-[1.2rem] text-[1.3rem] text-[#1B1B19] focus:border-[#003366] focus:outline-none transition-colors"
            />
            <p class="text-[1.1rem] text-[#64748B]">
              This note will be rendered in a highlighted callout box inside the email.
            </p>
          </div>

          <!-- Optional Support Phone -->
          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="font-[600] text-[1.4rem] text-[#0F172A]">
              Direct Support Phone <span class="text-[#64748B] text-[1.2rem] font-normal">(Optional)</span>
            </label>
            <input
              v-model="supportPhone"
              type="text"
              placeholder="e.g. +234 800 123 4567"
              class="w-full rounded-[8px] border border-[#CBD5E1] px-[1.2rem] py-[0.8rem] text-[1.3rem] text-[#1B1B19] focus:border-[#003366] focus:outline-none transition-colors"
            >
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-x-[1.2rem] pt-[1.2rem] border-t border-[#E2E8F0]">
            <button
              type="button"
              class="h-[44px] px-[2rem] rounded-[8px] border border-[#CBD5E1] text-[1.4rem] font-[600] text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              @click="close()"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!selectedTemplateCode || isSubmitting"
              class="h-[44px] px-[2.4rem] rounded-[8px] bg-primary text-white text-[1.4rem] font-[700] hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[0.6rem]"
              @click="handleSend(close)"
            >
              <span v-if="isSubmitting" class="animate-spin material-symbols-outlined text-[1.8rem]">progress_activity</span>
              <span v-else class="material-symbols-outlined text-[1.8rem]">send</span>
              <span>{{ isSubmitting ? 'Sending Reminder...' : 'Send Reminder Email' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { VueFinalModal } from 'vue-final-modal'
import { useAdminMerchantsStore } from '~/stores/adminMerchants.store.js'
import { formatDate } from '~/utils/helpers.js'

const props = defineProps({
  merchant: { type: Object, default: null },
})

const emit = defineEmits(['sent', 'closed'])

function handleClose(close) {
  if (close && typeof close === 'function') {
    close()
  }
  emit('closed')
}

const adminMerchantsStore = useAdminMerchantsStore()

const availableTemplates = ref([
  {
    code: 'ONBOARDING_SETUP_WELCOME',
    label: 'Onboarding Welcome & Setup Guide',
    emailSubject: "Welcome to ShopSynch — Let's get your store live!",
    message: 'Welcome follow-up encouraging merchant to complete profile, bank details, and verification.',
  },
  {
    code: 'ONBOARDING_VERIFICATION_CHECKLIST',
    label: 'Verification Requirements Checklist',
    emailSubject: 'Start accepting live customer payments on your store',
    message: 'Explains what unlocks with verification and breaks down requirements for Starter vs Registered businesses.',
  },
  {
    code: 'ONBOARDING_FEEDBACK_CHECK',
    label: 'Setup Check-in & Feedback',
    emailSubject: 'How is your store setup going?',
    message: 'Check-in asking if the merchant encountered blockers during setup or needs feature guidance.',
  },
])

const selectedTemplateCode = ref('ONBOARDING_SETUP_WELCOME')
const customNote = ref('')
const supportPhone = ref('')
const isSubmitting = ref(false)
const loadingTemplates = ref(false)

const deliveryLogs = ref([])
const loadingLogs = ref(false)
const showAllHistory = ref(false)

const displayedLogs = computed(() => {
  if (showAllHistory.value) {
    return deliveryLogs.value
  }
  return deliveryLogs.value.slice(0, 1)
})

const recipientEmail = computed(() => {
  if (!props.merchant) return ''
  return props.merchant.ownerEmail || props.merchant.owner?.email || props.merchant.businessSupportEmailAddress || ''
})

async function loadData() {
  if (!props.merchant?.id) return

  // 1. Fetch dynamic templates
  loadingTemplates.value = true
  try {
    const templates = await adminMerchantsStore.fetchReminderTemplates('ONBOARDING')
    if (templates && templates.length) {
      availableTemplates.value = templates
    }
  } catch {
    // fallback to preset list
  } finally {
    loadingTemplates.value = false
  }

  // 2. Fetch delivery logs for this merchant
  loadingLogs.value = true
  try {
    const logs = await adminMerchantsStore.fetchMerchantDeliveryLogs(props.merchant.id)
    deliveryLogs.value = logs || []
  } catch {
    deliveryLogs.value = []
  } finally {
    loadingLogs.value = false
  }
}

watch(
  () => props.merchant?.id,
  (newId) => {
    if (newId) {
      loadData()
    }
  },
  { immediate: true }
)

async function handleSend(close) {
  if (!props.merchant?.id || !selectedTemplateCode.value) return

  isSubmitting.value = true
  try {
    await adminMerchantsStore.sendOnboardingReminder(props.merchant.id, {
      templateCode: selectedTemplateCode.value,
      customNote: customNote.value || undefined,
      supportPhone: supportPhone.value || undefined,
    })

    emit('sent')
    // Refresh delivery logs immediately inside the modal
    await loadData()
    close()
  } catch {
    // error notification handled globally by fetch interceptor
  } finally {
    isSubmitting.value = false
  }
}
</script>
