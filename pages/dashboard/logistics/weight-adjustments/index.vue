<script setup>
import { logger, formatToMoney } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";
import LogisticAdjustmentResolveDrawer from "~/components/Dashboard/LogisticAdjustmentResolveDrawer.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-logistics-weight-adjustments",
});

const logisticsStore = useAdminLogisticsStore();

const tenantId = ref("");
const status = ref("");
const from = ref("");
const to = ref("");
const page = ref(1);
const limit = ref(50);

const drawerOpen = ref(false);
const selectedAdjustment = ref(null);

const adjustmentStatuses = [
  "NONE",
  "UNDER_REVIEW",
  "MERCHANT_UNDERCHARGED",
  "MERCHANT_OVERCHARGED",
  "DISPUTED",
  "RESOLVED",
  "WAIVED",
];

const statusBadgeClass = {
  NONE: "bg-gray-100 text-gray-600",
  UNDER_REVIEW: "bg-[#FFF9C5] text-[#E79640]",
  MERCHANT_UNDERCHARGED: "bg-[#FFBFBF] text-[#FF3131]",
  MERCHANT_OVERCHARGED: "bg-[#FFE8CC] text-[#CC6600]",
  DISPUTED: "bg-[#FFE8CC] text-[#CC6600]",
  RESOLVED: "bg-[#B5F9B4] text-[#3CA745]",
  WAIVED: "bg-[#E5E7EB] text-[#6B7280]",
};

const tableHeader = [
  { title: "Order #", accessor: "orderNumber" },
  { title: "Tenant", accessor: "tenantId" },
  { title: "Provider", accessor: "provider" },
  { title: "Quoted Weight", accessor: "quotedWeightKg" },
  { title: "Actual Weight", accessor: "actualWeightKg" },
  { title: "Quoted Fee", accessor: "quotedFee" },
  { title: "Actual Fee", accessor: "actualFee" },
  { title: "Fee Diff", accessor: "feeDifference" },
  { title: "Status", accessor: "status" },
  { title: "Created By", accessor: "createdBy" },
  { title: "Action", accessor: "_action" },
];

const params = computed(() => ({
  tenantId: tenantId.value || undefined,
  status: status.value || undefined,
  from: from.value ? new Date(from.value).toISOString() : undefined,
  to: to.value ? new Date(to.value).toISOString() : undefined,
  page: page.value - 1,
  limit: limit.value,
  sortDirectionParam: "DESC",
}));

async function fetchAdjustments(nextPage = page.value) {
  try {
    page.value = nextPage;
    await logisticsStore.fetchWeightAdjustments(params.value);
  } catch (err) {
    logger.error("Failed to load weight adjustments", err);
  }
}

function applyFilters() {
  fetchAdjustments(1);
}

function changeLimit(nextLimit) {
  limit.value = nextLimit;
  fetchAdjustments(1);
}

function openResolveDrawer(adjustment) {
  selectedAdjustment.value = adjustment;
  drawerOpen.value = true;
}

function onResolved() {
  fetchAdjustments(page.value);
}

const diffClass = (val) =>
  val > 0 ? "text-[#FF3131] font-[600]" : val < 0 ? "text-[#3CA745] font-[600]" : "";

const isResolvable = (adj) =>
  adj.status !== "RESOLVED" && adj.status !== "WAIVED";

onMounted(fetchAdjustments);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Weight Adjustments</h1>
          <p class="mt-[0.4rem]">Total: {{ logisticsStore.adjustmentsTotal }}</p>
        </div>
        <div class="flex flex-col gap-[1rem] sm:flex-row sm:flex-wrap sm:justify-end">
          <input
            v-model="tenantId"
            type="text"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Filter by tenant ID"
            @keyup.enter="applyFilters"
          />
          <select
            v-model="status"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="applyFilters"
          >
            <option value="">All statuses</option>
            <option v-for="s in adjustmentStatuses" :key="s" :value="s">{{ s.replace(/_/g, " ") }}</option>
          </select>
          <input
            v-model="from"
            type="date"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="applyFilters"
          />
          <input
            v-model="to"
            type="date"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="applyFilters"
          />
          <button
            class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white"
            @click="applyFilters"
          >
            Filter
          </button>
        </div>
      </div>
    </section>

    <div v-if="logisticsStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ logisticsStore.error }}
    </div>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <DataTable
        :table-header="tableHeader"
        :table-data="logisticsStore.adjustments"
        :pagination="logisticsStore.adjustmentsPaginatedData"
        :loading="logisticsStore.loading"
        @fetch-page="fetchAdjustments"
        @change-limit="changeLimit"
      >
        <template #cell(provider)="{ row }">
          <span class="rounded-full bg-[#D0E8FF] px-[1rem] py-[0.3rem] text-[1.2rem] font-[600] text-[#0066CC]">
            {{ row.provider }}
          </span>
        </template>
        <template #cell(quotedWeightKg)="{ row }">{{ row.quotedWeightKg ?? "—" }} kg</template>
        <template #cell(actualWeightKg)="{ row }">{{ row.actualWeightKg ?? "—" }} kg</template>
        <template #cell(quotedFee)="{ row }">{{ formatToMoney(row.quotedFee || 0) }}</template>
        <template #cell(actualFee)="{ row }">{{ formatToMoney(row.actualFee || 0) }}</template>
        <template #cell(feeDifference)="{ row }">
          <span :class="diffClass(row.feeDifference)">
            {{ row.feeDifference != null ? formatToMoney(row.feeDifference) : "—" }}
          </span>
        </template>
        <template #cell(status)="{ row }">
          <span
            :class="statusBadgeClass[row.status] || 'bg-gray-100 text-gray-600'"
            class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[500]"
          >
            {{ row.status?.replace(/_/g, " ") }}
          </span>
        </template>
        <template #cell(createdBy)="{ row }">{{ row.createdBy || "—" }}</template>
        <template #cell(_action)="{ row }">
          <button
            v-if="isResolvable(row)"
            class="rounded-[6px] bg-primary px-[1rem] py-[0.5rem] text-[1.2rem] font-[600] text-white hover:opacity-90"
            @click="openResolveDrawer(row)"
          >
            Resolve
          </button>
          <span v-else class="text-gray-400">—</span>
        </template>
      </DataTable>
    </section>

    <LogisticAdjustmentResolveDrawer
      :open="drawerOpen"
      :adjustment="selectedAdjustment"
      @update:open="drawerOpen = $event"
      @resolved="onResolved"
    />
  </div>
</template>
