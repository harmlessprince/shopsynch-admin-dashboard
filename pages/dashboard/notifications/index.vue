<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useAdminNotificationOperationsStore } from "~/stores/adminNotificationOperations.store.js";
import { useAdminNotificationMonitoringStore } from "~/stores/adminNotificationMonitoring.store.js";
import { formatDate, logger } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-notifications-operations",
});

useHead({
  title: "Notification Operations - ShopSynch Admin",
});

const store = useAdminNotificationOperationsStore();
const monitoringStore = useAdminNotificationMonitoringStore();

const activeTab = ref("preferences");

// Pagination (shared across tabs — only one tab is visible at a time)
const currentPage = ref(0);
const pageSize = ref(50);

// Filters for Preferences
const prefFilters = ref({
  tenantId: "",
  email: "",
  category: "",
  notificationType: "",
  enabled: "",
});

// Filters for Deliveries
const deliveryFilters = ref({
  tenantId: "",
  email: "",
  category: "",
  notificationType: "",
  status: "",
});

// Filters for Suppressions
const suppressionFilters = ref({
  email: "",
  reason: "",
});

// Filters for Monitoring (Overview & Statistics)
const monitoringTenantId = ref("");
const statsFromDate = ref(monitoringStore.statsFilters.from.slice(0, 10));
const statsToDate = ref(monitoringStore.statsFilters.to.slice(0, 10));
const statsCategory = ref("");
const statsNotificationType = ref("");
const statsNotifiableType = ref("");
const rollupDays = ref(1);

// Edit Preference Modal state
const showEditPrefModal = ref(false);
const selectedPref = ref(null);
const editPrefForm = ref({
  enabled: true,
  consentSource: "",
  reason: "",
});
const updatingPref = ref(false);

// Add Suppression Modal state
const showAddSuppressionModal = ref(false);
const addSuppressionForm = ref({
  email: "",
  reason: "MANUAL_ADMIN",
});
const addingSuppression = ref(false);

const loadActiveTabData = async () => {
  const pagination = { page: currentPage.value, limit: pageSize.value };
  if (activeTab.value === "preferences") {
    await store.fetchPreferences({ ...cleanParams(prefFilters.value), ...pagination });
  } else if (activeTab.value === "deliveries") {
    await store.fetchDeliveries({ ...cleanParams(deliveryFilters.value), ...pagination });
  } else if (activeTab.value === "suppressions") {
    await store.fetchSuppressions({ ...cleanParams(suppressionFilters.value), ...pagination });
  } else if (activeTab.value === "monitoring") {
    await loadMonitoringData();
  }
};

const isRollupDisabled = computed(() => {
  if (monitoringStore.rollupRunning) return true;
  if (!monitoringStore.nextAllowedAt) return false;
  return new Date(monitoringStore.nextAllowedAt).getTime() > Date.now();
});

const loadMonitoringOverview = async () => {
  try {
    await monitoringStore.fetchOverview(monitoringTenantId.value.trim());
  } catch (err) {
    logger.error("Failed to load notification monitoring overview", err);
  }
};

const loadMonitoringStats = async () => {
  try {
    monitoringStore.setStatsFilters({
      from: statsFromDate.value ? new Date(`${statsFromDate.value}T00:00:00.000Z`).toISOString() : undefined,
      to: statsToDate.value ? new Date(`${statsToDate.value}T23:59:59.999Z`).toISOString() : undefined,
      tenantId: monitoringTenantId.value.trim(),
      category: statsCategory.value,
      notificationType: statsNotificationType.value.trim(),
      notifiableType: statsNotifiableType.value.trim(),
    });
    await monitoringStore.fetchStats();
  } catch (err) {
    logger.error("Failed to load notification delivery statistics", err);
  }
};

const loadMonitoringData = async () => {
  await Promise.all([loadMonitoringOverview(), loadMonitoringStats()]);
};

const applyMonitoringFilters = () => {
  loadMonitoringData();
};

const refreshNotificationRollup = async () => {
  try {
    await monitoringStore.runRollup(rollupDays.value);
    await loadMonitoringData();
  } catch (err) {
    logger.error("Failed to run notification rollup", err);
  }
};

const cleanParams = (obj) => {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== null && val !== undefined && String(val).trim() !== "") {
      result[key] = String(val).trim();
    }
  }
  return result;
};

const applyFilters = () => {
  currentPage.value = 0;
  loadActiveTabData();
};

const activePagination = computed(() => {
  if (activeTab.value === "preferences") return store.preferencePagination;
  if (activeTab.value === "deliveries") return store.deliveryPagination;
  return store.suppressionPagination;
});

const activeLoading = computed(() => {
  if (activeTab.value === "preferences") return store.loadingPreferences;
  if (activeTab.value === "deliveries") return store.loadingDeliveries;
  return store.loadingSuppressions;
});

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
    loadActiveTabData();
  }
};

