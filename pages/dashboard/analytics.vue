<script setup>
import { logger, formatDate } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-analytics",
});

const analyticsStore = useAdminAnalyticsStore();

const tenantId = ref("");
const appName = ref("");
const eventName = ref("");
const featureCode = ref("");
const pagePath = ref("");
const limit = ref(10);
const fromDate = ref(analyticsStore.filters.from.slice(0, 10));
const toDate = ref(analyticsStore.filters.to.slice(0, 10));

const appNameOptions = [
  { label: "All apps", value: "" },
  { label: "Merchant Dashboard", value: "Merchant Dashboard" },
  { label: "Customer Storefront", value: "Customer Storefront" },
];

const appUsageHeader = [
  { title: "App", accessor: "appName" },
  { title: "Source", accessor: "source" },
  { title: "Events", accessor: "eventCount" },
  { title: "Page views", accessor: "pageViewCount" },
  { title: "Unique sessions", accessor: "uniqueSessions" },
  { title: "Last seen", accessor: "lastSeenAt", type: "date" },
];

const eventBreakdownHeader = [
  { title: "Event", accessor: "eventName" },
  { title: "Count", accessor: "eventCount" },
  { title: "Last seen", accessor: "lastSeenAt", type: "date" },
];

const topPagesHeader = [
  { title: "Page", accessor: "pageName" },
  { title: "Path", accessor: "path" },
  { title: "Feature", accessor: "featureCode" },
  { title: "Events", accessor: "eventCount" },
  { title: "Unique sessions", accessor: "uniqueSessions" },
  { title: "Last seen", accessor: "lastSeenAt", type: "date" },
];

const topFeaturesHeader = [
  { title: "Feature", accessor: "featureCode" },
  { title: "Events", accessor: "eventCount" },
  { title: "Unique tenants", accessor: "uniqueTenants" },
  { title: "Unique sessions", accessor: "uniqueSessions" },
  { title: "Last seen", accessor: "lastSeenAt", type: "date" },
];

const topTenantsHeader = [
  { title: "Tenant ID", accessor: "tenantId" },
  { title: "Events", accessor: "eventCount" },
  { title: "Page views", accessor: "pageViewCount" },
  { title: "Unique sessions", accessor: "uniqueSessions" },
  { title: "Last seen", accessor: "lastSeenAt", type: "date" },
];

const recentEventsHeader = [
  { title: "Event", accessor: "eventName" },
  { title: "App", accessor: "appName" },
  { title: "Tenant ID", accessor: "tenantId" },
  { title: "Path", accessor: "path" },
  { title: "Feature", accessor: "featureCode" },
  { title: "Occurred at", accessor: "occurredAt", type: "date" },
];

const kpiCards = computed(() => [
  { label: "Total events", value: analyticsStore.summary?.totalEvents ?? 0, icon: "bar_chart" },
  { label: "Page views", value: analyticsStore.summary?.totalPageViews ?? 0, icon: "visibility" },
  { label: "Unique sessions", value: analyticsStore.summary?.uniqueSessions ?? 0, icon: "group" },
  { label: "Active apps", value: analyticsStore.summary?.appUsage?.length ?? 0, icon: "apps" },
]);

const isRollupDisabled = computed(() => {
  if (analyticsStore.rollupRunning) return true;
  if (!analyticsStore.nextAllowedAt) return false;
  return new Date(analyticsStore.nextAllowedAt).getTime() > Date.now();
});

function buildParams() {
  return {
    from: fromDate.value ? new Date(`${fromDate.value}T00:00:00.000Z`).toISOString() : undefined,
    to: toDate.value ? new Date(`${toDate.value}T23:59:59.999Z`).toISOString() : undefined,
    tenantId: tenantId.value || undefined,
    appName: appName.value || undefined,
    eventName: eventName.value || undefined,
    featureCode: featureCode.value || undefined,
    pagePath: pagePath.value || undefined,
    limit: limit.value,
  };
}

async function fetchSummary() {
  try {
    analyticsStore.setFilters(buildParams());
    await analyticsStore.fetchSummary();
  } catch (err) {
    logger.error("Failed to load admin analytics summary", err);
  }
}

function applyFilters() {
  fetchSummary();
}

async function refreshRollups() {
  try {
    await analyticsStore.runRollup(30);
    await fetchSummary();
  } catch (err) {
    logger.error("Failed to run analytics rollup", err);
  }
}

