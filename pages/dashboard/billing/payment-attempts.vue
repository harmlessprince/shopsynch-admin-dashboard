<script setup>
import { formatDate, formatToMoney } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-payment-attempts",
});

useHead({
  title: "Subscription Payment Attempts - ShopSynch Admin",
});

const attemptsStore = useAdminBillingPaymentAttemptsStore();

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Initiated", value: "INITIATED" },
  { label: "Pending", value: "PENDING" },
  { label: "Successful", value: "SUCCESSFUL" },
  { label: "Failed", value: "FAILED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Abandoned", value: "ABANDONED" },
  { label: "Needs review", value: "NEEDS_REVIEW" },
];

const providerOptions = [
  { label: "All providers", value: "" },
  { label: "Paystack", value: "PAYSTACK" },
  { label: "Flutterwave", value: "FLUTTERWAVE" },
  { label: "Stripe", value: "STRIPE" },
  { label: "Offline", value: "OFFLINE" },
  { label: "Monnify", value: "MONNIFY" },
];

const priceSourceOptions = [
  { label: "All price sources", value: "" },
  { label: "List Price", value: "LIST" },
  { label: "Offer Discount", value: "OFFER" },
  { label: "Price Lock", value: "PRICE_LOCK" },
];

const statusMeta = {
  INITIATED: { label: "Initiated", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  PENDING: { label: "Pending", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  SUCCESSFUL: { label: "Successful", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAILED: { label: "Failed", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  CANCELLED: { label: "Cancelled", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  ABANDONED: { label: "Abandoned", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  NEEDS_REVIEW: { label: "Needs Review", badge: "bg-red-100 text-red-800 border-red-300 font-bold" },
};

const priceSourceMeta = {
  LIST: { label: "List", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  OFFER: { label: "Offer", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  PRICE_LOCK: { label: "Price Lock", badge: "bg-teal-50 text-teal-700 border-teal-200" },
};

const tableHeader = [
  { title: "Initiated", accessor: "initiatedAt" },
  { title: "Merchant", accessor: "tenantId" },
  { title: "Plan", accessor: "planId" },
  { title: "Charged & List Price", accessor: "amount" },
  { title: "Status", accessor: "status" },
  { title: "Provider & Ref", accessor: "provider" },
  { title: "Actions", accessor: "_action" },
];

const showFilters = ref(false);
const detailAttempt = ref(null);

// Modal states for real actions
const verifyModalTarget = ref(null);
const verifyLoading = ref(false);
const verifyErrorMessage = ref("");

const abandonModalTarget = ref(null);
const abandonReason = ref("");
const abandonLoading = ref(false);
const abandonErrorMessage = ref("");
const abandonValidationError = ref("");

function displayCurrency(currency) {
  if (currency === "NGN" || !currency) return "₦";
  return `${currency} `;
}

function money(amount, currency) {
  return formatToMoney(Number(amount || 0), displayCurrency(currency));
}

function getDiscount(attempt) {
  if (!attempt) return 0;
  const list = Number(attempt.listAmount || 0);
  const charged = Number(attempt.amount || 0);
  if (list > charged && list > 0) {
    return list - charged;
  }
  return 0;
}

const paginationData = computed(() => {
  const current = attemptsStore.page + 1;
  const size = attemptsStore.size;
  const total = attemptsStore.totalElements;
  const totalPages = attemptsStore.totalPages || (total > 0 ? Math.ceil(total / size) : 1);
  return {
    currentPage: current,
    pageSize: size,
    total,
    totalPages,
    hasPrevious: current > 1,
    hasNext: current < totalPages,
    from: total === 0 ? 0 : (current - 1) * size + 1,
    to: Math.min(current * size, total),
  };
});

async function loadData(pageNumber = 1) {
  await attemptsStore.fetchPaymentAttempts({ page: Math.max(0, pageNumber - 1) });
}

function handleFetchPage(page) {
  loadData(page);
}

function handleApplyFilters() {
  attemptsStore.page = 0;
  loadData(1);
}

function handleResetFilters() {
  attemptsStore.resetFilters();
  loadData(1);
}

// Real Action 1: Verify Attempt with Provider
function openVerifyModal(attempt) {
  verifyModalTarget.value = attempt;
  verifyErrorMessage.value = "";
}

function closeVerifyModal(force = false) {
  if (verifyLoading.value && !force) return;
  verifyModalTarget.value = null;
  verifyErrorMessage.value = "";
}

async function handleConfirmVerify() {
  if (!verifyModalTarget.value) return;
  verifyLoading.value = true;
  verifyErrorMessage.value = "";
  try {
    const res = await attemptsStore.verifyPaymentAttempt(verifyModalTarget.value.id);
    if (res) {
      closeVerifyModal(true);
      await loadData(attemptsStore.page + 1);
    } else {
      verifyErrorMessage.value = attemptsStore.actionError || "Verification could not be completed.";
    }
  } catch (err) {
    verifyErrorMessage.value = err?.data?.message || err?.message || "Verification failed.";
  } finally {
    verifyLoading.value = false;
  }
}

// Real Action 2: Abandon Attempt
function openAbandonModal(attempt) {
  abandonModalTarget.value = attempt;
  abandonReason.value = "";
  abandonErrorMessage.value = "";
  abandonValidationError.value = "";
}

function closeAbandonModal(force = false) {
  if (abandonLoading.value && !force) return;
  abandonModalTarget.value = null;
  abandonReason.value = "";
  abandonErrorMessage.value = "";
  abandonValidationError.value = "";
}

async function handleConfirmAbandon() {
  if (!abandonModalTarget.value) return;
  const reasonText = abandonReason.value.trim();
  if (!reasonText) {
    abandonValidationError.value = "Reason is required to abandon a payment attempt.";
    return;
  }
  if (reasonText.length > 500) {
    abandonValidationError.value = "Reason must be 500 characters or fewer.";
    return;
  }

  abandonLoading.value = true;
  abandonErrorMessage.value = "";
  abandonValidationError.value = "";

  try {
    const res = await attemptsStore.abandonPaymentAttempt(abandonModalTarget.value.id, reasonText);
    if (res) {
      closeAbandonModal(true);
      await loadData(attemptsStore.page + 1);
    } else {
      if (attemptsStore.formErrors?.reason) {
        abandonValidationError.value = attemptsStore.formErrors.reason;
      }
      abandonErrorMessage.value = attemptsStore.actionError || "Could not abandon payment attempt.";
      // If the response indicated it was paid, refresh table
      if (attemptsStore.actionError?.includes("paid")) {
        await loadData(attemptsStore.page + 1);
      }
    }
  } catch (err) {
    abandonErrorMessage.value = err?.data?.message || err?.message || "Failed to abandon payment attempt.";
  } finally {
    abandonLoading.value = false;
  }
}

function openDetailModal(attempt) {
  detailAttempt.value = attempt;
}

function closeDetailModal() {
  detailAttempt.value = null;
}

onMounted(async () => {
  await loadData(1);
});
</script>

<template>
  <DashboardContainer>
    <div class="space-y-[1.6rem] text-dashboard_text_color">
      <!-- Sub-navigation tabs -->
      <DashboardBillingTabs />

      <!-- Page Header & Filter Controls -->
      <section class="rounded-[10px] bg-white p-[2.4rem] shadow-sm border border-slate-200/80">
        <div class="flex flex-col gap-[1.6rem] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div class="flex items-center gap-[0.8rem]">
              <span class="material-symbols-outlined text-primary text-[2.4rem]">history_toggle_off</span>
              <h1 class="text-[2.2rem] font-[700] text-slate-900">Subscription Payment Attempts</h1>
            </div>
            <p class="mt-[0.4rem] max-w-[75rem] text-[1.4rem] text-slate-500">
              Audit checkout attempts, verify pending charges with payment gateways, inspect prices and discount sources, and abandon stale links.
            </p>
          </div>

          <div class="flex items-center gap-[1rem] flex-wrap">
            <button
              type="button"
              class="inline-flex items-center gap-[0.6rem] rounded-[8px] border border-slate-300 bg-white px-[1.4rem] py-[0.8rem] text-[1.35rem] font-[600] text-slate-700 hover:bg-slate-50 shadow-sm"
              @click="showFilters = !showFilters"
            >
              <span class="material-symbols-outlined text-[1.8rem]">filter_list</span>
              {{ showFilters ? 'Hide Filters' : 'Filter Attempts' }}
            </button>
            <BaseButton
              radius="8px"
              variant="outline"
              class="whitespace-nowrap text-[1.35rem]"
              :loading="attemptsStore.loading"
              @click="loadData(attemptsStore.page + 1)"
            >
              <span class="material-symbols-outlined text-[1.8rem] mr-[0.4rem]">refresh</span>
              Refresh
            </BaseButton>
          </div>
        </div>

        <!-- Filter Panel -->
        <div
          v-if="showFilters"
          class="mt-[2rem] pt-[1.8rem] border-t border-slate-100 grid gap-[1.2rem] sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Tenant ID</label>
            <input
              v-model="attemptsStore.filters.tenantId"
              type="text"
              placeholder="e.g. tn_123"
              class="w-full rounded-[8px] border border-slate-300 px-[1.2rem] py-[0.8rem] text-[1.35rem] focus:border-primary focus:outline-none"
              @keyup.enter="handleApplyFilters"
            >
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Subscription ID</label>
            <input
              v-model="attemptsStore.filters.subscriptionId"
              type="text"
              placeholder="e.g. sub_123"
              class="w-full rounded-[8px] border border-slate-300 px-[1.2rem] py-[0.8rem] text-[1.35rem] focus:border-primary focus:outline-none"
              @keyup.enter="handleApplyFilters"
            >
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Status</label>
            <BaseSelectInput
              v-model="attemptsStore.filters.status"
              :options="statusOptions"
            />
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Provider</label>
            <BaseSelectInput
              v-model="attemptsStore.filters.provider"
              :options="providerOptions"
            />
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Price Source</label>
            <BaseSelectInput
              v-model="attemptsStore.filters.priceSource"
              :options="priceSourceOptions"
            />
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Offer Code</label>
            <input
              v-model="attemptsStore.filters.offerCode"
              type="text"
              placeholder="e.g. FOUNDING50"
              class="w-full rounded-[8px] border border-slate-300 px-[1.2rem] py-[0.8rem] text-[1.35rem] focus:border-primary focus:outline-none"
              @keyup.enter="handleApplyFilters"
            >
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Provider Reference</label>
            <input
              v-model="attemptsStore.filters.providerReference"
              type="text"
              placeholder="Matches current or prior reference"
              class="w-full rounded-[8px] border border-slate-300 px-[1.2rem] py-[0.8rem] text-[1.35rem] focus:border-primary focus:outline-none"
              @keyup.enter="handleApplyFilters"
            >
          </div>
          <div class="flex items-end gap-[0.8rem]">
            <BaseButton
              radius="8px"
              class="flex-1 text-[1.35rem] py-[0.8rem]"
              :loading="attemptsStore.loading"
              @click="handleApplyFilters"
            >
              Apply Filters
            </BaseButton>
            <button
              type="button"
              class="rounded-[8px] border border-slate-300 px-[1.4rem] py-[0.8rem] text-[1.35rem] font-[600] text-slate-600 hover:bg-slate-50"
              @click="handleResetFilters"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <!-- Global Error Alert -->
      <div
        v-if="attemptsStore.error"
        class="rounded-[10px] border border-rose-200 bg-rose-50 p-[1.6rem] text-[1.4rem] text-rose-800 flex items-center justify-between"
      >
        <div class="flex items-center gap-[0.8rem]">
          <span class="material-symbols-outlined text-rose-600">error</span>
          <span>{{ attemptsStore.error }}</span>
        </div>
        <button class="font-[600] text-rose-700 underline" @click="loadData(1)">Try again</button>
      </div>

      <!-- Main Data Table -->
      <section class="overflow-hidden rounded-[10px] bg-white shadow-sm border border-slate-200/80">
        <DataTable
          :table-header="tableHeader"
          :table-data="attemptsStore.attempts"
          :loading="attemptsStore.loading"
          :pagination="paginationData"
          has-pagination
          empty-state-title="No payment attempts found"
          empty-state-description="No attempts match your filter criteria."
          @fetch-page="handleFetchPage"
        >
          <!-- Initiated Column -->
          <template #cell(initiatedAt)="{ row }">
            <div class="text-[1.3rem] whitespace-nowrap">
              <span class="font-[600] text-slate-900 block">{{ row.initiatedAt ? formatDate(row.initiatedAt) : '—' }}</span>
              <span class="text-[1.15rem] font-mono text-slate-400">ID: {{ row.id?.slice(-8) }}</span>
            </div>
          </template>

          <!-- Merchant Column -->
          <template #cell(tenantId)="{ row }">
            <div class="text-[1.3rem]">
              <TenantHoverCard
                v-if="row.tenantId"
                :tenant-id="row.tenantId"
              />
              <span v-else class="text-slate-400">N/A</span>
              <span v-if="row.subscriptionId" class="block text-[1.15rem] font-mono text-slate-500 truncate max-w-[15rem] mt-[0.2rem]">
                sub: {{ row.subscriptionId?.slice(-8) }}
              </span>
            </div>
          </template>

          <!-- Plan Column -->
          <template #cell(planId)="{ row }">
            <PlanLabel
              :plan-id="row.planId"
              :period-unit-count="row.periodUnitCount"
              :period-days="row.periodDays"
            />
          </template>

          <!-- Amount, List Amount & Price Source Column -->
          <template #cell(amount)="{ row }">
            <div class="text-[1.3rem] min-w-[18rem]">
              <div class="flex items-center gap-[0.6rem]">
                <span class="font-[700] text-[1.4rem] text-slate-900 font-mono">
                  {{ money(row.amount, row.currency) }}
                </span>
                <!-- Price Source Badge -->
                <span
                  class="rounded-full px-[0.7rem] py-[0.1rem] text-[1.1rem] font-[700] border"
                  :class="priceSourceMeta[row.priceSource]?.badge || 'bg-slate-100 text-slate-600 border-slate-200'"
                >
                  {{ priceSourceMeta[row.priceSource]?.label || row.priceSource }}
                </span>
              </div>

              <!-- List amount & Discount indication -->
              <div class="mt-[0.3rem] flex items-center gap-[0.8rem] text-[1.2rem]">
                <span v-if="row.listAmount && Number(row.listAmount) !== Number(row.amount)" class="text-slate-400 line-through font-mono">
                  List: {{ money(row.listAmount, row.currency) }}
                </span>
                <span v-if="getDiscount(row) > 0" class="rounded bg-emerald-100 text-emerald-800 font-[700] px-[0.5rem] py-[0.1rem] text-[1.1rem]">
                  Save {{ money(getDiscount(row), row.currency) }}
                </span>
                <span v-if="row.offerCode" class="text-indigo-600 font-[600] text-[1.15rem]">
                  {{ row.offerCode }}
                </span>
              </div>
            </div>
          </template>

          <!-- Status Column -->
          <template #cell(status)="{ row }">
            <span
              class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[700] border"
              :class="statusMeta[row.status]?.badge || 'bg-slate-100 text-slate-600 border-slate-200'"
            >
              {{ statusMeta[row.status]?.label || row.status }}
            </span>
          </template>

          <!-- Provider & Reference Column -->
          <template #cell(provider)="{ row }">
            <div class="text-[1.3rem] max-w-[22rem]">
              <span class="font-[700] text-slate-800 text-[1.25rem]">{{ row.provider || '—' }}</span>
              <p
                v-if="row.providerReference"
                class="font-mono text-[1.2rem] text-slate-600 truncate mt-[0.2rem]"
                :title="row.providerReference"
              >
                {{ row.providerReference }}
              </p>
              <span
                v-if="row.previousProviderReferences && row.previousProviderReferences.length"
                class="inline-block mt-[0.2rem] text-[1.1rem] text-amber-700 bg-amber-50 px-[0.5rem] py-[0.1rem] rounded border border-amber-200"
                :title="row.previousProviderReferences.join(', ')"
              >
                +{{ row.previousProviderReferences.length }} prior ref(s)
              </span>
            </div>
          </template>

          <!-- Action Column -->
          <template #cell(_action)="{ row }">
            <div class="flex items-center gap-[0.6rem] whitespace-nowrap">
              <!-- Detail button -->
              <button
                type="button"
                class="rounded-[6px] border border-slate-200 bg-white px-[1rem] py-[0.5rem] text-[1.25rem] font-[600] text-slate-700 hover:bg-slate-50 transition shadow-xs"
                @click="openDetailModal(row)"
              >
                Details
              </button>

              <!-- Check with provider: PENDING only -->
              <button
                v-if="row.status === 'PENDING'"
                type="button"
                class="rounded-[6px] border border-blue-300 bg-blue-50 px-[1rem] py-[0.5rem] text-[1.25rem] font-[700] text-blue-800 hover:bg-blue-100 transition shadow-xs"
                :disabled="attemptsStore.verifyingId === row.id"
                @click="openVerifyModal(row)"
              >
                {{ attemptsStore.verifyingId === row.id ? 'Checking...' : 'Check Provider' }}
              </button>

              <!-- Abandon: INITIATED or PENDING only (NEVER on NEEDS_REVIEW) -->
              <button
                v-if="row.status === 'INITIATED' || row.status === 'PENDING'"
                type="button"
                class="rounded-[6px] border border-rose-300 bg-rose-50 px-[1rem] py-[0.5rem] text-[1.25rem] font-[700] text-rose-700 hover:bg-rose-100 transition shadow-xs"
                :disabled="attemptsStore.abandoningId === row.id"
                @click="openAbandonModal(row)"
              >
                {{ attemptsStore.abandoningId === row.id ? 'Abandoning...' : 'Abandon' }}
              </button>
            </div>
          </template>
        </DataTable>
      </section>
    </div>

    <!-- Confirmation Modal: Check With Provider -->
    <div
      v-if="verifyModalTarget"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-[50rem] rounded-[12px] border border-slate-200 bg-white p-[2.4rem] shadow-xl">
        <div class="flex items-center gap-[0.8rem] text-blue-700">
          <span class="material-symbols-outlined text-[2.6rem]">cloud_sync</span>
          <h3 class="text-[1.8rem] font-[700] text-slate-900">Verify Payment with Provider</h3>
        </div>

        <div class="mt-[1.6rem] rounded-[10px] bg-blue-50/70 border border-blue-200 p-[1.4rem] text-[1.35rem] text-blue-900 leading-relaxed">
          <p class="font-[600]">How this check works:</p>
          <p class="mt-[0.4rem]">
            This queries the payment provider directly ({{ verifyModalTarget.provider }}) for reference
            <code class="font-mono font-[700] bg-white px-[0.6rem] py-[0.1rem] rounded border border-blue-200">{{ verifyModalTarget.providerReference || 'N/A' }}</code>.
            If the gateway confirms the charge was paid, the payment is recorded and the tenant subscription is activated immediately.
          </p>
        </div>

        <div class="mt-[1.6rem] rounded-[8px] bg-slate-50 p-[1.4rem] text-[1.3rem] space-y-[0.6rem] text-slate-700">
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Tenant:</span>
            <TenantHoverCard :tenant-id="verifyModalTarget.tenantId" />
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Amount Charged:</span>
            <span class="font-mono font-[700] text-slate-900">{{ money(verifyModalTarget.amount, verifyModalTarget.currency) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Current Status:</span>
            <span class="font-[700] text-amber-700">{{ verifyModalTarget.status }}</span>
          </div>
        </div>

        <div v-if="verifyErrorMessage" class="mt-[1.4rem] rounded-[8px] bg-rose-50 border border-rose-200 p-[1.2rem] text-[1.3rem] text-rose-800">
          {{ verifyErrorMessage }}
        </div>

        <div class="mt-[2.4rem] flex justify-end gap-[1.2rem]">
          <BaseButton
            radius="8px"
            variant="outline"
            :disabled="verifyLoading"
            @click="closeVerifyModal"
          >
            Cancel
          </BaseButton>
          <BaseButton
            radius="8px"
            bold
            variant="primary"
            :loading="verifyLoading"
            @click="handleConfirmVerify"
          >
            Verify with Gateway Now
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal: Abandon Payment Attempt -->
    <div
      v-if="abandonModalTarget"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-[54rem] rounded-[12px] border border-slate-200 bg-white p-[2.4rem] shadow-xl">
        <div class="flex items-center gap-[0.8rem] text-rose-700">
          <span class="material-symbols-outlined text-[2.6rem]">warning</span>
          <h3 class="text-[1.9rem] font-[700] text-slate-900">Abandon Payment Attempt</h3>
        </div>

        <!-- Strong Warning Alert -->
        <div class="mt-[1.6rem] rounded-[10px] bg-amber-50 border border-amber-300 p-[1.4rem] text-[1.35rem] text-amber-950 leading-relaxed">
          <p class="font-[700] text-amber-900 flex items-center gap-[0.6rem]">
            <span class="material-symbols-outlined text-[1.8rem]">info</span>
            Important safety and gateway policy:
          </p>
          <ul class="list-disc list-inside mt-[0.6rem] space-y-[0.4rem] text-[1.3rem] text-amber-900">
            <li>Retires this attempt in ShopSynch so its checkout link is no longer reused (e.g. to retire a stale or mispriced attempt).</li>
            <li>If pending, the provider is checked first — <strong>a payment that may have already landed will never be hidden</strong>.</li>
            <li>The gateway checkout URL may remain payable at the provider; if the merchant pays later, our system will still reconcile it.</li>
          </ul>
        </div>

        <div class="mt-[1.4rem] rounded-[8px] bg-slate-50 p-[1.2rem] text-[1.3rem] grid grid-cols-2 gap-[0.8rem] text-slate-700">
          <div>
            <span class="text-slate-500 block text-[1.2rem]">Tenant:</span>
            <TenantHoverCard :tenant-id="abandonModalTarget.tenantId" />
          </div>
          <div>
            <span class="text-slate-500 block text-[1.2rem]">Charged Amount:</span>
            <span class="font-mono font-[700] text-slate-900">{{ money(abandonModalTarget.amount, abandonModalTarget.currency) }}</span>
          </div>
          <div>
            <span class="text-slate-500 block text-[1.2rem]">Current Status:</span>
            <span class="font-[700] text-slate-800">{{ abandonModalTarget.status }}</span>
          </div>
          <div>
            <span class="text-slate-500 block text-[1.2rem]">Price Source:</span>
            <span class="font-[700] text-slate-800">{{ abandonModalTarget.priceSource }}</span>
          </div>
        </div>

        <!-- Required Reason Input -->
        <div class="mt-[1.6rem]">
          <label class="block text-[1.35rem] font-[600] text-slate-800">
            Reason for abandoning <span class="text-rose-500">*</span>
            <span class="text-[1.2rem] font-[400] text-slate-500">(stored on billing audit log, 1–500 chars)</span>
          </label>
          <textarea
            v-model="abandonReason"
            rows="3"
            placeholder="e.g., Stale 15,000 NGN link generated before founding offer price lock was applied."
            class="mt-[0.6rem] w-full rounded-[8px] border px-[1.2rem] py-[0.8rem] text-[1.35rem] focus:outline-none"
            :class="abandonValidationError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 focus:border-primary'"
            maxlength="500"
          />
          <div class="flex justify-between items-center mt-[0.4rem]">
            <span v-if="abandonValidationError" class="text-rose-600 text-[1.25rem] font-[600]">
              {{ abandonValidationError }}
            </span>
            <span v-else class="text-transparent text-[1.25rem]">.</span>
            <span class="text-[1.2rem] text-slate-400 font-mono">{{ abandonReason.length }}/500</span>
          </div>
        </div>

        <!-- Server 400 or other action error -->
        <div v-if="abandonErrorMessage" class="mt-[1.4rem] rounded-[8px] bg-rose-50 border border-rose-200 p-[1.4rem] text-[1.35rem] text-rose-800">
          <p class="font-[700]">Operation refused:</p>
          <p class="mt-[0.4rem]">{{ abandonErrorMessage }}</p>
          <div v-if="abandonErrorMessage.includes('Try again shortly')" class="mt-[1rem]">
            <BaseButton size="sm" radius="6px" variant="outline" @click="handleConfirmAbandon">
              Retry Abandon Check
            </BaseButton>
          </div>
        </div>

        <div class="mt-[2.4rem] flex justify-end gap-[1.2rem]">
          <BaseButton
            radius="8px"
            variant="outline"
            :disabled="abandonLoading"
            @click="closeAbandonModal"
          >
            Cancel
          </BaseButton>
          <BaseButton
            radius="8px"
            bold
            variant="danger"
            :loading="abandonLoading"
            :disabled="!abandonReason.trim()"
            @click="handleConfirmAbandon"
          >
            Confirm Abandon Attempt
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Details Drawer / Modal -->
    <div
      v-if="detailAttempt"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-[62rem] max-h-[90vh] overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-[2.4rem] shadow-xl">
        <div class="flex items-center justify-between pb-[1.4rem] border-b border-slate-100">
          <div>
            <h3 class="text-[1.8rem] font-[700] text-slate-900">Payment Attempt Details</h3>
            <p class="font-mono text-[1.25rem] text-slate-500 mt-[0.2rem]">ID: {{ detailAttempt.id }}</p>
          </div>
          <button
            type="button"
            class="rounded-[6px] p-[0.4rem] text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            @click="closeDetailModal"
          >
            <span class="material-symbols-outlined text-[2.2rem]">close</span>
          </button>
        </div>

        <div class="mt-[2rem] space-y-[1.6rem] text-[1.35rem]">
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 gap-[1.2rem]">
            <div class="rounded-[8px] bg-slate-50 p-[1.2rem]">
              <span class="text-slate-500 block text-[1.2rem]">Tenant Store</span>
              <div class="mt-[0.2rem]">
                <TenantHoverCard :tenant-id="detailAttempt.tenantId" />
              </div>
            </div>
            <div class="rounded-[8px] bg-slate-50 p-[1.2rem]">
              <span class="text-slate-500 block text-[1.2rem]">Plan</span>
              <div class="mt-[0.2rem]">
                <PlanLabel :plan-id="detailAttempt.planId" :period-unit-count="detailAttempt.periodUnitCount" :period-days="detailAttempt.periodDays" />
              </div>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-[1.2rem]">
            <div class="rounded-[8px] bg-slate-50 p-[1.2rem]">
              <span class="text-slate-500 block text-[1.2rem]">Status</span>
              <span
                class="inline-block mt-[0.2rem] rounded-full px-[0.9rem] py-[0.2rem] text-[1.2rem] font-[700] border"
                :class="statusMeta[detailAttempt.status]?.badge || 'bg-slate-100 text-slate-600 border-slate-200'"
              >
                {{ statusMeta[detailAttempt.status]?.label || detailAttempt.status }}
              </span>
            </div>
          </div>

          <!-- Pricing Breakdown -->
          <div class="rounded-[10px] border border-slate-200 p-[1.6rem]">
            <h4 class="text-[1.4rem] font-[700] text-slate-900 mb-[1.2rem]">Pricing &amp; Breakdown</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-[1.2rem]">
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Charged Amount (Inc. VAT)</span>
                <span class="font-mono font-[700] text-slate-900 text-[1.5rem]">
                  {{ money(detailAttempt.amount, detailAttempt.currency) }}
                </span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">List Amount</span>
                <span class="font-mono font-[600] text-slate-700">
                  {{ money(detailAttempt.listAmount, detailAttempt.currency) }}
                </span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Price Source</span>
                <span class="font-[700] text-indigo-700">{{ detailAttempt.priceSource }}</span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Base Amount</span>
                <span class="font-mono text-slate-700">{{ money(detailAttempt.baseAmount, detailAttempt.currency) }}</span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">VAT Amount</span>
                <span class="font-mono text-slate-700">{{ money(detailAttempt.vatAmount, detailAttempt.currency) }}</span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Offer Code</span>
                <span class="font-[600] text-slate-800">{{ detailAttempt.offerCode || 'None' }}</span>
              </div>
            </div>
          </div>

          <!-- Gateway & Provider References -->
          <div class="rounded-[10px] border border-slate-200 p-[1.6rem] space-y-[1rem]">
            <h4 class="text-[1.4rem] font-[700] text-slate-900">Provider &amp; Gateway References</h4>
            <div>
              <span class="text-slate-500 text-[1.2rem] block">Provider</span>
              <span class="font-[700] text-slate-800">{{ detailAttempt.provider || '—' }}</span>
            </div>
            <div>
              <span class="text-slate-500 text-[1.2rem] block">Current Provider Reference</span>
              <code class="font-mono bg-slate-50 p-[0.6rem] rounded border block break-all text-[1.25rem]">
                {{ detailAttempt.providerReference || 'None' }}
              </code>
            </div>
            <div v-if="detailAttempt.previousProviderReferences?.length">
              <span class="text-slate-500 text-[1.2rem] block mb-[0.4rem]">Prior References (restarts):</span>
              <ul class="space-y-[0.4rem]">
                <li
                  v-for="(refItem, i) in detailAttempt.previousProviderReferences"
                  :key="i"
                  class="font-mono text-[1.2rem] bg-amber-50/60 border border-amber-200 p-[0.4rem_0.8rem] rounded"
                >
                  {{ refItem }}
                </li>
              </ul>
            </div>
            <div v-if="detailAttempt.checkoutUrl">
              <span class="text-slate-500 text-[1.2rem] block">Checkout URL</span>
              <a
                :href="detailAttempt.checkoutUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary break-all hover:underline font-mono text-[1.25rem]"
              >
                {{ detailAttempt.checkoutUrl }}
              </a>
            </div>
            <div v-if="detailAttempt.failureReason">
              <span class="text-slate-500 text-[1.2rem] block">Failure Reason</span>
              <p class="text-rose-700 font-[600]">{{ detailAttempt.failureReason }}</p>
            </div>
            <div v-if="detailAttempt.providerMessage">
              <span class="text-slate-500 text-[1.2rem] block">Provider Message</span>
              <p class="text-slate-700 italic">{{ detailAttempt.providerMessage }}</p>
            </div>
          </div>

          <!-- Dates and Idempotency -->
          <div class="grid grid-cols-2 gap-[1.2rem] text-slate-600">
            <div>
              <span class="text-slate-500 text-[1.2rem] block">Initiated At</span>
              <span class="font-mono">{{ detailAttempt.initiatedAt ? formatDate(detailAttempt.initiatedAt) : '—' }}</span>
            </div>
            <div>
              <span class="text-slate-500 text-[1.2rem] block">Completed At</span>
              <span class="font-mono">{{ detailAttempt.completedAt ? formatDate(detailAttempt.completedAt) : '—' }}</span>
            </div>
          </div>
        </div>

        <div class="mt-[2.4rem] flex justify-end">
          <BaseButton radius="8px" variant="outline" @click="closeDetailModal">
            Close
          </BaseButton>
        </div>
      </div>
    </div>
  </DashboardContainer>
</template>
