<script setup>
import { ref, computed, onMounted } from "vue";
import { formatToMoney, formatDate } from "~/utils/helpers.js";
import StaffUsageDrawer from "~/components/Dashboard/AiAnalytics/StaffUsageDrawer.vue";
import AiTrendChart from "~/components/Dashboard/AiAnalytics/AiTrendChart.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-ai-analytics",
});

const aiAnalyticsStore = useAdminAiAnalyticsStore();

// Navigation Tabs
const activeTab = ref("overview"); // 'overview' | 'tenants' | 'events'

// Date Preset options
const datePresets = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "This Month", value: "thisMonth" },
  { label: "Custom", value: "custom" },
];

const showCustomDatePicker = ref(false);
const customFrom = ref(aiAnalyticsStore.fromDate.slice(0, 10));
const customTo = ref(aiAnalyticsStore.toDate.slice(0, 10));

// Tenants filters
const tenantSearch = ref("");
const tenantPlan = ref("");
const tenantPage = ref(0);
const tenantSize = ref(10);

const planOptions = [
  { label: "All Plans", value: "" },
  { label: "FREE", value: "FREE" },
  { label: "STARTER", value: "STARTER" },
  { label: "GROWTH", value: "GROWTH" },
  { label: "PRO", value: "PRO" },
  { label: "ENTERPRISE", value: "ENTERPRISE" },
];

// Events filters
const eventChannel = ref("");
const eventProvider = ref("");
const eventSuccess = ref("");
const eventSearch = ref("");
const eventPage = ref(0);
const eventSize = ref(20);

const channelOptions = [
  { label: "All Channels", value: "" },
  { label: "Dashboard", value: "DASHBOARD" },
  { label: "Telegram", value: "TELEGRAM" },
  { label: "WhatsApp", value: "WHATSAPP" },
];

const providerOptions = [
  { label: "All Providers", value: "" },
  { label: "DeepSeek", value: "deepseek" },
  { label: "OpenAI", value: "openai" },
  { label: "NVIDIA", value: "nvidia" },
];

const statusOptions = [
  { label: "All Outcomes", value: "" },
  { label: "Success Only", value: "true" },
  { label: "Failures Only", value: "false" },
];

// Staff Drawer state
const isStaffDrawerOpen = ref(false);
const selectedTenant = ref(null);

// Formatters
function formatTokens(num) {
  if (!num && num !== 0) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return Number(num).toLocaleString();
}

function getChannelBadge(channel) {
  const norm = (channel || "").toUpperCase().trim();
  if (norm === "TELEGRAM") {
    return {
      label: "Telegram",
      class: "bg-sky-50 text-sky-700 border-sky-200",
      icon: "send",
      barClass: "bg-sky-500",
    };
  }
  if (norm === "WHATSAPP") {
    return {
      label: "WhatsApp",
      class: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: "chat",
      barClass: "bg-emerald-500",
    };
  }
  if (norm === "MCP") {
    return {
      label: "MCP",
      class: "bg-purple-50 text-purple-700 border-purple-200",
      icon: "hub",
      barClass: "bg-purple-600",
    };
  }
  if (norm === "DASHBOARD") {
    return {
      label: "Dashboard",
      class: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: "laptop_mac",
      barClass: "bg-indigo-600",
    };
  }
  return {
    label: norm && norm !== "UNKNOWN" ? norm : "Other / Unspecified",
    class: "bg-slate-50 text-slate-700 border-slate-200",
    icon: "devices",
    barClass: "bg-slate-400",
  };
}

