<script setup>
import { formatDate, formatToMoney } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-payments",
});

useHead({
  title: "Subscription Payments - ShopSynch Admin",
});

const paymentsStore = useAdminBillingPaymentsStore();

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

const priceSourceMeta = {
  LIST: { label: "List", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  OFFER: { label: "Offer", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  PRICE_LOCK: { label: "Price Lock", badge: "bg-teal-50 text-teal-700 border-teal-200" },
};

const sourceMeta = {
  MERCHANT_CONFIRMATION: { label: "Merchant Confirmed", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  PAYMENT_WEBHOOK: { label: "Webhook", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ADMIN_MANUAL: { label: "Admin Manual", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  RECURRING_RENEWAL: { label: "Recurring Renewal", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  RECONCILIATION_JOB: { label: "Reconciliation Job", badge: "bg-cyan-50 text-cyan-700 border-cyan-200" },
};

const tableHeader = [
  { title: "Paid At", accessor: "paidAt" },
  { title: "Merchant", accessor: "tenantId" },
  { title: "Plan", accessor: "planId" },
  { title: "Amount Paid & List", accessor: "amountPaid" },
  { title: "Payment Source", accessor: "paymentSource" },
  { title: "Provider & Ref", accessor: "provider" },
  { title: "Attempt", accessor: "paymentAttemptId" },
  { title: "Actions", accessor: "_action" },
];

const showFilters = ref(false);
const detailPayment = ref(null);

function displayCurrency(currency) {
  if (currency === "NGN" || !currency) return "₦";
  return `${currency} `;
}

function money(amount, currency) {
  return formatToMoney(Number(amount || 0), displayCurrency(currency));
}

function getDiscount(payment) {
  if (!payment) return 0;
  const list = Number(payment.listAmount || 0);
  const paid = Number(payment.amountPaid || payment.amount || 0);
  if (list > paid && list > 0) {
    return list - paid;
  }
  return 0;
}

const paginationData = computed(() => {
  const current = paymentsStore.page + 1;
  const size = paymentsStore.size;
  const total = paymentsStore.totalElements;
  const totalPages = paymentsStore.totalPages || (total > 0 ? Math.ceil(total / size) : 1);
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
  await paymentsStore.fetchPayments({ page: Math.max(0, pageNumber - 1) });
}

function handleFetchPage(page) {
  loadData(page);
}

function handleApplyFilters() {
  paymentsStore.page = 0;
  loadData(1);
}

function handleResetFilters() {
  paymentsStore.resetFilters();
  loadData(1);
}

function openDetailModal(payment) {
  detailPayment.value = payment;
}

function closeDetailModal() {
  detailPayment.value = null;
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
              <span class="material-symbols-outlined text-primary text-[2.4rem]">verified_user</span>
              <h1 class="text-[2.2rem] font-[700] text-slate-900">Recorded Subscription Payments</h1>
            </div>
            <p class="mt-[0.4rem] max-w-[75rem] text-[1.4rem] text-slate-500">
              Audit successful subscription payments, view charged amounts against list pricing, inspect overpayments, and trace payments back to attempt checkouts.
            </p>
          </div>

          <div class="flex items-center gap-[1rem] flex-wrap">
            <button
              type="button"
              class="inline-flex items-center gap-[0.6rem] rounded-[8px] border border-slate-300 bg-white px-[1.4rem] py-[0.8rem] text-[1.35rem] font-[600] text-slate-700 hover:bg-slate-50 shadow-sm"
              @click="showFilters = !showFilters"
            >
              <span class="material-symbols-outlined text-[1.8rem]">filter_list</span>
              {{ showFilters ? 'Hide Filters' : 'Filter Payments' }}
            </button>
            <BaseButton
              radius="8px"
              variant="outline"
              class="whitespace-nowrap text-[1.35rem]"
              :loading="paymentsStore.loading"
              @click="loadData(paymentsStore.page + 1)"
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
              v-model="paymentsStore.filters.tenantId"
              type="text"
              placeholder="e.g. tn_123"
              class="w-full rounded-[8px] border border-slate-300 px-[1.2rem] py-[0.8rem] text-[1.35rem] focus:border-primary focus:outline-none"
              @keyup.enter="handleApplyFilters"
            >
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Subscription ID</label>
            <input
              v-model="paymentsStore.filters.subscriptionId"
              type="text"
              placeholder="e.g. sub_123"
              class="w-full rounded-[8px] border border-slate-300 px-[1.2rem] py-[0.8rem] text-[1.35rem] focus:border-primary focus:outline-none"
              @keyup.enter="handleApplyFilters"
            >
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Plan ID</label>
            <input
              v-model="paymentsStore.filters.planId"
              type="text"
              placeholder="e.g. pro"
              class="w-full rounded-[8px] border border-slate-300 px-[1.2rem] py-[0.8rem] text-[1.35rem] focus:border-primary focus:outline-none"
              @keyup.enter="handleApplyFilters"
            >
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Provider</label>
            <BaseSelectInput
              v-model="paymentsStore.filters.provider"
              :options="providerOptions"
            />
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Price Source</label>
            <BaseSelectInput
              v-model="paymentsStore.filters.priceSource"
              :options="priceSourceOptions"
            />
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Offer Code</label>
            <input
              v-model="paymentsStore.filters.offerCode"
              type="text"
              placeholder="e.g. FOUNDING50"
              class="w-full rounded-[8px] border border-slate-300 px-[1.2rem] py-[0.8rem] text-[1.35rem] focus:border-primary focus:outline-none"
              @keyup.enter="handleApplyFilters"
            >
          </div>
          <div>
            <label class="block text-[1.25rem] font-[600] text-slate-700 mb-[0.4rem]">Provider Reference</label>
            <input
              v-model="paymentsStore.filters.providerReference"
              type="text"
              placeholder="Matches payment reference"
              class="w-full rounded-[8px] border border-slate-300 px-[1.2rem] py-[0.8rem] text-[1.35rem] focus:border-primary focus:outline-none"
              @keyup.enter="handleApplyFilters"
            >
          </div>
          <div class="flex items-end gap-[0.8rem]">
            <BaseButton
              radius="8px"
              class="flex-1 text-[1.35rem] py-[0.8rem]"
              :loading="paymentsStore.loading"
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
        v-if="paymentsStore.error"
        class="rounded-[10px] border border-rose-200 bg-rose-50 p-[1.6rem] text-[1.4rem] text-rose-800 flex items-center justify-between"
      >
        <div class="flex items-center gap-[0.8rem]">
          <span class="material-symbols-outlined text-rose-600">error</span>
          <span>{{ paymentsStore.error }}</span>
        </div>
        <button class="font-[600] text-rose-700 underline" @click="loadData(1)">Try again</button>
      </div>

      <!-- Main Data Table -->
      <section class="overflow-hidden rounded-[10px] bg-white shadow-sm border border-slate-200/80">
        <DataTable
          :table-header="tableHeader"
          :table-data="paymentsStore.payments"
          :loading="paymentsStore.loading"
          :pagination="paginationData"
          has-pagination
          empty-state-title="No subscription payments found"
          empty-state-description="No payments match your filter criteria."
          @fetch-page="handleFetchPage"
        >
          <!-- Paid At Column -->
          <template #cell(paidAt)="{ row }">
            <div class="text-[1.3rem] whitespace-nowrap">
              <span class="font-[600] text-slate-900 block">{{ row.paidAt ? formatDate(row.paidAt) : '—' }}</span>
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

          <!-- Amount Paid & List Price Column -->
          <template #cell(amountPaid)="{ row }">
            <div class="text-[1.3rem] min-w-[20rem]">
              <div class="flex items-center gap-[0.6rem]">
                <span class="font-[700] text-[1.45rem] text-slate-900 font-mono">
                  {{ money(row.amountPaid ?? row.amount, row.currency) }}
                </span>
                <!-- Price Source Badge -->
                <span
                  class="rounded-full px-[0.7rem] py-[0.1rem] text-[1.1rem] font-[700] border"
                  :class="priceSourceMeta[row.priceSource]?.badge || 'bg-slate-100 text-slate-600 border-slate-200'"
                >
                  {{ priceSourceMeta[row.priceSource]?.label || row.priceSource }}
                </span>
              </div>

              <!-- List amount, Discount & Overpayment -->
              <div class="mt-[0.3rem] flex items-center gap-[0.8rem] text-[1.2rem] flex-wrap">
                <span v-if="row.listAmount && Number(row.listAmount) !== Number(row.amountPaid ?? row.amount)" class="text-slate-400 line-through font-mono">
                  List: {{ money(row.listAmount, row.currency) }}
                </span>
                <span v-if="getDiscount(row) > 0" class="rounded bg-emerald-100 text-emerald-800 font-[700] px-[0.5rem] py-[0.1rem] text-[1.1rem]">
                  Save {{ money(getDiscount(row), row.currency) }}
                </span>
                <span v-if="row.overpaidAmount > 0" class="rounded bg-amber-100 text-amber-800 font-[700] px-[0.5rem] py-[0.1rem] text-[1.1rem]">
                  Overpaid {{ money(row.overpaidAmount, row.currency) }}
                </span>
                <span v-if="row.offerCode" class="text-indigo-600 font-[600] text-[1.15rem]">
                  {{ row.offerCode }}
                </span>
              </div>
            </div>
          </template>

          <!-- Payment Source Column -->
          <template #cell(paymentSource)="{ row }">
            <span
              class="inline-flex items-center rounded-full px-[0.9rem] py-[0.2rem] text-[1.15rem] font-[700] border"
              :class="sourceMeta[row.paymentSource]?.badge || 'bg-slate-100 text-slate-600 border-slate-200'"
            >
              {{ sourceMeta[row.paymentSource]?.label || row.paymentSource || 'N/A' }}
            </span>
          </template>

          <!-- Provider & Reference Column -->
          <template #cell(provider)="{ row }">
            <div class="text-[1.3rem] max-w-[22rem]">
              <div class="flex items-center gap-[0.6rem]">
                <span class="font-[700] text-slate-800 text-[1.25rem]">{{ row.provider || '—' }}</span>
                <span v-if="row.paymentMethod" class="text-[1.15rem] text-slate-500 bg-slate-100 px-[0.4rem] py-[0.1rem] rounded">
                  {{ row.paymentMethod }}
                </span>
              </div>
              <p
                v-if="row.providerReference"
                class="font-mono text-[1.2rem] text-slate-600 truncate mt-[0.2rem]"
                :title="row.providerReference"
              >
                {{ row.providerReference }}
              </p>
            </div>
          </template>

          <!-- Attempt Link Column -->
          <template #cell(paymentAttemptId)="{ row }">
            <div class="text-[1.3rem]">
              <NuxtLink
                v-if="row.paymentAttemptId"
                :to="`/dashboard/billing/payment-attempts?providerReference=${encodeURIComponent(row.providerReference || '')}`"
                class="font-mono text-[1.2rem] text-primary hover:underline font-[600]"
                title="View matching payment attempt"
              >
                Attempt: {{ row.paymentAttemptId.slice(-8) }}
              </NuxtLink>
              <span v-else class="text-[1.2rem] text-slate-400 italic">
                Manual / Invoice
              </span>
            </div>
          </template>

          <!-- Action Column -->
          <template #cell(_action)="{ row }">
            <button
              type="button"
              class="rounded-[6px] border border-slate-200 bg-white px-[1rem] py-[0.5rem] text-[1.25rem] font-[600] text-slate-700 hover:bg-slate-50 transition shadow-xs"
              @click="openDetailModal(row)"
            >
              Details
            </button>
          </template>
        </DataTable>
      </section>
    </div>

    <!-- Details Modal -->
    <div
      v-if="detailPayment"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-[62rem] max-h-[90vh] overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-[2.4rem] shadow-xl">
        <div class="flex items-center justify-between pb-[1.4rem] border-b border-slate-100">
          <div>
            <h3 class="text-[1.8rem] font-[700] text-slate-900">Recorded Payment Details</h3>
            <p class="font-mono text-[1.25rem] text-slate-500 mt-[0.2rem]">Payment ID: {{ detailPayment.id }}</p>
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
                <TenantHoverCard :tenant-id="detailPayment.tenantId" />
              </div>
            </div>
            <div class="rounded-[8px] bg-slate-50 p-[1.2rem]">
              <span class="text-slate-500 block text-[1.2rem]">Payment Source</span>
              <span
                class="inline-block mt-[0.2rem] rounded-full px-[0.9rem] py-[0.2rem] text-[1.2rem] font-[700] border"
                :class="sourceMeta[detailPayment.paymentSource]?.badge || 'bg-slate-100 text-slate-600 border-slate-200'"
              >
                {{ sourceMeta[detailPayment.paymentSource]?.label || detailPayment.paymentSource }}
              </span>
            </div>
          </div>

          <!-- Pricing & Monetary Breakdown -->
          <div class="rounded-[10px] border border-slate-200 p-[1.6rem]">
            <h4 class="text-[1.4rem] font-[700] text-slate-900 mb-[1.2rem]">Payment &amp; Tax Breakdown</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-[1.2rem]">
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Amount Received</span>
                <span class="font-mono font-[700] text-slate-900 text-[1.5rem]">
                  {{ money(detailPayment.amountPaid, detailPayment.currency) }}
                </span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Amount Due</span>
                <span class="font-mono font-[600] text-slate-700">
                  {{ money(detailPayment.amount, detailPayment.currency) }}
                </span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">List Amount</span>
                <span class="font-mono text-slate-700">
                  {{ money(detailPayment.listAmount, detailPayment.currency) }}
                </span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Base Amount</span>
                <span class="font-mono text-slate-700">{{ money(detailPayment.baseAmount, detailPayment.currency) }}</span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">VAT Amount</span>
                <span class="font-mono text-slate-700">{{ money(detailPayment.vatAmount, detailPayment.currency) }}</span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Overpaid Amount</span>
                <span class="font-mono" :class="detailPayment.overpaidAmount > 0 ? 'text-amber-700 font-[700]' : 'text-slate-600'">
                  {{ money(detailPayment.overpaidAmount, detailPayment.currency) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Terms & Source Details -->
          <div class="rounded-[10px] border border-slate-200 p-[1.6rem] space-y-[1rem]">
            <h4 class="text-[1.4rem] font-[700] text-slate-900">Subscription Terms &amp; Provider</h4>
            <div class="grid grid-cols-2 gap-[1.2rem]">
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Plan</span>
                <div class="mt-[0.2rem]">
                  <PlanLabel :plan-id="detailPayment.planId" :period-unit-count="detailPayment.periodUnitCount" :period-days="detailPayment.periodDays" />
                </div>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Price Source</span>
                <span class="font-[700] text-indigo-700">{{ detailPayment.priceSource }}</span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Offer Code</span>
                <span class="font-[600] text-slate-800">{{ detailPayment.offerCode || 'None' }}</span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Period Length</span>
                <span class="font-[600] text-slate-800">{{ detailPayment.periodUnitCount }} month(s) ({{ detailPayment.periodDays }} days)</span>
              </div>
              <div>
                <span class="text-slate-500 text-[1.2rem] block">Payment Method</span>
                <span class="font-[600] text-slate-800">{{ detailPayment.paymentMethod || '—' }}</span>
              </div>
            </div>

            <div class="pt-[0.8rem] border-t border-slate-100">
              <span class="text-slate-500 text-[1.2rem] block">Provider Reference</span>
              <code class="font-mono bg-slate-50 p-[0.6rem] rounded border block break-all text-[1.25rem] mt-[0.2rem]">
                {{ detailPayment.providerReference || 'None' }}
              </code>
            </div>

            <div v-if="detailPayment.paymentAttemptId" class="pt-[0.4rem]">
              <span class="text-slate-500 text-[1.2rem] block">Payment Attempt ID</span>
              <NuxtLink
                :to="`/dashboard/billing/payment-attempts?providerReference=${encodeURIComponent(detailPayment.providerReference || '')}`"
                class="font-mono text-primary font-[700] hover:underline"
              >
                {{ detailPayment.paymentAttemptId }} → View Attempt
              </NuxtLink>
            </div>
          </div>

          <!-- Timestamp -->
          <div class="text-slate-600">
            <span class="text-slate-500 text-[1.2rem] block">Recorded Paid At</span>
            <span class="font-mono font-[600] text-slate-800">{{ detailPayment.paidAt ? formatDate(detailPayment.paidAt) : '—' }}</span>
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
