<script setup>
import { logger, formatToMoney } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-logistics-shipments",
});

const logisticsStore = useAdminLogisticsStore();
const router = useRouter();

const tenantId = ref("");
const provider = ref("");
const status = ref("");
const from = ref("");
const to = ref("");
const page = ref(1);
const limit = ref(50);

const shipmentStatuses = [
  "PENDING_WAYBILL",
  "WAYBILL_GENERATED",
  "WAYBILL_FAILED",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
];

const statusBadgeClass = {
  PENDING_WAYBILL: "bg-[#FFF9C5] text-[#E79640]",
  WAYBILL_GENERATED: "bg-[#D0E8FF] text-[#0066CC]",
  WAYBILL_FAILED: "bg-[#FFBFBF] text-[#FF3131]",
  IN_TRANSIT: "bg-[#E8D5FF] text-[#7B2FBE]",
  DELIVERED: "bg-[#B5F9B4] text-[#3CA745]",
  FAILED: "bg-[#FFBFBF] text-[#FF3131]",
};

const tableHeader = [
  { title: "Order", accessor: "orderNumber" },
  { title: "Tenant", accessor: "tenantId" },
  { title: "Provider", accessor: "provider" },
  { title: "Status", accessor: "status" },
  { title: "Quoted Fee", accessor: "quotedShippingFee" },
  { title: "Weight (kg)", accessor: "weightKg" },
  { title: "Waybill #", accessor: "waybillNumber" },
  { title: "Created", accessor: "createdAt", type: "date" },
];

const params = computed(() => ({
  tenantId: tenantId.value || undefined,
  provider: provider.value || undefined,
  status: status.value || undefined,
  from: from.value ? new Date(from.value).toISOString() : undefined,
  to: to.value ? new Date(to.value).toISOString() : undefined,
  page: page.value - 1,
  limit: limit.value,
  sortDirectionParam: "DESC",
}));

async function fetchShipments(nextPage = page.value) {
  try {
    page.value = nextPage;
    await logisticsStore.fetchShipments(params.value);
  } catch (err) {
    logger.error("Failed to load shipments", err);
  }
}

function applyFilters() {
  fetchShipments(1);
}

function changeLimit(nextLimit) {
  limit.value = nextLimit;
  fetchShipments(1);
}

onMounted(fetchShipments);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Shipments</h1>
          <p class="mt-[0.4rem]">Total: {{ logisticsStore.shipmentsTotal }}</p>
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
            v-model="provider"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="applyFilters"
          >
            <option value="">All providers</option>
            <option value="KONGA">Konga</option>
          </select>
          <select
            v-model="status"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="applyFilters"
          >
            <option value="">All statuses</option>
            <option v-for="s in shipmentStatuses" :key="s" :value="s">{{ s.replace(/_/g, " ") }}</option>
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
        :table-data="logisticsStore.shipments"
        :pagination="logisticsStore.shipmentsPaginatedData"
        :loading="logisticsStore.loading"
        @fetch-page="fetchShipments"
        @change-limit="changeLimit"
      >
        <template #cell(provider)="{ row }">
          <span class="rounded-full bg-[#D0E8FF] px-[1rem] py-[0.3rem] text-[1.2rem] font-[600] text-[#0066CC]">
            {{ row.provider }}
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
        <template #cell(quotedShippingFee)="{ row }">
          {{ row.quotedShippingFee != null ? formatToMoney(row.quotedShippingFee) : "—" }}
        </template>
        <template #cell(waybillNumber)="{ row }">
          {{ row.waybillNumber || "—" }}
        </template>
      </DataTable>
    </section>
  </div>
</template>
