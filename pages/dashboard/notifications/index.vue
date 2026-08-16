<script setup>
import { ref, onMounted, watch } from "vue";
import { useAdminNotificationOperationsStore } from "~/stores/adminNotificationOperations.store.js";
import { formatDate } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-notifications-operations",
});

useHead({
  title: "Notification Operations - ShopSynch Admin",
});

const store = useAdminNotificationOperationsStore();

const activeTab = ref("preferences");

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

// Filters for Scheduler Runs
const schedulerFilters = ref({
  schedulerName: "",
  status: "",
});

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

// Scheduler Detail Drawer state
const showSchedulerDrawer = ref(false);

const loadActiveTabData = async () => {
  if (activeTab.value === "preferences") {
    await store.fetchPreferences(cleanParams(prefFilters.value));
  } else if (activeTab.value === "deliveries") {
    await store.fetchDeliveries(cleanParams(deliveryFilters.value));
  } else if (activeTab.value === "suppressions") {
    await store.fetchSuppressions(cleanParams(suppressionFilters.value));
  } else if (activeTab.value === "scheduler-runs") {
    await store.fetchSchedulerRuns(cleanParams(schedulerFilters.value));
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

watch(activeTab, () => {
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

const openSchedulerDetail = async (run) => {
  await store.fetchSchedulerRunDetail(run.id);
  showSchedulerDrawer.value = true;
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
</script>

<template>
  <div class="p-[1.6rem] lg:p-[2.4rem] flex flex-col gap-y-[2rem]">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-y-[1rem]">
      <div>
        <h1 class="text-[2rem] lg:text-[2.4rem] font-[700] text-[#1B1B19]">Notification Operations</h1>
        <p class="text-[1.3rem] text-[#616161] mt-[0.2rem]">
          Monitor deliverability health, opt-out preferences, suppression entries, and scheduler execution logs.
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
        @click="activeTab = 'scheduler-runs'"
        class="pb-[1rem] text-[1.4rem] font-[600] border-b-2 transition-colors duration-150"
        :class="activeTab === 'scheduler-runs' ? 'border-[#003366] text-[#003366]' : 'border-transparent text-[#616161] hover:text-[#1B1B19]'"
      >
        Scheduler Runs
      </button>
    </div>

    <!-- TAB 1: PREFERENCES -->
    <div v-if="activeTab === 'preferences'" class="flex flex-col gap-y-[1.6rem]">
      <!-- Filter Bar -->
      <div class="bg-[#FFFFFF] p-[1.6rem] rounded-[10px] border border-[#EBEBEB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[1.2rem]">
        <input
          v-model="prefFilters.email"
          @keyup.enter="loadActiveTabData"
          placeholder="Filter by Email"
          class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
        />
        <input
          v-model="prefFilters.tenantId"
          @keyup.enter="loadActiveTabData"
          placeholder="Filter by Tenant ID"
          class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
        />
        <select v-model="prefFilters.category" @change="loadActiveTabData" class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
          <option value="">All Categories</option>
          <option value="SECURITY">SECURITY</option>
          <option value="TRANSACTIONAL">TRANSACTIONAL</option>
          <option value="REMINDER">REMINDER</option>
          <option value="MARKETING">MARKETING</option>
          <option value="BILLING">BILLING</option>
        </select>
        <select v-model="prefFilters.enabled" @change="loadActiveTabData" class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
          <option value="">All Statuses</option>
          <option value="true">Enabled (Opted In)</option>
          <option value="false">Disabled (Opted Out)</option>
        </select>
        <button @click="loadActiveTabData" class="px-[1.2rem] py-[0.8rem] bg-[#003366] text-white font-[600] rounded-[6px] text-[1.3rem]">
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
      </div>
    </div>

    <!-- TAB 2: DELIVERIES -->
    <div v-if="activeTab === 'deliveries'" class="flex flex-col gap-y-[1.6rem]">
      <!-- Filter Bar -->
      <div class="bg-[#FFFFFF] p-[1.6rem] rounded-[10px] border border-[#EBEBEB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[1.2rem]">
        <input
          v-model="deliveryFilters.email"
          @keyup.enter="loadActiveTabData"
          placeholder="Filter by Email"
          class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
        />
        <input
          v-model="deliveryFilters.tenantId"
          @keyup.enter="loadActiveTabData"
          placeholder="Filter by Tenant ID"
          class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]"
        />
        <select v-model="deliveryFilters.status" @change="loadActiveTabData" class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
          <option value="">All Statuses</option>
          <option value="SENT">SENT</option>
          <option value="SKIPPED_OPT_OUT">SKIPPED_OPT_OUT</option>
          <option value="SKIPPED_RATE_LIMITED">SKIPPED_RATE_LIMITED</option>
          <option value="SKIPPED_SUPPRESSED">SKIPPED_SUPPRESSED</option>
          <option value="SKIPPED_INVALID_CONTRACT">SKIPPED_INVALID_CONTRACT</option>
          <option value="FAILED">FAILED</option>
        </select>
        <select v-model="deliveryFilters.category" @change="loadActiveTabData" class="px-[1.2rem] py-[0.8rem] border border-[#D0D5DD] rounded-[6px] text-[1.3rem]">
          <option value="">All Categories</option>
          <option value="REMINDER">REMINDER</option>
          <option value="TRANSACTIONAL">TRANSACTIONAL</option>
          <option value="SECURITY">SECURITY</option>
          <option value="MARKETING">MARKETING</option>
          <option value="BILLING">BILLING</option>
        </select>
        <button @click="loadActiveTabData" class="px-[1.2rem] py-[0.8rem] bg-[#003366] text-white font-[600] rounded-[6px] text-[1.3rem]">
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
      </div>
    </div>

    <!-- TAB 4: SCHEDULER RUNS -->
    <div v-if="activeTab === 'scheduler-runs'" class="flex flex-col gap-y-[1.6rem]">
      <!-- Table -->
      <div class="bg-[#FFFFFF] rounded-[10px] border border-[#EBEBEB] overflow-x-auto">
        <table class="w-full text-left text-[1.3rem]">
          <thead class="bg-[#F8FAFC] border-b border-[#EBEBEB] text-[#64748B] font-[600] uppercase text-[1.1rem]">
            <tr>
              <th class="py-[1.2rem] px-[1.6rem]">Scheduler Name</th>
              <th class="py-[1.2rem] px-[1.6rem]">Status</th>
              <th class="py-[1.2rem] px-[1.6rem]">Scanned</th>
              <th class="py-[1.2rem] px-[1.6rem]">Eligible</th>
              <th class="py-[1.2rem] px-[1.6rem]">Sent</th>
              <th class="py-[1.2rem] px-[1.6rem]">Skipped</th>
              <th class="py-[1.2rem] px-[1.6rem]">Run Time</th>
              <th class="py-[1.2rem] px-[1.6rem]">Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#EBEBEB]">
            <tr v-if="store.loadingSchedulerRuns">
              <td colspan="8" class="py-[3rem] text-center text-[#64748B]">Loading scheduler run logs...</td>
            </tr>
            <tr v-else-if="!store.schedulerRuns.length">
              <td colspan="8" class="py-[3rem] text-center text-[#64748B]">No scheduler execution runs recorded.</td>
            </tr>
            <tr v-for="run in store.schedulerRuns" :key="run.id" class="hover:bg-[#F8FAFC]">
              <td class="py-[1.2rem] px-[1.6rem] font-[600] text-[#0F172A]">
                {{ run.schedulerName }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <span class="px-[0.8rem] py-[0.2rem] rounded-full text-[1.1rem] font-[600]" :class="getStatusBadge(run.status)">
                  {{ run.status }}
                </span>
              </td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono">{{ run.merchantsScanned || 0 }}</td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono">{{ run.eligibleCount || 0 }}</td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono text-[#137333] font-[600]">{{ run.sentCount || 0 }}</td>
              <td class="py-[1.2rem] px-[1.6rem] font-mono text-[#B06000]">{{ run.skippedCount || 0 }}</td>
              <td class="py-[1.2rem] px-[1.6rem] text-[#64748B] whitespace-nowrap">
                {{ formatDate(run.createdAt) }}
              </td>
              <td class="py-[1.2rem] px-[1.6rem]">
                <button @click="openSchedulerDetail(run)" class="text-[#003366] font-[600] hover:underline">
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
