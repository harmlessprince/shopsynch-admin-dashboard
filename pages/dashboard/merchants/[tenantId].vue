<script setup>
import { logger, formatDate, formatToMoney } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-merchant-detail",
});

const route = useRoute();
const store = useAdminMerchantsStore();

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
    await store.fetchMerchantDetail(route.params.tenantId);
  } catch (err) {
    logger.error("Failed to load merchant detail", err);
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

      <!-- ===== BUSINESS PROFILE ===== -->
      <div class="rounded-[8px] bg-white shadow-sm">
        <div class="flex items-center gap-[1rem] border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <span class="material-symbols-outlined text-primary">storefront</span>
          <h2 class="text-[1.6rem] font-[700] text-[#000]">Business Profile</h2>
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
        <div class="flex items-center gap-[1rem] border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <span class="material-symbols-outlined text-primary">contact_mail</span>
          <h2 class="text-[1.6rem] font-[700] text-[#000]">Business Contact</h2>
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
    </template>

    <p v-else-if="!store.detailLoading">No merchant found.</p>
  </div>
</template>
