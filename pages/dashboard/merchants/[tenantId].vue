<script setup>
import { logger, formatDate, formatToMoney } from "~/utils/helpers.js";
import { useVfm } from "vue-final-modal";
import SendReminderModal from "~/components/Modals/SendReminderModal.vue";
import CompleteComplianceModal from "~/components/Modals/CompleteComplianceModal.vue";
import AddBankAccountModal from "~/components/Modals/AddBankAccountModal.vue";
import UpdateBusinessProfileModal from "~/components/Modals/UpdateBusinessProfileModal.vue";
import UpdateBusinessContactModal from "~/components/Modals/UpdateBusinessContactModal.vue";
import UpdateOwnerKycModal from "~/components/Modals/UpdateOwnerKycModal.vue";
import UpdateStoreSettingsModal from "~/components/Modals/UpdateStoreSettingsModal.vue";
import ConfirmModal from "~/components/Modals/ConfirmModal.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-merchant-detail",
});

const route = useRoute();
const store = useAdminMerchantsStore();
const vfm = useVfm();

const statusToggleLoading = ref(false);

const m = computed(() => store.merchant);

const complianceStatusConfig = {
  NOT_SUBMITTED: { label: "Not Submitted", class: "bg-slate-100 text-slate-600" },
  AWAITING_APPROVAL: { label: "Awaiting Approval", class: "bg-yellow-100 text-yellow-700" },
  UNDER_REVIEW: { label: "Under Review", class: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Approved", class: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", class: "bg-red-100 text-red-700" },
  SUSPENDED: { label: "Suspended", class: "bg-orange-100 text-orange-700" },
};

function complianceBadge(status) {
  return complianceStatusConfig[status] || complianceStatusConfig.NOT_SUBMITTED;
}

function getProfileStatus(merchant) {
  if (!merchant) return { label: 'Not Provided', class: 'bg-slate-100 text-slate-600' }
  const isFilled = merchant.kybDetailFilled || Boolean(merchant.businessTradingName)
  if (merchant.kybCompleted || (merchant.complianceReviewStatus === 'APPROVED' && isFilled)) {
    return { label: 'Approved', class: 'bg-green-100 text-green-700' }
  }
  if (merchant.complianceReviewStatus === 'UNDER_REVIEW' && isFilled) {
    return { label: 'Under Review', class: 'bg-blue-100 text-blue-700' }
  }
  if (merchant.complianceReviewStatus === 'AWAITING_APPROVAL' && isFilled) {
    return { label: 'Awaiting Approval', class: 'bg-yellow-100 text-yellow-700' }
  }
  if (merchant.complianceReviewStatus === 'REJECTED') {
    return { label: 'Rejected', class: 'bg-red-100 text-red-700' }
  }
  if (isFilled) {
    return { label: 'Prefilled', class: 'bg-slate-100 text-slate-700' }
  }
  return { label: 'Not Provided', class: 'bg-slate-100 text-slate-500' }
}

function getContactStatus(merchant) {
  if (!merchant) return { label: 'Not Provided', class: 'bg-slate-100 text-slate-600' }
  const isFilled = merchant.contactDetailFilled || Boolean(merchant.businessPrimaryPhoneNumber)
  if (merchant.complianceReviewStatus === 'APPROVED' && isFilled) {
    return { label: 'Approved', class: 'bg-green-100 text-green-700' }
  }
  if (merchant.complianceReviewStatus === 'UNDER_REVIEW' && isFilled) {
    return { label: 'Under Review', class: 'bg-blue-100 text-blue-700' }
  }
  if (merchant.complianceReviewStatus === 'AWAITING_APPROVAL' && isFilled) {
    return { label: 'Awaiting Approval', class: 'bg-yellow-100 text-yellow-700' }
  }
  if (merchant.complianceReviewStatus === 'REJECTED') {
    return { label: 'Rejected', class: 'bg-red-100 text-red-700' }
  }
  if (isFilled) {
    return { label: 'Prefilled', class: 'bg-slate-100 text-slate-700' }
  }
  return { label: 'Not Provided', class: 'bg-slate-100 text-slate-500' }
}

function getKycStatus(merchant) {
  if (!merchant) return { label: 'Not Provided', class: 'bg-slate-100 text-slate-600' }
  const isFilled = merchant.kycDetailFilled || Boolean(merchant.owner?.idType || merchant.owner?.idNumber || merchant.owner?.address)
  if (merchant.kycCompleted || (merchant.complianceReviewStatus === 'APPROVED' && isFilled)) {
    return { label: 'Approved', class: 'bg-green-100 text-green-700' }
  }
  if (merchant.complianceReviewStatus === 'UNDER_REVIEW' && isFilled) {
    return { label: 'Under Review', class: 'bg-blue-100 text-blue-700' }
  }
  if (merchant.complianceReviewStatus === 'AWAITING_APPROVAL' && isFilled) {
    return { label: 'Awaiting Approval', class: 'bg-yellow-100 text-yellow-700' }
  }
  if (merchant.complianceReviewStatus === 'REJECTED') {
    return { label: 'Rejected', class: 'bg-red-100 text-red-700' }
  }
  if (isFilled) {
    return { label: 'Prefilled', class: 'bg-slate-100 text-slate-700' }
  }
  return { label: 'Not Provided', class: 'bg-slate-100 text-slate-500' }
}

