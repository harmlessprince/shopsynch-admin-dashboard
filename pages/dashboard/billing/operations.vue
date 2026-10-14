<script setup>
import { logger, formatDate, formatToMoney } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-operations",
});

useHead({
  title: "Billing Overrides & Extensions - ShopSynch Admin",
});

const billingOperationsStore = useAdminBillingOperationsStore();
const authStore = useAuthStore();

const isSuperAdmin = computed(() => {
  const r = authStore.user?.role;
  const name = typeof r === "string" ? r : (r?.name || r?.slug || "");
  const normalized = name.toLowerCase().replace(/[\s_-]+/g, "");
  return normalized.includes("superadmin");
});

const showResyncModal = ref(false);
const resyncedCount = ref(null);

const retiredAuditLogs = ref([]);
const loadingRetiredLogs = ref(false);
const retiredTenantFilter = ref("");

async function loadRetiredPlanLogs() {
  loadingRetiredLogs.value = true;
  try {
    const params = { reason: "plan_retired" };
    if (retiredTenantFilter.value.trim()) {
      params.tenantId = retiredTenantFilter.value.trim();
    }
    const logs = await billingOperationsStore.fetchAuditLogs(params);
    retiredAuditLogs.value = logs || [];
  } catch (err) {
    logger.error("Failed to load retired plan logs", err);
  } finally {
    loadingRetiredLogs.value = false;
  }
}

async function handleConfirmResync() {
  try {
    const count = await billingOperationsStore.resyncSubscriptionsToTest();
    resyncedCount.value = count;
    showResyncModal.value = false;
  } catch (err) {
    logger.error("Failed to resync subscriptions to test", err);
  }
}

onMounted(async () => {
  await loadRetiredPlanLogs();
});

const tenantId = ref("");
const searchedTenantId = ref("");
const overrideJsonError = ref("");
const revokeReasonById = ref({});
const invoiceStatusFilter = ref("");
const invoiceConfirmForms = ref({});

const overrideScopes = [
  "SUBSCRIPTION_REQUIRED",
  "GRACE_PERIOD",
  "CHECKOUT_FEE",
  "API_LIMIT",
  "PLAN_FEATURE",
  "MANUAL_RENEWAL",
  "FAILED_PAYMENT_FLAG",
];

const overrideForm = ref({
  scope: "SUBSCRIPTION_REQUIRED",
  startDate: "",
  endDate: "",
  reason: "",
  overrideValueJson: "{}",
});

const generateCodeForm = ref({
  extensionDays: "30",
  singleUse: true,
  maxRedemptions: "1",
  expiresAt: "",
  reason: "",
});

const applyCodeForm = ref({
  code: "",
});

const directExtensionForm = ref({
  extensionDays: "30",
  reason: "",
});

