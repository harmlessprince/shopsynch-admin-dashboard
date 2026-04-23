<script setup>
import { logger } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";
definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-merchants",
});

const adminMerchantsStore = useAdminMerchantsStore();
const router = useRouter();
const search = ref("");
const complianceReviewStatus = ref("");
const currentMode = ref("");
const status = ref("");
const page = ref(1);
const limit = ref(50);

const tableHeader = [
  { title: "Merchant", accessor: "businessTradingName" },
  { title: "Owner", accessor: "ownerFullName" },
  { title: "Mode", accessor: "currentMode" },
  { title: "Compliance", accessor: "complianceReviewStatus" },
  { title: "Status", accessor: "status" },
  { title: "Created", accessor: "createdAt", type: "date" },
];

const params = computed(() => ({
  search: search.value || undefined,
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

function formatMerchantName(merchant) {
  return merchant.businessTradingName || "Untitled merchant";
}

onMounted(fetchMerchants);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Merchants</h1>
          <p class="mt-[0.4rem]">All platform merchants: {{ adminMerchantsStore.total }}</p>
        </div>
        <div class="flex flex-col gap-[1rem] sm:flex-row sm:flex-wrap sm:justify-end">
          <input
            v-model="search"
            type="search"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Search merchants"
            @keyup.enter="applyFilters"
          />
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
          <select
            v-model="status"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="applyFilters"
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <button class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white" @click="applyFilters">
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
          <div>
            <p class="font-[700] text-[#000]">{{ formatMerchantName(row) }}</p>
            <p class="text-[1.2rem] text-dashboard_text_color">{{ row.code || row.slug || "N/A" }}</p>
          </div>
        </template>

        <template #cell(ownerFullName)="{ row }">
          <div>
            <p class="text-[#000]">{{ row.ownerFullName || "N/A" }}</p>
            <p class="text-[1.2rem] text-dashboard_text_color">{{ row.ownerEmail || "N/A" }}</p>
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
          <div class="dt-action-item" @click="updateMerchantStatus(data)">
            <span class="material-symbols-outlined">
              {{ data.status ? "toggle_off" : "toggle_on" }}
            </span>
            <p>{{ data.status ? "Deactivate" : "Activate" }}</p>
          </div>
        </template>
      </DataTable>
    </section>
  </div>
</template>
