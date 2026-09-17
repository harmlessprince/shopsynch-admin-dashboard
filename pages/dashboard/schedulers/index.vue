<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useAdminSchedulerStore } from "~/stores/adminScheduler.store.js";
import { formatDate } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-schedulers",
});

useHead({
  title: "Scheduler Operations - ShopSynch Admin",
});

const store = useAdminSchedulerStore();

const activeTab = ref("overview"); // "overview" | "runs"

// Schedulers list filtering (Tab 1)
const schedulerSearch = ref("");
const schedulerRiskFilter = ref("");
const schedulerHealthFilter = ref("");

// Run history filtering (Tab 2)
const runFilters = ref({
  schedulerName: "",
  status: "",
  triggerType: "",
  cadence: "",
  runKey: "",
});
const currentPage = ref(0);
const pageSize = ref(20);

// Run detail drawer state
const showDetailDrawer = ref(false);
const selectedRun = ref(null);

const loadOverview = async () => {
  await store.fetchOverview();
};

const loadRuns = async () => {
  const params = {
    page: currentPage.value,
    limit: pageSize.value,
  };
  for (const [k, v] of Object.entries(runFilters.value)) {
    if (v && String(v).trim() !== "") {
      params[k] = String(v).trim();
    }
  }
  await store.fetchRuns(params);
};

const handleRefresh = async () => {
  if (activeTab.value === "overview") {
    await loadOverview();
  } else {
    await loadRuns();
  }
};

const applyRunFilters = async () => {
  currentPage.value = 0;
  await loadRuns();
};

const resetRunFilters = async () => {
  runFilters.value = {
    schedulerName: "",
    status: "",
    triggerType: "",
    cadence: "",
    runKey: "",
  };
  currentPage.value = 0;
  await loadRuns();
};

const goToRunsForScheduler = (schedulerName) => {
  runFilters.value.schedulerName = schedulerName;
  activeTab.value = "runs";
  currentPage.value = 0;
  loadRuns();
};

const openRunDetail = async (run) => {
  selectedRun.value = run;
  showDetailDrawer.value = true;
  if (run?.id) {
    const res = await store.fetchRunDetail(run.id);
    if (res?.data) {
      selectedRun.value = res.data;
    }
  }
};

const prevPage = async () => {
  if (currentPage.value > 0) {
    currentPage.value--;
    await loadRuns();
  }
};

const nextPage = async () => {
  if (currentPage.value + 1 < store.runPagination.totalPages) {
    currentPage.value++;
    await loadRuns();
  }
};

// Filtered schedulers for Tab 1
const filteredSchedulers = computed(() => {
  let list = store.overview.schedulers || [];
  if (schedulerSearch.value.trim() !== "") {
    const q = schedulerSearch.value.toLowerCase().trim();
    list = list.filter(
      (s) =>
        s.schedulerName.toLowerCase().includes(q) ||
        (s.displayName && s.displayName.toLowerCase().includes(q))
    );
  }
  if (schedulerRiskFilter.value) {
    list = list.filter((s) => s.riskLevel === schedulerRiskFilter.value);
  }
  if (schedulerHealthFilter.value) {
    list = list.filter((s) => s.health === schedulerHealthFilter.value);
  }
  return list;
});

