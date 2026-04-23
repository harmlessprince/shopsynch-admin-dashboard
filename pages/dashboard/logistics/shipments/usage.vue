<script setup>
import { Bar } from "vue-chartjs";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { logger, formatToMoney } from "~/utils/helpers.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-logistics-usage",
});

const logisticsStore = useAdminLogisticsStore();

const tenantId = ref("");
const provider = ref("");
const from = ref("");
const to = ref("");

const params = computed(() => ({
  tenantId: tenantId.value || undefined,
  provider: provider.value || undefined,
  from: from.value ? new Date(from.value).toISOString() : undefined,
  to: to.value ? new Date(to.value).toISOString() : undefined,
}));

const chartData = computed(() => ({
  labels: logisticsStore.usageStats.map((s) => s.provider),
  datasets: [
    {
      label: "Shipments",
      data: logisticsStore.usageStats.map((s) => s.shipmentCount),
      backgroundColor: "#003366CC",
      borderRadius: 4,
    },
    {
      label: "Waybill Failures",
      data: logisticsStore.usageStats.map((s) => s.waybillFailureCount),
      backgroundColor: "#FF3131CC",
      borderRadius: 4,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { position: "top" },
    title: { display: true, text: "Shipments by Provider" },
  },
};

const usageTableHeader = [
  { title: "Provider", accessor: "provider" },
  { title: "Shipments", accessor: "shipmentCount" },
  { title: "Total Fees", accessor: "totalQuotedFees" },
  { title: "Avg Weight (kg)", accessor: "averageWeightKg" },
  { title: "Failures", accessor: "waybillFailureCount" },
  { title: "Failure Rate", accessor: "waybillFailureRate" },
  { title: "Adjustments", accessor: "weightAdjustmentCount" },
  { title: "Adj. Rate", accessor: "adjustmentRate" },
];

function formatRate(value) {
  if (value == null) return "0%";
  return (value * 100).toFixed(1) + "%";
}

async function fetchStats() {
  try {
    await logisticsStore.fetchUsageStats(params.value);
  } catch (err) {
    logger.error("Failed to load usage stats", err);
  }
}

function applyFilters() {
  fetchStats();
}

onMounted(fetchStats);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <!-- Header + filters -->
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Provider Usage</h1>
          <p class="mt-[0.4rem]">Aggregated logistics stats by provider</p>
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
            Apply
          </button>
        </div>
      </div>
    </section>

    <!-- Chart -->
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div v-if="logisticsStore.loading" class="flex h-[250px] items-center justify-center text-gray-400">
        Loading chart…
      </div>
      <div v-else-if="!logisticsStore.usageStats.length" class="flex h-[250px] items-center justify-center text-gray-400">
        No data available
      </div>
      <Bar v-else :data="chartData" :options="chartOptions" class="max-h-[300px]" />
    </section>

    <!-- Table -->
    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="border-b border-slate-100 bg-slate-50">
            <tr>
              <th v-for="h in usageTableHeader" :key="h.accessor" class="px-[1.6rem] py-[1.2rem] font-[600]">
                {{ h.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="logisticsStore.loading">
              <td :colspan="usageTableHeader.length" class="px-[1.6rem] py-[2rem] text-center text-gray-400">
                Loading…
              </td>
            </tr>
            <tr v-else-if="!logisticsStore.usageStats.length">
              <td :colspan="usageTableHeader.length" class="px-[1.6rem] py-[2rem] text-center text-gray-400">
                No usage data
              </td>
            </tr>
            <tr
              v-for="row in logisticsStore.usageStats"
              :key="row.provider"
              class="border-b border-slate-50 hover:bg-slate-50"
            >
              <td class="px-[1.6rem] py-[1.2rem]">
                <span class="rounded-full bg-[#D0E8FF] px-[1rem] py-[0.3rem] text-[1.2rem] font-[600] text-[#0066CC]">
                  {{ row.provider }}
                </span>
              </td>
              <td class="px-[1.6rem] py-[1.2rem] font-[600]">{{ row.shipmentCount }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ formatToMoney(row.totalQuotedFees || 0) }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ row.averageWeightKg?.toFixed(2) || "0.00" }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ row.waybillFailureCount }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ formatRate(row.waybillFailureRate) }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ row.weightAdjustmentCount }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ formatRate(row.adjustmentRate) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