const nextPage = () => {
  if (currentPage.value + 1 < activePagination.value.totalPages) {
    currentPage.value++;
    loadActiveTabData();
  }
};

watch(activeTab, () => {
  currentPage.value = 0;
  loadActiveTabData();
});

onMounted(() => {
  loadActiveTabData();
});

// Actions
const openEditPrefModal = (pref) => {
  selectedPref.value = pref;
  editPrefForm.value = {
    enabled: pref.enabled !== false,
    consentSource: pref.consentSource || "",
    reason: "",
  };
  showEditPrefModal.value = true;
};

const handleUpdatePref = async () => {
  if (!selectedPref.value) return;
  updatingPref.value = true;
  try {
    await store.updatePreference(selectedPref.value.id, {
      enabled: editPrefForm.value.enabled,
      consentSource: editPrefForm.value.consentSource,
      reason: editPrefForm.value.reason,
    });
    showEditPrefModal.value = false;
  } finally {
    updatingPref.value = false;
  }
};

const handleAddSuppression = async () => {
  if (!addSuppressionForm.value.email) return;
  addingSuppression.value = true;
  try {
    await store.addSuppression(addSuppressionForm.value);
    showAddSuppressionModal.value = false;
    addSuppressionForm.value = { email: "", reason: "MANUAL_ADMIN" };
  } finally {
    addingSuppression.value = false;
  }
};

const handleRemoveSuppression = async (email) => {
  if (confirm(`Are you sure you want to remove ${email} from the suppression list?`)) {
    await store.removeSuppression(email);
  }
};

// Formatting helpers
const getStatusBadge = (status) => {
  switch (status) {
    case "SENT":
    case "SUCCESS":
      return "bg-[#E6F4EA] text-[#137333]";
    case "SKIPPED_OPT_OUT":
    case "SKIPPED_RATE_LIMITED":
      return "bg-[#FEF7E0] text-[#B06000]";
    case "SKIPPED_SUPPRESSED":
    case "SKIPPED_INVALID_CONTRACT":
    case "FAILED":
      return "bg-[#FCE8E6] text-[#C5221F]";
    default:
      return "bg-[#F1F3F4] text-[#5F6368]";
  }
};

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

const dailyTrendHeader = [
  { title: "Date", accessor: "date" },
  { title: "Attempts", accessor: "totalAttempts" },
  { title: "Sent", accessor: "sentCount" },
  { title: "Failed", accessor: "failedCount" },
  { title: "Skipped", accessor: "skippedCount" },
  { title: "Unique recipients", accessor: "uniqueRecipients" },
  { title: "Success rate %", accessor: "successRate" },
];

const categoryBreakdownHeader = [
  { title: "Category", accessor: "category" },
  { title: "Attempts", accessor: "totalAttempts" },
  { title: "Sent", accessor: "sentCount" },
  { title: "Failed", accessor: "failedCount" },
  { title: "Skipped", accessor: "skippedCount" },
  { title: "Success rate %", accessor: "successRate" },
];

const notificationTypeBreakdownHeader = [
  { title: "Notification Type", accessor: "notificationType" },
  { title: "Category", accessor: "category" },
  { title: "Attempts", accessor: "totalAttempts" },
  { title: "Sent", accessor: "sentCount" },
  { title: "Failed", accessor: "failedCount" },
  { title: "Skipped", accessor: "skippedCount" },
  { title: "Success rate %", accessor: "successRate" },
];

const topTenantsHeader = [
  { title: "Tenant", accessor: "merchantName" },
  { title: "Tenant Code", accessor: "tenantCode" },
  { title: "Creator Email", accessor: "creatorEmail" },
  { title: "Attempts", accessor: "totalAttempts" },
  { title: "Sent", accessor: "sentCount" },
  { title: "Failed", accessor: "failedCount" },
  { title: "Success rate %", accessor: "successRate" },
];
</script>

