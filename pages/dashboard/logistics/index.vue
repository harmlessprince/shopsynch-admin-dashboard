<script setup>
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-logistics",
});

const logisticsStore = useAdminLogisticsStore();

const activeProviders = computed(() =>
  logisticsStore.usageStats.filter((s) => s.shipmentCount > 0).length
);
const totalShipments = computed(() =>
  logisticsStore.usageStats.reduce((sum, s) => sum + (s.shipmentCount || 0), 0)
);
const totalWaybillFailures = computed(() =>
  logisticsStore.usageStats.reduce((sum, s) => sum + (s.waybillFailureCount || 0), 0)
);
const overallFailureRate = computed(() => {
  if (totalShipments.value === 0) return "0%";
  const rate = (totalWaybillFailures.value / totalShipments.value) * 100;
  return rate.toFixed(1) + "%";
});
const topProvider = computed(() => {
  if (!logisticsStore.usageStats.length) return "—";
  return [...logisticsStore.usageStats].sort((a, b) => b.shipmentCount - a.shipmentCount)[0]?.provider || "—";
});
const openAdjustments = computed(() => logisticsStore.adjustmentsTotal);

const overviewCards = computed(() => [
  { label: "Active Providers", value: activeProviders.value, icon: "business", color: "bg-blue-50 text-blue-600" },
  { label: "Total Shipments", value: totalShipments.value, icon: "local_shipping", color: "bg-purple-50 text-purple-600" },
  { label: "Waybill Failures", value: totalWaybillFailures.value, icon: "error_outline", color: "bg-red-50 text-red-600" },
  { label: "Failure Rate", value: overallFailureRate.value, icon: "percent", color: "bg-orange-50 text-orange-600" },
  { label: "Open Adjustments", value: openAdjustments.value, icon: "balance", color: "bg-yellow-50 text-yellow-600" },
  { label: "Top Provider", value: topProvider.value, icon: "emoji_events", color: "bg-green-50 text-green-600" },
]);

const quickLinks = [
  { label: "Shipments", icon: "inventory_2", to: "/dashboard/logistics/shipments" },
  { label: "Provider Usage", icon: "bar_chart", to: "/dashboard/logistics/shipments/usage" },
  { label: "Waybill Failures", icon: "error", to: "/dashboard/logistics/waybill-failures" },
  { label: "Weight Adjustments", icon: "scale", to: "/dashboard/logistics/weight-adjustments" },
  { label: "Provider Capabilities", icon: "tune", to: "/dashboard/logistics/provider-capabilities" },
];

onMounted(async () => {
  try {
    await Promise.all([
      logisticsStore.fetchUsageStats({}),
      logisticsStore.fetchWeightAdjustments({ status: "UNDER_REVIEW", limit: 1, page: 0 }),
    ]);
  } catch (err) {
    logger.error("Failed to load logistics overview", err);
  }
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <!-- Header -->
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h1 class="text-[2rem] font-[700] text-[#000]">Logistics Overview</h1>
      <p class="mt-[0.4rem]">Cross-tenant logistics health at a glance</p>
    </section>

    <!-- Stat cards -->
    <div v-if="logisticsStore.loading" class="grid grid-cols-2 gap-[1.6rem] md:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-[100px] animate-pulse rounded-[8px] bg-white shadow-sm" />
    </div>

    <div v-else class="grid grid-cols-2 gap-[1.6rem] md:grid-cols-3">
      <div
        v-for="card in overviewCards"
        :key="card.label"
        class="flex items-center gap-[1.2rem] rounded-[8px] bg-white p-[1.6rem] shadow-sm"
      >
        <div :class="[card.color, 'flex h-[48px] w-[48px] items-center justify-center rounded-full']">
          <span class="material-symbols-outlined text-[2.4rem]">{{ card.icon }}</span>
        </div>
        <div>
          <p class="text-[1.2rem]">{{ card.label }}</p>
          <p class="text-[2rem] font-[700] text-[#000]">{{ card.value }}</p>
        </div>
      </div>
    </div>

    <!-- Quick links -->
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h2 class="mb-[1.2rem] text-[1.6rem] font-[700] text-[#000]">Quick Navigation</h2>
      <div class="grid grid-cols-2 gap-[1.2rem] md:grid-cols-4">
        <NuxtLink
          v-for="link in quickLinks"
          :key="link.to"
          :to="link.to"
          class="flex flex-col items-center gap-[0.8rem] rounded-[8px] border border-slate-100 p-[1.6rem] text-center transition hover:border-primary hover:bg-blue-50"
        >
          <span class="material-symbols-outlined text-[3.2rem] text-primary">{{ link.icon }}</span>
          <span class="font-[600] text-[#000]">{{ link.label }}</span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