async function toggleStatus() {
  statusToggleLoading.value = true;
  try {
    await store.updateMerchantStatus(route.params.tenantId, !m.value.status);
    await store.fetchMerchantDetail(route.params.tenantId);
  } catch (err) {
    logger.error("Failed to toggle merchant status", err);
  } finally {
    statusToggleLoading.value = false;
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchMerchantDetail(route.params.tenantId),
      store.fetchBankAccounts(route.params.tenantId),
      store.fetchStoreSettings(route.params.tenantId),
    ]);
  } catch (err) {
    logger.error("Failed to load merchant detail, bank accounts, or store settings", err);
  }
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color pb-[4rem]">
    <NuxtLink to="/dashboard/merchants" class="inline-flex items-center gap-[0.6rem] font-[700] text-primary">
      <span class="material-symbols-outlined text-[1.8rem]">arrow_back</span>
      Merchants
    </NuxtLink>

    <div v-if="store.error && !m" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ store.error }}
    </div>

    <div v-if="store.detailLoading" class="flex items-center justify-center py-[6rem] text-[#616161]">
      <span class="animate-spin material-symbols-outlined mr-[1rem] text-[2.4rem] text-primary">progress_activity</span>
      Loading merchant...
    </div>

    <template v-else-if="m">
      <!-- ===== HEADER ===== -->
      <div class="rounded-[8px] bg-white p-[2rem] shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-[1.6rem]">
          <div class="flex items-center gap-[1.6rem]">
            <div class="flex h-[5.6rem] w-[5.6rem] items-center justify-center rounded-full bg-primary/10">
              <span class="material-symbols-outlined text-[3rem] text-primary">storefront</span>
            </div>
            <div>
              <h1 class="text-[2.2rem] font-[700] text-[#000]">{{ m.businessTradingName || "Untitled Merchant" }}</h1>
              <p class="mt-[0.2rem] text-[1.2rem] text-[#616161]">{{ m.code }}</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-[1rem]">
            <span :class="['inline-flex items-center rounded-full px-[1.2rem] py-[0.5rem] text-[1.3rem] font-[700]', complianceBadge(m.complianceReviewStatus).class]">
              {{ complianceBadge(m.complianceReviewStatus).label }}
            </span>
            <button
              :disabled="statusToggleLoading"
              :class="[
                'rounded-[8px] border px-[1.6rem] py-[0.8rem] text-[1.3rem] font-[700] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                m.status
                  ? 'border-red-300 text-red-600 hover:bg-red-50'
                  : 'border-green-400 text-green-700 hover:bg-green-50',
              ]"
              @click="toggleStatus"
            >
              <span v-if="statusToggleLoading" class="animate-spin material-symbols-outlined align-middle text-[1.6rem]">progress_activity</span>
              <span v-else>{{ m.status ? "Deactivate" : "Activate" }}</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-[0.4rem] rounded-[8px] bg-primary px-[1.6rem] py-[0.8rem] text-[1.3rem] font-[700] text-white transition-colors hover:bg-primary/90 cursor-pointer"
              @click="vfm.open('sendReminderModal')"
            >
              <span class="material-symbols-outlined text-[1.6rem]">forward_to_inbox</span>
              Send Reminder
            </button>
            <button
              v-if="['NOT_SUBMITTED', 'REJECTED'].includes(m.complianceReviewStatus)"
              type="button"
              class="inline-flex items-center gap-[0.4rem] rounded-[8px] bg-emerald-600 px-[1.6rem] py-[0.8rem] text-[1.3rem] font-[700] text-white transition-colors hover:bg-emerald-700 cursor-pointer"
              @click="vfm.open('completeComplianceModal')"
            >
              <span class="material-symbols-outlined text-[1.6rem]">assignment_turned_in</span>
              Complete Compliance
            </button>
            <NuxtLink
              :to="`/dashboard/product/import?tenantId=${m.id}`"
              class="inline-flex items-center gap-[0.4rem] rounded-[8px] border border-slate-300 px-[1.6rem] py-[0.8rem] text-[1.3rem] font-[700] text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span class="material-symbols-outlined text-[1.6rem]">upload_file</span>
              Import Products
            </NuxtLink>
            <NuxtLink
              :to="`/dashboard/compliance/${m.id}`"
              class="inline-flex items-center gap-[0.4rem] rounded-[8px] border border-primary px-[1.6rem] py-[0.8rem] text-[1.3rem] font-[700] text-primary transition-colors hover:bg-primary/5"
            >
              <span class="material-symbols-outlined text-[1.6rem]">policy</span>
              View Compliance
            </NuxtLink>
          </div>
        </div>

        <!-- Stats row -->
        <div class="mt-[2rem] grid grid-cols-2 gap-[1.2rem] sm:grid-cols-4">
          <div class="rounded-[8px] border border-slate-100 p-[1.4rem]">
            <p class="text-[1.2rem] font-[600] uppercase tracking-wider text-[#616161]">Mode</p>
            <p class="mt-[0.4rem] font-[700] text-[#000] capitalize">{{ m.currentMode || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.4rem]">
            <p class="text-[1.2rem] font-[600] uppercase tracking-wider text-[#616161]">Account Status</p>
            <p :class="['mt-[0.4rem] font-[700]', m.status ? 'text-green-600' : 'text-red-500']">
              {{ m.status ? "Active" : "Inactive" }}
            </p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.4rem]">
            <p class="text-[1.2rem] font-[600] uppercase tracking-wider text-[#616161]">Live Access</p>
            <p :class="['mt-[0.4rem] font-[700]', m.canOperateInLiveMode ? 'text-green-600' : 'text-red-500']">
              {{ m.canOperateInLiveMode ? "Allowed" : "Blocked" }}
            </p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.4rem]">
            <p class="text-[1.2rem] font-[600] uppercase tracking-wider text-[#616161]">Member Since</p>
            <p class="mt-[0.4rem] font-[700] text-[#000]">{{ formatDate(m.createdAt) }}</p>
          </div>
        </div>

        <!-- Compliance rejection banner -->
        <div
          v-if="m.complianceReviewStatus === 'REJECTED'"
          class="mt-[1.6rem] rounded-[8px] border border-red-200 bg-red-50 p-[1.4rem]"
        >
          <div class="flex items-center gap-[0.8rem]">
            <span class="material-symbols-outlined text-red-500">cancel</span>
            <p class="text-[1.3rem] font-[700] text-red-700">Compliance Rejected — {{ m.complianceRejectionCode }}</p>
          </div>
          <p v-if="m.complianceRejectionMessage" class="mt-[0.6rem] text-[1.3rem] text-red-600">
            {{ m.complianceRejectionMessage }}
          </p>
          <pre v-if="m.complianceNextSteps" class="mt-[0.6rem] whitespace-pre-wrap text-[1.2rem] text-red-500">{{ m.complianceNextSteps }}</pre>
        </div>

        <!-- Override banner -->
        <div
          v-if="m.complianceOverrideEnabled"
          class="mt-[1.6rem] flex items-center gap-[0.8rem] rounded-[8px] border border-purple-200 bg-purple-50 px-[1.4rem] py-[1rem]"
        >
          <span class="material-symbols-outlined text-purple-600">shield_with_heart</span>
          <p class="text-[1.3rem] font-[600] text-purple-800">
            Override Active: merchant can operate in Live Mode regardless of compliance status.
            <span v-if="m.complianceOverrideReason" class="font-normal"> — {{ m.complianceOverrideReason }}</span>
          </p>
        </div>
      </div>

      <!-- Staff Compliance Completion Card -->
      <div
        v-if="['NOT_SUBMITTED', 'REJECTED'].includes(m.complianceReviewStatus)"
        class="rounded-[8px] border border-blue-200 bg-blue-50/70 p-[2rem] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-[1.6rem]"
      >
        <div class="flex items-start gap-[1.2rem]">
          <div class="flex h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-full bg-blue-100 text-primary">
            <span class="material-symbols-outlined text-[2.2rem]">support_agent</span>
          </div>
          <div>
            <h3 class="text-[1.6rem] font-[700] text-slate-900">Staff-Assisted Compliance Completion</h3>
            <p class="mt-[0.2rem] text-[1.3rem] text-slate-600">
              Complete business profile, contact details, and owner KYC on behalf of this merchant to submit for review.
            </p>
          </div>
        </div>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-[0.6rem] rounded-[8px] bg-primary px-[2rem] py-[1rem] text-[1.4rem] font-[700] text-white shadow-sm hover:bg-blue-700 cursor-pointer"
          @click="vfm.open('completeComplianceModal')"
        >
          <span class="material-symbols-outlined text-[1.8rem]">edit_document</span>
          Fill & Submit Compliance
        </button>
      </div>

      <!-- ===== BUSINESS PROFILE ===== -->
      <div class="rounded-[8px] bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <div class="flex items-center gap-[1rem]">
            <span class="material-symbols-outlined text-primary">storefront</span>
            <h2 class="text-[1.6rem] font-[700] text-[#000]">Business Profile</h2>
            <span :class="['inline-flex items-center rounded-full px-[1rem] py-[0.2rem] text-[1.2rem] font-[700]', getProfileStatus(m).class]">
              {{ getProfileStatus(m).label }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-[0.4rem] rounded-[8px] bg-primary px-[1.4rem] py-[0.6rem] text-[1.3rem] font-[700] text-white transition-colors hover:bg-primary/90 cursor-pointer"
            @click="vfm.open('updateBusinessProfileModal')"
          >
            <span class="material-symbols-outlined text-[1.6rem]">edit</span>
            Update Business Profile
          </button>
        </div>
        <div class="grid grid-cols-2 gap-[1.2rem] p-[1.6rem]">
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Trading Name</p>
            <p class="font-[500] text-[#000]">{{ m.businessTradingName || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Business Type</p>
            <p class="font-[500] capitalize text-[#000]">{{ m.businessType || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Industry</p>
            <p class="font-[500] capitalize text-[#000]">{{ m.industry || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Registration Number</p>
            <p class="font-[500] text-[#000]">{{ m.businessRegistrationNumber || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Tax ID Number</p>
            <p class="font-[500] text-[#000]">{{ m.businessTaxIdNumber || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Expected Monthly Income</p>
            <p class="font-[500] text-[#000]">{{ m.businessExpectedMonthlyIncome ? formatToMoney(m.businessExpectedMonthlyIncome) : "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Staff Size</p>
            <p class="font-[500] text-[#000]">{{ m.staffSize ?? "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Storefront URL</p>
            <a v-if="m.businessStorefrontUrl" :href="m.businessStorefrontUrl" target="_blank" rel="noopener noreferrer" class="break-all font-[500] text-primary underline hover:no-underline">
              {{ m.businessStorefrontUrl }}
            </a>
            <p v-else class="font-[500] text-[#000]">—</p>
          </div>
          <div class="col-span-2 rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Business Description</p>
            <p class="font-[500] text-[#000]">{{ m.businessDescription || "—" }}</p>
          </div>
          <div class="col-span-2 rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">CAC Document</p>
            <a v-if="m.cacDocumentUrl" :href="m.cacDocumentUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-[0.4rem] font-[600] text-primary underline hover:no-underline">
              <span class="material-symbols-outlined text-[1.6rem]">open_in_new</span>
              View CAC Document
            </a>
            <p v-else class="italic text-slate-400">Not uploaded</p>
          </div>
        </div>
      </div>

      <!-- ===== BUSINESS CONTACT ===== -->
      <div class="rounded-[8px] bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <div class="flex items-center gap-[1rem]">
            <span class="material-symbols-outlined text-primary">contact_mail</span>
            <h2 class="text-[1.6rem] font-[700] text-[#000]">Business Contact</h2>
            <span :class="['inline-flex items-center rounded-full px-[1rem] py-[0.2rem] text-[1.2rem] font-[700]', getContactStatus(m).class]">
              {{ getContactStatus(m).label }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-[0.4rem] rounded-[8px] bg-primary px-[1.4rem] py-[0.6rem] text-[1.3rem] font-[700] text-white transition-colors hover:bg-primary/90 cursor-pointer"
            @click="vfm.open('updateBusinessContactModal')"
          >
            <span class="material-symbols-outlined text-[1.6rem]">edit</span>
            Update Business Contact
          </button>
        </div>
        <div class="grid grid-cols-2 gap-[1.2rem] p-[1.6rem]">
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Primary Phone</p>
            <p class="font-[500] text-[#000]">{{ m.businessPrimaryPhoneNumber || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Secondary Phone</p>
            <p class="font-[500] text-[#000]">{{ m.businessSecondaryPhoneNumber || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Support Email</p>
            <p class="font-[500] text-[#000]">{{ m.businessSupportEmailAddress || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">General Email</p>
            <p class="font-[500] text-[#000]">{{ m.businessGeneralEmailAddress || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Country</p>
            <p class="font-[500] text-[#000]">{{ m.businessCountry || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">State / City</p>
            <p class="font-[500] text-[#000]">{{ [m.businessState, m.businessCity].filter(Boolean).join(", ") || "—" }}</p>
          </div>
          <div class="col-span-2 rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Business Address</p>
            <p class="font-[500] text-[#000]">{{ m.businessAddress || "—" }}</p>
          </div>
        </div>
      </div>

      <!-- ===== STORE SETTINGS ===== -->
      <div class="rounded-[8px] bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <div class="flex items-center gap-[1rem]">
            <span class="material-symbols-outlined text-primary">store</span>
            <h2 class="text-[1.6rem] font-[700] text-[#000]">Store Settings</h2>
            <span
              v-if="store.storeSettings?.costingMethod"
              class="inline-flex items-center rounded-full bg-slate-100 px-[1rem] py-[0.2rem] text-[1.2rem] font-[700] text-slate-700"
            >
              {{ store.storeSettings.costingMethod === 'WEIGHTED_AVERAGE' ? 'Weighted Average' : store.storeSettings.costingMethod }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-[0.4rem] rounded-[8px] bg-primary px-[1.4rem] py-[0.6rem] text-[1.3rem] font-[700] text-white transition-colors hover:bg-primary/90 cursor-pointer"
            @click="vfm.open('updateStoreSettingsModal')"
          >
            <span class="material-symbols-outlined text-[1.6rem]">edit</span>
            Update Store Settings
          </button>
        </div>

        <div v-if="store.storeSettingsLoading" class="flex items-center justify-center py-[4rem] text-[#616161]">
          <span class="animate-spin material-symbols-outlined mr-[1rem] text-[2.4rem] text-primary">progress_activity</span>
          Loading store settings...
        </div>

        <div v-else class="p-[2rem] space-y-[2.4rem]">
          <!-- Configuration & Preferences -->
          <div>
            <h3 class="text-[1.3rem] font-[700] text-slate-800 uppercase tracking-wider mb-[1.2rem] flex items-center gap-[0.6rem]">
              <span class="material-symbols-outlined text-[1.8rem] text-primary">tune</span>
              Configuration & Regional Preferences
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[1.2rem]">
              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Store Web Address (Subdomain)</p>
                <div v-if="store.storeSettings?.slug || m.slug" class="flex items-center gap-[0.6rem]">
                  <span class="font-[600] text-[#000]">{{ store.storeSettings?.slug || m.slug }}</span>
                  <a
                    :href="`https://${store.storeSettings?.slug || m.slug}.shopsynch.com`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center text-primary hover:text-primary/80"
                    title="Open Storefront"
                  >
                    <span class="material-symbols-outlined text-[1.6rem]">open_in_new</span>
                  </a>
                </div>
                <p v-else class="font-[500] text-[#000]">—</p>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Currency</p>
                <p class="font-[500] text-[#000]">{{ store.storeSettings?.currency || m.currency || "NGN" }}</p>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Timezone</p>
                <p class="font-[500] text-[#000]">{{ store.storeSettings?.timezone || m.timezone || "Africa/Lagos" }}</p>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <div class="flex items-center justify-between mb-[0.4rem]">
                  <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Costing Method</p>
                  <span
                    v-if="store.storeSettings?.costingMethodLocked"
                    class="text-[1rem] font-[700] uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"
                  >
                    Locked
                  </span>
                </div>
                <p class="font-[500] text-[#000]">
                  {{ store.storeSettings?.costingMethod === 'WEIGHTED_AVERAGE' ? 'Weighted Average' : (store.storeSettings?.costingMethod || 'Weighted Average') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Branding -->
          <div class="border-t border-slate-100 pt-[2rem]">
            <h3 class="text-[1.3rem] font-[700] text-slate-800 uppercase tracking-wider mb-[1.2rem] flex items-center gap-[0.6rem]">
              <span class="material-symbols-outlined text-[1.8rem] text-primary">palette</span>
              Branding & Visual Identity
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[1.2rem]">
              <div class="rounded-[8px] border border-slate-100 p-[1.2rem] flex items-center gap-[1.2rem]">
                <div class="w-[4.4rem] h-[4.4rem] rounded-[6px] border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    v-if="store.storeSettings?.branding?.logoUrl || m.logo"
                    :src="store.storeSettings?.branding?.logoUrl || m.logo"
                    alt="Logo"
                    class="w-full h-full object-contain p-1"
                  >
                  <span v-else class="material-symbols-outlined text-[2.4rem] text-slate-300">image</span>
                </div>
                <div class="min-w-0">
                  <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Logo</p>
                  <p v-if="store.storeSettings?.branding?.logoUrl || m.logo" class="text-[1.2rem] text-emerald-600 font-[600] truncate">Uploaded</p>
                  <p v-else class="text-[1.2rem] text-slate-400 italic">None</p>
                </div>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Primary Color</p>
                <div class="flex items-center gap-[0.8rem]">
                  <span
                    class="w-[2rem] h-[2rem] rounded-full border border-slate-200 shrink-0"
                    :style="{ backgroundColor: store.storeSettings?.branding?.primaryColor || m.primaryColor || '#003366' }"
                  />
                  <span class="font-mono font-[600] text-[#000]">{{ store.storeSettings?.branding?.primaryColor || m.primaryColor || "#003366" }}</span>
                </div>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Accent Color</p>
                <div class="flex items-center gap-[0.8rem]">
                  <span
                    class="w-[2rem] h-[2rem] rounded-full border border-slate-200 shrink-0"
                    :style="{ backgroundColor: store.storeSettings?.branding?.accentColor || m.accentColor || '#FF6B00' }"
                  />
                  <span class="font-mono font-[600] text-[#000]">{{ store.storeSettings?.branding?.accentColor || m.accentColor || "#FF6B00" }}</span>
                </div>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Font Family</p>
                <p class="font-[500] text-[#000]">{{ store.storeSettings?.branding?.fontFamily || m.fontFamily || "Inter" }}</p>
              </div>
            </div>
          </div>

          <!-- Social Media -->
          <div class="border-t border-slate-100 pt-[2rem]">
            <h3 class="text-[1.3rem] font-[700] text-slate-800 uppercase tracking-wider mb-[1.2rem] flex items-center gap-[0.6rem]">
              <span class="material-symbols-outlined text-[1.8rem] text-primary">language</span>
              Social Media Links
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-[1.2rem]">
              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Instagram</p>
                <a
                  v-if="store.storeSettings?.contact?.instagramUrl || m.instagramUrl"
                  :href="store.storeSettings?.contact?.instagramUrl || m.instagramUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline text-[1.3rem] font-[500] truncate block"
                >
                  View Link
                </a>
                <span v-else class="text-slate-400 italic text-[1.2rem]">Not set</span>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Facebook</p>
                <a
                  v-if="store.storeSettings?.contact?.facebookUrl || m.facebookUrl"
                  :href="store.storeSettings?.contact?.facebookUrl || m.facebookUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline text-[1.3rem] font-[500] truncate block"
                >
                  View Link
                </a>
                <span v-else class="text-slate-400 italic text-[1.2rem]">Not set</span>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">X (Twitter)</p>
                <a
                  v-if="store.storeSettings?.contact?.twitterUrl || m.twitterUrl"
                  :href="store.storeSettings?.contact?.twitterUrl || m.twitterUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline text-[1.3rem] font-[500] truncate block"
                >
                  View Link
                </a>
                <span v-else class="text-slate-400 italic text-[1.2rem]">Not set</span>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">YouTube</p>
                <a
                  v-if="store.storeSettings?.contact?.youtubeUrl || m.youtubeUrl"
                  :href="store.storeSettings?.contact?.youtubeUrl || m.youtubeUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline text-[1.3rem] font-[500] truncate block"
                >
                  View Link
                </a>
                <span v-else class="text-slate-400 italic text-[1.2rem]">Not set</span>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">LinkedIn</p>
                <a
                  v-if="store.storeSettings?.contact?.linkedinUrl || m.linkedinUrl"
                  :href="store.storeSettings?.contact?.linkedinUrl || m.linkedinUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline text-[1.3rem] font-[500] truncate block"
                >
                  View Link
                </a>
                <span v-else class="text-slate-400 italic text-[1.2rem]">Not set</span>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">TikTok</p>
                <a
                  v-if="store.storeSettings?.contact?.tiktokUrl || m.tiktokUrl"
                  :href="store.storeSettings?.contact?.tiktokUrl || m.tiktokUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline text-[1.3rem] font-[500] truncate block"
                >
                  View Link
                </a>
                <span v-else class="text-slate-400 italic text-[1.2rem]">Not set</span>
              </div>
            </div>
          </div>

          <!-- SEO & Search -->
          <div class="border-t border-slate-100 pt-[2rem]">
            <h3 class="text-[1.3rem] font-[700] text-slate-800 uppercase tracking-wider mb-[1.2rem] flex items-center gap-[0.6rem]">
              <span class="material-symbols-outlined text-[1.8rem] text-primary">search</span>
              SEO & Search Crawling Metadata
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-[1.2rem]">
              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">SEO Meta Title</p>
                <p class="font-[500] text-[#000]">{{ store.storeSettings?.seo?.title || m.seoTitle || "—" }}</p>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Google Site Verification</p>
                <p class="font-mono font-[500] text-[#000]">{{ store.storeSettings?.seo?.googleSiteVerification || m.googleSiteVerification || "—" }}</p>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Search Keywords</p>
                <p class="font-[500] text-[#000]">{{ store.storeSettings?.seo?.keywords || m.seoKeywords || "—" }}</p>
              </div>

              <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Social Share Image</p>
                <a
                  v-if="store.storeSettings?.seo?.socialShareImage || m.socialShareImage"
                  :href="store.storeSettings?.seo?.socialShareImage || m.socialShareImage"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-[0.4rem] font-[600] text-primary underline hover:no-underline"
                >
                  <span class="material-symbols-outlined text-[1.6rem]">open_in_new</span>
                  View Share Image
                </a>
                <p v-else class="text-slate-400 italic">Not set</p>
              </div>

              <div class="col-span-1 sm:col-span-2 rounded-[8px] border border-slate-100 p-[1.2rem]">
                <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">SEO Meta Description</p>
                <p class="font-[500] text-[#000]">{{ store.storeSettings?.seo?.description || m.seoDescription || "—" }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== OWNER ===== -->
      <div class="rounded-[8px] bg-white shadow-sm">
        <div class="flex items-center gap-[1rem] border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <span class="material-symbols-outlined text-primary">person</span>
          <h2 class="text-[1.6rem] font-[700] text-[#000]">Owner</h2>
        </div>
        <div v-if="m.owner" class="grid grid-cols-2 gap-[1.2rem] p-[1.6rem]">
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Full Name</p>
            <p class="font-[500] text-[#000]">{{ m.owner.fullName || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Email Address</p>
            <p class="font-[500] text-[#000]">{{ m.owner.email || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Phone Number</p>
            <p class="font-[500] text-[#000]">{{ m.owner.phoneNumber || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Account Status</p>
            <p :class="['font-[700] capitalize', m.owner.status === 'active' ? 'text-green-600' : 'text-red-500']">
              {{ m.owner.status || "—" }}
            </p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Email Verified</p>
            <p :class="['font-[700]', m.owner.emailVerified ? 'text-green-600' : 'text-red-500']">
              {{ m.owner.emailVerified ? "Verified" : "Not Verified" }}
            </p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">2FA Enabled</p>
            <p :class="['font-[700]', m.owner.twoFactorEnabled ? 'text-green-600' : 'text-slate-400']">
              {{ m.owner.twoFactorEnabled ? "Enabled" : "Disabled" }}
            </p>
          </div>
        </div>
        <p v-else class="p-[1.6rem] italic text-slate-400">No owner information available.</p>
      </div>

      <!-- ===== KYC / IDENTITY VERIFICATION ===== -->
      <div class="rounded-[8px] bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <div class="flex items-center gap-[1rem]">
            <span class="material-symbols-outlined text-primary">verified_user</span>
            <h2 class="text-[1.6rem] font-[700] text-[#000]">Owner KYC / Identity Details</h2>
            <span :class="['inline-flex items-center rounded-full px-[1rem] py-[0.2rem] text-[1.2rem] font-[700]', getKycStatus(m).class]">
              {{ getKycStatus(m).label }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-[0.4rem] rounded-[8px] bg-primary px-[1.4rem] py-[0.6rem] text-[1.3rem] font-[700] text-white transition-colors hover:bg-primary/90 cursor-pointer"
            @click="vfm.open('updateOwnerKycModal')"
          >
            <span class="material-symbols-outlined text-[1.6rem]">edit</span>
            Update KYC
          </button>
        </div>
        <div v-if="m.owner" class="grid grid-cols-2 gap-[1.2rem] p-[1.6rem]">
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">First Name</p>
            <p class="font-[500] text-[#000]">{{ m.owner.firstName || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Last Name</p>
            <p class="font-[500] text-[#000]">{{ m.owner.lastName || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Other Name</p>
            <p class="font-[500] text-[#000]">{{ m.owner.otherName || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Date of Birth</p>
            <p class="font-[500] text-[#000]">{{ m.owner.dateOfBirth ? formatDate(m.owner.dateOfBirth) : "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Nationality</p>
            <p class="font-[500] text-[#000]">{{ m.owner.nationality || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">ID Type</p>
            <p class="font-[500] uppercase text-[#000]">{{ m.owner.idType || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">ID Number</p>
            <p class="font-[500] font-mono text-[#000]">{{ m.owner.idNumber || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Address</p>
            <p class="font-[500] text-[#000]">{{ m.owner.address || "—" }}</p>
          </div>

          <!-- Documents / Links -->
          <div class="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-[1.2rem]">
            <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
              <div class="flex items-center justify-between mb-[0.4rem]">
                <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">ID Document</p>
                <span v-if="m.owner.idDocumentVerified" class="text-[1.1rem] font-[700] text-emerald-600">Verified</span>
              </div>
              <a v-if="m.owner.idDocumentUrl" :href="m.owner.idDocumentUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-[0.4rem] font-[600] text-primary underline hover:no-underline">
                <span class="material-symbols-outlined text-[1.6rem]">open_in_new</span>
                View ID Document
              </a>
              <p v-else class="italic text-slate-400">Not uploaded</p>
            </div>

            <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
              <div class="flex items-center justify-between mb-[0.4rem]">
                <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Owner Photo / Selfie</p>
                <span v-if="m.owner.profileImageVerified" class="text-[1.1rem] font-[700] text-emerald-600">Verified</span>
              </div>
              <a v-if="m.owner.profileUrl" :href="m.owner.profileUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-[0.4rem] font-[600] text-primary underline hover:no-underline">
                <span class="material-symbols-outlined text-[1.6rem]">open_in_new</span>
                View Photo
              </a>
              <p v-else class="italic text-slate-400">Not uploaded</p>
            </div>

            <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
              <div class="flex items-center justify-between mb-[0.4rem]">
                <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Proof of Address</p>
                <span v-if="m.owner.proofOfAddressVerified" class="text-[1.1rem] font-[700] text-emerald-600">Verified</span>
              </div>
              <a v-if="m.owner.proofOfAddress" :href="m.owner.proofOfAddress" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-[0.4rem] font-[600] text-primary underline hover:no-underline">
                <span class="material-symbols-outlined text-[1.6rem]">open_in_new</span>
                View Proof of Address
              </a>
              <p v-else class="italic text-slate-400">Not uploaded</p>
            </div>
          </div>
        </div>
        <p v-else class="p-[1.6rem] italic text-slate-400">No owner information available.</p>
      </div>

      <!-- ===== BANK ACCOUNT / PAYMENT SECRETS ===== -->
      <div class="rounded-[8px] bg-white shadow-sm">
        <div class="flex items-center gap-[1rem] border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <span class="material-symbols-outlined text-primary">account_balance</span>
          <h2 class="text-[1.6rem] font-[700] text-[#000]">Payment Gateway Secrets</h2>
        </div>
        <div class="p-[1.6rem]">
          <div v-if="store.paymentSecrets.length" class="space-y-[1rem]">
            <div
              v-for="secret in store.paymentSecrets"
              :key="secret.id"
              class="grid grid-cols-3 items-center gap-[1.2rem] rounded-[8px] border border-slate-100 p-[1.4rem]"
            >
              <div>
                <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Gateway</p>
                <p class="mt-[0.4rem] font-[700] text-[#000]">{{ secret.gateway }}</p>
              </div>
              <div>
                <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Live Secret</p>
                <p :class="['mt-[0.4rem] font-[700]', secret.hasLiveSecret ? 'text-green-600' : 'text-red-500']">
                  {{ secret.hasLiveSecret ? "Configured" : "Missing" }}
                </p>
              </div>
              <div>
                <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Test Secret</p>
                <p :class="['mt-[0.4rem] font-[700]', secret.hasTestSecret ? 'text-green-600' : 'text-slate-400']">
                  {{ secret.hasTestSecret ? "Configured" : "Missing" }}
                </p>
              </div>
            </div>
          </div>
          <p v-else class="italic text-slate-400">No payment gateway secrets available.</p>
        </div>
      </div>

      <!-- ===== SETTLEMENT BANK ACCOUNTS ===== -->
      <div class="rounded-[8px] bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <div class="flex items-center gap-[1rem]">
            <span class="material-symbols-outlined text-primary">account_balance_wallet</span>
            <h2 class="text-[1.6rem] font-[700] text-[#000]">Settlement Bank Accounts</h2>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-[0.4rem] rounded-[8px] bg-primary px-[1.4rem] py-[0.6rem] text-[1.3rem] font-[700] text-white transition-colors hover:bg-primary/90 cursor-pointer"
            @click="vfm.open('addBankAccountModal')"
          >
            <span class="material-symbols-outlined text-[1.6rem]">add</span>
            Add Bank Account
          </button>
        </div>
        <div class="p-[1.6rem]">
          <div v-if="store.bankAccountsLoading" class="flex items-center justify-center py-[2rem] text-[#616161]">
            <span class="animate-spin material-symbols-outlined mr-[0.8rem] text-[2rem] text-primary">progress_activity</span>
            Loading bank accounts...
          </div>
          <div v-else-if="store.bankAccounts.length" class="space-y-[1rem]">
            <div
              v-for="account in store.bankAccounts"
              :key="account.id || account.accountNumber"
              class="grid grid-cols-1 sm:grid-cols-4 items-center gap-[1.2rem] rounded-[8px] border border-slate-100 p-[1.4rem]"
            >
              <div>
                <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Bank</p>
                <p class="mt-[0.4rem] font-[700] text-[#000]">{{ account.bankName || account.bankCode || "—" }}</p>
              </div>
              <div>
                <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Account Number</p>
                <p class="mt-[0.4rem] font-mono font-[700] text-[#000]">{{ account.accountNumber || "—" }}</p>
              </div>
              <div>
                <p class="text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Account Name</p>
                <p class="mt-[0.4rem] font-[600] text-[#000]">{{ account.accountName || "—" }}</p>
              </div>
              <div class="flex items-center justify-end sm:justify-start">
                <span
                  v-if="account.primary"
                  class="rounded-full bg-emerald-100 px-[1rem] py-[0.2rem] text-[1.2rem] font-[700] text-emerald-800"
                >
                  Primary
                </span>
                <span v-else class="text-[1.2rem] text-slate-400">Secondary</span>
              </div>
            </div>
          </div>
          <p v-else class="italic text-slate-400">No settlement bank accounts configured for this merchant.</p>
        </div>
      </div>
    </template>

    <p v-else-if="!store.detailLoading">No merchant found.</p>

    <SendReminderModal
      :merchant="m"
      @sent="store.fetchMerchantDetail(route.params.tenantId)"
    />

    <CompleteComplianceModal
      :tenant-id="route.params.tenantId"
      :merchant="m"
      @completed="store.fetchMerchantDetail(route.params.tenantId)"
    />

    <AddBankAccountModal
      :tenant-id="route.params.tenantId"
      :merchant="m"
      @added="store.fetchBankAccounts(route.params.tenantId)"
    />

    <UpdateBusinessProfileModal
      :tenant-id="route.params.tenantId"
      :merchant="m"
      @updated="store.fetchMerchantDetail(route.params.tenantId)"
    />

    <UpdateBusinessContactModal
      :tenant-id="route.params.tenantId"
      :merchant="m"
      @updated="store.fetchMerchantDetail(route.params.tenantId)"
    />

    <UpdateOwnerKycModal
      :tenant-id="route.params.tenantId"
      :merchant="m"
      @updated="store.fetchMerchantDetail(route.params.tenantId)"
    />

    <UpdateStoreSettingsModal
      :tenant-id="route.params.tenantId"
      :merchant="m"
      :store-settings="store.storeSettings"
      @updated="store.fetchStoreSettings(route.params.tenantId)"
    />

    <ConfirmModal />
  </div>
</template>