const invoiceStatusOptions = [
  { label: "All invoices", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Paid", value: "PAID" },
  { label: "Cancelled", value: "CANCELLED" },
];

const snapshot = computed(() => billingOperationsStore.tenantSnapshot);
const subscription = computed(() => snapshot.value?.subscription || null);
const activeOverrides = computed(() => snapshot.value?.activeOverrides || []);
const extensionCodes = computed(() => snapshot.value?.extensionCodes || []);
const recentEvents = computed(() => snapshot.value?.recentEvents || []);
const tenantInvoices = computed(() => billingOperationsStore.tenantInvoices || []);
const hasSearched = computed(() => Boolean(searchedTenantId.value));

const statusBadgeClass = {
  ACTIVE: "bg-[#B5F9B4] text-[#3CA745]",
  TRIALING: "bg-[#D0E8FF] text-[#335C85]",
  GRACE: "bg-[#FFF0C2] text-[#8A5A00]",
  PENDING_PAYMENT: "bg-[#D0E8FF] text-[#335C85]",
  PAST_DUE: "bg-[#FFF0C2] text-[#8A5A00]",
  RENEWAL_PENDING: "bg-[#D0E8FF] text-[#335C85]",
  EXPIRED: "bg-[#FFBFBF] text-[#B42318]",
  CANCELLED: "bg-[#F3F4F6] text-[#6B7280]",
  SUSPENDED: "bg-[#FFBFBF] text-[#B42318]",
  EXEMPTED: "bg-[#F4E8FF] text-[#6D28D9]",
  USED: "bg-[#F3F4F6] text-[#6B7280]",
  REVOKED: "bg-[#FFBFBF] text-[#B42318]",
  PENDING: "bg-[#FFF0C2] text-[#8A5A00]",
  PAID: "bg-[#B5F9B4] text-[#3CA745]",
  CANCELLED: "bg-[#F3F4F6] text-[#6B7280]",
};

function labelize(value) {
  return String(value || "").replace(/_/g, " ");
}

function toIsoDateTime(value) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function displayCurrency(currency) {
  if (currency === "NGN" || !currency) return "₦";
  return `${currency} `;
}

function money(amount, currency) {
  return formatToMoney(Number(amount || 0), displayCurrency(currency));
}

function invoiceForm(invoiceId) {
  if (!invoiceConfirmForms.value[invoiceId]) {
    invoiceConfirmForms.value = {
      ...invoiceConfirmForms.value,
      [invoiceId]: {
        reference: "",
        paymentDate: "",
        note: "",
      },
    };
  }
  return invoiceConfirmForms.value[invoiceId];
}

function parseOverrideValue() {
  if (!String(overrideForm.value.overrideValueJson || "").trim()) return {};
  try {
    const parsed = JSON.parse(overrideForm.value.overrideValueJson);
    if (Array.isArray(parsed) || typeof parsed !== "object" || parsed === null) {
      throw new Error("Override value must be a JSON object.");
    }
    return parsed;
  } catch (error) {
    throw new Error(error?.message || "Override value must be valid JSON.");
  }
}

function resetOverrideForm() {
  overrideForm.value = {
    scope: "SUBSCRIPTION_REQUIRED",
    startDate: "",
    endDate: "",
    reason: "",
    overrideValueJson: "{}",
  };
  overrideJsonError.value = "";
}

async function loadTenantSnapshot() {
  const nextTenantId = tenantId.value.trim();
  if (!nextTenantId) return;
  searchedTenantId.value = nextTenantId;
  billingOperationsStore.resetActionState();
  invoiceStatusFilter.value = "";
  invoiceConfirmForms.value = {};
  await billingOperationsStore.fetchTenantSnapshot(nextTenantId);
}

async function reloadTenantInvoices() {
  if (!searchedTenantId.value) return;
  await billingOperationsStore.fetchTenantInvoices(searchedTenantId.value, invoiceStatusFilter.value);
}

async function applyOverride() {
  if (!searchedTenantId.value) return;
  overrideJsonError.value = "";
  try {
    const payload = {
      tenantId: searchedTenantId.value,
      scope: overrideForm.value.scope,
      startDate: toIsoDateTime(overrideForm.value.startDate),
      endDate: toIsoDateTime(overrideForm.value.endDate),
      reason: overrideForm.value.reason,
      overrideValue: parseOverrideValue(),
    };
    const result = await billingOperationsStore.applyOverride(payload);
    if (result) resetOverrideForm();
  } catch (error) {
    overrideJsonError.value = error?.message || "Override value must be valid JSON.";
    logger.error("Invalid override value", error);
  }
}

async function revokeOverride(override) {
  const reason = revokeReasonById.value[override.id];
  if (!reason) return;
  const result = await billingOperationsStore.revokeOverride(override.id, reason, searchedTenantId.value);
  if (result) {
    revokeReasonById.value = {
      ...revokeReasonById.value,
      [override.id]: "",
    };
  }
}

async function generateExtensionCode() {
  const payload = {
    extensionDays: Number(generateCodeForm.value.extensionDays || 0),
    singleUse: generateCodeForm.value.singleUse,
    maxRedemptions: Number(generateCodeForm.value.maxRedemptions || 1),
    expiresAt: toIsoDateTime(generateCodeForm.value.expiresAt),
    reason: generateCodeForm.value.reason,
  };
  const result = await billingOperationsStore.generateExtensionCode(payload);
  if (result?.code) {
    applyCodeForm.value.code = result.code;
  }
}

async function applyExtensionCode() {
  if (!searchedTenantId.value) return;
  const result = await billingOperationsStore.applyExtensionCode({
    tenantId: searchedTenantId.value,
    code: applyCodeForm.value.code,
  });
  if (result) applyCodeForm.value = { code: "" };
}

async function extendSubscriptionDirectly() {
  if (!searchedTenantId.value) return;
  const result = await billingOperationsStore.extendSubscriptionDirectly({
    tenantId: searchedTenantId.value,
    extensionDays: Number(directExtensionForm.value.extensionDays || 0),
    reason: directExtensionForm.value.reason,
  });
  if (result) directExtensionForm.value = { extensionDays: "30", reason: "" };
}

async function confirmInvoicePayment(invoice) {
  const form = invoiceForm(invoice.id);
  if (!form.reference) return;
  const result = await billingOperationsStore.confirmInvoicePayment(
    invoice.id,
    {
      reference: form.reference,
      paymentDate: toIsoDateTime(form.paymentDate),
      note: form.note,
    },
    searchedTenantId.value,
  );
  if (result) {
    invoiceConfirmForms.value = {
      ...invoiceConfirmForms.value,
      [invoice.id]: {
        reference: "",
        paymentDate: "",
        note: "",
      },
    };
  }
}
</script>

<template>
  <DashboardContainer>
    <div class="space-y-[1.6rem] text-dashboard_text_color">
      <section class="rounded-[10px] bg-white p-[2.4rem] shadow-sm">
        <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-[1.2rem] font-[700] uppercase tracking-[0.08em] text-primary">
              Billing operations
            </p>
            <h1 class="mt-[0.6rem] text-[2.4rem] font-[700] text-[#000]">
              Overrides and extensions
            </h1>
            <p class="mt-[0.6rem] max-w-[72rem] text-[1.5rem] text-[#616161]">
              Apply scoped billing exceptions, generate extension codes, apply codes, and directly extend a tenant subscription.
            </p>
          </div>
          <NuxtLink to="/dashboard/billing/plans" class="text-[1.4rem] font-[700] text-primary">
            Manage billing plans
          </NuxtLink>
        </div>

        <form class="mt-[2rem] grid gap-[1.2rem] md:grid-cols-[1fr_auto]" @submit.prevent="loadTenantSnapshot">
          <AppInput
            v-model="tenantId"
            label="Tenant ID"
            name="billingTenantId"
            placeholder="Enter tenant ID"
          />
          <BaseButton
            type="submit"
            radius="8px"
            class="self-end"
            :loading="billingOperationsStore.loadingSnapshot"
            :disabled="!tenantId"
          >
            Load tenant
          </BaseButton>
        </form>
      </section>

      <!-- Super Admin Resync Subscriptions to Test (Issue 009) -->
      <section
        v-if="isSuperAdmin"
        class="rounded-[10px] border border-blue-200 bg-blue-50/60 p-[2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-[1.6rem]"
      >
        <div>
          <div class="flex items-center gap-[0.8rem]">
            <span class="material-symbols-outlined text-primary text-[2rem]">sync_alt</span>
            <h2 class="text-[1.7rem] font-[700] text-slate-900">Resync Subscriptions to Test Mode</h2>
            <span class="rounded bg-blue-100 text-primary font-[700] text-[1.1rem] px-[0.8rem] py-[0.2rem]">
              Super Admin Only
            </span>
          </div>
          <p class="mt-[0.4rem] text-[1.3rem] text-slate-600 max-w-[65rem]">
            Copies every store's current live subscription and plan to test mode so test mode follows the same plan as live. It is safe to run again at any time, and is needed once after deploying replication.
            <span class="font-[600] text-slate-800">Available only on the live backend.</span>
          </p>
          <p v-if="resyncedCount !== null" class="mt-[0.6rem] text-[1.3rem] font-[700] text-emerald-700">
            ✓ Successfully replicated {{ resyncedCount }} subscription(s) to test mode.
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-[8px] bg-primary px-[2rem] py-[1rem] font-[700] text-white hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          :disabled="billingOperationsStore.resyncingToTest"
          @click="showResyncModal = true"
        >
          {{ billingOperationsStore.resyncingToTest ? "Resyncing..." : "Resync to Test" }}
        </button>
      </section>

      <!-- Retired Plan Moves Report (Issue 008) -->
      <section class="rounded-[10px] bg-white p-[2.4rem] shadow-sm border border-slate-100">
        <div class="flex flex-col gap-[1.2rem] sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-[1.6rem] mb-[1.6rem]">
          <div>
            <h2 class="text-[1.8rem] font-[700] text-slate-900">Subscriptions Moved off Retired Plans</h2>
            <p class="text-[1.3rem] text-slate-500 mt-[0.2rem]">
              Audit report of stores automatically moved from retired catalog plans to Pro.
            </p>
          </div>
          <div class="flex items-center gap-[1rem]">
            <input
              v-model="retiredTenantFilter"
              type="text"
              placeholder="Filter by Tenant ID"
              class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.7rem] text-[1.3rem]"
              @keyup.enter="loadRetiredPlanLogs"
            >
            <button
              class="rounded-[8px] border border-slate-300 px-[1.4rem] py-[0.7rem] font-[600] text-slate-700 hover:bg-slate-50 text-[1.3rem]"
              @click="loadRetiredPlanLogs"
            >
              Filter
            </button>
          </div>
        </div>

        <div v-if="loadingRetiredLogs" class="py-[3rem] text-center text-slate-400 text-[1.3rem]">
          Loading retired plan moves...
        </div>

        <div v-else-if="!retiredAuditLogs || retiredAuditLogs.length === 0" class="rounded-[8px] border border-dashed border-slate-200 p-[3rem] text-center text-slate-500 text-[1.3rem]">
          No stores have been moved off retired plans.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-[1.3rem]">
            <thead>
              <tr class="border-b border-slate-200 text-slate-500 font-[600]">
                <th class="py-[1.2rem] px-[1rem]">Store (Tenant ID)</th>
                <th class="py-[1.2rem] px-[1rem]">Previous Plan</th>
                <th class="py-[1.2rem] px-[1rem]">New Plan</th>
                <th class="py-[1.2rem] px-[1rem]">Date &amp; Time</th>
                <th class="py-[1.2rem] px-[1rem]">Actor / Reason</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-800">
              <tr v-for="log in retiredAuditLogs" :key="log.id || log._id" class="hover:bg-slate-50/60">
                <td class="py-[1.2rem] px-[1rem] font-mono">
                  <NuxtLink
                    :to="`/dashboard/merchants/${log.tenantId}`"
                    class="text-primary font-[700] hover:underline"
                  >
                    {{ log.tenantId }}
                  </NuxtLink>
                </td>
                <td class="py-[1.2rem] px-[1rem]">
                  <span class="rounded bg-rose-50 px-[0.8rem] py-[0.2rem] text-rose-800 font-[700]">
                    {{ log.previousValue || log.metadata?.previousPlanCode || "retired" }}
                  </span>
                </td>
                <td class="py-[1.2rem] px-[1rem]">
                  <span class="rounded bg-emerald-50 px-[0.8rem] py-[0.2rem] text-emerald-800 font-[700]">
                    {{ log.newValue || log.metadata?.newPlanCode || "pro" }}
                  </span>
                </td>
                <td class="py-[1.2rem] px-[1rem] whitespace-nowrap text-slate-500">
                  {{ log.timestamp || log.createdAt ? new Date(log.timestamp || log.createdAt).toLocaleString() : "—" }}
                </td>
                <td class="py-[1.2rem] px-[1rem] text-slate-600">
                  {{ log.reason || "plan_retired" }} ({{ log.actorId || "system" }})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        v-if="billingOperationsStore.snapshotError"
        class="rounded-[10px] border border-[#FFF0C2] bg-[#FFF9E8] p-[1.6rem] text-[1.4rem] text-[#8A5A00]"
      >
        {{ billingOperationsStore.snapshotError }}
      </section>

      <section
        v-if="billingOperationsStore.actionError"
        class="rounded-[10px] border border-[#FFBFBF] bg-[#FFF5F5] p-[1.6rem] text-[1.4rem] text-[#B42318]"
      >
        {{ billingOperationsStore.actionError }}
      </section>

      <section v-if="billingOperationsStore.loadingSnapshot" class="rounded-[10px] bg-white p-[4rem] text-center shadow-sm">
        <Spinner />
        <p class="mt-[1.2rem] text-[1.4rem] text-[#616161]">Loading tenant billing state...</p>
      </section>

      <section v-else-if="hasSearched && !snapshot" class="rounded-[10px] bg-white p-[3rem] shadow-sm">
        <EmptyState>
          <h2 class="text-[1.8rem] font-[700] text-[#000]">No billing snapshot found</h2>
          <p class="mt-[0.6rem] max-w-[42rem] text-center text-[1.4rem] text-[#616161]">
            Check the tenant ID and try again.
          </p>
        </EmptyState>
      </section>

      <template v-else-if="snapshot">
        <section class="grid gap-[1.6rem] lg:grid-cols-[1.1fr_0.9fr]">
          <div class="rounded-[10px] bg-white p-[2.4rem] shadow-sm">
            <div class="flex items-start justify-between gap-[1rem]">
              <div>
                <h2 class="text-[1.8rem] font-[800] text-[#000]">Current subscription</h2>
                <p class="mt-[0.4rem] text-[1.3rem] text-[#616161]">{{ searchedTenantId }}</p>
              </div>
              <span
                v-if="subscription?.status"
                class="rounded-full px-[1rem] py-[0.4rem] text-[1.2rem] font-[800]"
                :class="statusBadgeClass[subscription.status] || 'bg-[#F3F4F6] text-[#6B7280]'"
              >
                {{ labelize(subscription.status) }}
              </span>
            </div>

            <div v-if="subscription" class="mt-[2rem] grid gap-[1.2rem] sm:grid-cols-2">
              <div class="rounded-[8px] bg-[#F8F9FA] p-[1.4rem]">
                <p class="text-[1.2rem] font-[700] uppercase text-[#616161]">Plan ID</p>
                <p class="mt-[0.4rem] break-all text-[1.4rem] font-[700] text-[#000]">{{ subscription.planId || "None" }}</p>
              </div>
              <div class="rounded-[8px] bg-[#F8F9FA] p-[1.4rem]">
                <p class="text-[1.2rem] font-[700] uppercase text-[#616161]">Renewal</p>
                <p class="mt-[0.4rem] text-[1.4rem] font-[700] text-[#000]">{{ labelize(subscription.renewalMode || "N/A") }}</p>
              </div>
              <div class="rounded-[8px] bg-[#F8F9FA] p-[1.4rem]">
                <p class="text-[1.2rem] font-[700] uppercase text-[#616161]">Period ends</p>
                <p class="mt-[0.4rem] text-[1.4rem] font-[700] text-[#000]">{{ subscription.currentPeriodEndDate ? formatDate(subscription.currentPeriodEndDate) : "N/A" }}</p>
              </div>
              <div class="rounded-[8px] bg-[#F8F9FA] p-[1.4rem]">
                <p class="text-[1.2rem] font-[700] uppercase text-[#616161]">Grace ends</p>
                <p class="mt-[0.4rem] text-[1.4rem] font-[700] text-[#000]">{{ subscription.gracePeriodEndDate ? formatDate(subscription.gracePeriodEndDate) : "N/A" }}</p>
              </div>
            </div>
            <EmptyState v-else class="mt-[1.6rem]">
              <p class="text-[1.4rem] text-[#616161]">This tenant does not have a billing subscription yet.</p>
            </EmptyState>
          </div>

          <div class="rounded-[10px] bg-white p-[2.4rem] shadow-sm">
            <h2 class="text-[1.8rem] font-[800] text-[#000]">Recent billing events</h2>
            <div v-if="recentEvents.length" class="mt-[1.6rem] space-y-[1rem]">
              <div v-for="event in recentEvents.slice(0, 5)" :key="event.id || event.timestamp || event.action" class="rounded-[8px] border border-[#EDEFF2] p-[1.2rem]">
                <p class="text-[1.3rem] font-[800] text-[#000]">{{ event.action }}</p>
                <p class="mt-[0.3rem] text-[1.2rem] text-[#616161]">{{ event.reason || "No reason recorded" }}</p>
                <p class="mt-[0.3rem] text-[1.2rem] text-[#9CA3AF]">{{ event.timestamp ? formatDate(event.timestamp) : "" }}</p>
              </div>
            </div>
            <p v-else class="mt-[1.6rem] text-[1.4rem] text-[#616161]">No billing events yet.</p>
          </div>
        </section>

        <section class="grid gap-[1.6rem] xl:grid-cols-2">
          <div class="rounded-[10px] bg-white p-[2.4rem] shadow-sm xl:col-span-2">
            <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 class="text-[1.8rem] font-[800] text-[#000]">Manual subscription invoices</h2>
                <p class="mt-[0.4rem] max-w-[72rem] text-[1.35rem] leading-[2rem] text-[#616161]">
                  Review pending offline payment invoices and confirm them once the transfer, cash, or support agreement is verified.
                </p>
              </div>
              <div class="flex min-w-[24rem] flex-col gap-[0.8rem] sm:flex-row">
                <BaseSelectInput
                  v-model="invoiceStatusFilter"
                  :options="invoiceStatusOptions"
                  label="Invoice status"
                  @update:model-value="reloadTenantInvoices"
                />
                <BaseButton
                  radius="8px"
                  variant="outline"
                  class="self-end"
                  :loading="billingOperationsStore.loadingInvoices"
                  @click="reloadTenantInvoices"
                >
                  Refresh
                </BaseButton>
              </div>
            </div>

            <p
              v-if="billingOperationsStore.invoicesError"
              class="mt-[1.2rem] rounded-[8px] border border-[#FFF0C2] bg-[#FFF9E8] p-[1rem] text-[1.3rem] font-[700] text-[#8A5A00]"
            >
              {{ billingOperationsStore.invoicesError }}
            </p>

            <div v-if="billingOperationsStore.loadingInvoices" class="mt-[2rem] rounded-[8px] bg-[#F8F9FA] p-[2rem] text-center">
              <Spinner />
              <p class="mt-[0.8rem] text-[1.3rem] text-[#616161]">Loading invoices...</p>
            </div>

            <div v-else-if="tenantInvoices.length" class="mt-[1.6rem] space-y-[1.2rem]">
              <div
                v-for="invoice in tenantInvoices"
                :key="invoice.id || invoice.invoiceNumber"
                class="rounded-[8px] border border-[#EDEFF2] p-[1.4rem]"
              >
                <div class="flex flex-col gap-[1rem] lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div class="flex flex-wrap items-center gap-[0.8rem]">
                      <p class="font-mono text-[1.4rem] font-[800] text-[#000]">{{ invoice.invoiceNumber || invoice.id }}</p>
                      <span
                        class="rounded-full px-[0.9rem] py-[0.35rem] text-[1.1rem] font-[800] uppercase"
                        :class="statusBadgeClass[invoice.status] || 'bg-[#F3F4F6] text-[#6B7280]'"
                      >
                        {{ labelize(invoice.status) }}
                      </span>
                    </div>
                    <p class="mt-[0.4rem] text-[1.25rem] text-[#616161]">
                      Plan {{ invoice.planId || "N/A" }} · {{ invoice.periodDays || 0 }} days · Due {{ invoice.dueDate ? formatDate(invoice.dueDate) : "N/A" }}
                    </p>
                    <p class="mt-[0.4rem] text-[1.25rem] text-[#616161]">
                      Reference: <span class="font-mono">{{ invoice.paymentReference || "Awaiting confirmation" }}</span>
                    </p>
                  </div>
                  <p class="text-[1.8rem] font-[800] text-[#000]">{{ money(invoice.amount, invoice.currency) }}</p>
                </div>

                <form
                  v-if="invoice.status === 'PENDING'"
                  class="mt-[1.4rem] grid gap-[1.2rem] lg:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1fr_1.4fr_auto]"
                  @submit.prevent="confirmInvoicePayment(invoice)"
                >
                  <AppInput
                    v-model="invoiceForm(invoice.id).reference"
                    :name="`invoice-reference-${invoice.id}`"
                    label="Payment reference"
                    placeholder="BANK-TRANSFER-123"
                  />
                  <AppInput
                    v-model="invoiceForm(invoice.id).paymentDate"
                    :name="`invoice-paid-at-${invoice.id}`"
                    label="Paid date"
                    type="datetime-local"
                  />
                  <BaseTextArea
                    v-model="invoiceForm(invoice.id).note"
                    label="Admin note"
                    :name="`invoice-note-${invoice.id}`"
                    placeholder="Confirmed in bank statement"
                    :rows="2"
                    resize="none"
                  />
                  <BaseButton
                    type="submit"
                    radius="8px"
                    class="self-end"
                    :loading="billingOperationsStore.confirmingInvoice"
                    :disabled="!invoiceForm(invoice.id).reference"
                  >
                    Mark paid
                  </BaseButton>
                </form>

                <div v-else-if="invoice.status === 'PAID'" class="mt-[1rem] rounded-[8px] bg-[#F4FFF4] p-[1rem] text-[1.25rem] font-[700] text-[#3CA745]">
                  Paid {{ invoice.paidAt ? formatDate(invoice.paidAt) : "" }}. Subscription payment ID: {{ invoice.subscriptionPaymentId || "N/A" }}
                </div>
              </div>
            </div>

            <EmptyState v-else class="mt-[1.6rem]">
              <p class="text-[1.4rem] text-[#616161]">No manual subscription invoices match this tenant and filter.</p>
            </EmptyState>
          </div>

          <div class="rounded-[10px] bg-white p-[2.4rem] shadow-sm">
            <h2 class="text-[1.8rem] font-[800] text-[#000]">Apply billing override</h2>
            <form class="mt-[1.6rem] space-y-[1.4rem]" @submit.prevent="applyOverride">
              <div>
                <label class="mb-[0.8rem] block text-[1.8rem] text-[#1B1B19]">Scope</label>
                <select v-model="overrideForm.scope" class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] outline-none">
                  <option v-for="scope in overrideScopes" :key="scope" :value="scope">{{ labelize(scope) }}</option>
                </select>
              </div>
              <div class="grid gap-[1.2rem] md:grid-cols-2">
                <AppInput v-model="overrideForm.startDate" label="Start date" name="overrideStartDate" type="datetime-local" />
                <AppInput v-model="overrideForm.endDate" label="End date" name="overrideEndDate" type="datetime-local" />
              </div>
              <AppInput v-model="overrideForm.reason" label="Reason" name="overrideReason" placeholder="Why is this override needed?" />
              <div>
                <label class="mb-[0.8rem] block text-[1.8rem] text-[#1B1B19]">Override value JSON</label>
                <textarea
                  v-model="overrideForm.overrideValueJson"
                  rows="5"
                  class="w-full rounded-[10px] border border-[#D9D9D9] p-[1.4rem] font-mono text-[1.3rem] outline-none focus:border-primary"
                />
                <p v-if="overrideJsonError" class="mt-[0.5rem] text-[1.2rem] text-[#B42318]">{{ overrideJsonError }}</p>
              </div>
              <BaseButton
                type="submit"
                radius="8px"
                :loading="billingOperationsStore.applyingOverride"
                :disabled="!overrideForm.reason"
              >
                Apply override
              </BaseButton>
            </form>
          </div>

          <div class="rounded-[10px] bg-white p-[2.4rem] shadow-sm">
            <h2 class="text-[1.8rem] font-[800] text-[#000]">Active overrides</h2>
            <div v-if="activeOverrides.length" class="mt-[1.6rem] space-y-[1.2rem]">
              <div v-for="override in activeOverrides" :key="override.id" class="rounded-[8px] border border-[#EDEFF2] p-[1.4rem]">
                <div class="flex flex-wrap items-center justify-between gap-[1rem]">
                  <div>
                    <p class="text-[1.4rem] font-[800] text-[#000]">{{ labelize(override.scope) }}</p>
                    <p class="mt-[0.3rem] text-[1.2rem] text-[#616161]">{{ override.reason }}</p>
                  </div>
                  <span class="rounded-full bg-[#B5F9B4] px-[1rem] py-[0.4rem] text-[1.2rem] font-[800] text-[#3CA745]">
                    {{ labelize(override.status) }}
                  </span>
                </div>
                <p class="mt-[0.8rem] text-[1.2rem] text-[#616161]">
                  {{ override.startDate ? formatDate(override.startDate) : "Now" }}
                  -
                  {{ override.endDate ? formatDate(override.endDate) : "No expiry" }}
                </p>
                <div class="mt-[1rem] grid gap-[1rem] md:grid-cols-[1fr_auto]">
                  <AppInput
                    v-model="revokeReasonById[override.id]"
                    :name="`revoke-${override.id}`"
                    placeholder="Reason for revoking"
                  />
                  <BaseButton
                    radius="8px"
                    variant="outline"
                    :loading="billingOperationsStore.revokingOverride"
                    :disabled="!revokeReasonById[override.id]"
                    @click="revokeOverride(override)"
                  >
                    Revoke
                  </BaseButton>
                </div>
              </div>
            </div>
            <p v-else class="mt-[1.6rem] text-[1.4rem] text-[#616161]">No active overrides for this tenant.</p>
          </div>
        </section>

        <section class="grid gap-[1.6rem] xl:grid-cols-3">
          <div class="rounded-[10px] bg-white p-[2.4rem] shadow-sm">
            <h2 class="text-[1.8rem] font-[800] text-[#000]">Generate extension code</h2>
            <form class="mt-[1.6rem] space-y-[1.4rem]" @submit.prevent="generateExtensionCode">
              <AppInput v-model="generateCodeForm.extensionDays" label="Extension days" name="codeExtensionDays" type="number" />
              <AppInput v-model="generateCodeForm.maxRedemptions" label="Max redemptions" name="codeMaxRedemptions" type="number" />
              <AppInput v-model="generateCodeForm.expiresAt" label="Expires at" name="codeExpiresAt" type="datetime-local" />
              <label class="flex items-center gap-[0.8rem] text-[1.4rem] font-[700] text-[#1B1B19]">
                <input v-model="generateCodeForm.singleUse" type="checkbox" class="h-[1.6rem] w-[1.6rem]">
                Single use
              </label>
              <AppInput v-model="generateCodeForm.reason" label="Reason" name="codeReason" placeholder="Why is this code being generated?" />
              <BaseButton
                type="submit"
                radius="8px"
                :loading="billingOperationsStore.generatingCode"
                :disabled="!generateCodeForm.reason"
              >
                Generate code
              </BaseButton>
            </form>
            <div v-if="billingOperationsStore.generatedCode" class="mt-[1.6rem] rounded-[8px] bg-[#F8F9FA] p-[1.4rem]">
              <p class="text-[1.2rem] font-[700] uppercase text-[#616161]">Generated code</p>
              <p class="mt-[0.4rem] break-all font-mono text-[1.8rem] font-[800] text-[#000]">
                {{ billingOperationsStore.generatedCode.code }}
              </p>
            </div>
          </div>

          <div class="rounded-[10px] bg-white p-[2.4rem] shadow-sm">
            <h2 class="text-[1.8rem] font-[800] text-[#000]">Apply extension code</h2>
            <form class="mt-[1.6rem] space-y-[1.4rem]" @submit.prevent="applyExtensionCode">
              <AppInput v-model="applyCodeForm.code" label="Extension code" name="applyExtensionCode" placeholder="EXT-..." />
              <BaseButton
                type="submit"
                radius="8px"
                :loading="billingOperationsStore.applyingCode"
                :disabled="!applyCodeForm.code"
              >
                Apply code
              </BaseButton>
            </form>

            <div v-if="extensionCodes.length" class="mt-[2rem] space-y-[1rem]">
              <h3 class="text-[1.5rem] font-[800] text-[#000]">Applied codes</h3>
              <div v-for="code in extensionCodes" :key="code.id || code.code" class="rounded-[8px] border border-[#EDEFF2] p-[1.2rem]">
                <div class="flex items-center justify-between gap-[1rem]">
                  <p class="font-mono text-[1.3rem] font-[800]">{{ code.code }}</p>
                  <span
                    class="rounded-full px-[0.8rem] py-[0.3rem] text-[1.1rem] font-[800]"
                    :class="statusBadgeClass[code.status] || 'bg-[#F3F4F6] text-[#6B7280]'"
                  >
                    {{ labelize(code.status) }}
                  </span>
                </div>
                <p class="mt-[0.4rem] text-[1.2rem] text-[#616161]">
                  {{ code.extensionDays }} days · {{ code.redemptionCount || 0 }}/{{ code.maxRedemptions || 1 }} used
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-[10px] bg-white p-[2.4rem] shadow-sm">
            <h2 class="text-[1.8rem] font-[800] text-[#000]">Direct extension</h2>
            <form class="mt-[1.6rem] space-y-[1.4rem]" @submit.prevent="extendSubscriptionDirectly">
              <AppInput v-model="directExtensionForm.extensionDays" label="Extension days" name="directExtensionDays" type="number" />
              <AppInput v-model="directExtensionForm.reason" label="Reason" name="directExtensionReason" placeholder="Offline payment, migration support, etc." />
              <BaseButton
                type="submit"
                radius="8px"
                :loading="billingOperationsStore.extendingSubscription"
                :disabled="!directExtensionForm.reason"
              >
                Extend subscription
              </BaseButton>
            </form>
          </div>
        </section>
      </template>

      <!-- Confirmation Modal for Resyncing to Test -->
      <div
        v-if="showResyncModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
        role="dialog"
        aria-modal="true"
      >
        <div class="w-full max-w-[48rem] rounded-[12px] bg-white p-[2.4rem] shadow-xl border border-slate-200">
          <h3 class="text-[1.8rem] font-[700] text-slate-900 flex items-center gap-[0.8rem]">
            <span class="material-symbols-outlined text-primary">sync_alt</span>
            Resync Subscriptions to Test Mode?
          </h3>
          <p class="mt-[1.2rem] text-[1.4rem] text-slate-600 leading-relaxed">
            This action will replicate all merchant subscriptions and current plan assignments from the live database to test mode via the live-to-test event stream.
          </p>
          <div class="mt-[1.4rem] rounded-[8px] bg-blue-50 border border-blue-200 p-[1.2rem] text-blue-900 text-[1.3rem]">
            <strong>Note:</strong> Safe to run again at any time. It should be run once following replication deployments so test stores reflect their live plan tier.
          </div>
          <div class="mt-[2.4rem] flex justify-end gap-[1.2rem]">
            <button
              type="button"
              class="rounded-[8px] border border-slate-300 px-[1.6rem] py-[0.8rem] font-[600] text-slate-700 hover:bg-slate-50 transition"
              @click="showResyncModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-[8px] bg-primary px-[1.8rem] py-[0.8rem] font-[700] text-white hover:bg-primary/90 transition shadow-sm"
              :disabled="billingOperationsStore.resyncingToTest"
              @click="handleConfirmResync"
            >
              {{ billingOperationsStore.resyncingToTest ? "Resyncing..." : "Confirm & Resync" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </DashboardContainer>
</template>
