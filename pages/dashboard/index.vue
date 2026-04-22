<script setup>
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-overview",
});

const adminDashboardStore = useAdminDashboardStore();

const cards = computed(() => [
  { label: "Total merchants", value: adminDashboardStore.overview?.totalMerchants ?? 0, icon: "storefront" },
  { label: "Active merchants", value: adminDashboardStore.overview?.activeMerchants ?? 0, icon: "task_alt" },
  { label: "Inactive merchants", value: adminDashboardStore.overview?.inactiveMerchants ?? 0, icon: "block" },
  { label: "Total users", value: adminDashboardStore.overview?.totalUsers ?? 0, icon: "group" },
]);

async function fetchOverview() {
  try {
    await adminDashboardStore.fetchOverview();
  } catch (err) {
    logger.error("Failed to load admin overview", err);
  }
}

onMounted(fetchOverview);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <div v-if="adminDashboardStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ adminDashboardStore.error }}
    </div>

    <div class="grid grid-cols-1 gap-[1.6rem] md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in cards"
        :key="card.label"
        class="rounded-[8px] bg-white p-[2rem] shadow-sm"
      >
        <div class="mb-[1.6rem] flex h-[4rem] w-[4rem] items-center justify-center rounded-[8px] bg-primary/10 text-primary">
          <span class="material-symbols-outlined">{{ card.icon }}</span>
        </div>
        <p class="text-[1.3rem] font-[500] text-[#616161]">{{ card.label }}</p>
        <p class="mt-[0.6rem] text-[2.8rem] font-[700] text-[#000]">
          {{ adminDashboardStore.loading ? "..." : card.value }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-[1.6rem] xl:grid-cols-2">
      <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
        <h2 class="text-[1.8rem] font-[700] text-[#000]">Merchant registration trend</h2>
        <div class="mt-[2rem] space-y-[1.2rem]">
          <div
            v-for="item in adminDashboardStore.merchantTrend"
            :key="item.yearMonth"
            class="flex items-center justify-between border-b border-slate-100 pb-[1rem]"
          >
            <span>{{ item.yearMonth }}</span>
            <span class="font-[700] text-[#000]">{{ item.count }}</span>
          </div>
          <p v-if="!adminDashboardStore.loading && adminDashboardStore.merchantTrend.length === 0" class="text-[#616161]">No trend data available.</p>
        </div>
      </section>

      <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
        <h2 class="text-[1.8rem] font-[700] text-[#000]">Compliance summary</h2>
        <div class="mt-[2rem] grid grid-cols-1 gap-[1.2rem] sm:grid-cols-2">
          <div
            v-for="(value, key) in adminDashboardStore.complianceSummary"
            :key="key"
            class="rounded-[8px] border border-slate-100 p-[1.4rem]"
          >
            <p class="capitalize text-[#616161]">{{ String(key).replaceAll('_', ' ') }}</p>
            <p class="mt-[0.4rem] text-[2.2rem] font-[700] text-[#000]">{{ value }}</p>
          </div>
          <p v-if="!adminDashboardStore.loading && !adminDashboardStore.complianceSummary" class="text-[#616161]">No compliance data available.</p>
        </div>
      </section>
    </div>
  </div>
</template>