onMounted(fetchSummary);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-end md:flex-wrap md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Analytics</h1>
          <p class="mt-[0.4rem]">Product usage across Merchant Dashboard and Customer Storefront.</p>
        </div>
        <div class="flex flex-col gap-[1rem] sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <input
            v-model="fromDate"
            type="date"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          />
          <input
            v-model="toDate"
            type="date"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          />
          <select v-model="appName" class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]">
            <option v-for="option in appNameOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <input
            v-model="tenantId"
            type="text"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Tenant ID"
            @keyup.enter="applyFilters"
          />
          <input
            v-model="featureCode"
            type="text"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Feature code"
            @keyup.enter="applyFilters"
          />
          <input
            v-model="pagePath"
            type="text"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Page path"
            @keyup.enter="applyFilters"
          />
          <select v-model.number="limit" class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]">
            <option :value="10">10 rows</option>
            <option :value="25">25 rows</option>
            <option :value="50">50 rows</option>
            <option :value="100">100 rows</option>
          </select>
          <button class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white" @click="applyFilters">
            Filter
          </button>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-[1rem] rounded-[8px] bg-white p-[2rem] shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p v-if="analyticsStore.rollupResult" class="text-[#000]">
          Last rollup: {{ analyticsStore.rollupResult.message || analyticsStore.rollupResult.status }}
          <span v-if="analyticsStore.rollupResult.rowsInserted !== undefined">
            ({{ analyticsStore.rollupResult.rowsInserted }} rows inserted)
          </span>
        </p>
        <p v-if="analyticsStore.rollupError" class="text-red-600">{{ analyticsStore.rollupError }}</p>
        <p v-if="isRollupDisabled && analyticsStore.nextAllowedAt" class="text-[1.2rem] text-dashboard_text_color">
          Next rollup available at {{ formatDate(analyticsStore.nextAllowedAt) }}.
        </p>
      </div>
      <button
        class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="isRollupDisabled"
        @click="refreshRollups"
      >
        {{ analyticsStore.rollupRunning ? "Refreshing…" : "Refresh rollups" }}
      </button>
    </section>

    <div v-if="analyticsStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ analyticsStore.error }}
    </div>

    <div class="grid grid-cols-1 gap-[1.6rem] md:grid-cols-2 xl:grid-cols-4">
      <div v-for="card in kpiCards" :key="card.label" class="rounded-[8px] bg-white p-[2rem] shadow-sm">
        <div class="mb-[1.6rem] flex h-[4rem] w-[4rem] items-center justify-center rounded-[8px] bg-primary/10 text-primary">
          <span class="material-symbols-outlined">{{ card.icon }}</span>
        </div>
        <p class="text-[1.3rem] font-[500] text-[#616161]">{{ card.label }}</p>
        <p class="mt-[0.6rem] text-[2.8rem] font-[700] text-[#000]">
          {{ analyticsStore.loading ? "..." : card.value }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-[1.6rem] xl:grid-cols-2">
      <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
        <h2 class="p-[2rem] pb-0 text-[1.8rem] font-[700] text-[#000]">App usage</h2>
        <div class="p-[2rem]">
          <DataTable
            :table-header="appUsageHeader"
            :table-data="analyticsStore.summary?.appUsage || []"
            :loading="analyticsStore.loading"
            :has-pagination="false"
          />
        </div>
      </section>

      <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
        <h2 class="p-[2rem] pb-0 text-[1.8rem] font-[700] text-[#000]">Event breakdown</h2>
        <div class="p-[2rem]">
          <DataTable
            :table-header="eventBreakdownHeader"
            :table-data="analyticsStore.summary?.eventBreakdown || []"
            :loading="analyticsStore.loading"
            :has-pagination="false"
          />
        </div>
      </section>
    </div>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <h2 class="p-[2rem] pb-0 text-[1.8rem] font-[700] text-[#000]">Top pages</h2>
      <div class="p-[2rem]">
        <DataTable
          :table-header="topPagesHeader"
          :table-data="analyticsStore.summary?.topPages || []"
          :loading="analyticsStore.loading"
          :has-pagination="false"
        />
      </div>
    </section>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <h2 class="p-[2rem] pb-0 text-[1.8rem] font-[700] text-[#000]">Top features</h2>
      <div class="p-[2rem]">
        <DataTable
          :table-header="topFeaturesHeader"
          :table-data="analyticsStore.summary?.topFeatures || []"
          :loading="analyticsStore.loading"
          :has-pagination="false"
        />
      </div>
    </section>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <h2 class="p-[2rem] pb-0 text-[1.8rem] font-[700] text-[#000]">Top tenants</h2>
      <div class="p-[2rem]">
        <DataTable
          :table-header="topTenantsHeader"
          :table-data="analyticsStore.summary?.topTenants || []"
          :loading="analyticsStore.loading"
          :has-pagination="false"
        />
      </div>
    </section>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <h2 class="p-[2rem] pb-0 text-[1.8rem] font-[700] text-[#000]">Recent activity</h2>
      <div class="p-[2rem]">
        <DataTable
          :table-header="recentEventsHeader"
          :table-data="analyticsStore.summary?.recentEvents || []"
          :loading="analyticsStore.loading"
          :has-pagination="false"
        />
      </div>
    </section>
  </div>
</template>
