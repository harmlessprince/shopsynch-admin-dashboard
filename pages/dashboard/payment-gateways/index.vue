<script setup>
import { ref, computed, onMounted } from "vue";
import { useAdminPaymentGatewaysStore } from "~/stores/adminPaymentGateways.store.js";
import { useAdminSettingsStore } from "~/stores/adminSettings.store.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-payment-gateways",
});

const gatewayStore = useAdminPaymentGatewaysStore();
const settingsStore = useAdminSettingsStore();
const toastStore = useToastStore();

const activeTab = ref("control"); // 'control' | 'health' | 'alerts'
const selectedCountry = ref("DEFAULT");
const countries = computed(() =>
  gatewayStore.settingsList.map((setting) => ({
    code: setting.country,
    name: setting.country === "DEFAULT" ? "Default (Global Fallback)" : setting.country,
  }))
);

const availableGateways = [
  { code: "PAYSTACK", name: "Paystack", description: "Cards, Bank Transfer, USSD" },
  { code: "MONNIFY", name: "Monnify", description: "Account Transfer, Cards, USSD" },
  { code: "FLUTTERWAVE", name: "Flutterwave", description: "Cards, Mobile Money, Bank Transfer" },
  { code: "STRIPE", name: "Stripe", description: "International card processing (USD/EUR/GBP)" },
  { code: "OFFLINE", name: "Offline", description: "Manual bank transfer or Cash on Delivery" },
];

// Setting draft state
const enabledGateways = ref([]);
const defaultGateway = ref("");
const affectedStores = ref(0);

// Modals
const showDisableModal = ref(false);
const pendingDisableGateway = ref(null);
const showResetModal = ref(false);
const pendingResetGateway = ref(null);

// Alert Recipients State
const alertEmailsInput = ref("");
const alertEmailErrors = ref("");
const savingAlerts = ref(false);
const alertSettingKey = "platformPaymentAlertEmails";

const currentCountrySetting = computed(() => {
  return gatewayStore.settingsList.find(
    (s) => (s.country || "")?.toUpperCase() === selectedCountry.value.toUpperCase()
  );
});

function syncCountrySetting() {
  const setting = currentCountrySetting.value;
  if (setting) {
    enabledGateways.value = (setting.gateways || [])
      .filter((gateway) => gateway.enabled)
      .map((gateway) => gateway.gateway);
    defaultGateway.value = setting.defaultGateway || enabledGateways.value[0] || "";
    affectedStores.value = setting.affectedStores ?? 0;
  } else {
    enabledGateways.value = [];
    defaultGateway.value = "";
    affectedStores.value = 0;
  }
}

async function loadData() {
  try {
    await Promise.all([
      gatewayStore.fetchGatewaySettings(),
      gatewayStore.fetchCircuits(),
      gatewayStore.fetchMetrics(),
      gatewayStore.fetchAuditLogs(selectedCountry.value),
      loadAlertRecipients(),
    ]);
    syncCountrySetting();
  } catch (err) {
    logger.error("Failed to load payment gateway data", err);
  }
}

async function handleCountryChange() {
  syncCountrySetting();
  await gatewayStore.fetchAuditLogs(selectedCountry.value);
}

function isGatewayEnabled(code) {
  return enabledGateways.value.includes(code);
}

function toggleGateway(code) {
  if (isGatewayEnabled(code)) {
    // If disabling, check if it's the default
    if (defaultGateway.value === code && enabledGateways.value.length > 1) {
      toastStore.error("Cannot disable the default gateway. Please select another default gateway first.");
      return;
    }
    // Check affected store count and confirm
    pendingDisableGateway.value = code;
    showDisableModal.value = true;
  } else {
    // Enabling
    enabledGateways.value.push(code);
  }
}

function confirmDisableGateway() {
  if (!pendingDisableGateway.value) return;
  enabledGateways.value = enabledGateways.value.filter((g) => g !== pendingDisableGateway.value);
  if (defaultGateway.value === pendingDisableGateway.value) {
    defaultGateway.value = enabledGateways.value[0] || "";
  }
  showDisableModal.value = false;
  pendingDisableGateway.value = null;
}

function setDefault(code) {
  if (!isGatewayEnabled(code)) {
    toastStore.error("A disabled gateway cannot be set as the default.");
    return;
  }
  defaultGateway.value = code;
}

