<script setup>
import { logger } from "~/utils/helpers.js";
import { useVfm } from "vue-final-modal";
import DataTable from "~/components/table/DataTable.vue";
import SendReminderModal from "~/components/Modals/SendReminderModal.vue";
import RegisterMerchantModal from "~/components/Modals/RegisterMerchantModal.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-merchants",
});

const adminMerchantsStore = useAdminMerchantsStore();
const toastStore = useToastStore();
const router = useRouter();
const vfm = useVfm();
const search = ref("");
const classification = ref("REAL");
const funnelStep = ref("");
const stalledDays = ref("");
const complianceReviewStatus = ref("");
const currentMode = ref("");
const status = ref("");
const page = ref(1);
const limit = ref(50);
const exportingCsv = ref(false);
const selectedMerchantForReminder = ref(null);

const funnelSteps = [
  { code: "SIGNED_UP", label: "Signed Up" },
  { code: "EMAIL_VERIFIED", label: "Email Verified" },
  { code: "PROFILE_COMPLETED", label: "Owner Profile Completed" },
  { code: "BUSINESS_PROFILE_COMPLETED", label: "Business Profile Completed" },
  { code: "CONTACT_COMPLETED", label: "Business Contact Completed" },
  { code: "BANK_ACCOUNT_ADDED", label: "Bank Account Added" },
  { code: "COMPLIANCE_SUBMITTED", label: "Compliance Submitted" },
  { code: "COMPLIANCE_APPROVED", label: "Compliance Approved" },
  { code: "LIVE_MODE", label: "Switched to Live Mode" },
  { code: "FIRST_PRODUCT", label: "First Product Added" },
  { code: "FIRST_ORDER", label: "First Order Received" },
  { code: "FIRST_PAID_ORDER", label: "First Paid Order" },
];

const classificationBadgeConfig = {
  REAL: { label: "Real", class: "bg-emerald-100 text-emerald-800" },
  INTERNAL: { label: "Internal", class: "bg-purple-100 text-purple-800" },
  TEST: { label: "Test", class: "bg-slate-200 text-slate-700" },
};

const tableHeader = [
  { title: "Merchant", accessor: "businessTradingName" },
  { title: "Owner & Contact", accessor: "ownerFullName" },
  { title: "Activation Funnel", accessor: "currentFunnelStep" },
  { title: "Mode", accessor: "currentMode" },
  { title: "Compliance", accessor: "complianceReviewStatus" },
  { title: "Status", accessor: "status" },
  { title: "Created", accessor: "createdAt", type: "date" },
];

const params = computed(() => ({
  search: search.value || undefined,
  classification: classification.value || undefined,
  funnelStep: funnelStep.value || undefined,
  stalledDays: stalledDays.value ? Number(stalledDays.value) : undefined,
  complianceReviewStatus: complianceReviewStatus.value || undefined,
  currentMode: currentMode.value || undefined,
  status: status.value || undefined,
  page: page.value - 1,
  limit: limit.value,
  sortFieldParam: "CREATED_AT",
  sortDirectionParam: "DESC",
}));

async function fetchMerchants(nextPage = page.value) {
  try {
    page.value = nextPage;
    await adminMerchantsStore.fetchMerchants(params.value);
  } catch (err) {
    logger.error("Failed to load merchants", err);
  }
}

function applyFilters() {
  fetchMerchants(1);
}

function changeLimit(nextLimit) {
  limit.value = nextLimit;
  fetchMerchants(1);
}

async function updateMerchantStatus(merchant) {
  try {
    await adminMerchantsStore.updateMerchantStatus(merchant.id, !merchant.status);
    await fetchMerchants();
  } catch (err) {
    logger.error("Failed to update merchant status", err);
  }
}

async function quickClassifyMerchant(merchant, nextClassification) {
  try {
    await adminMerchantsStore.updateMerchantClassification(merchant.id, {
      classification: nextClassification,
      reason: `Manual classification update from merchants list (${nextClassification})`,
    });
    await fetchMerchants();
  } catch (err) {
    logger.error("Failed to update merchant classification", err);
  }
}