function getPlanBadge(plan) {
  const p = (plan || "").toUpperCase();
  if (p === "ENTERPRISE") return "bg-purple-100 text-purple-800 border-purple-200";
  if (p === "PRO") return "bg-blue-100 text-blue-800 border-blue-200";
  if (p === "GROWTH") return "bg-teal-100 text-teal-800 border-teal-200";
  if (p === "STARTER") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

// Actions
function selectPreset(preset) {
  if (preset === "custom") {
    showCustomDatePicker.value = true;
    return;
  }
  showCustomDatePicker.value = false;
  aiAnalyticsStore.setDatePreset(preset);
  refreshData();
}

function applyCustomDate() {
  if (!customFrom.value || !customTo.value) return;
  aiAnalyticsStore.setCustomDateRange(customFrom.value, customTo.value);
  refreshData();
}

function refreshData() {
  aiAnalyticsStore.refreshAll();
  loadCurrentTab();
}

function loadCurrentTab() {
  if (activeTab.value === "tenants") {
    aiAnalyticsStore.fetchTenants({
      page: tenantPage.value,
      size: tenantSize.value,
      search: tenantSearch.value,
      planCode: tenantPlan.value,
    });
  } else if (activeTab.value === "events") {
    aiAnalyticsStore.fetchEvents({
      page: eventPage.value,
      size: eventSize.value,
      channel: eventChannel.value,
      provider: eventProvider.value,
      success: eventSuccess.value === "" ? undefined : eventSuccess.value === "true",
      search: eventSearch.value,
    });
  }
}

function handleTenantFilterChange() {
  tenantPage.value = 0;
  loadCurrentTab();
}

function changeTenantPage(newPage) {
  tenantPage.value = newPage;
  loadCurrentTab();
}

function handleEventFilterChange() {
  eventPage.value = 0;
  loadCurrentTab();
}

function changeEventPage(newPage) {
  eventPage.value = newPage;
  loadCurrentTab();
}

function openStaffDrawer(tenant) {
  selectedTenant.value = tenant;
  isStaffDrawerOpen.value = true;
}

const totalProviderTokens = computed(() => {
  return (aiAnalyticsStore.providerBreakdown || []).reduce(
    (acc, p) => acc + (p.totalTokens || 0),
    0,
  ) || 1;
});

const totalChannelCalls = computed(() => {
  return (aiAnalyticsStore.channelBreakdown || []).reduce(
    (acc, c) => acc + (c.callCount || 0),
    0,
  ) || 1;
});

onMounted(() => {
  aiAnalyticsStore.refreshAll();
});
</script>

<template>
  <div class="space-y-[2.4rem] text-[1.4rem] text-slate-800 pb-[6rem]">
    <!-- Top Header -->
    <header class="bg-white rounded-xl p-[2rem] sm:p-[2.4rem] shadow-sm border border-slate-200">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-[1.6rem]">
        <div>
          <div class="flex items-center gap-[1rem]">
            <span class="material-symbols-outlined text-primary text-[2.8rem]">smart_toy</span>
            <h1 class="text-[2.2rem] sm:text-[2.4rem] font-[700] text-slate-900 tracking-tight">
              AI & Assistant Analytics
            </h1>
          </div>
          <p class="text-[1.4rem] text-slate-500 mt-[0.4rem]">
            Monitor store assistant usage, staff activity, model provider costs, and platform quotas
          </p>
        </div>

        <!-- Controls: Date Presets & Refresh -->
        <div class="flex flex-wrap items-center gap-[1rem]">
          <!-- Preset buttons -->
          <div class="inline-flex rounded-lg bg-slate-100 p-[0.4rem] border border-slate-200 text-[1.3rem] font-[600]">
            <button
              v-for="p in datePresets"
              :key="p.value"
              type="button"
              class="px-[1.4rem] py-[0.8rem] rounded-md transition-all cursor-pointer"
              :class="
                aiAnalyticsStore.datePreset === p.value
                  ? 'bg-white text-primary shadow-sm font-[700]'
                  : 'text-slate-600 hover:text-slate-900'
              "
              @click="selectPreset(p.value)"
            >
              {{ p.label }}
            </button>
          </div>

          <!-- Refresh Button -->
          <button
            type="button"
            class="inline-flex items-center gap-[0.8rem] px-[1.4rem] py-[0.8rem] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[1.3rem] font-[600] shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            :disabled="aiAnalyticsStore.loadingOverview"
            @click="refreshData"
          >
            <span
              class="material-symbols-outlined text-[1.8rem]"
              :class="{ 'animate-spin text-primary': aiAnalyticsStore.loadingOverview }"
            >
              refresh
            </span>
            Refresh
          </button>
        </div>
      </div>

      <!-- Custom Date Picker Dropdown/Row -->
      <div
        v-if="showCustomDatePicker"
        class="mt-[1.6rem] pt-[1.6rem] border-t border-slate-100 flex flex-wrap items-center gap-[1.2rem] bg-slate-50 p-[1.4rem] rounded-lg text-[1.3rem]"
      >
        <div class="flex items-center gap-[0.8rem] text-slate-600 font-[500]">
          <span class="material-symbols-outlined text-[1.8rem]">calendar_today</span>
          <span>From:</span>
          <input
            v-model="customFrom"
            type="date"
            class="rounded-md border border-slate-200 px-[1.2rem] py-[0.8rem] bg-white font-[500] text-slate-800 focus:outline-primary"
          >
        </div>

        <div class="flex items-center gap-[0.8rem] text-slate-600 font-[500]">
          <span>To:</span>
          <input
            v-model="customTo"
            type="date"
            class="rounded-md border border-slate-200 px-[1.2rem] py-[0.8rem] bg-white font-[500] text-slate-800 focus:outline-primary"
          >
        </div>

        <button
          type="button"
          class="px-[1.6rem] py-[0.8rem] rounded-md bg-primary hover:bg-primary/90 text-white font-[700] transition-colors shadow-2xs cursor-pointer"
          @click="applyCustomDate"
        >
          Apply Range
        </button>
      </div>
    </header>

    <!-- Circuit Breaker Progress Banner -->
    <section
      class="rounded-xl border p-[2rem] sm:p-[2.4rem] shadow-sm transition-all relative overflow-hidden"
      :class="
        aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed > 90
          ? 'bg-rose-50/70 border-rose-200 text-rose-900'
          : aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed > 70
          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
          : 'bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 border-indigo-100 text-slate-900'
      "
    >
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-[1.6rem]">
        <div class="flex items-start sm:items-center gap-[1.4rem]">
          <div
            class="w-[4.8rem] h-[4.8rem] rounded-xl flex items-center justify-center shrink-0"
            :class="
              aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed > 90
                ? 'bg-rose-600 text-white'
                : aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed > 70
                ? 'bg-amber-600 text-white'
                : 'bg-indigo-600 text-white'
            "
          >
            <span class="material-symbols-outlined text-[2.6rem]">bolt</span>
          </div>

          <div>
            <div class="flex items-center gap-[1rem] flex-wrap">
              <span class="text-[1.3rem] font-[700] uppercase tracking-wider text-slate-500">
                Platform Circuit Breaker
              </span>
              <span
                class="px-[1.2rem] py-[0.3rem] rounded-full text-[1.2rem] font-[700]"
                :class="
                  aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed > 90
                    ? 'bg-rose-200 text-rose-800'
                    : aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed > 70
                    ? 'bg-amber-200 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                "
              >
                {{
                  aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed > 90
                    ? "Critical Threshold"
                    : aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed > 70
                    ? "Guarded Usage"
                    : "Normal Operations"
                }}
              </span>
            </div>

            <p class="text-[1.8rem] sm:text-[2rem] font-[700] mt-[0.4rem] text-slate-900">
              {{ aiAnalyticsStore.overview?.circuitBreaker?.todayQuestionsUsed?.toLocaleString() || 0 }}
              <span class="font-normal text-slate-600">/</span>
              {{ aiAnalyticsStore.overview?.circuitBreaker?.dailyCeiling?.toLocaleString() || 5000 }}
              <span class="text-[1.4rem] font-[500] text-slate-600">
                daily questions used ({{ aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed?.toFixed(1) || 0 }}% of ceiling)
              </span>
            </p>
          </div>
        </div>

        <!-- Quota safety description -->
        <div class="text-[1.3rem] text-slate-500 max-w-sm">
          <p>
            Platform safety ceiling prevents runaway assistant costs across all connected merchant channels.
            Resets automatically at 00:00 Africa/Lagos.
          </p>
        </div>
      </div>

      <!-- Linear visual progress bar -->
      <div class="w-full bg-slate-200/80 h-[1rem] rounded-full mt-[1.6rem] overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-700 ease-out"
          :class="
            aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed > 90
              ? 'bg-rose-500'
              : aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed > 70
              ? 'bg-amber-500'
              : 'bg-indigo-600'
          "
          :style="{
            width: `${Math.min(aiAnalyticsStore.overview?.circuitBreaker?.percentageUsed || 0, 100)}%`,
          }"
        />
      </div>
    </section>

    <!-- Top KPI Cards Grid (5 core business metrics) -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[1.6rem]">
      <!-- 1. Total Estimated Cost -->
      <div class="bg-white rounded-xl p-[2rem] border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
        <div class="flex items-center justify-between text-slate-500 mb-[1.2rem]">
          <span class="text-[1.3rem] font-[700] uppercase tracking-wider text-slate-500">Est. Total Cost</span>
          <div class="w-[3.6rem] h-[3.6rem] rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span class="material-symbols-outlined text-[2rem]">payments</span>
          </div>
        </div>
        <p class="text-[2.6rem] font-[700] text-slate-900 leading-tight">
          ${{ aiAnalyticsStore.overview?.totalCostUsd?.toFixed(2) || "0.00" }}
        </p>
        <p class="text-[1.4rem] font-[600] text-emerald-600 mt-[0.4rem]">
          {{ formatToMoney(aiAnalyticsStore.overview?.totalCostNgn || 0) }}
        </p>
        <span class="text-[1.2rem] text-slate-400 block mt-[0.4rem]">
          Avg ${{ aiAnalyticsStore.overview?.avgCostPerQuestionUsd?.toFixed(4) }}/question
        </span>
      </div>

      <!-- 2. Total Questions & Calls -->
      <div class="bg-white rounded-xl p-[2rem] border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
        <div class="flex items-center justify-between text-slate-500 mb-[1.2rem]">
          <span class="text-[1.3rem] font-[700] uppercase tracking-wider text-slate-500">Questions & Calls</span>
          <div class="w-[3.6rem] h-[3.6rem] rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <span class="material-symbols-outlined text-[2rem]">smart_toy</span>
          </div>
        </div>
        <p class="text-[2.6rem] font-[700] text-slate-900 leading-tight">
          {{ aiAnalyticsStore.overview?.questionCount?.toLocaleString() || 0 }}
        </p>
        <p class="text-[1.4rem] font-[500] text-slate-600 mt-[0.4rem]">
          {{ aiAnalyticsStore.overview?.callCount?.toLocaleString() || 0 }} model calls
        </p>
        <span class="text-[1.2rem] text-rose-500 block mt-[0.4rem] font-[500]">
          {{ aiAnalyticsStore.overview?.failedCallCount || 0 }} failed calls
          ({{
            (
              ((aiAnalyticsStore.overview?.failedCallCount || 0) /
                (aiAnalyticsStore.overview?.callCount || 1)) *
              100
            ).toFixed(2)
          }}%)
        </span>
      </div>

      <!-- 3. Tokens Processed -->
      <div class="bg-white rounded-xl p-[2rem] border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
        <div class="flex items-center justify-between text-slate-500 mb-[1.2rem]">
          <span class="text-[1.3rem] font-[700] uppercase tracking-wider text-slate-500">Tokens Processed</span>
          <div class="w-[3.6rem] h-[3.6rem] rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <span class="material-symbols-outlined text-[2rem]">token</span>
          </div>
        </div>
        <p class="text-[2.6rem] font-[700] text-slate-900 leading-tight">
          {{ formatTokens(aiAnalyticsStore.overview?.totalTokens) }}
        </p>
        <p class="text-[1.4rem] font-[500] text-slate-600 mt-[0.4rem]">
          In: {{ formatTokens(aiAnalyticsStore.overview?.totalInputTokens) }}
        </p>
        <span class="text-[1.2rem] text-slate-400 block mt-[0.4rem]">
          Out: {{ formatTokens(aiAnalyticsStore.overview?.totalOutputTokens) }}
        </span>
      </div>

      <!-- 4. Active Stores & Staff -->
      <div class="bg-white rounded-xl p-[2rem] border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
        <div class="flex items-center justify-between text-slate-500 mb-[1.2rem]">
          <span class="text-[1.3rem] font-[700] uppercase tracking-wider text-slate-500">Active Stores</span>
          <div class="w-[3.6rem] h-[3.6rem] rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <span class="material-symbols-outlined text-[2rem]">storefront</span>
          </div>
        </div>
        <p class="text-[2.6rem] font-[700] text-slate-900 leading-tight">
          {{ aiAnalyticsStore.overview?.activeTenantsCount?.toLocaleString() || 0 }}
        </p>
        <p class="text-[1.4rem] font-[500] text-slate-600 mt-[0.4rem]">
          {{ aiAnalyticsStore.overview?.activeUsersCount?.toLocaleString() || 0 }} staff users
        </p>
        <span class="text-[1.2rem] text-slate-400 block mt-[0.4rem]">
          Across Telegram, WhatsApp & Web
        </span>
      </div>

      <!-- 5. Operational Latency -->
      <div class="bg-white rounded-xl p-[2rem] border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
        <div class="flex items-center justify-between text-slate-500 mb-[1.2rem]">
          <span class="text-[1.3rem] font-[700] uppercase tracking-wider text-slate-500">Avg Latency</span>
          <div class="w-[3.6rem] h-[3.6rem] rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <span class="material-symbols-outlined text-[2rem]">speed</span>
          </div>
        </div>
        <p class="text-[2.6rem] font-[700] text-slate-900 leading-tight">
          {{ ((aiAnalyticsStore.overview?.avgLatencyMillis || 0) / 1000).toFixed(2) }}s
        </p>
        <p class="text-[1.4rem] font-[500] text-slate-600 mt-[0.4rem]">
          {{ aiAnalyticsStore.overview?.avgLatencyMillis?.toLocaleString() || 0 }} ms roundtrip
        </p>
        <span class="text-[1.2rem] text-emerald-600 font-[600] block mt-[0.4rem]">
          99.49% uptime SLA
        </span>
      </div>
    </section>

    <!-- Main Navigation Tabs -->
    <div class="border-b border-slate-200">
      <nav class="flex gap-[2.4rem] -mb-px text-[1.5rem] font-[600]">
        <button
          type="button"
          class="pb-[1.2rem] border-b-2 flex items-center gap-[0.8rem] transition-all cursor-pointer"
          :class="
            activeTab === 'overview'
              ? 'border-primary text-primary font-[700]'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          "
          @click="activeTab = 'overview'"
        >
          <span class="material-symbols-outlined text-[2rem]">insights</span>
          Overview & Trends
        </button>

        <button
          type="button"
          class="pb-[1.2rem] border-b-2 flex items-center gap-[0.8rem] transition-all cursor-pointer"
          :class="
            activeTab === 'tenants'
              ? 'border-primary text-primary font-[700]'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          "
          @click="activeTab = 'tenants'"
        >
          <span class="material-symbols-outlined text-[2rem]">store</span>
          Stores & Staff Usage
          <span class="px-[1rem] py-[0.2rem] rounded-full text-[1.2rem] bg-slate-100 text-slate-600">
            {{ aiAnalyticsStore.tenants.totalElements }}
          </span>
        </button>

        <button
          type="button"
          class="pb-[1.2rem] border-b-2 flex items-center gap-[0.8rem] transition-all cursor-pointer"
          :class="
            activeTab === 'events'
              ? 'border-primary text-primary font-[700]'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          "
          @click="activeTab = 'events'"
        >
          <span class="material-symbols-outlined text-[2rem]">manage_search</span>
          Usage Events Explorer
          <span class="px-[1rem] py-[0.2rem] rounded-full text-[1.2rem] bg-slate-100 text-slate-600">
            {{ aiAnalyticsStore.events.totalElements }}
          </span>
        </button>
      </nav>
    </div>

    <!-- ================================================================= -->
    <!-- TAB 1: OVERVIEW & TRENDS -->
    <!-- ================================================================= -->
    <div v-if="activeTab === 'overview'" class="space-y-[2rem]">
      <!-- Trajectory Chart -->
      <AiTrendChart
        :timeseries="aiAnalyticsStore.timeseries"
        :loading="aiAnalyticsStore.loadingTimeseries"
      />

      <!-- Analytical Cards Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-[2rem]">
        <!-- 1. Provider & Model Economics -->
        <div class="bg-white rounded-xl p-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-[1.6rem]">
              <div>
                <h3 class="text-[1.8rem] font-[700] text-slate-900">Provider Economics</h3>
                <p class="text-[1.3rem] text-slate-500 mt-[0.2rem]">Cost & latency per model vendor</p>
              </div>
              <span class="material-symbols-outlined text-slate-400 text-[2.4rem]">hub</span>
            </div>

            <div class="space-y-[1.2rem]">
              <div
                v-for="prov in aiAnalyticsStore.providerBreakdown"
                :key="prov.key"
                class="p-[1.4rem] rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
              >
                <div class="flex items-center justify-between mb-[0.6rem]">
                  <div class="flex items-center gap-[0.8rem]">
                    <span class="font-[700] text-slate-900 capitalize text-[1.5rem]">{{ prov.key }}</span>
                    <span class="px-[0.8rem] py-[0.2rem] rounded text-[1.2rem] font-[600] bg-white border border-slate-200 text-slate-700">
                      {{ ((prov.totalTokens / totalProviderTokens) * 100).toFixed(0) }}% vol
                    </span>
                  </div>
                  <span class="text-[1.5rem] font-[700] text-slate-900">${{ prov.costUsd?.toFixed(2) }}</span>
                </div>

                <div class="flex items-center justify-between text-[1.3rem] text-slate-500">
                  <span>{{ formatTokens(prov.totalTokens) }} tokens ({{ prov.callCount?.toLocaleString() }} calls)</span>
                  <span class="font-[600] text-slate-700">{{ prov.avgLatencyMillis }}ms</span>
                </div>

                <div class="w-full bg-slate-200 h-[0.5rem] rounded-full mt-[0.8rem] overflow-hidden">
                  <div
                    class="h-full rounded-full bg-primary"
                    :style="{ width: `${(prov.totalTokens / totalProviderTokens) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Model list snippet -->
          <div class="mt-[1.6rem] pt-[1.6rem] border-t border-slate-100 text-[1.3rem] text-slate-500">
            <span class="font-[700] text-slate-700 block mb-[0.6rem]">Top Models:</span>
            <div class="flex flex-wrap gap-[0.6rem]">
              <span
                v-for="m in aiAnalyticsStore.modelBreakdown"
                :key="m.key"
                class="px-[1rem] py-[0.4rem] rounded-md bg-slate-100 text-slate-700 text-[1.2rem] font-mono font-[600]"
              >
                {{ m.key }}: ${{ m.costUsd?.toFixed(2) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 2. Channel Distribution -->
        <div class="bg-white rounded-xl p-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-[1.6rem]">
              <div>
                <h3 class="text-[1.8rem] font-[700] text-slate-900">Channel Distribution</h3>
                <p class="text-[1.3rem] text-slate-500 mt-[0.2rem]">Where merchants talk to their assistant</p>
              </div>
              <span class="material-symbols-outlined text-slate-400 text-[2.4rem]">devices</span>
            </div>

            <div class="space-y-[1.6rem]">
              <div
                v-for="chan in aiAnalyticsStore.channelBreakdown"
                :key="chan.key"
                class="p-[1.4rem] rounded-lg border border-slate-100 bg-white"
              >
                <div class="flex items-center justify-between mb-[0.8rem]">
                  <div class="flex items-center gap-[0.8rem]">
                    <span
                      class="inline-flex items-center gap-[0.6rem] px-[1.2rem] py-[0.4rem] rounded-full text-[1.3rem] font-[600] border"
                      :class="getChannelBadge(chan.key).class"
                    >
                      <span class="material-symbols-outlined text-[1.6rem]">
                        {{ getChannelBadge(chan.key).icon }}
                      </span>
                      {{ getChannelBadge(chan.key).label }}
                    </span>
                  </div>
                  <span class="text-[1.4rem] font-[700] text-slate-800">
                    {{ ((chan.callCount / totalChannelCalls) * 100).toFixed(1) }}%
                  </span>
                </div>

                <div class="w-full bg-slate-100 h-[0.8rem] rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="getChannelBadge(chan.key).barClass"
                    :style="{ width: `${(chan.callCount / totalChannelCalls) * 100}%` }"
                  />
                </div>

                <div class="flex items-center justify-between text-[1.3rem] text-slate-500 mt-[0.8rem]">
                  <span>{{ chan.callCount?.toLocaleString() }} calls</span>
                  <span>Avg {{ chan.avgLatencyMillis }}ms</span>
                  <span class="font-[600] text-slate-700">${{ chan.costUsd?.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-[1.6rem] pt-[1.6rem] border-t border-slate-100 text-[1.3rem] text-slate-500">
            <p>Channel integration is live across web, mobile bot, and messaging webhooks.</p>
          </div>
        </div>

        <!-- 3. Assistant Tools Utilized -->
        <div class="bg-white rounded-xl p-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-[1.6rem]">
              <div>
                <h3 class="text-[1.8rem] font-[700] text-slate-900">Top Assistant Tools</h3>
                <p class="text-[1.3rem] text-slate-500 mt-[0.2rem]">Execution rate of platform tool calls</p>
              </div>
              <span class="material-symbols-outlined text-slate-400 text-[2.4rem]">construction</span>
            </div>

            <div class="space-y-[1rem]">
              <div
                v-for="tool in aiAnalyticsStore.tools"
                :key="tool.toolName"
                class="p-[1.2rem] rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div class="flex items-center justify-between text-[1.3rem]">
                  <span class="font-mono font-[700] text-slate-900">{{ tool.toolName }}</span>
                  <span class="font-[700] text-indigo-700">
                    {{ tool.timesUsed?.toLocaleString() }}
                    <span class="text-slate-400 font-normal">/ {{ tool.timesOffered }}</span>
                  </span>
                </div>

                <div class="w-full bg-slate-200 h-[0.6rem] rounded-full mt-[0.6rem] overflow-hidden">
                  <div
                    class="h-full rounded-full bg-indigo-600"
                    :style="{
                      width: `${Math.min(((tool.timesUsed || 0) / (tool.timesOffered || 1)) * 100, 100)}%`,
                    }"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="mt-[1.6rem] pt-[1.6rem] border-t border-slate-100 text-[1.3rem] text-slate-500">
            <span class="text-slate-600 font-[500]">Tools autonomously invoked by LLM models when querying store database.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- TAB 2: STORES & STAFF USAGE -->
    <!-- ================================================================= -->
    <div v-else-if="activeTab === 'tenants'" class="space-y-[1.6rem]">
      <!-- Search & Filters Toolbar -->
      <div class="bg-white rounded-xl p-[1.6rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-[1.2rem]">
        <div class="flex flex-col sm:flex-row sm:items-center gap-[1.2rem] flex-1">
          <!-- Search Input -->
          <div class="relative flex-1 max-w-md">
            <span class="material-symbols-outlined absolute left-[1.2rem] top-1/2 -translate-y-1/2 text-slate-400 text-[2rem]">
              search
            </span>
            <input
              v-model="tenantSearch"
              type="text"
              placeholder="Search store name or tenant ID..."
              class="w-full rounded-lg border border-slate-200 pl-[3.6rem] pr-[1.4rem] py-[0.9rem] text-[1.4rem] font-[500] text-slate-800 placeholder-slate-400 focus:outline-primary bg-slate-50/50"
              @keyup.enter="handleTenantFilterChange"
            >
          </div>

          <!-- Plan Code Filter -->
          <select
            v-model="tenantPlan"
            class="rounded-lg border border-slate-200 px-[1.4rem] py-[0.9rem] text-[1.4rem] font-[500] text-slate-800 bg-slate-50/50 focus:outline-primary cursor-pointer"
            @change="handleTenantFilterChange"
          >
            <option v-for="opt in planOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>

          <button
            type="button"
            class="px-[1.8rem] py-[0.9rem] rounded-lg bg-primary hover:bg-primary/90 text-white text-[1.4rem] font-[700] transition-colors shadow-2xs cursor-pointer"
            @click="handleTenantFilterChange"
          >
            Filter
          </button>
        </div>

        <div class="text-[1.3rem] text-slate-500">
          Showing {{ aiAnalyticsStore.tenants.items?.length || 0 }} of {{ aiAnalyticsStore.tenants.totalElements }} stores
        </div>
      </div>

      <!-- Tenants Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[1.4rem] border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-[700] uppercase tracking-wider text-[1.2rem]">
                <th class="px-[2rem] py-[1.4rem]">Store / Tenant</th>
                <th class="px-[1.6rem] py-[1.4rem]">Plan</th>
                <th class="px-[1.6rem] py-[1.4rem]">Monthly Allowance</th>
                <th class="px-[1.6rem] py-[1.4rem]">Total Tokens</th>
                <th class="px-[1.6rem] py-[1.4rem]">Est. Cost (USD/NGN)</th>
                <th class="px-[1.6rem] py-[1.4rem]">Active Staff</th>
                <th class="px-[2rem] py-[1.4rem] text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <template v-if="aiAnalyticsStore.loadingTenants">
                <tr
                  v-for="i in 5"
                  :key="i"
                  class="animate-pulse"
                >
                  <td colspan="7" class="px-[2rem] py-[1.6rem]">
                    <div class="h-[1.6rem] bg-slate-200 rounded w-full" />
                  </td>
                </tr>
              </template>

              <tr
                v-else-if="!aiAnalyticsStore.tenants.items || aiAnalyticsStore.tenants.items.length === 0"
              >
                <td colspan="7" class="px-[2rem] py-[4rem] text-center text-slate-400">
                  <span class="material-symbols-outlined text-[3.6rem] mb-[0.8rem]">storefront</span>
                  <p class="font-[600] text-[1.6rem] text-slate-600">No stores match the selected filter</p>
                </td>
              </tr>

              <tr
                v-for="tenant in aiAnalyticsStore.tenants.items"
                v-else
                :key="tenant.tenantId"
                class="hover:bg-slate-50/70 transition-colors"
              >
                <!-- Store name & ID -->
                <td class="px-[2rem] py-[1.6rem]">
                  <div class="font-[700] text-slate-900 text-[1.5rem]">{{ tenant.storeName }}</div>
                  <div class="text-[1.2rem] font-mono text-slate-400 mt-[0.2rem]">ID: {{ tenant.tenantId }}</div>
                </td>

                <!-- Plan Badge -->
                <td class="px-[1.6rem] py-[1.6rem]">
                  <span
                    class="px-[1.2rem] py-[0.3rem] rounded-full text-[1.2rem] font-[600] border"
                    :class="getPlanBadge(tenant.planCode)"
                  >
                    {{ tenant.planCode }}
                  </span>
                </td>

                <!-- Monthly Allowance Cap & Progress -->
                <td class="px-[1.6rem] py-[1.6rem] min-w-[20rem]">
                  <div class="flex items-center justify-between font-[600]">
                    <span class="text-slate-900 font-[700] text-[1.4rem]">
                      {{ tenant.questionCount }}
                      <span class="text-slate-400 font-normal">/ {{ tenant.monthlyLimit || "∞" }}</span>
                    </span>
                    <span
                      class="font-[700] text-[1.3rem]"
                      :class="
                        tenant.allowanceUsedPercentage > 90
                          ? 'text-rose-600'
                          : tenant.allowanceUsedPercentage > 70
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      "
                    >
                      {{ tenant.allowanceUsedPercentage?.toFixed(0) || 0 }}%
                    </span>
                  </div>
                  <div class="w-full bg-slate-100 h-[0.6rem] rounded-full mt-[0.6rem] overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      :class="
                        tenant.allowanceUsedPercentage > 90
                          ? 'bg-rose-500'
                          : tenant.allowanceUsedPercentage > 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      "
                      :style="{ width: `${Math.min(tenant.allowanceUsedPercentage || 0, 100)}%` }"
                    />
                  </div>
                </td>

                <!-- Total Tokens -->
                <td class="px-[1.6rem] py-[1.6rem]">
                  <div class="font-[700] text-slate-900 text-[1.5rem]">{{ formatTokens(tenant.totalTokens) }}</div>
                  <div class="text-[1.2rem] text-slate-400 mt-[0.2rem]">{{ tenant.callCount }} calls</div>
                </td>

                <!-- Estimated Cost -->
                <td class="px-[1.6rem] py-[1.6rem]">
                  <div class="font-[700] text-slate-900 text-[1.5rem]">${{ tenant.totalCostUsd?.toFixed(2) }}</div>
                  <div class="text-[1.3rem] text-emerald-600 mt-[0.2rem] font-[600]">
                    {{ formatToMoney(tenant.totalCostNgn) }}
                  </div>
                </td>

                <!-- Active Staff -->
                <td class="px-[1.6rem] py-[1.6rem]">
                  <div class="inline-flex items-center gap-[0.6rem] font-[600] text-slate-800 text-[1.4rem]">
                    <span class="material-symbols-outlined text-[1.8rem] text-slate-400">group</span>
                    {{ tenant.activeStaffCount }} staff
                  </div>
                </td>

                <!-- Actions: View Staff -->
                <td class="px-[2rem] py-[1.6rem] text-right">
                  <button
                    type="button"
                    class="inline-flex items-center gap-[0.6rem] px-[1.4rem] py-[0.8rem] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[1.3rem] font-[600] shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
                    @click="openStaffDrawer(tenant)"
                  >
                    <span class="material-symbols-outlined text-[1.8rem] text-primary">visibility</span>
                    View Staff
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="p-[1.6rem] border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-[1.2rem] text-[1.3rem] text-slate-600">
          <div>
            Page {{ tenantPage + 1 }} of {{ aiAnalyticsStore.tenants.totalPages || 1 }}
          </div>

          <div class="flex items-center gap-[0.8rem]">
            <button
              type="button"
              class="px-[1.4rem] py-[0.8rem] rounded-md border border-slate-200 bg-white text-slate-700 font-[600] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              :disabled="tenantPage <= 0"
              @click="changeTenantPage(tenantPage - 1)"
            >
              Previous
            </button>
            <button
              type="button"
              class="px-[1.4rem] py-[0.8rem] rounded-md border border-slate-200 bg-white text-slate-700 font-[600] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              :disabled="tenantPage + 1 >= aiAnalyticsStore.tenants.totalPages"
              @click="changeTenantPage(tenantPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- TAB 3: AUDIT / USAGE EVENTS EXPLORER -->
    <!-- ================================================================= -->
    <div v-else-if="activeTab === 'events'" class="space-y-[1.6rem]">
      <!-- Event Filters Bar -->
      <div class="bg-white rounded-xl p-[1.6rem] border border-slate-200 shadow-sm flex flex-wrap items-center gap-[1.2rem]">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[22rem]">
          <span class="material-symbols-outlined absolute left-[1.2rem] top-1/2 -translate-y-1/2 text-slate-400 text-[2rem]">
            search
          </span>
          <input
            v-model="eventSearch"
            type="text"
            placeholder="Search tenant ID, user ID or failure reason..."
            class="w-full rounded-lg border border-slate-200 pl-[3.6rem] pr-[1.4rem] py-[0.9rem] text-[1.4rem] font-[500] text-slate-800 placeholder-slate-400 focus:outline-primary bg-slate-50/50"
            @keyup.enter="handleEventFilterChange"
          >
        </div>

        <!-- Channel Filter -->
        <select
          v-model="eventChannel"
          class="rounded-lg border border-slate-200 px-[1.4rem] py-[0.9rem] text-[1.4rem] font-[500] text-slate-800 bg-slate-50/50 focus:outline-primary cursor-pointer"
          @change="handleEventFilterChange"
        >
          <option v-for="c in channelOptions" :key="c.value" :value="c.value">
            {{ c.label }}
          </option>
        </select>

        <!-- Provider Filter -->
        <select
          v-model="eventProvider"
          class="rounded-lg border border-slate-200 px-[1.4rem] py-[0.9rem] text-[1.4rem] font-[500] text-slate-800 bg-slate-50/50 focus:outline-primary cursor-pointer"
          @change="handleEventFilterChange"
        >
          <option v-for="p in providerOptions" :key="p.value" :value="p.value">
            {{ p.label }}
          </option>
        </select>

        <!-- Success/Failure Filter -->
        <select
          v-model="eventSuccess"
          class="rounded-lg border border-slate-200 px-[1.4rem] py-[0.9rem] text-[1.4rem] font-[500] text-slate-800 bg-slate-50/50 focus:outline-primary cursor-pointer"
          @change="handleEventFilterChange"
        >
          <option v-for="s in statusOptions" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>

        <button
          type="button"
          class="px-[1.8rem] py-[0.9rem] rounded-lg bg-primary hover:bg-primary/90 text-white text-[1.4rem] font-[700] transition-colors shadow-2xs cursor-pointer"
          @click="handleEventFilterChange"
        >
          Apply Filters
        </button>
      </div>

      <!-- Events Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[1.4rem] border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-[700] uppercase tracking-wider text-[1.2rem]">
                <th class="px-[2rem] py-[1.4rem]">Timestamp</th>
                <th class="px-[1.6rem] py-[1.4rem]">Store / Tenant</th>
                <th class="px-[1.6rem] py-[1.4rem]">User</th>
                <th class="px-[1.6rem] py-[1.4rem]">Channel</th>
                <th class="px-[1.6rem] py-[1.4rem]">Provider & Model</th>
                <th class="px-[1.6rem] py-[1.4rem]">Tokens (In / Out)</th>
                <th class="px-[1.6rem] py-[1.4rem]">Latency</th>
                <th class="px-[1.6rem] py-[1.4rem]">Status</th>
                <th class="px-[2rem] py-[1.4rem] text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <template v-if="aiAnalyticsStore.loadingEvents">
                <tr
                  v-for="i in 5"
                  :key="i"
                  class="animate-pulse"
                >
                  <td colspan="9" class="px-[2rem] py-[1.6rem]">
                    <div class="h-[1.6rem] bg-slate-200 rounded w-full" />
                  </td>
                </tr>
              </template>

              <tr
                v-else-if="!aiAnalyticsStore.events.items || aiAnalyticsStore.events.items.length === 0"
              >
                <td colspan="9" class="px-[2rem] py-[4rem] text-center text-slate-400">
                  <span class="material-symbols-outlined text-[3.6rem] mb-[0.8rem]">manage_search</span>
                  <p class="font-[600] text-[1.6rem] text-slate-600">No events found matching this filter criteria</p>
                </td>
              </tr>

              <tr
                v-for="evt in aiAnalyticsStore.events.items"
                v-else
                :key="evt.id"
                class="hover:bg-slate-50/70 transition-colors"
              >
                <!-- Timestamp -->
                <td class="px-[2rem] py-[1.4rem] whitespace-nowrap text-slate-600 font-[500] text-[1.3rem]">
                  {{ formatDate(evt.occurredAt) }}
                </td>

                <!-- Store / Tenant -->
                <td class="px-[1.6rem] py-[1.4rem] whitespace-nowrap">
                  <div class="font-[700] text-slate-900 text-[1.4rem]">{{ evt.tenantName || "Store" }}</div>
                  <div class="text-[1.2rem] font-mono text-slate-400">{{ evt.tenantId?.slice(0, 10) }}...</div>
                </td>

                <!-- User -->
                <td class="px-[1.6rem] py-[1.4rem] whitespace-nowrap">
                  <div class="font-[600] text-slate-800 text-[1.4rem]">{{ evt.userName || evt.userId }}</div>
                </td>

                <!-- Channel Badge -->
                <td class="px-[1.6rem] py-[1.4rem] whitespace-nowrap">
                  <span
                    class="inline-flex items-center gap-[0.6rem] px-[1rem] py-[0.3rem] rounded-full text-[1.2rem] font-[600] border"
                    :class="getChannelBadge(evt.channel).class"
                  >
                    <span class="material-symbols-outlined text-[1.4rem]">
                      {{ getChannelBadge(evt.channel).icon }}
                    </span>
                    {{ getChannelBadge(evt.channel).label }}
                  </span>
                </td>

                <!-- Provider & Model -->
                <td class="px-[1.6rem] py-[1.4rem] whitespace-nowrap font-mono text-[1.3rem]">
                  <span class="font-[700] text-slate-800 uppercase">{{ evt.provider }}</span>
                  <span class="text-slate-400"> / </span>
                  <span class="text-slate-600">{{ evt.model }}</span>
                </td>

                <!-- Tokens -->
                <td class="px-[1.6rem] py-[1.4rem] whitespace-nowrap">
                  <span class="font-[700] text-slate-800 text-[1.4rem]">{{ evt.totalTokens?.toLocaleString() }}</span>
                  <span class="text-[1.2rem] text-slate-400 block">
                    {{ evt.inputTokens }} in • {{ evt.outputTokens }} out
                  </span>
                </td>

                <!-- Latency -->
                <td class="px-[1.6rem] py-[1.4rem] whitespace-nowrap">
                  <span
                    class="font-[600] text-[1.3rem]"
                    :class="evt.latencyMillis > 3000 ? 'text-amber-600' : 'text-slate-700'"
                  >
                    {{ evt.latencyMillis }}ms
                  </span>
                </td>

                <!-- Status Badge -->
                <td class="px-[1.6rem] py-[1.4rem] whitespace-nowrap">
                  <div v-if="evt.success" class="inline-flex items-center gap-[0.6rem] text-emerald-700 font-[700] text-[1.3rem]">
                    <span class="material-symbols-outlined text-[1.8rem] text-emerald-600">check_circle</span>
                    Success
                  </div>
                  <div v-else class="text-rose-600 text-[1.3rem] font-[700]">
                    <div class="inline-flex items-center gap-[0.6rem]">
                      <span class="material-symbols-outlined text-[1.8rem] text-rose-600">error</span>
                      Failed
                    </div>
                    <p v-if="evt.failureReason" class="text-[1.2rem] font-normal text-rose-500 max-w-xs truncate" :title="evt.failureReason">
                      {{ evt.failureReason }}
                    </p>
                  </div>
                </td>

                <!-- Cost -->
                <td class="px-[2rem] py-[1.4rem] whitespace-nowrap text-right font-mono font-[700] text-slate-900 text-[1.4rem]">
                  ${{ evt.estimatedCostUsd?.toFixed(5) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Events Pagination -->
        <div class="p-[1.6rem] border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-[1.2rem] text-[1.3rem] text-slate-600">
          <div>
            Showing page {{ eventPage + 1 }} of {{ aiAnalyticsStore.events.totalPages || 1 }} ({{ aiAnalyticsStore.events.totalElements }} events)
          </div>

          <div class="flex items-center gap-[0.8rem]">
            <button
              type="button"
              class="px-[1.4rem] py-[0.8rem] rounded-md border border-slate-200 bg-white text-slate-700 font-[600] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              :disabled="eventPage <= 0"
              @click="changeEventPage(eventPage - 1)"
            >
              Previous
            </button>
            <button
              type="button"
              class="px-[1.4rem] py-[0.8rem] rounded-md border border-slate-200 bg-white text-slate-700 font-[600] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              :disabled="eventPage + 1 >= aiAnalyticsStore.events.totalPages"
              @click="changeEventPage(eventPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Staff Usage Drawer -->
    <StaffUsageDrawer
      v-model:open="isStaffDrawerOpen"
      :tenant="selectedTenant"
    />
  </div>
</template>