async function saveCountrySettings() {
  if (enabledGateways.value.length === 0) {
    toastStore.error("At least one payment gateway must remain enabled.");
    return;
  }
  if (!enabledGateways.value.includes(defaultGateway.value)) {
    toastStore.error("The default gateway must be one of the enabled gateways.");
    return;
  }

  try {
    const payload = {
      enabledGateways: enabledGateways.value,
      defaultGateway: defaultGateway.value,
    };
    await gatewayStore.updateCountryGatewaySetting(selectedCountry.value, payload);
    syncCountrySetting();
  } catch (error) {
    const msg = error?.data?.message || error?.message || "Failed to update country gateway settings.";
    toastStore.error(msg);
  }
}

// Health & Circuit Reset
function promptResetCircuit(gateway) {
  pendingResetGateway.value = gateway;
  showResetModal.value = true;
}

async function confirmResetCircuit() {
  if (!pendingResetGateway.value) return;
  try {
    await gatewayStore.resetCircuit(pendingResetGateway.value);
    showResetModal.value = false;
    pendingResetGateway.value = null;
  } catch (error) {
    const msg = error?.data?.message || error?.message || "Failed to reset circuit breaker.";
    toastStore.error(msg);
  }
}

// Alert recipients management
async function loadAlertRecipients() {
  try {
    await settingsStore.fetchSettings({ category: "PAYMENT" });
    const setting = settingsStore.settings.find((s) => s.key === alertSettingKey);
    if (setting) {
      if (Array.isArray(setting.value)) {
        alertEmailsInput.value = setting.value.join(", ");
      } else if (typeof setting.value === "string") {
        alertEmailsInput.value = setting.value;
      }
    }
  } catch (err) {
    logger.error("Failed to load alert recipients setting", err);
  }
}

function parseEmails(str) {
  if (!str || !str.trim()) return [];
  return str
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

const currentRecipientsList = computed(() => {
  return parseEmails(alertEmailsInput.value);
});

async function saveAlertRecipients() {
  alertEmailErrors.value = "";
  const emails = parseEmails(alertEmailsInput.value);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const email of emails) {
    if (!emailRegex.test(email)) {
      alertEmailErrors.value = `"${email}" is not a valid email address.`;
      return;
    }
  }

  savingAlerts.value = true;
  try {
    const payloadValue = emails.join(",");
    await settingsStore.updateSettingValue(alertSettingKey, payloadValue);
  } catch (err) {
    alertEmailErrors.value = err?.data?.message || err?.message || "Failed to save alert recipients.";
  } finally {
    savingAlerts.value = false;
  }
}

const circuitByGateway = computed(() => {
  const byGateway = {};
  for (const circuit of gatewayStore.circuits || []) {
    byGateway[circuit.gateway] = circuit;
  }
  return byGateway;
});

const metricByGateway = computed(() => {
  const byGateway = {};
  for (const metric of gatewayStore.metrics || []) {
    byGateway[metric.gateway] = metric;
  }
  return byGateway;
});

const hasActiveCircuitsAlert = computed(() => {
  return (gatewayStore.circuits || []).some((circuit) => circuit?.state === "OPEN");
});

onMounted(loadData);
</script>