async function exportStalledCsv() {
  exportingCsv.value = true;
  try {
    const csvContent = await adminMerchantsStore.exportStalledMerchantsCsv({
      classification: classification.value || undefined,
      stalledDays: stalledDays.value ? Number(stalledDays.value) : 3,
      funnelStep: funnelStep.value || undefined,
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `stalled-merchants-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    logger.error("Failed to export stalled merchants CSV", err);
    toastStore.error("Failed to export stalled merchants CSV", "");
  } finally {
    exportingCsv.value = false;
  }
}

function classificationBadge(value) {
  return classificationBadgeConfig[value] || classificationBadgeConfig.REAL;
}

function formatMerchantName(merchant) {
  return merchant.businessTradingName || "Untitled merchant";
}

function formatWhatsAppUrl(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/[^0-9]/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("0") && digits.length === 11 ? `234${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

async function copyText(value, label) {
  if (!value || !import.meta.client) return;
  try {
    await navigator.clipboard.writeText(value);
    toastStore.success(`${label} copied`, "");
  } catch (err) {
    logger.error("Clipboard copy failed", err);
  }
}

onMounted(fetchMerchants);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm space-y-[1.6rem]">
      <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Merchants</h1>
          <p class="mt-[0.4rem]">
            Matching merchants: <span class="font-[700] text-[#000]">{{ adminMerchantsStore.total }}</span>
            <span v-if="classification === 'REAL'" class="ml-2 text-[1.2rem] text-emerald-700 font-[600]">
              (Showing Real Merchants — Internal &amp; Test stores hidden)
            </span>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-[1rem]">
          <NuxtLink
            to="/dashboard/merchants/funnel"
            class="rounded-[8px] border border-primary bg-primary/5 px-[1.4rem] py-[0.9rem] font-[700] text-primary flex items-center gap-2 hover:bg-primary/10 transition-colors"
          >
            <span class="material-symbols-outlined text-[1.8rem]">filter_alt</span>
            <span>Activation Funnel</span>
          </NuxtLink>
          <button
            type="button"
            :disabled="exportingCsv"
            class="rounded-[8px] border border-slate-300 bg-white px-[1.4rem] py-[0.9rem] font-[700] text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
            @click="exportStalledCsv"
          >
            <span class="material-symbols-outlined text-[1.8rem]">download</span>
            <span>{{ exportingCsv ? "Exporting..." : "Export Stalled CSV" }}</span>
          </button>
          <button
            data-testid="open-register-merchant-modal"
            class="rounded-[8px] bg-primary px-[1.6rem] py-[0.9rem] font-[700] text-white flex items-center gap-2 hover:bg-primary/90 transition-colors w-fit"
            @click="vfm.open('registerMerchantModal')"
          >
            <span class="material-symbols-outlined text-[1.8rem]">add</span>
            <span>Register Merchant</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-[1rem] sm:grid-cols-2 lg:grid-cols-7">
        <input
          v-model="search"
          type="search"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="Search name, slug, code"
          @keyup.enter="applyFilters"
        >
        <select
          v-model="classification"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] font-[600]"
          @change="applyFilters"
        >
          <option value="REAL">Real Merchants (Default)</option>
          <option value="ALL">All Classifications</option>
          <option value="INTERNAL">Internal Only</option>
          <option value="TEST">Test / Smoke Only</option>
        </select>
        <select
          v-model="funnelStep"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          @change="applyFilters"
        >
          <option value="">All funnel steps</option>
          <option v-for="step in funnelSteps" :key="step.code" :value="step.code">
            {{ step.label }}
          </option>
        </select>
        <select
          v-model="stalledDays"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          @change="applyFilters"
        >
          <option value="">All durations</option>
          <option value="3">Stalled 3+ days</option>
          <option value="7">Stalled 7+ days</option>
          <option value="14">Stalled 14+ days</option>
        </select>
        <select
          v-model="complianceReviewStatus"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          @change="applyFilters"
        >
          <option value="">All compliance statuses</option>
          <option value="NOT_SUBMITTED">Not submitted</option>
          <option value="AWAITING_APPROVAL">Awaiting approval</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <select
          v-model="currentMode"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          @change="applyFilters"
        >
          <option value="">All modes</option>
          <option value="TEST_MODE">Test mode</option>
          <option value="LIVE_MODE">Live mode</option>
        </select>
        <div class="flex gap-[0.8rem]">
          <select
            v-model="status"
            class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="applyFilters"
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <button class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white shrink-0" @click="applyFilters">
            Filter
          </button>
        </div>
      </div>
    </section>

    <div v-if="adminMerchantsStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ adminMerchantsStore.error }}
    </div>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <DataTable
        :table-header="tableHeader"
        :table-data="adminMerchantsStore.merchants"
        :pagination="adminMerchantsStore.paginatedData"
        :loading="adminMerchantsStore.loading"
        has-action
        has-show
        @show="router.push(`/dashboard/merchants/${$event}`)"
        @fetch-page="fetchMerchants"
        @change-limit="changeLimit"
      >
        <template #cell(businessTradingName)="{ row }">
          <div class="space-y-[0.3rem]">
            <div class="flex items-center gap-[0.6rem] flex-wrap">
              <p class="font-[700] text-[#000]">{{ formatMerchantName(row) }}</p>
              <span
                :class="['inline-flex items-center rounded-full px-[0.8rem] py-[0.15rem] text-[1.1rem] font-[700]', classificationBadge(row.classification).class]"
                :title="row.classificationReason || ''"
              >
                {{ classificationBadge(row.classification).label }}
              </span>
            </div>
            <p class="text-[1.2rem] text-dashboard_text_color">{{ row.code || row.slug || "N/A" }}</p>
          </div>
        </template>

        <template #cell(ownerFullName)="{ row }">
          <div class="space-y-[0.3rem]">
            <p class="font-[600] text-[#000]">{{ row.ownerFullName || "N/A" }}</p>
            <div v-if="row.ownerEmail" class="flex items-center gap-[0.5rem] text-[1.2rem]">
              <a :href="`mailto:${row.ownerEmail}`" class="text-primary hover:underline truncate max-w-[200px]">
                {{ row.ownerEmail }}
              </a>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-700"
                title="Copy email"
                @click.stop="copyText(row.ownerEmail, 'Email')"
              >
                <span class="material-symbols-outlined text-[1.4rem]">content_copy</span>
              </button>
            </div>
            <div
              v-if="row.ownerPhoneNumber || row.businessPrimaryPhoneNumber"
              class="flex items-center gap-[0.6rem] text-[1.2rem]"
            >
              <a
                :href="`tel:${row.ownerPhoneNumber || row.businessPrimaryPhoneNumber}`"
                class="text-slate-700 font-[500] hover:underline"
              >
                {{ row.ownerPhoneNumber || row.businessPrimaryPhoneNumber }}
              </a>
              <a
                v-if="formatWhatsAppUrl(row.ownerPhoneNumber || row.businessPrimaryPhoneNumber)"
                :href="formatWhatsAppUrl(row.ownerPhoneNumber || row.businessPrimaryPhoneNumber)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-emerald-600 font-[700] hover:underline"
                title="Message on WhatsApp"
                @click.stop
              >
                WhatsApp
              </a>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-700"
                title="Copy phone"
                @click.stop="copyText(row.ownerPhoneNumber || row.businessPrimaryPhoneNumber, 'Phone')"
              >
                <span class="material-symbols-outlined text-[1.4rem]">content_copy</span>
              </button>
            </div>
          </div>
        </template>

        <template #cell(currentFunnelStep)="{ row }">
          <div class="space-y-[0.3rem]">
            <div class="flex items-center gap-[0.5rem] flex-wrap">
              <span class="inline-flex items-center rounded-full bg-blue-50 px-[0.9rem] py-[0.2rem] text-[1.2rem] font-[700] text-blue-800">
                {{ row.currentFunnelStepLabel || row.currentFunnelStep || "Signed Up" }}
              </span>
              <span
                v-if="row.daysInCurrentStep >= 3 && row.nextFunnelStep"
                class="inline-flex items-center rounded-full bg-amber-100 px-[0.8rem] py-[0.15rem] text-[1.1rem] font-[700] text-amber-800"
              >
                {{ row.daysInCurrentStep }}d stalled
              </span>
            </div>
            <p v-if="row.nextFunnelStepLabel" class="text-[1.15rem] text-slate-600">
              Next: <span class="font-[600] text-slate-800">{{ row.nextFunnelStepLabel }}</span>
            </p>
            <p v-else class="text-[1.15rem] font-[600] text-emerald-700">
              Fully Activated
            </p>
          </div>
        </template>

        <template #cell(status)="{ row }">
          <span
            :class="row.status ? 'bg-[#B5F9B4] text-[#3CA745]' : 'bg-[#FFBFBF] text-[#FF3131]'"
            class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
          >
            {{ row.status ? "Active" : "Inactive" }}
          </span>
        </template>

        <template #more-actions="{ data }">
          <div class="dt-action-item" @click="selectedMerchantForReminder = data; vfm.open('sendReminderModal')">
            <span class="material-symbols-outlined">
              forward_to_inbox
            </span>
            <p>Send Reminder</p>
          </div>
          <div
            v-if="data.classification !== 'REAL'"
            class="dt-action-item"
            @click="quickClassifyMerchant(data, 'REAL')"
          >
            <span class="material-symbols-outlined">verified</span>
            <p>Mark as Real</p>
          </div>
          <div
            v-if="data.classification !== 'INTERNAL'"
            class="dt-action-item"
            @click="quickClassifyMerchant(data, 'INTERNAL')"
          >
            <span class="material-symbols-outlined">badge</span>
            <p>Mark as Internal</p>
          </div>
          <div
            v-if="data.classification !== 'TEST'"
            class="dt-action-item"
            @click="quickClassifyMerchant(data, 'TEST')"
          >
            <span class="material-symbols-outlined">science</span>
            <p>Mark as Test</p>
          </div>
          <div class="dt-action-item" @click="updateMerchantStatus(data)">
            <span class="material-symbols-outlined">
              {{ data.status ? "toggle_off" : "toggle_on" }}
            </span>
            <p>{{ data.status ? "Deactivate" : "Activate" }}</p>
          </div>
        </template>
      </DataTable>
    </section>

    <ClientOnly>
      <SendReminderModal
        :merchant="selectedMerchantForReminder"
        @sent="fetchMerchants()"
        @closed="selectedMerchantForReminder = null"
      />

      <RegisterMerchantModal
        @registered="fetchMerchants()"
      />
    </ClientOnly>
  </div>
</template>
