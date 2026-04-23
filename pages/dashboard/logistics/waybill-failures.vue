<script setup>
import { logger } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-logistics-waybill-failures",
});

const logisticsStore = useAdminLogisticsStore();

const tenantId = ref("");
const page = ref(1);
const limit = ref(50);

const tableHeader = [
  { title: "Order #", accessor: "orderNumber" },
  { title: "Order ID", accessor: "orderId" },
  { title: "Tenant", accessor: "tenantId" },
  { title: "Provider", accessor: "provider" },
  { title: "Failed At", accessor: "updatedAt", type: "date" },
  { title: "Waybill #", accessor: "waybillNumber" },
  { title: "Raw Response", accessor: "rawWaybillResponse" },
];

const params = computed(() => ({
  tenantId: tenantId.value || undefined,
  page: page.value - 1,
  limit: limit.value,
  sortDirectionParam: "DESC",
}));

async function fetchFailures(nextPage = page.value) {
  try {
    page.value = nextPage;
    await logisticsStore.fetchWaybillFailures(params.value);
  } catch (err) {
    logger.error("Failed to load waybill failures", err);
  }
}

function applyFilters() {
  fetchFailures(1);
}

function changeLimit(nextLimit) {
  limit.value = nextLimit;
  fetchFailures(1);
}

function truncateJson(value) {
  if (!value) return "—";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > 60 ? str.slice(0, 60) + "…" : str;
}

onMounted(fetchFailures);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Waybill Failures</h1>
          <p class="mt-[0.4rem]">
            Shipments where waybill generation failed: {{ logisticsStore.waybillFailuresTotal }}
          </p>
        </div>
        <div class="flex gap-[1rem]">
          <input
            v-model="tenantId"
            type="text"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Filter by tenant ID"
            @keyup.enter="applyFilters"
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
        :table-data="logisticsStore.waybillFailures"
        :pagination="logisticsStore.waybillFailuresPaginatedData"
        :loading="logisticsStore.loading"
        @fetch-page="fetchFailures"
        @change-limit="changeLimit"
      >
        <template #cell(provider)="{ row }">
          <span class="rounded-full bg-[#D0E8FF] px-[1rem] py-[0.3rem] text-[1.2rem] font-[600] text-[#0066CC]">
            {{ row.provider }}
          </span>
        </template>
        <template #cell(waybillNumber)="{ row }">
          {{ row.waybillNumber || "—" }}
        </template>
        <template #cell(rawWaybillResponse)="{ row }">
          <span class="font-mono text-[1.2rem] text-gray-500" :title="JSON.stringify(row.rawWaybillResponse)">
            {{ truncateJson(row.rawWaybillResponse) }}
          </span>
        </template>
      </DataTable>
    </section>
  </div>
</template>