<template>
  <div class="space-y-[2rem] text-[1.4rem] text-dashboard_text_color">
    <!-- Header -->
    <section class="rounded-[12px] bg-white p-[2.4rem] shadow-sm border border-slate-100">
      <div class="flex flex-col gap-[1.6rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-[2.2rem] font-[700] text-slate-900">Payment Gateway Management</h1>
          <p class="mt-[0.4rem] text-slate-600">
            Control per-country gateway routing, monitor live circuit health &amp; metrics, and configure platform incident alert recipients.
          </p>
        </div>
        <div class="flex items-center gap-[1rem]">
          <button
            class="rounded-[8px] border border-slate-200 px-[1.6rem] py-[0.9rem] font-[600] text-slate-700 hover:bg-slate-50 transition"
            @click="loadData"
          >
            Refresh Data
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="mt-[2rem] flex border-b border-slate-200 text-[1.5rem] font-[600]">
        <button
          class="border-b-2 px-[2rem] py-[1.2rem] transition-colors"
          :class="activeTab === 'control' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'control'"
        >
          Country Routing &amp; Audit Trail
        </button>
        <button
          class="flex items-center gap-[0.8rem] border-b-2 px-[2rem] py-[1.2rem] transition-colors"
          :class="activeTab === 'health' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'health'"
        >
          Health, Circuits &amp; Metrics
          <span
            v-if="hasActiveCircuitsAlert"
            class="rounded-full bg-red-100 px-[0.8rem] py-[0.2rem] text-[1.1rem] font-[700] text-red-700"
          >
            Alert
          </span>
        </button>
        <button
          class="border-b-2 px-[2rem] py-[1.2rem] transition-colors"
          :class="activeTab === 'alerts' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'alerts'"
        >
          Alert Recipients
        </button>
      </div>
    </section>

    <!-- TAB 1: Country Gateway Controls & History (Issues 001 & 003) -->
    <div v-if="activeTab === 'control'" class="space-y-[2rem]">
      <section class="rounded-[12px] bg-white p-[2.4rem] shadow-sm border border-slate-100">
        <div class="flex flex-col gap-[1.6rem] sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-[1.6rem] mb-[2rem]">
          <div>
            <h2 class="text-[1.8rem] font-[700] text-slate-900">Per-Country Gateway Controls</h2>
            <p class="text-slate-500 text-[1.3rem] mt-[0.2rem]">
              Configure which payment providers are active for stores in this country, and set the primary default.
            </p>
          </div>
          <div class="flex items-center gap-[1.2rem]">
            <label class="text-[1.3rem] font-[600] text-slate-700">Country:</label>
            <select
              v-model="selectedCountry"
              class="rounded-[8px] border border-slate-300 px-[1.4rem] py-[0.8rem] font-[600] text-slate-800 bg-white shadow-sm"
              @change="handleCountryChange"
            >
              <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.name }}</option>
            </select>
          </div>
        </div>

        <!-- Gateway Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1.6rem]">
          <div
            v-for="gw in availableGateways"
            :key="gw.code"
            class="rounded-[10px] border p-[1.8rem] transition flex flex-col justify-between"
            :class="isGatewayEnabled(gw.code) ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50/70 opacity-75'"
          >
            <div>
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-[1.6rem] font-[700] text-slate-900 flex items-center gap-[0.8rem]">
                    {{ gw.name }}
                    <span
                      v-if="defaultGateway === gw.code"
                      class="rounded-full bg-emerald-100 text-emerald-800 text-[1.1rem] px-[0.8rem] py-[0.2rem] font-[700]"
                    >
                      Default
                    </span>
                  </h3>
                  <p class="text-[1.2rem] text-slate-500 mt-[0.2rem]">{{ gw.description }}</p>
                </div>
                <!-- Toggle switch -->
                <button
                  type="button"
                  class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  :class="isGatewayEnabled(gw.code) ? 'bg-primary' : 'bg-slate-300'"
                  @click="toggleGateway(gw.code)"
                >
                  <span
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    :class="isGatewayEnabled(gw.code) ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </div>
            </div>

            <!-- Set as Default Action -->
            <div class="mt-[1.6rem] pt-[1.2rem] border-t border-slate-100 flex items-center justify-between">
              <span class="text-[1.2rem] font-[500]" :class="isGatewayEnabled(gw.code) ? 'text-slate-600' : 'text-slate-400'">
                Primary country default:
              </span>
              <button
                type="button"
                :disabled="!isGatewayEnabled(gw.code) || defaultGateway === gw.code"
                class="text-[1.2rem] font-[700] px-[1rem] py-[0.4rem] rounded-[6px] transition"
                :class="defaultGateway === gw.code ? 'bg-emerald-50 text-emerald-700 cursor-default' : 'text-primary hover:bg-primary/10 disabled:text-slate-400 disabled:hover:bg-transparent'"
                @click="setDefault(gw.code)"
              >
                {{ defaultGateway === gw.code ? 'Active Default' : 'Make Default' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="mt-[2.4rem] flex justify-end border-t border-slate-100 pt-[1.6rem]">
          <button
            type="button"
            class="rounded-[8px] bg-primary px-[2.4rem] py-[1.1rem] font-[700] text-white hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            :disabled="gatewayStore.savingSettings"
            @click="saveCountrySettings"
          >
            {{ gatewayStore.savingSettings ? "Saving Settings..." : `Save ${selectedCountry} Settings` }}
          </button>
        </div>
      </section>

      <!-- Audit Trail Section (Issue 003) -->
      <section class="rounded-[12px] bg-white p-[2.4rem] shadow-sm border border-slate-100">
        <div class="flex items-center justify-between mb-[1.6rem]">
          <div>
            <h2 class="text-[1.8rem] font-[700] text-slate-900">Gateway Setting Change History</h2>
            <p class="text-slate-500 text-[1.3rem]">
              Audit trail of gateway enablement and default configuration changes for {{ selectedCountry }}.
            </p>
          </div>
          <button
            class="text-[1.3rem] font-[600] text-primary hover:underline"
            @click="gatewayStore.fetchAuditLogs(selectedCountry)"
          >
            Refresh History
          </button>
        </div>

        <div v-if="gatewayStore.loadingAuditLogs" class="py-[3rem] text-center text-slate-400">
          Loading audit logs...
        </div>

        <div v-else-if="!gatewayStore.auditLogs || gatewayStore.auditLogs.length === 0" class="rounded-[8px] border border-dashed border-slate-200 p-[3rem] text-center text-slate-500">
          No gateway setting changes recorded yet for {{ selectedCountry }}.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-[1.3rem]">
            <thead>
              <tr class="border-b border-slate-200 text-slate-500 font-[600]">
                <th class="py-[1.2rem] px-[1rem]">Timestamp</th>
                <th class="py-[1.2rem] px-[1rem]">Actor</th>
                <th class="py-[1.2rem] px-[1rem]">Action</th>
                <th class="py-[1.2rem] px-[1rem]">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-800">
              <tr v-for="log in gatewayStore.auditLogs" :key="log.id || log._id" class="hover:bg-slate-50/60">
                <td class="py-[1.2rem] px-[1rem] whitespace-nowrap text-slate-500">
                  {{ log.timestamp || log.createdAt ? new Date(log.timestamp || log.createdAt).toLocaleString() : "—" }}
                </td>
                <td class="py-[1.2rem] px-[1rem] font-[500]">
                  {{ log.actorEmail || log.actorId || "System" }}
                </td>
                <td class="py-[1.2rem] px-[1rem]">
                  <span class="rounded bg-slate-100 px-[0.8rem] py-[0.2rem] font-mono text-[1.2rem]">
                    {{ log.action || "UPDATE_SETTINGS" }}
                  </span>
                </td>
                <td class="py-[1.2rem] px-[1rem] text-slate-600">
                  <span v-if="log.metadata?.enabledGateways">
                    Enabled: <strong>{{ log.metadata.enabledGateways.join(', ') }}</strong>
                  </span>
                  <span v-if="log.metadata?.defaultGateway" class="ml-[0.8rem]">
                    | Default: <strong>{{ log.metadata.defaultGateway }}</strong>
                  </span>
                  <span v-if="!log.metadata?.enabledGateways && !log.metadata?.defaultGateway">
                    {{ log.description || log.newValue || "Settings modified" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- TAB 2: Health, Circuits & Metrics (Issue 002) -->
    <div v-if="activeTab === 'health'" class="space-y-[2rem]">
      <!-- Alert Banner -->
      <div
        v-if="hasActiveCircuitsAlert"
        class="rounded-[10px] border border-red-200 bg-red-50 p-[1.6rem] text-red-800 flex items-center justify-between"
      >
        <div class="flex items-center gap-[1.2rem]">
          <span class="material-symbols-outlined text-[2.4rem] text-red-600">warning</span>
          <div>
            <h4 class="font-[700] text-[1.5rem]">Payment Gateway Outage Alert</h4>
            <p class="text-[1.3rem] text-red-700">
              One or more payment gateway circuit breakers have tripped open due to elevated error rates. Checkout traffic is failing over automatically.
            </p>
          </div>
        </div>
      </div>

      <section class="rounded-[12px] bg-white p-[2.4rem] shadow-sm border border-slate-100">
        <div class="mb-[2rem]">
          <h2 class="text-[1.8rem] font-[700] text-slate-900">Live Gateway Circuit Breakers</h2>
          <p class="text-slate-500 text-[1.3rem]">
            Real-time circuit status, recent failure rates, retry timers, and manual reset controls.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1.6rem]">
          <div
            v-for="gw in availableGateways"
            :key="gw.code"
            class="rounded-[10px] border border-slate-200 p-[1.8rem] shadow-sm bg-white flex flex-col justify-between"
          >
            <div>
              <div class="flex items-center justify-between border-b border-slate-100 pb-[1.2rem]">
                <h3 class="text-[1.6rem] font-[700] text-slate-900">{{ gw.name }}</h3>
                <!-- Circuit Status Badge -->
                <span
                  class="rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[700]"
                  :class="{
                    'bg-emerald-100 text-emerald-800': (circuitByGateway[gw.code]?.state || 'CLOSED') === 'CLOSED',
                    'bg-rose-100 text-rose-800': (circuitByGateway[gw.code]?.state || '') === 'OPEN',
                    'bg-amber-100 text-amber-800': (circuitByGateway[gw.code]?.state || '') === 'HALF_OPEN',
                  }"
                >
                  {{ circuitByGateway[gw.code]?.state || "CLOSED" }}
                </span>
              </div>

              <div class="mt-[1.4rem] space-y-[0.8rem] text-[1.3rem]">
                <div class="flex justify-between text-slate-600">
                  <span>Recent Failures:</span>
                  <span class="font-[600] text-slate-900">
                    {{ circuitByGateway[gw.code]?.consecutiveFailures ?? 0 }}
                  </span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>Success Rate:</span>
                  <span
                    class="font-[600]"
                    :class="metricByGateway[gw.code]?.successRatePercent != null && metricByGateway[gw.code].successRatePercent < 90 ? 'text-rose-600 font-[700]' : 'text-slate-900'"
                  >
                    {{ metricByGateway[gw.code]?.successRatePercent != null ? metricByGateway[gw.code].successRatePercent + '%' : '—' }}
                  </span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>Average Latency:</span>
                  <span class="font-[600] text-slate-900">
                    {{ metricByGateway[gw.code]?.averageLatencyMillis != null ? metricByGateway[gw.code].averageLatencyMillis + 'ms' : '—' }}
                  </span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>Fallback Rate:</span>
                  <span class="font-[600] text-slate-900">
                    {{ metricByGateway[gw.code]?.fallbackRatePercent != null ? metricByGateway[gw.code].fallbackRatePercent + '%' : '—' }}
                  </span>
                </div>
                <div v-if="circuitByGateway[gw.code]?.openedAt" class="flex justify-between text-slate-600">
                  <span>Opened At:</span>
                  <span class="font-[600] text-slate-900">
                    {{ new Date(circuitByGateway[gw.code].openedAt).toLocaleTimeString() }}
                  </span>
                </div>
                <div v-if="circuitByGateway[gw.code]?.nextTrialAt" class="flex justify-between text-slate-600">
                  <span>Next Retry:</span>
                  <span class="font-[600] text-amber-700">
                    {{ new Date(circuitByGateway[gw.code].nextTrialAt).toLocaleTimeString() }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-[1.8rem] pt-[1.2rem] border-t border-slate-100 flex justify-end">
              <button
                type="button"
                class="rounded-[6px] border border-slate-300 px-[1.2rem] py-[0.6rem] text-[1.2rem] font-[700] text-slate-700 hover:bg-slate-50 transition"
                @click="promptResetCircuit(gw.code)"
              >
                Reset Circuit
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- TAB 3: Platform Payment Alert Recipients (Issue 005) -->
    <div v-if="activeTab === 'alerts'" class="space-y-[2rem]">
      <section class="rounded-[12px] bg-white p-[2.4rem] shadow-sm border border-slate-100 max-w-[80rem]">
        <div class="mb-[2rem]">
          <h2 class="text-[1.8rem] font-[700] text-slate-900">Platform Payment Incident Alert Recipients</h2>
          <p class="text-slate-600 text-[1.3rem] mt-[0.4rem]">
            Team members who receive immediate email alerts when ShopSynch's platform payment gateway credentials fail, are rejected, or become valid again.
          </p>
        </div>

        <!-- Empty state warning -->
        <div
          v-if="currentRecipientsList.length === 0"
          class="rounded-[8px] bg-amber-50 border border-amber-200 p-[1.4rem] text-amber-800 text-[1.3rem] mb-[1.8rem]"
        >
          <strong>No recipients configured.</strong> Platform gateway errors will not trigger automated incident emails until at least one recipient is specified.
        </div>

        <!-- Recipients tags preview -->
        <div v-else class="mb-[1.8rem]">
          <label class="block text-[1.2rem] font-[700] text-slate-700 mb-[0.6rem]">Currently Alerted:</label>
          <div class="flex flex-wrap gap-[0.8rem]">
            <span
              v-for="email in currentRecipientsList"
              :key="email"
              class="inline-flex items-center gap-[0.4rem] rounded-full bg-slate-100 px-[1.2rem] py-[0.4rem] text-[1.3rem] font-[600] text-slate-800"
            >
              <span class="material-symbols-outlined text-[1.6rem] text-slate-500">mail</span>
              {{ email }}
            </span>
          </div>
        </div>

        <!-- Form -->
        <form class="space-y-[1.6rem]" @submit.prevent="saveAlertRecipients">
          <div>
            <label for="alertEmailsInput" class="block text-[1.3rem] font-[700] text-slate-800 mb-[0.4rem]">
              Recipient Email Addresses
            </label>
            <p class="text-[1.2rem] text-slate-500 mb-[0.8rem]">
              Enter email addresses separated by commas (e.g. <code>devops@shopsynch.com, alerts@shopsynch.com</code>).
            </p>
            <textarea
              id="alertEmailsInput"
              v-model="alertEmailsInput"
              rows="3"
              class="w-full rounded-[8px] border border-slate-300 p-[1.2rem] font-mono text-[1.3rem] text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="admin@shopsynch.com, engineering@shopsynch.com"
            />
            <p v-if="alertEmailErrors" class="mt-[0.4rem] text-[1.2rem] font-[600] text-rose-600">
              {{ alertEmailErrors }}
            </p>
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              class="rounded-[8px] bg-primary px-[2rem] py-[1rem] font-[700] text-white hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
              :disabled="savingAlerts"
            >
              {{ savingAlerts ? "Saving Recipients..." : "Save Alert Recipients" }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <!-- Confirmation Modal for Disabling Gateway -->
    <div
      v-if="showDisableModal"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-[48rem] rounded-[12px] bg-white p-[2.4rem] shadow-xl border border-slate-200">
        <h3 class="text-[1.8rem] font-[700] text-slate-900 flex items-center gap-[0.8rem]">
          <span class="material-symbols-outlined text-amber-600">warning</span>
          Disable Payment Gateway?
        </h3>
        <p class="mt-[1.2rem] text-[1.4rem] text-slate-600 leading-relaxed">
          Are you sure you want to disable <strong>{{ pendingDisableGateway?.toUpperCase() }}</strong> for {{ selectedCountry }}?
        </p>
        <div class="mt-[1.4rem] rounded-[8px] bg-amber-50 border border-amber-200 p-[1.2rem] text-amber-900 text-[1.3rem]">
          <strong>Impact:</strong> This change affects approximately <strong>{{ affectedStores }} stores</strong> in this entry. New checkouts will immediately failover to other enabled gateways.
        </div>
        <div class="mt-[2.4rem] flex justify-end gap-[1.2rem]">
          <button
            type="button"
            class="rounded-[8px] border border-slate-300 px-[1.6rem] py-[0.8rem] font-[600] text-slate-700 hover:bg-slate-50 transition"
            @click="showDisableModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-[8px] bg-rose-600 px-[1.8rem] py-[0.8rem] font-[700] text-white hover:bg-rose-700 transition"
            @click="confirmDisableGateway"
          >
            Confirm &amp; Disable
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal for Circuit Breaker Reset -->
    <div
      v-if="showResetModal"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-[44rem] rounded-[12px] bg-white p-[2.4rem] shadow-xl border border-slate-200">
        <h3 class="text-[1.8rem] font-[700] text-slate-900">
          Reset Circuit Breaker?
        </h3>
        <p class="mt-[1.2rem] text-[1.4rem] text-slate-600 leading-relaxed">
          Manually resetting the circuit breaker for <strong>{{ pendingResetGateway?.toUpperCase() }}</strong> will force the circuit state to CLOSED and resume live transaction attempts.
        </p>
        <div class="mt-[2.4rem] flex justify-end gap-[1.2rem]">
          <button
            type="button"
            class="rounded-[8px] border border-slate-300 px-[1.6rem] py-[0.8rem] font-[600] text-slate-700 hover:bg-slate-50 transition"
            @click="showResetModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-[8px] bg-primary px-[1.8rem] py-[0.8rem] font-[700] text-white hover:bg-primary/90 transition"
            @click="confirmResetCircuit"
          >
            Confirm Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
