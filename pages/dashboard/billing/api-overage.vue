<script setup>
import { formatDate } from "~/utils/helpers.js";
import { overageStateMeta, usageMonthLabel } from "~/utils/apiOverage.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-api-overage",
});

useHead({
  title: "API Overage - ShopSynch Admin",
});

const overageStore = useAdminBillingApiOverageStore();

const invoiceHeader = [
  { title: "Store", accessor: "tenantId" },
  { title: "Month", accessor: "usageMonth" },
  { title: "Amount", accessor: "amount" },
  { title: "Collection", accessor: "collectionState" },
  { title: "Due", accessor: "dueDate" },
];

const statusOptions = [
  { value: "", label: "Issued, paid and cancelled" },
  { value: "ISSUED", label: "Issued (unpaid)" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];
const invoiceMonth = ref("");
const invoiceStatus = ref("");

const loadInvoices = (page = 0) =>
  overageStore.fetchInvoices({ page, usageMonth: invoiceMonth.value, status: invoiceStatus.value });

const attentionHeader = [
  { title: "Store", accessor: "tenantId" },
  { title: "Month", accessor: "usageMonth" },
  { title: "Amount", accessor: "amount" },
  { title: "Collection", accessor: "collectionState" },
  { title: "Why it needs attention", accessor: "adminAttentionReason" },
];

function formatMoney(amount, currency = "NGN") {
  return `${currency || "NGN"} ${Number(amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// The period filter: both dates optional, "to" is the last day included, the API takes an exclusive end.
const revenueFrom = ref("");
const revenueTo = ref("");

function revenueParams() {
  const params = {};
  if (revenueFrom.value) params.paidFrom = new Date(`${revenueFrom.value}T00:00:00Z`).toISOString();
  if (revenueTo.value) params.paidTo = new Date(new Date(`${revenueTo.value}T00:00:00Z`).getTime() + 86400000).toISOString();
  return params;
}

const loadRevenue = () => overageStore.fetchRevenueSplit(revenueParams());

// A row's parts should add up to its total; say so when they do not instead of hiding it.
function addsUp(row) {
  const parts = Number(row.planRevenue || 0) + Number(row.addOnRevenue || 0) + Number(row.apiOverageRevenue || 0);
  return Math.abs(parts - Number(row.totalRevenue || 0)) < 0.005;
}

onMounted(() => {
  overageStore.fetchAttention();
  loadInvoices();
  loadRevenue();
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <DashboardBillingTabs />

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.6rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">API Overage</h1>
          <p class="mt-[0.4rem] max-w-[80rem] text-[#616161]">
            Live API calls past a plan's included amount are invoiced after each month closes. API calls are never cut
            off because an invoice is unpaid. Resolving a flagged invoice is not available here yet; the backend
            actions are in
            <a
              href="https://github.com/harmlessprince/ecommerce-api-springboot/pull/1314"
              target="_blank"
              rel="noopener"
              class="font-[700] text-primary"
            >backend PR 1314</a>.
          </p>
        </div>
        <BaseButton
          radius="8px"
          variant="outline"
          :loading="overageStore.loadingAttention || overageStore.loadingRevenue || overageStore.loadingInvoices"
          @click="overageStore.fetchAttention(); loadRevenue(); loadInvoices(overageStore.invoicePage)"
        >
          Reload
        </BaseButton>
      </div>
    </section>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h2 class="text-[1.8rem] font-[700] text-[#000]">Revenue split</h2>
      <p class="mt-[0.4rem] max-w-[80rem] text-[#616161]">
        What subscriptions collected in the period, VAT included, one row per currency. API overage is its own column and
        is never counted as plan or add-on revenue.
      </p>
      <div class="mt-[1.2rem] grid gap-[1.2rem] md:grid-cols-3">
        <AppInput v-model="revenueFrom" label="Paid from" name="revenueFrom" type="date" />
        <AppInput v-model="revenueTo" label="Paid to (included)" name="revenueTo" type="date" />
        <div class="flex items-end">
          <BaseButton radius="8px" :loading="overageStore.loadingRevenue" @click="loadRevenue">Apply period</BaseButton>
        </div>
      </div>
      <p v-if="overageStore.revenueError" class="mt-[1.2rem] rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">
        {{ overageStore.revenueError }}
      </p>
      <div v-else class="mt-[1.2rem] overflow-x-auto">
        <table class="w-full text-left">
          <thead class="text-[1.2rem] text-[#616161]">
            <tr>
              <th class="py-[0.8rem] pr-[1.6rem] font-[600]">Currency</th>
              <th class="py-[0.8rem] pr-[1.6rem] font-[600]">Plans</th>
              <th class="py-[0.8rem] pr-[1.6rem] font-[600]">Add-ons</th>
              <th class="py-[0.8rem] pr-[1.6rem] font-[600]">API overage</th>
              <th class="py-[0.8rem] pr-[1.6rem] font-[600]">Total</th>
              <th class="py-[0.8rem] font-[600]">Payments</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in overageStore.revenueSplit" :key="row.currency" class="border-t border-slate-100">
              <td class="py-[1rem] pr-[1.6rem] font-[700]">{{ row.currency }}</td>
              <td class="py-[1rem] pr-[1.6rem]">{{ formatMoney(row.planRevenue, row.currency) }}</td>
              <td class="py-[1rem] pr-[1.6rem]">{{ formatMoney(row.addOnRevenue, row.currency) }}</td>
              <td class="py-[1rem] pr-[1.6rem]">{{ formatMoney(row.apiOverageRevenue, row.currency) }}</td>
              <td class="py-[1rem] pr-[1.6rem] font-[700]">
                {{ formatMoney(row.totalRevenue, row.currency) }}
                <p v-if="!addsUp(row)" class="text-[1.2rem] font-[600] text-[#B42318]">The parts do not add up to this total.</p>
              </td>
              <td class="py-[1rem]">{{ row.paymentCount }}</td>
            </tr>
            <tr v-if="!overageStore.loadingRevenue && !overageStore.revenueSplit.length">
              <td colspan="6" class="py-[1.6rem] text-[#616161]">No subscription revenue in this period.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <div class="p-[2rem] pb-0">
        <h2 class="text-[1.8rem] font-[700] text-[#000]">Needs attention</h2>
        <p class="mt-[0.4rem] max-w-[80rem] text-[#616161]">
          Overage invoices where the automatic charge kept failing, a payment arrived that does not match, or the invoice
          is unpaid past its grace period. Newest first.
        </p>
        <p v-if="overageStore.attentionError" class="mt-[1.2rem] rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">
          {{ overageStore.attentionError }}
        </p>
      </div>
      <DataTable
        :table-header="attentionHeader"
        :table-data="overageStore.attention"
        :loading="overageStore.loadingAttention"
        :has-pagination="false"
        empty-state-title="Nothing needs attention"
        empty-state-description="No overage invoice is flagged for an admin right now."
      >
        <template #cell(tenantId)="{ row }">
          <TenantHoverCard v-if="row.tenantId" :tenant-id="row.tenantId" />
          <span v-else class="text-slate-400">N/A</span>
          <p class="font-mono text-[1.2rem] text-slate-500 mt-[0.2rem]">{{ row.invoiceNumber }}</p>
        </template>
        <template #cell(usageMonth)="{ row }">{{ usageMonthLabel(row.usageMonth) }}</template>
        <template #cell(amount)="{ row }">{{ formatMoney(row.amount, row.currency) }}</template>
        <template #cell(collectionState)="{ row }">
          <StatusBadge :tone="overageStateMeta(row).tone" :label="overageStateMeta(row).label" />
          <StatusBadge v-if="row.overdue" tone="danger" label="Overdue" class="ml-[0.4rem]" />
          <p v-if="row.adminAttentionFlaggedAt" class="mt-[0.3rem] text-[1.2rem] text-[#616161]">
            Flagged {{ formatDate(row.adminAttentionFlaggedAt, "short") }}
          </p>
        </template>
        <template #cell(adminAttentionReason)="{ row }">
          <span class="block max-w-[34rem] whitespace-normal">{{ row.adminAttentionReason || "No reason recorded" }}</span>
        </template>
      </DataTable>
    </section>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <div class="p-[2rem] pb-0">
        <h2 class="text-[1.8rem] font-[700] text-[#000]">All overage invoices</h2>
        <p class="mt-[0.4rem] max-w-[80rem] text-[#616161]">Every store's overage invoices, newest first. Filter by usage month and status.</p>
        <form class="mt-[1.2rem] grid gap-[1.2rem] md:grid-cols-[14rem_20rem_auto]" @submit.prevent="loadInvoices(0)">
          <AppInput v-model="invoiceMonth" label="Usage month" name="overageInvoiceMonth" type="month" />
          <div>
            <label class="mb-[0.8rem] block text-[1.4rem] text-[#1B1B19]" for="overageInvoiceStatus">Status</label>
            <select
              id="overageInvoiceStatus"
              v-model="invoiceStatus"
              class="w-full rounded-[10px] border border-[#D9D9D9] bg-white p-[1.4rem] outline-none focus:border-primary"
            >
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <BaseButton type="submit" radius="8px" class="self-end" :loading="overageStore.loadingInvoices">Apply filters</BaseButton>
        </form>
        <p v-if="overageStore.invoicesError" class="mt-[1.2rem] rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">
          {{ overageStore.invoicesError }}
        </p>
      </div>
      <DataTable
        :table-header="invoiceHeader"
        :table-data="overageStore.invoices"
        :loading="overageStore.loadingInvoices"
        pagination-type="cursor"
        :has-prev="overageStore.invoicePage > 0"
        :has-next="overageStore.invoicePage + 1 < overageStore.invoiceTotalPages"
        :current-page="overageStore.invoicePage + 1"
        :current-limit="overageStore.invoiceSize"
        empty-state-title="No overage invoices"
        empty-state-description="No overage invoice matches these filters."
        @prev="loadInvoices(overageStore.invoicePage - 1)"
        @next="loadInvoices(overageStore.invoicePage + 1)"
        @change-limit="overageStore.fetchInvoices({ page: 0, size: $event, usageMonth: invoiceMonth, status: invoiceStatus })"
      >
        <template #cell(tenantId)="{ row }">
          <TenantHoverCard v-if="row.tenantId" :tenant-id="row.tenantId" />
          <span v-else class="text-slate-400">N/A</span>
          <p class="font-mono text-[1.2rem] text-slate-500 mt-[0.2rem]">{{ row.invoiceNumber }}</p>
        </template>
        <template #cell(usageMonth)="{ row }">{{ usageMonthLabel(row.usageMonth) }}</template>
        <template #cell(amount)="{ row }">{{ formatMoney(row.amount, row.currency) }}</template>
        <template #cell(collectionState)="{ row }">
          <StatusBadge :tone="overageStateMeta(row).tone" :label="overageStateMeta(row).label" />
          <StatusBadge v-if="row.overdue" tone="danger" label="Overdue" class="ml-[0.4rem]" />
          <StatusBadge v-if="row.adminAttentionRequired" tone="danger" label="Needs attention" class="ml-[0.4rem]" />
        </template>
        <template #cell(dueDate)="{ row }">{{ row.dueDate ? formatDate(row.dueDate, "short") : "N/A" }}</template>
      </DataTable>
    </section>
  </div>
</template>