<template>
  <div class="p-[1.6rem] lg:p-[2.4rem] flex flex-col gap-y-[2rem]">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-y-[1rem]">
      <div>
        <h1 class="text-[2rem] lg:text-[2.4rem] font-[700] text-[#1B1B19]">Notification Operations</h1>
        <p class="text-[1.3rem] text-[#616161] mt-[0.2rem]">
          Monitor deliverability health, opt-out preferences, and suppression entries.
        </p>
      </div>

      <div v-if="activeTab === 'suppressions'">
        <button
          @click="showAddSuppressionModal = true"
          class="px-[1.6rem] py-[0.8rem] bg-[#003366] text-white text-[1.3rem] font-[600] rounded-[8px] flex items-center gap-x-[0.4rem]"
        >
          <span class="material-symbols-outlined text-[1.8rem]">block</span>
          <span>Suppress Email</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="border-b border-[#EBEBEB] flex gap-x-[2.4rem]">
      <button
        @click="activeTab = 'preferences'"
        class="pb-[1rem] text-[1.4rem] font-[600] border-b-2 transition-colors duration-150"
        :class="activeTab === 'preferences' ? 'border-[#003366] text-[#003366]' : 'border-transparent text-[#616161] hover:text-[#1B1B19]'"
      >
        Notification Preferences
      </button>

      <button
        @click="activeTab = 'deliveries'"
        class="pb-[1rem] text-[1.4rem] font-[600] border-b-2 transition-colors duration-150"
        :class="activeTab === 'deliveries' ? 'border-[#003366] text-[#003366]' : 'border-transparent text-[#616161] hover:text-[#1B1B19]'"
      >
        Delivery Logs
      </button>

      <button
        @click="activeTab = 'suppressions'"
        class="pb-[1rem] text-[1.4rem] font-[600] border-b-2 transition-colors duration-150"
        :class="activeTab === 'suppressions' ? 'border-[#003366] text-[#003366]' : 'border-transparent text-[#616161] hover:text-[#1B1B19]'"
      >
        Suppression List
      </button>

      <button
        @click="activeTab = 'monitoring'"
        class="pb-[1rem] text-[1.4rem] font-[600] border-b-2 transition-colors duration-150"
        :class="activeTab === 'monitoring' ? 'border-[#003366] text-[#003366]' : 'border-transparent text-[#616161] hover:text-[#1B1B19]'"
      >
        Monitoring & Stats
      </button>
    </div>

    <!-- TAB 1: PREFERENCES -->
    <div v-if="activeTab === 'preferences'" class="flex flex-col gap-y-[1.6rem]">
      <!-- Filter Bar -->
      <div class="bg-[#FFFFFF] p-[1.6rem] rounded-[10px] border border-[#EBEBEB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[1.2rem]">
        <input
          v-model="prefFilters.email"
          @keyup.enter="applyFilters"
          placeholder="Filter by Email"
          class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
        />
        <input
          v-model="prefFilters.tenantId"
          @keyup.enter="applyFilters"
          placeholder="Filter by Tenant ID"
          class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
        />
        <select v-model="prefFilters.category" @change="applyFilters" class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
          <option value="">All Categories</option>
          <option value="SECURITY">SECURITY</option>
          <option value="TRANSACTIONAL">TRANSACTIONAL</option>
          <option value="REMINDER">REMINDER</option>
          <option value="MARKETING">MARKETING</option>
          <option value="BILLING">BILLING</option>
        </select>
        <select v-model="prefFilters.enabled" @change="applyFilters" class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
          <option value="">All Statuses</option>
          <option value="true">Enabled (Opted In)</option>
          <option value="false">Disabled (Opted Out)</option>
        </select>
        <button @click="applyFilters" class="px-[1.2rem] py-[0.8rem] bg-[#003366] text-white font-[600] rounded-[6px] text-[1.3rem]">
          Apply Filter
        </button>
      </div>

      <!-- Table -->
      <div class="bg-[#FFFFFF] rounded-[10px] border border-[#EBEBEB] overflow-x-auto">
        <table class="w-full text-left text-[1.3rem]">
          <thead class="bg-[#F8FAFC] border-b border-[#EBEBEB] text-[#64748B] font-[600] uppercase text-[1.1rem]">
            <tr>
              <th class="py-[1.2rem] px-[1.6rem]">Recipient / Email</th>
              <th class="py-[1.2rem] px-[1.6rem]">Category</th>
              <th class="py-[1.2rem] px-[1.6rem]">Notification Type</th>
              <th class="py-[1.2rem] px-[1.6rem]">Status</th>
              <th class="py-[1.2rem] px-[1.6rem]">Consent / Unsubscribe Source</th>
              <th class="py-[1.2rem] px-[1.6rem]">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#EBEBEB]">
            <tr v-if="store.loadingPreferences">
              <td colspan="6" class="py-[3rem] text-center text-[#64748B]">Loading preferences...</td>
            </tr>
            <tr v-else-if="!store.preferences.length">
              <td colspan="6" class="py-[3rem] text-center text-[#64748B]">No notification preferences found.</td>
            </tr>
            <tr v-for="pref in store.preferences" :key="pref.id" class="hover:bg-[#F8FAFC]">
              <td class="py-[1.2rem] px-[1.6rem]">
                <div class="font-[600] text-[#0F172A]">{{ pref.email || 'N/A' }}</div>
                <div class="text-[1.1rem] text-[#64748B]">
                  {{ pref.recipientName || pref.notifiableType || 'USER' }} ({{ pref.tenantId || 'Global' }})
                </div>
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span class="font-[600] text-[#334155]">{{ pref.category || 'ALL' }}</span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono text-[1.2rem]">
                {{ pref.notificationType || 'CATEGORY_WIDE' }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span
                  class="px-[0.8rem] py-[0.2rem] rounded-full text-[1.1rem] font-[600]"
                  :class="pref.enabled ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#FCE8E6] text-[#C5221F]'"
                >
                  {{ pref.enabled ? 'Enabled' : 'Disabled (Opted Out)' }}
                </span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem] text-[#64748B]">
                <div v-if="pref.enabled">
                  <span class="font-[500] text-[#334155]">{{ pref.consentSource || 'USER_ACTION' }}</span>
                  <div v-if="pref.consentedAt" class="text-[1.1rem]">{{ formatDate(pref.consentedAt) }}</div>
                </div>
                <div v-else>
                  <span class="font-[500] text-[#C5221F]">{{ pref.unsubscribeSource || 'USER_ACTION' }}</span>
                  <div v-if="pref.unsubscribeReason" class="text-[1.1rem] italic">"{{ pref.unsubscribeReason }}"</div>
                </div>
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <button
                  @click="openEditPrefModal(pref)"
                  class="text-[#003366] font-[600] hover:underline"
                >
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="px-[1.6rem] py-[1.2rem] border-t border-[#EBEBEB] flex items-center justify-between">
          <div class="text-[1.2rem] text-[#64748B]">
            Page <span class="font-[600] text-[#0F172A]">{{ currentPage + 1 }}</span> of
            <span class="font-[600] text-[#0F172A]">{{ store.preferencePagination.totalPages || 1 }}</span>
            ({{ store.preferencePagination.totalElements || 0 }} total preferences)
          </div>
          <div class="flex items-center gap-x-[0.8rem]">
            <button
              @click="prevPage"
              :disabled="currentPage === 0 || activeLoading"
              class="px-[1.2rem] py-[0.6rem] border border-[#D0D5DD] rounded-[6px] text-[1.2rem] font-[600] disabled:opacity-50 hover:bg-[#F8FAFC]"
            >
              Previous
            </button>
            <button
              @click="nextPage"
              :disabled="currentPage + 1 >= store.preferencePagination.totalPages || activeLoading"
              class="px-[1.2rem] py-[0.6rem] border border-[#D0D5DD] rounded-[6px] text-[1.2rem] font-[600] disabled:opacity-50 hover:bg-[#F8FAFC]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: DELIVERIES -->
    <div v-if="activeTab === 'deliveries'" class="flex flex-col gap-y-[1.6rem]">
      <!-- Filter Bar -->
      <div class="bg-[#FFFFFF] p-[1.6rem] rounded-[10px] border border-[#EBEBEB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[1.2rem]">
        <input
          v-model="deliveryFilters.email"
          @keyup.enter="applyFilters"
          placeholder="Filter by Email"
          class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
        />
        <input
          v-model="deliveryFilters.tenantId"
          @keyup.enter="applyFilters"
          placeholder="Filter by Tenant ID"
          class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
        />
        <select v-model="deliveryFilters.status" @change="applyFilters" class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
          <option value="">All Statuses</option>
          <option value="SENT">SENT</option>
          <option value="SKIPPED_OPT_OUT">SKIPPED_OPT_OUT</option>
          <option value="SKIPPED_RATE_LIMITED">SKIPPED_RATE_LIMITED</option>
          <option value="SKIPPED_SUPPRESSED">SKIPPED_SUPPRESSED</option>
          <option value="SKIPPED_INVALID_CONTRACT">SKIPPED_INVALID_CONTRACT</option>
          <option value="FAILED">FAILED</option>
        </select>
        <select v-model="deliveryFilters.category" @change="applyFilters" class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
          <option value="">All Categories</option>
          <option value="REMINDER">REMINDER</option>
          <option value="TRANSACTIONAL">TRANSACTIONAL</option>
          <option value="SECURITY">SECURITY</option>
          <option value="MARKETING">MARKETING</option>
          <option value="BILLING">BILLING</option>
        </select>
        <button @click="applyFilters" class="px-[1.2rem] py-[0.8rem] bg-[#003366] text-white font-[600] rounded-[6px] text-[1.3rem]">
          Filter Delivery Logs
        </button>
      </div>

      <!-- Table -->
      <div class="bg-[#FFFFFF] rounded-[10px] border border-[#EBEBEB] overflow-x-auto">
        <table class="w-full text-left text-[1.3rem]">
          <thead class="bg-[#F8FAFC] border-b border-[#EBEBEB] text-[#64748B] font-[600] uppercase text-[1.1rem]">
            <tr>
              <th class="py-[1.2rem] px-[1.6rem]">Time</th>
              <th class="py-[1.2rem] px-[1.6rem]">Recipient / Tenant</th>
              <th class="py-[1.2rem] px-[1.6rem]">Notification Type</th>
              <th class="py-[1.2rem] px-[1.6rem]">Category</th>
              <th class="py-[1.2rem] px-[1.6rem]">Status</th>
              <th class="py-[1.2rem] px-[1.6rem]">Reason / Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#EBEBEB]">
            <tr v-if="store.loadingDeliveries">
              <td colspan="6" class="py-[3rem] text-center text-[#64748B]">Loading delivery logs...</td>
            </tr>
            <tr v-else-if="!store.deliveries.length">
              <td colspan="6" class="py-[3rem] text-center text-[#64748B]">No delivery logs recorded.</td>
            </tr>
            <tr v-for="log in store.deliveries" :key="log.id" class="hover:bg-[#F8FAFC]">
              <td class="py-[1.2rem] px-[1.6rem] whitespace-nowrap text-[#64748B]">
                {{ formatDate(log.createdAt) }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <div class="font-[600] text-[#0F172A]">{{ log.email || 'N/A' }}</div>
                <div class="text-[1.1rem] text-[#64748B]">{{ log.tenantId || 'Platform Global' }}</div>
              </td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono text-[1.2rem]">
                {{ log.notificationType }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem] font-[500]">
                {{ log.category }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span class="px-[0.8rem] py-[0.2rem] rounded-full text-[1.1rem] font-[600]" :class="getStatusBadge(log.status)">
                  {{ log.status }}
                </span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem] text-[#64748B]">
                {{ log.reason || '-' }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="px-[1.6rem] py-[1.2rem] border-t border-[#EBEBEB] flex items-center justify-between">
          <div class="text-[1.2rem] text-[#64748B]">
            Page <span class="font-[600] text-[#0F172A]">{{ currentPage + 1 }}</span> of
            <span class="font-[600] text-[#0F172A]">{{ store.deliveryPagination.totalPages || 1 }}</span>
            ({{ store.deliveryPagination.totalElements || 0 }} total delivery logs)
          </div>
          <div class="flex items-center gap-x-[0.8rem]">
            <button
              @click="prevPage"
              :disabled="currentPage === 0 || activeLoading"
              class="px-[1.2rem] py-[0.6rem] border border-[#D0D5DD] rounded-[6px] text-[1.2rem] font-[600] disabled:opacity-50 hover:bg-[#F8FAFC]"
            >
              Previous
            </button>
            <button
              @click="nextPage"
              :disabled="currentPage + 1 >= store.deliveryPagination.totalPages || activeLoading"
              class="px-[1.2rem] py-[0.6rem] border border-[#D0D5DD] rounded-[6px] text-[1.2rem] font-[600] disabled:opacity-50 hover:bg-[#F8FAFC]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: SUPPRESSIONS -->
    <div v-if="activeTab === 'suppressions'" class="flex flex-col gap-y-[1.6rem]">
      <!-- Table -->
      <div class="bg-[#FFFFFF] rounded-[10px] border border-[#EBEBEB] overflow-x-auto">
        <table class="w-full text-left text-[1.3rem]">
          <thead class="bg-[#F8FAFC] border-b border-[#EBEBEB] text-[#64748B] font-[600] uppercase text-[1.1rem]">
            <tr>
              <th class="py-[1.2rem] px-[1.6rem]">Suppressed Email</th>
              <th class="py-[1.2rem] px-[1.6rem]">Reason</th>
              <th class="py-[1.2rem] px-[1.6rem]">Suppressed Date</th>
              <th class="py-[1.2rem] px-[1.6rem]">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#EBEBEB]">
            <tr v-if="store.loadingSuppressions">
              <td colspan="4" class="py-[3rem] text-center text-[#64748B]">Loading suppression entries...</td>
            </tr>
            <tr v-else-if="!store.suppressions.length">
              <td colspan="4" class="py-[3rem] text-center text-[#64748B]">No email addresses are suppressed.</td>
            </tr>
            <tr v-for="item in store.suppressions" :key="item.id" class="hover:bg-[#F8FAFC]">
              <td class="py-[1.2rem] px-[1.6rem] font-[600] text-[#0F172A]">
                {{ item.email }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span class="px-[0.8rem] py-[0.2rem] bg-[#FEF2F2] text-[#DC2626] font-[600] text-[1.1rem] rounded-full uppercase">
                  {{ item.reason }}
                </span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem] text-[#64748B]">
                {{ formatDate(item.createdAt) }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <button
                  @click="handleRemoveSuppression(item.email)"
                  class="text-[#DC2626] font-[600] hover:underline"
                >
                  Remove Suppression
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="px-[1.6rem] py-[1.2rem] border-t border-[#EBEBEB] flex items-center justify-between">
          <div class="text-[1.2rem] text-[#64748B]">
            Page <span class="font-[600] text-[#0F172A]">{{ currentPage + 1 }}</span> of
            <span class="font-[600] text-[#0F172A]">{{ store.suppressionPagination.totalPages || 1 }}</span>
            ({{ store.suppressionPagination.totalElements || 0 }} total suppressed emails)
          </div>
          <div class="flex items-center gap-x-[0.8rem]">
            <button
              @click="prevPage"
              :disabled="currentPage === 0 || activeLoading"
              class="px-[1.2rem] py-[0.6rem] border border-[#D0D5DD] rounded-[6px] text-[1.2rem] font-[600] disabled:opacity-50 hover:bg-[#F8FAFC]"
            >
              Previous
            </button>
            <button
              @click="nextPage"
              :disabled="currentPage + 1 >= store.suppressionPagination.totalPages || activeLoading"
              class="px-[1.2rem] py-[0.6rem] border border-[#D0D5DD] rounded-[6px] text-[1.2rem] font-[600] disabled:opacity-50 hover:bg-[#F8FAFC]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: MONITORING & STATS -->
    <div v-if="activeTab === 'monitoring'" class="flex flex-col gap-y-[1.6rem]">
      <!-- Filter Bar -->
      <div class="bg-[#FFFFFF] rounded-[10px] border border-[#EBEBEB] p-[1.6rem] flex flex-col gap-y-[1.2rem]">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1.2rem]">
          <div>
            <label class="block text-[1.2rem] font-[600] text-[#334155] mb-[0.4rem]">Tenant ID</label>
            <input
              v-model="monitoringTenantId"
              placeholder="Leave blank for platform-wide"
              class="w-full px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
            />
          </div>
          <div>
            <label class="block text-[1.2rem] font-[600] text-[#334155] mb-[0.4rem]">From</label>
            <input v-model="statsFromDate" type="date" class="w-full px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]" />
          </div>
          <div>
            <label class="block text-[1.2rem] font-[600] text-[#334155] mb-[0.4rem]">To</label>
            <input v-model="statsToDate" type="date" class="w-full px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]" />
          </div>
          <div>
            <label class="block text-[1.2rem] font-[600] text-[#334155] mb-[0.4rem]">Category</label>
            <select v-model="statsCategory" class="w-full px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
              <option value="">All Categories</option>
              <option value="SECURITY">SECURITY</option>
              <option value="TRANSACTIONAL">TRANSACTIONAL</option>
              <option value="REMINDER">REMINDER</option>
              <option value="MARKETING">MARKETING</option>
              <option value="BILLING">BILLING</option>
            </select>
          </div>
          <div>
            <label class="block text-[1.2rem] font-[600] text-[#334155] mb-[0.4rem]">Notification Type</label>
            <input
              v-model="statsNotificationType"
              placeholder="e.g. order_confirmation"
              class="w-full px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
            />
          </div>
          <div>
            <label class="block text-[1.2rem] font-[600] text-[#334155] mb-[0.4rem]">Notifiable Type</label>
            <input
              v-model="statsNotifiableType"
              placeholder="e.g. Customer, Merchant"
              class="w-full px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
            />
          </div>
        </div>
        <div class="flex items-center justify-end gap-x-[1.2rem] pt-[0.8rem] border-t border-[#F1F5F9]">
          <button
            @click="applyMonitoringFilters"
            class="px-[1.6rem] py-[0.6rem] bg-[#003366] text-white rounded-[6px] text-[1.3rem] font-[600] hover:bg-[#002244]"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <!-- Rollup Trigger -->
      <div class="bg-[#FFFFFF] rounded-[10px] border border-[#EBEBEB] p-[1.6rem] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[1.2rem]">
        <div>
          <p v-if="monitoringStore.rollupResult" class="text-[1.3rem] text-[#1B1B19]">
            Last rollup: {{ monitoringStore.rollupResult.status }} — {{ monitoringStore.rollupResult.message }}
            <span v-if="monitoringStore.rollupResult.rowsProcessed !== undefined">
              ({{ monitoringStore.rollupResult.rowsProcessed }} rows processed)
            </span>
          </p>
          <p v-if="monitoringStore.rollupError" class="text-[1.3rem] text-[#DC2626]">{{ monitoringStore.rollupError }}</p>
          <p v-if="isRollupDisabled && monitoringStore.nextAllowedAt" class="text-[1.2rem] text-[#64748B]">
            Next rollup available at {{ formatDate(monitoringStore.nextAllowedAt) }}.
          </p>
        </div>
        <div class="flex items-center gap-x-[1rem]">
          <select v-model.number="rollupDays" class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
            <option :value="1">Last 1 day</option>
            <option :value="3">Last 3 days</option>
            <option :value="7">Last 7 days</option>
            <option :value="30">Last 30 days</option>
          </select>
          <button
            @click="refreshNotificationRollup"
            :disabled="isRollupDisabled"
            class="px-[1.6rem] py-[0.8rem] bg-[#003366] text-white rounded-[6px] text-[1.3rem] font-[600] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ monitoringStore.rollupRunning ? 'Refreshing…' : 'Refresh Rollup' }}
          </button>
        </div>
      </div>

      <div v-if="monitoringStore.overviewError" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700 text-[1.3rem]">
        {{ monitoringStore.overviewError }}
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1.6rem]">
        <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">Health</span>
          <div class="mt-[1rem]">
            <span
              class="px-[1rem] py-[0.4rem] rounded-full text-[1.4rem] font-[700]"
              :class="getHealthBadge(monitoringStore.overview?.health)"
            >
              {{ monitoringStore.overview?.health || 'UNKNOWN' }}
            </span>
          </div>
        </div>
        <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">24h Attempts</span>
          <span class="text-[2.8rem] font-[700] text-[#0F172A] tabular-nums mt-[1rem]">
            {{ Number(monitoringStore.overview?.last24HoursTotalAttempts || 0).toLocaleString() }}
          </span>
        </div>
        <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">24h Success Rate</span>
          <span class="text-[2.8rem] font-[700] text-[#137333] tabular-nums mt-[1rem]">
            {{ monitoringStore.overview?.last24HoursSuccessRate ?? 0 }}%
          </span>
        </div>
        <div class="bg-white rounded-[12px] p-[1.8rem] border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <span class="text-[1.2rem] font-[600] text-[#64748B] uppercase tracking-wider">Active Alerts</span>
          <span
            class="text-[2.8rem] font-[700] tabular-nums mt-[1rem]"
            :class="(monitoringStore.overview?.activeAlertsCount || 0) > 0 ? 'text-[#B06000]' : 'text-[#0F172A]'"
          >
            {{ monitoringStore.overview?.activeAlertsCount || 0 }}
          </span>
        </div>
      </div>

      <!-- Active Alerts Banner -->
      <div
        v-if="monitoringStore.overview?.alerts?.length"
        class="bg-[#FEF2F2] border-l-4 border-[#EF4444] p-[1.6rem] rounded-r-[8px] shadow-sm flex flex-col gap-y-[1.2rem]"
      >
        <div class="flex items-center gap-x-[0.8rem]">
          <span class="material-symbols-outlined text-[#DC2626] text-[2.2rem]">warning</span>
          <h3 class="text-[1.5rem] font-[700] text-[#991B1B]">
            {{ monitoringStore.overview.alerts.length }} Active Delivery {{ monitoringStore.overview.alerts.length === 1 ? 'Alert' : 'Alerts' }}
          </h3>
        </div>
        <div class="flex flex-col gap-y-[0.8rem]">
          <div
            v-for="(alert, idx) in monitoringStore.overview.alerts"
            :key="idx"
            class="flex flex-col sm:flex-row sm:items-center gap-[0.8rem] bg-white/80 p-[1.2rem] rounded-[6px] border border-[#FCA5A5]"
          >
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
        </div>
      </div>

      <div v-if="monitoringStore.statsError" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700 text-[1.3rem]">
        {{ monitoringStore.statsError }}
      </div>

      <!-- Daily Trend -->
      <section class="overflow-hidden rounded-[10px] bg-white border border-[#EBEBEB]">
        <h2 class="p-[1.6rem] pb-0 text-[1.6rem] font-[700] text-[#1B1B19]">Daily Delivery Trend</h2>
        <div class="p-[1.6rem]">
          <DataTable
            :table-header="dailyTrendHeader"
            :table-data="monitoringStore.stats?.dailyTrend || []"
            :loading="monitoringStore.loadingStats"
            :has-pagination="false"
          />
        </div>
      </section>

      <div class="grid grid-cols-1 gap-[1.6rem] xl:grid-cols-2">
        <section class="overflow-hidden rounded-[10px] bg-white border border-[#EBEBEB]">
          <h2 class="p-[1.6rem] pb-0 text-[1.6rem] font-[700] text-[#1B1B19]">Category Breakdown</h2>
          <div class="p-[1.6rem]">
            <DataTable
              :table-header="categoryBreakdownHeader"
              :table-data="monitoringStore.stats?.categoryBreakdown || []"
              :loading="monitoringStore.loadingStats"
              :has-pagination="false"
            />
          </div>
        </section>

        <section class="overflow-hidden rounded-[10px] bg-white border border-[#EBEBEB]">
          <h2 class="p-[1.6rem] pb-0 text-[1.6rem] font-[700] text-[#1B1B19]">Notification Type Breakdown</h2>
          <div class="p-[1.6rem]">
            <DataTable
              :table-header="notificationTypeBreakdownHeader"
              :table-data="monitoringStore.stats?.notificationTypeBreakdown || []"
              :loading="monitoringStore.loadingStats"
              :has-pagination="false"
            />
          </div>
        </section>
      </div>

      <section v-if="!monitoringTenantId" class="overflow-hidden rounded-[10px] bg-white border border-[#EBEBEB]">
        <h2 class="p-[1.6rem] pb-0 text-[1.6rem] font-[700] text-[#1B1B19]">Top Merchants by Notification Volume</h2>
        <div class="p-[1.6rem]">
          <DataTable
            :table-header="topTenantsHeader"
            :table-data="monitoringStore.stats?.topTenants || []"
            :loading="monitoringStore.loadingStats"
            :has-pagination="false"
          />
        </div>
      </section>
    </div>

    <!-- MODAL: EDIT PREFERENCE -->
    <div v-if="showEditPrefModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-[1.6rem] z-50">
      <div class="bg-white rounded-[12px] max-w-[480px] w-full p-[2.4rem] flex flex-col gap-y-[1.6rem]">
        <h3 class="text-[1.8rem] font-[700] text-[#1B1B19]">Edit Notification Preference</h3>

        <div class="text-[1.3rem] text-[#64748B]">
          Recipient: <strong class="text-[#0F172A]">{{ selectedPref?.email }}</strong><br />
          Category / Type: <span class="font-mono text-[#003366]">{{ selectedPref?.notificationType || selectedPref?.category }}</span>
        </div>

        <div class="flex flex-col gap-y-[1.2rem]">
          <label class="flex items-center gap-x-[0.8rem] cursor-pointer">
            <input type="checkbox" v-model="editPrefForm.enabled" class="w-4 h-4 text-[#003366] rounded" />
            <span class="text-[1.4rem] font-[600]">Enable Notifications</span>
          </label>

          <div v-if="editPrefForm.enabled && (selectedPref?.category === 'REMINDER' || selectedPref?.category === 'MARKETING')">
            <label class="block text-[1.2rem] font-[600] text-[#334155] mb-[0.4rem]">Consent Source (Required for Marketing/Reminder)</label>
            <input
              v-model="editPrefForm.consentSource"
              placeholder="e.g. MERCHANT_VERBAL_CONSENT, SUPPORT_TICKET_123"
              class="w-full px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
            />
          </div>

          <div>
            <label class="block text-[1.2rem] font-[600] text-[#334155] mb-[0.4rem]">Audit Reason / Note</label>
            <textarea
              v-model="editPrefForm.reason"
              rows="3"
              placeholder="Explain why this preference is being updated by admin"
              class="w-full px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-x-[1.2rem] pt-[1rem]">
          <button @click="showEditPrefModal = false" class="px-[1.6rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem] font-[600]">
            Cancel
          </button>
          <button
            @click="handleUpdatePref"
            :disabled="updatingPref"
            class="px-[1.6rem] py-[0.8rem] bg-[#003366] text-white rounded-[6px] text-[1.3rem] font-[600]"
          >
            {{ updatingPref ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD SUPPRESSION -->
    <div v-if="showAddSuppressionModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-[1.6rem] z-50">
      <div class="bg-white rounded-[12px] max-w-[440px] w-full p-[2.4rem] flex flex-col gap-y-[1.6rem]">
        <h3 class="text-[1.8rem] font-[700] text-[#1B1B19]">Suppress Email Address</h3>

        <div class="flex flex-col gap-y-[1.2rem]">
          <div>
            <label class="block text-[1.2rem] font-[600] text-[#334155] mb-[0.4rem]">Email Address</label>
            <input
              v-model="addSuppressionForm.email"
              placeholder="merchant@example.com"
              class="w-full px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
            />
          </div>

          <div>
            <label class="block text-[1.2rem] font-[600] text-[#334155] mb-[0.4rem]">Suppression Reason</label>
            <select v-model="addSuppressionForm.reason" class="w-full px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
              <option value="MANUAL_ADMIN">MANUAL_ADMIN</option>
              <option value="HARD_BOUNCE">HARD_BOUNCE</option>
              <option value="COMPLAINT">COMPLAINT</option>
              <option value="UNSUBSCRIBED">UNSUBSCRIBED</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-x-[1.2rem] pt-[1rem]">
          <button @click="showAddSuppressionModal = false" class="px-[1.6rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem] font-[600]">
            Cancel
          </button>
          <button
            @click="handleAddSuppression"
            :disabled="addingSuppression || !addSuppressionForm.email"
            class="px-[1.6rem] py-[0.8rem] bg-[#DC2626] text-white rounded-[6px] text-[1.3rem] font-[600]"
          >
            {{ addingSuppression ? 'Suppressing...' : 'Suppress Email' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