// Success rate helper
const successRate = computed(() => {
  const total = store.overview.last24HoursRunsCount || 0;
  const success = store.overview.last24HoursSuccessCount || 0;
  if (total === 0) return "100%";
  const pct = (success / total) * 100;
  return pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(1)}%`;
});

// Duration formatter
const formatRunDuration = (run) => {
  if (!run?.startedAt || !run?.completedAt) return "-";
  const start = new Date(run.startedAt).getTime();
  const end = new Date(run.completedAt).getTime();
  const diffMs = Math.max(0, end - start);
  if (diffMs < 1000) return `${diffMs}ms`;
  if (diffMs < 60000) return `${(diffMs / 1000).toFixed(1)}s`;
  return `${Math.round(diffMs / 60000)}m`;
};

// Badges
const getHealthBadge = (health) => {
  switch (health?.toUpperCase()) {
    case "HEALTHY":
      return "bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]";
    case "WARNING":
      return "bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]";
    case "CRITICAL":
      return "bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]";
    default:
      return "bg-[#F1F3F4] text-[#5F6368] border border-[#DADCE0]";
  }
};

const getStatusBadge = (status) => {
  switch (status?.toUpperCase()) {
    case "SUCCESS":
      return "bg-[#E6F4EA] text-[#137333]";
    case "FAILED":
      return "bg-[#FCE8E6] text-[#C5221F]";
    case "SKIPPED":
      return "bg-[#FEF7E0] text-[#B06000]";
    case "RUNNING":
      return "bg-[#E8F0FE] text-[#1A73E8] animate-pulse";
    default:
      return "bg-[#F1F3F4] text-[#5F6368]";
  }
};

const getRiskBadge = (risk) => {
  switch (risk?.toUpperCase()) {
    case "CRITICAL":
      return "bg-[#FEE2E2] text-[#991B1B] font-[700]";
    case "IMPORTANT":
      return "bg-[#DBEAFE] text-[#1E40AF]";
    case "LOW_RISK":
      return "bg-[#F3F4F6] text-[#4B5563]";
    default:
      return "bg-[#F3F4F6] text-[#4B5563]";
  }
};

watch(activeTab, (tab) => {
  if (tab === "overview") {
    loadOverview();
  } else if (tab === "runs") {
    loadRuns();
  }
});

onMounted(async () => {
  await loadOverview();
});
</script>

<template>
  <div class="p-[2.4rem] max-w-[1400px] mx-auto flex flex-col gap-y-[2.4rem]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[1.6rem]">
      <div>
        <h1 class="text-[2.4rem] font-[700] text-[#1B1B19]">Scheduler Operations</h1>
        <p class="text-[1.3rem] text-[#64748B] mt-[0.4rem]">
          Monitor durable job execution health, recoverability, SLA adherence, and active failure alerts.
        </p>
      </div>

      <div class="flex items-center gap-x-[1.2rem]">
        <button
          @click="handleRefresh"
          :disabled="store.loadingOverview || store.loadingRuns"
          class="flex items-center gap-x-[0.8rem] px-[1.6rem] py-[0.8rem] bg-white border border-[#D0D5DD] rounded-[8px] text-[1.3rem] font-[600] text-[#344054] hover:bg-[#F9FAFB] transition-colors shadow-sm disabled:opacity-50"
        >
          <span
            class="material-symbols-outlined text-[1.8rem] text-[#64748B]"
            :class="{ 'animate-spin': store.loadingOverview || store.loadingRuns }"
          >
            refresh
          </span>
          Refresh
        </button>
      </div>
    </div>

    <!-- Tier 1: KPI Overview Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1.6rem]">
      <!-- Total Monitored -->
      <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
        <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">Monitored Jobs</span>
        <div class="flex items-baseline justify-between mt-[1rem]">
          <span class="text-[2.8rem] font-[700] text-[#0F172A] tabular-nums">
            {{ Number(store.overview.totalMonitored || 0).toLocaleString() }}
          </span>
          <span class="material-symbols-outlined text-[#003366] text-[2.4rem]">timer</span>
        </div>
      </div>

      <!-- Healthy Jobs -->
      <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
        <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">Healthy</span>
        <div class="flex items-baseline justify-between mt-[1rem]">
          <span class="text-[2.8rem] font-[700] text-[#137333] tabular-nums">
            {{ Number(store.overview.healthyCount || 0).toLocaleString() }}
          </span>
          <span class="material-symbols-outlined text-[#137333] text-[2.4rem]">check_circle</span>
        </div>
      </div>

      <!-- Warning Jobs -->
      <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
        <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">Warning</span>
        <div class="flex items-baseline justify-between mt-[1rem]">
          <span
            class="text-[2.8rem] font-[700] tabular-nums"
            :class="(store.overview.warningCount || 0) > 0 ? 'text-[#B06000]' : 'text-[#0F172A]'"
          >
            {{ Number(store.overview.warningCount || 0).toLocaleString() }}
          </span>
          <span
            class="material-symbols-outlined text-[2.4rem]"
            :class="(store.overview.warningCount || 0) > 0 ? 'text-[#B06000]' : 'text-[#94A3B8]'"
          >
            warning
          </span>
        </div>
      </div>

      <!-- Critical Jobs -->
      <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
        <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">Critical</span>
        <div class="flex items-baseline justify-between mt-[1rem]">
          <span
            class="text-[2.8rem] font-[700] tabular-nums"
            :class="(store.overview.criticalCount || 0) > 0 ? 'text-[#C5221F]' : 'text-[#0F172A]'"
          >
            {{ Number(store.overview.criticalCount || 0).toLocaleString() }}
          </span>
          <span
            class="material-symbols-outlined text-[2.4rem]"
            :class="(store.overview.criticalCount || 0) > 0 ? 'text-[#C5221F]' : 'text-[#94A3B8]'"
          >
            error
          </span>
        </div>
      </div>

      <!-- Active Alerts -->
      <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
        <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">Active Alerts</span>
        <div class="flex items-baseline justify-between mt-[1rem]">
          <span
            class="text-[2.8rem] font-[700] tabular-nums"
            :class="(store.overview.activeAlertsCount || 0) > 0 ? 'text-[#B06000]' : 'text-[#0F172A]'"
          >
            {{ Number(store.overview.activeAlertsCount || 0).toLocaleString() }}
          </span>
          <span
            class="material-symbols-outlined text-[2.4rem]"
            :class="(store.overview.activeAlertsCount || 0) > 0 ? 'text-[#B06000]' : 'text-[#94A3B8]'"
          >
            notifications_active
          </span>
        </div>
      </div>

      <!-- 24h Total Runs -->
      <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
        <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">24h Total Runs</span>
        <div class="flex items-baseline justify-between mt-[1rem]">
          <span class="text-[2.8rem] font-[700] text-[#0F172A] tabular-nums">
            {{ Number(store.overview.last24HoursRunsCount || 0).toLocaleString() }}
          </span>
          <span class="material-symbols-outlined text-[#003366] text-[2.4rem]">history</span>
        </div>
      </div>

      <!-- 24h Successful Runs -->
      <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">24h Successful Runs</span>
          <span class="text-[1.1rem] font-[600] text-[#137333] bg-[#E6F4EA] px-[0.6rem] py-[0.1rem] rounded-full">
            {{ successRate }}
          </span>
        </div>
        <div class="flex items-baseline justify-between mt-[1rem]">
          <span class="text-[2.8rem] font-[700] text-[#137333] tabular-nums">
            {{ Number(store.overview.last24HoursSuccessCount || 0).toLocaleString() }}
          </span>
          <span class="material-symbols-outlined text-[#137333] text-[2.4rem]">task_alt</span>
        </div>
      </div>

      <!-- 24h Failed Runs -->
      <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
        <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">24h Failed Runs</span>
        <div class="flex items-baseline justify-between mt-[1rem]">
          <span
            class="text-[2.8rem] font-[700] tabular-nums"
            :class="(store.overview.last24HoursFailureCount || 0) > 0 ? 'text-[#C5221F]' : 'text-[#0F172A]'"
          >
            {{ Number(store.overview.last24HoursFailureCount || 0).toLocaleString() }}
          </span>
          <span
            class="material-symbols-outlined text-[2.4rem]"
            :class="(store.overview.last24HoursFailureCount || 0) > 0 ? 'text-[#C5221F]' : 'text-[#94A3B8]'"
          >
            {{ (store.overview.last24HoursFailureCount || 0) > 0 ? 'cancel' : 'check_circle' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Active Alerts Banner -->
    <div
      v-if="store.alerts && store.alerts.length > 0"
      class="bg-[#FEF2F2] border-l-4 border-[#EF4444] p-[1.6rem] rounded-r-[8px] shadow-sm flex flex-col gap-y-[1.2rem]"
    >
      <div class="flex items-center gap-x-[0.8rem]">
        <span class="material-symbols-outlined text-[#DC2626] text-[2.2rem]">warning</span>
        <h3 class="text-[1.5rem] font-[700] text-[#991B1B]">
          {{ store.alerts.length }} Active Scheduler {{ store.alerts.length === 1 ? 'Alert' : 'Alerts' }} Requiring Attention
        </h3>
      </div>
      <div class="flex flex-col gap-y-[0.8rem]">
        <div
          v-for="(alert, idx) in store.alerts"
          :key="idx"
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white/80 p-[1.2rem] rounded-[6px] border border-[#FCA5A5] gap-[0.8rem]"
        >
          <div class="flex items-start sm:items-center gap-x-[1rem]">
            <span
              class="px-[0.8rem] py-[0.2rem] rounded-full text-[1rem] font-[700] uppercase tracking-wide"
              :class="alert.severity === 'CRITICAL' ? 'bg-[#DC2626] text-white' : 'bg-[#D97706] text-white'"
            >
              {{ alert.severity }}
            </span>
            <span class="px-[0.8rem] py-[0.2rem] bg-[#F1F5F9] text-[#475569] rounded-[4px] font-mono text-[1.1rem]">
              {{ alert.alertType }}
            </span>
            <span class="text-[1.3rem] text-[#1E293B] font-[500]">{{ alert.message }}</span>
          </div>
          <button
            @click="goToRunsForScheduler(alert.schedulerName)"
            class="self-end sm:self-center text-[1.2rem] font-[600] text-[#003366] hover:underline flex items-center gap-x-[0.4rem]"
          >
            Investigate Runs
            <span class="material-symbols-outlined text-[1.6rem]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-[#E2E8F0] gap-x-[2.4rem]">
      <button
        @click="activeTab = 'overview'"
        class="pb-[1.2rem] text-[1.4rem] font-[600] transition-colors relative"
        :class="activeTab === 'overview' ? 'text-[#003366]' : 'text-[#64748B] hover:text-[#0F172A]'"
      >
        Scheduler Health & SLAs
        <div
          v-if="activeTab === 'overview'"
          class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#003366]"
        ></div>
      </button>

      <button
        @click="activeTab = 'runs'"
        class="pb-[1.2rem] text-[1.4rem] font-[600] transition-colors relative"
        :class="activeTab === 'runs' ? 'text-[#003366]' : 'text-[#64748B] hover:text-[#0F172A]'"
      >
        Run History
        <div
          v-if="activeTab === 'runs'"
          class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#003366]"
        ></div>
      </button>
    </div>

    <!-- TAB 1: SCHEDULER HEALTH & SLAS -->
    <div v-if="activeTab === 'overview'" class="flex flex-col gap-y-[1.6rem]">
      <!-- Filter Bar -->
      <div class="flex flex-col sm:flex-row items-center gap-[1.2rem] justify-between">
        <div class="relative w-full sm:w-[320px]">
          <span class="material-symbols-outlined absolute left-[1.2rem] top-[50%] -translate-y-1/2 text-[#94A3B8] text-[2rem]">
            search
          </span>
          <input
            v-model="schedulerSearch"
            placeholder="Search by scheduler name..."
            class="w-full pl-[3.8rem] pr-[1.2rem] py-[0.8rem] bg-white border border-[#D0D5DD] rounded-[8px] text-[1.3rem] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#003366]"
          />
        </div>

        <div class="flex items-center gap-x-[1.2rem] w-full sm:w-auto">
          <select
            v-model="schedulerRiskFilter"
            class="w-full sm:w-auto px-[1.2rem] py-[0.8rem] bg-white border border-[#D0D5DD] rounded-[8px] text-[1.3rem] text-[#334155]"
          >
            <option value="">All Risk Levels</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="IMPORTANT">IMPORTANT</option>
            <option value="LOW_RISK">LOW_RISK</option>
          </select>

          <select
            v-model="schedulerHealthFilter"
            class="w-full sm:w-auto px-[1.2rem] py-[0.8rem] bg-white border border-[#D0D5DD] rounded-[8px] text-[1.3rem] text-[#334155]"
          >
            <option value="">All Health Statuses</option>
            <option value="HEALTHY">HEALTHY</option>
            <option value="WARNING">WARNING</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>

      <!-- Schedulers Table -->
      <div class="bg-white rounded-[10px] border border-[#E2E8F0] shadow-sm overflow-x-auto">
        <table class="w-full text-left text-[1.3rem]">
          <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-[600] uppercase text-[1.1rem]">
            <tr>
              <th class="py-[1.2rem] px-[1.6rem]">Job / Method</th>
              <th class="py-[1.2rem] px-[1.6rem]">Risk</th>
              <th class="py-[1.2rem] px-[1.6rem]">Cadence</th>
              <th class="py-[1.2rem] px-[1.6rem]">Health</th>
              <th class="py-[1.2rem] px-[1.6rem]">SLA Status</th>
              <th class="py-[1.2rem] px-[1.6rem]">Consecutive Failures</th>
              <th class="py-[1.2rem] px-[1.6rem]">Last Run</th>
              <th class="py-[1.2rem] px-[1.6rem]">Last Success</th>
              <th class="py-[1.2rem] px-[1.6rem] text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E2E8F0]">
            <tr v-if="store.loadingOverview">
              <td colspan="9" class="py-[4rem] text-center text-[#64748B]">Loading scheduler overview...</td>
            </tr>
            <tr v-else-if="!filteredSchedulers.length">
              <td colspan="9" class="py-[4rem] text-center text-[#64748B]">No schedulers matched your filter criteria.</td>
            </tr>
            <tr
              v-for="s in filteredSchedulers"
              :key="s.schedulerName"
              class="hover:bg-[#F8FAFC] transition-colors"
            >
              <td class="py-[1.2rem] px-[1.6rem]">
                <div class="font-[600] text-[#0F172A]">{{ s.displayName }}</div>
                <div class="font-mono text-[1.1rem] text-[#64748B] truncate max-w-[280px]" :title="s.schedulerName">
                  {{ s.schedulerName }}
                </div>
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span class="px-[0.8rem] py-[0.2rem] rounded-[4px] text-[1.1rem]" :class="getRiskBadge(s.riskLevel)">
                  {{ s.riskLevel }}
                </span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono text-[1.2rem] text-[#475569]">
                {{ s.cadence }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span class="px-[0.8rem] py-[0.2rem] rounded-full text-[1.1rem] font-[600]" :class="getHealthBadge(s.health)">
                  {{ s.health }}
                </span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span
                  class="px-[0.8rem] py-[0.2rem] rounded-full text-[1.1rem] font-[600]"
                  :class="s.slaStatus === 'OK' ? 'bg-[#E6F4EA] text-[#137333]' : s.slaStatus === 'BREACHED' ? 'bg-[#FCE8E6] text-[#C5221F]' : 'bg-[#F1F3F4] text-[#64748B]'"
                >
                  {{ s.slaStatus }}
                </span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span
                  class="font-mono font-[600] text-[1.3rem]"
                  :class="s.consecutiveFailures > 0 ? 'text-[#DC2626]' : 'text-[#64748B]'"
                >
                  {{ s.consecutiveFailures }}
                </span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <div v-if="s.lastRunStatus" class="flex items-center gap-x-[0.6rem]">
                  <span class="px-[0.6rem] py-[0.1rem] rounded text-[1rem] font-[700]" :class="getStatusBadge(s.lastRunStatus)">
                    {{ s.lastRunStatus }}
                  </span>
                  <span class="text-[1.2rem] text-[#64748B]">{{ formatDate(s.lastRunAt, 'relative') }}</span>
                </div>
                <span v-else class="text-[#94A3B8] text-[1.2rem]">Never</span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem] text-[#64748B] text-[1.2rem] whitespace-nowrap">
                {{ s.lastSuccessAt ? formatDate(s.lastSuccessAt, 'relative') : 'Never' }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem] text-right">
                <button
                  @click="goToRunsForScheduler(s.schedulerName)"
                  class="px-[1rem] py-[0.4rem] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#003366] font-[600] text-[1.2rem] rounded-[6px] transition-colors"
                >
                  Runs
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: RUN HISTORY -->
    <div v-if="activeTab === 'runs'" class="flex flex-col gap-y-[1.6rem]">
      <!-- Filters -->
      <div class="bg-white rounded-[10px] p-[1.6rem] border border-[#E2E8F0] shadow-sm flex flex-col gap-y-[1.2rem]">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1.2rem]">
          <div>
            <label class="block text-[1.2rem] font-[600] text-[#475569] mb-[0.4rem]">Scheduler Name</label>
            <input
              v-model="runFilters.schedulerName"
              placeholder="e.g. AnalyticsRollup..."
              class="w-full px-[1.2rem] py-[0.8rem] bg-white border border-[#D0D5DD] rounded-[6px] text-[1.3rem] text-[#0F172A]"
            />
          </div>

          <div>
            <label class="block text-[1.2rem] font-[600] text-[#475569] mb-[0.4rem]">Status</label>
            <select v-model="runFilters.status" class="w-full px-[1.2rem] py-[0.8rem] bg-white border border-[#D0D5DD] rounded-[6px] text-[1.3rem] text-[#0F172A]">
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="SKIPPED">SKIPPED</option>
              <option value="RUNNING">RUNNING</option>
            </select>
          </div>

          <div>
            <label class="block text-[1.2rem] font-[600] text-[#475569] mb-[0.4rem]">Trigger Type</label>
            <select v-model="runFilters.triggerType" class="w-full px-[1.2rem] py-[0.8rem] bg-white border border-[#D0D5DD] rounded-[6px] text-[1.3rem] text-[#0F172A]">
              <option value="">All Trigger Types</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="STARTUP_CATCH_UP">STARTUP_CATCH_UP</option>
              <option value="MANUAL">MANUAL</option>
            </select>
          </div>

          <div>
            <label class="block text-[1.2rem] font-[600] text-[#475569] mb-[0.4rem]">Cadence</label>
            <select v-model="runFilters.cadence" class="w-full px-[1.2rem] py-[0.8rem] bg-white border border-[#D0D5DD] rounded-[6px] text-[1.3rem] text-[#0F172A]">
              <option value="">All Cadences</option>
              <option value="DAILY">DAILY</option>
              <option value="WEEKLY">WEEKLY</option>
              <option value="MONTHLY">MONTHLY</option>
              <option value="FIXED_DELAY">FIXED_DELAY</option>
              <option value="AD_HOC">AD_HOC</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-x-[1.2rem] pt-[0.8rem] border-t border-[#F1F5F9]">
          <button
            @click="resetRunFilters"
            class="px-[1.4rem] py-[0.6rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem] font-[600] text-[#475569] hover:bg-[#F8FAFC]"
          >
            Reset
          </button>
          <button
            @click="applyRunFilters"
            class="px-[1.6rem] py-[0.6rem] bg-[#003366] text-white rounded-[6px] text-[1.3rem] font-[600] hover:bg-[#002244]"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <!-- Runs Table -->
      <div class="bg-white rounded-[10px] border border-[#E2E8F0] shadow-sm overflow-x-auto">
        <table class="w-full text-left text-[1.3rem]">
          <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-[600] uppercase text-[1.1rem]">
            <tr>
              <th class="py-[1.2rem] px-[1.6rem]">Scheduler Name</th>
              <th class="py-[1.2rem] px-[1.6rem]">Run Key</th>
              <th class="py-[1.2rem] px-[1.6rem]">Status</th>
              <th class="py-[1.2rem] px-[1.6rem]">Trigger</th>
              <th class="py-[1.2rem] px-[1.6rem]">Processed</th>
              <th class="py-[1.2rem] px-[1.6rem]">Attempt</th>
              <th class="py-[1.2rem] px-[1.6rem]">Started At</th>
              <th class="py-[1.2rem] px-[1.6rem]">Duration</th>
              <th class="py-[1.2rem] px-[1.6rem] text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E2E8F0]">
            <tr v-if="store.loadingRuns">
              <td colspan="9" class="py-[4rem] text-center text-[#64748B]">Loading scheduler run logs...</td>
            </tr>
            <tr v-else-if="!store.runs.length">
              <td colspan="9" class="py-[4rem] text-center text-[#64748B]">No scheduler execution runs found.</td>
            </tr>
            <tr
              v-for="run in store.runs"
              :key="run.id"
              class="hover:bg-[#F8FAFC] transition-colors"
            >
              <td class="py-[1.2rem] px-[1.6rem] font-[600] text-[#0F172A] whitespace-nowrap">
                {{ run.schedulerName }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono text-[1.1rem] text-[#64748B] truncate max-w-[200px]" :title="run.runKey">
                {{ run.runKey }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span class="px-[0.8rem] py-[0.2rem] rounded-full text-[1.1rem] font-[600]" :class="getStatusBadge(run.status)">
                  {{ run.status }}
                </span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span class="px-[0.6rem] py-[0.1rem] bg-[#F1F5F9] text-[#475569] rounded font-mono text-[1rem]">
                  {{ run.triggerType }}
                </span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono font-[600]" :class="run.processedCount > 0 ? 'text-[#137333]' : 'text-[#64748B]'">
                {{ run.processedCount || 0 }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono text-[#64748B] text-[1.2rem]">
                {{ run.attemptNumber }} / {{ run.maxAttempts }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem] text-[#64748B] text-[1.2rem] whitespace-nowrap">
                {{ formatDate(run.startedAt, 'relative') }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono text-[#475569] text-[1.2rem] whitespace-nowrap">
                {{ formatRunDuration(run) }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem] text-right">
                <button
                  @click="openRunDetail(run)"
                  class="text-[#003366] font-[600] hover:underline text-[1.2rem]"
                >
                  Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="px-[1.6rem] py-[1.2rem] border-t border-[#E2E8F0] flex items-center justify-between">
          <div class="text-[1.2rem] text-[#64748B]">
            Page <span class="font-[600] text-[#0F172A]">{{ currentPage + 1 }}</span> of
            <span class="font-[600] text-[#0F172A]">{{ store.runPagination.totalPages || 1 }}</span>
            ({{ store.runPagination.totalElements || 0 }} total runs)
          </div>
          <div class="flex items-center gap-x-[0.8rem]">
            <button
              @click="prevPage"
              :disabled="currentPage === 0 || store.loadingRuns"
              class="px-[1.2rem] py-[0.6rem] border border-[#D0D5DD] rounded-[6px] text-[1.2rem] font-[600] disabled:opacity-50 hover:bg-[#F8FAFC]"
            >
              Previous
            </button>
            <button
              @click="nextPage"
              :disabled="currentPage + 1 >= store.runPagination.totalPages || store.loadingRuns"
              class="px-[1.2rem] py-[0.6rem] border border-[#D0D5DD] rounded-[6px] text-[1.2rem] font-[600] disabled:opacity-50 hover:bg-[#F8FAFC]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- RUN DETAIL SLIDE-OUT DRAWER -->
    <div
      v-if="showDetailDrawer"
      class="fixed inset-0 bg-black/50 z-50 flex justify-end"
      @click.self="showDetailDrawer = false"
    >
      <div class="bg-white w-full max-w-[620px] h-full overflow-y-auto p-[2.4rem] flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
        <div class="flex flex-col gap-y-[2rem]">
          <!-- Drawer Header -->
          <div class="flex items-start justify-between border-b border-[#E2E8F0] pb-[1.6rem]">
            <div>
              <div class="flex items-center gap-x-[0.8rem]">
                <span class="px-[0.8rem] py-[0.2rem] rounded-full text-[1.1rem] font-[700]" :class="getStatusBadge(selectedRun?.status)">
                  {{ selectedRun?.status }}
                </span>
                <span class="text-[1.3rem] font-mono text-[#64748B]">
                  {{ selectedRun?.id }}
                </span>
              </div>
              <h2 class="text-[1.8rem] font-[700] text-[#0F172A] mt-[0.6rem]">
                {{ selectedRun?.schedulerName }}
              </h2>
            </div>
            <button
              @click="showDetailDrawer = false"
              class="p-[0.6rem] hover:bg-[#F1F5F9] rounded-full text-[#64748B] transition-colors"
            >
              <span class="material-symbols-outlined text-[2.2rem]">close</span>
            </button>
          </div>

          <!-- Error Alert (if present) -->
          <div
            v-if="selectedRun?.errorMessage"
            class="bg-[#FEF2F2] border border-[#FCA5A5] rounded-[8px] p-[1.4rem] flex flex-col gap-y-[0.6rem]"
          >
            <div class="flex items-center gap-x-[0.6rem] text-[#991B1B] font-[700] text-[1.3rem]">
              <span class="material-symbols-outlined text-[1.8rem]">error</span>
              Execution Error
            </div>
            <pre class="text-[1.2rem] font-mono text-[#7F1D1D] whitespace-pre-wrap break-words bg-[#FFF1F2] p-[1rem] rounded border border-[#FECDD3]">
              {{ selectedRun?.errorMessage }}
            </pre>
          </div>

          <!-- Execution Metrics Grid -->
          <div class="grid grid-cols-2 gap-[1.6rem] bg-[#F8FAFC] p-[1.6rem] rounded-[8px] border border-[#E2E8F0]">
            <div>
              <span class="text-[1.1rem] font-[600] text-[#64748B] uppercase">Run Key</span>
              <div class="font-mono text-[1.2rem] text-[#0F172A] break-all mt-[0.2rem]">{{ selectedRun?.runKey }}</div>
            </div>
            <div>
              <span class="text-[1.1rem] font-[600] text-[#64748B] uppercase">Trigger Type</span>
              <div class="font-mono text-[1.2rem] text-[#0F172A] mt-[0.2rem]">{{ selectedRun?.triggerType }}</div>
            </div>
            <div>
              <span class="text-[1.1rem] font-[600] text-[#64748B] uppercase">Cadence</span>
              <div class="font-mono text-[1.2rem] text-[#0F172A] mt-[0.2rem]">{{ selectedRun?.cadence }}</div>
            </div>
            <div>
              <span class="text-[1.1rem] font-[600] text-[#64748B] uppercase">Host</span>
              <div class="font-mono text-[1.2rem] text-[#0F172A] mt-[0.2rem]">{{ selectedRun?.host || 'unknown' }}</div>
            </div>
            <div>
              <span class="text-[1.1rem] font-[600] text-[#64748B] uppercase">Started At</span>
              <div class="text-[1.2rem] text-[#0F172A] mt-[0.2rem]">{{ formatDate(selectedRun?.startedAt, 'full') }}</div>
            </div>
            <div>
              <span class="text-[1.1rem] font-[600] text-[#64748B] uppercase">Completed At</span>
              <div class="text-[1.2rem] text-[#0F172A] mt-[0.2rem]">{{ selectedRun?.completedAt ? formatDate(selectedRun?.completedAt, 'full') : 'In progress' }}</div>
            </div>
            <div>
              <span class="text-[1.1rem] font-[600] text-[#64748B] uppercase">Duration</span>
              <div class="font-mono text-[1.2rem] text-[#003366] font-[700] mt-[0.2rem]">{{ formatRunDuration(selectedRun) }}</div>
            </div>
            <div>
              <span class="text-[1.1rem] font-[600] text-[#64748B] uppercase">Attempt</span>
              <div class="font-mono text-[1.2rem] text-[#0F172A] mt-[0.2rem]">
                {{ selectedRun?.attemptNumber }} / {{ selectedRun?.maxAttempts }}
              </div>
            </div>
            <div>
              <span class="text-[1.1rem] font-[600] text-[#64748B] uppercase">Processed Items</span>
              <div class="font-mono text-[1.3rem] text-[#137333] font-[700] mt-[0.2rem]">{{ selectedRun?.processedCount || 0 }}</div>
            </div>
            <div>
              <span class="text-[1.1rem] font-[600] text-[#64748B] uppercase">Failed Items</span>
              <div class="font-mono text-[1.3rem] font-[700] mt-[0.2rem]" :class="(selectedRun?.failedCount || 0) > 0 ? 'text-[#DC2626]' : 'text-[#64748B]'">
                {{ selectedRun?.failedCount || 0 }}
              </div>
            </div>
          </div>

          <!-- Window Bounds -->
          <div v-if="selectedRun?.windowStart || selectedRun?.windowEnd" class="flex flex-col gap-y-[0.6rem]">
            <span class="text-[1.2rem] font-[600] text-[#475569]">Logical Window</span>
            <div class="bg-[#F8FAFC] p-[1.2rem] rounded-[6px] border border-[#E2E8F0] font-mono text-[1.2rem] flex justify-between">
              <span>Start: <strong>{{ selectedRun?.windowStart ? formatDate(selectedRun?.windowStart, 'full') : 'None' }}</strong></span>
              <span>End: <strong>{{ selectedRun?.windowEnd ? formatDate(selectedRun?.windowEnd, 'full') : 'None' }}</strong></span>
            </div>
          </div>

          <!-- Metadata -->
          <div class="flex flex-col gap-y-[0.6rem]">
            <span class="text-[1.2rem] font-[600] text-[#475569]">Execution Metadata</span>
            <pre class="bg-[#0F172A] text-[#E2E8F0] p-[1.4rem] rounded-[8px] font-mono text-[1.1rem] overflow-x-auto max-h-[220px]">
{{ JSON.stringify(selectedRun?.metadata || {}, null, 2) }}
            </pre>
          </div>
        </div>

        <div class="pt-[2rem] border-t border-[#E2E8F0] flex justify-end">
          <button
            @click="showDetailDrawer = false"
            class="px-[1.6rem] py-[0.8rem] bg-[#003366] text-white rounded-[6px] text-[1.3rem] font-[600] hover:bg-[#002244]"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
