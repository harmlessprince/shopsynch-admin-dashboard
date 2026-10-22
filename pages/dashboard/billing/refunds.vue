<script setup>
import { formatDate } from "~/utils/helpers.js";
import { isRefundFinal, refundStatusMeta } from "~/utils/billingRefunds.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-refunds",
});

useHead({
  title: "Subscription Refunds - ShopSynch Admin",
});

const refundsStore = useAdminBillingRefundsStore();

const tableHeader = [
  { title: "Merchant", accessor: "tenantId" },
  { title: "Amount", accessor: "amount" },
  { title: "Status", accessor: "status" },
  { title: "Reason", accessor: "reason" },
  { title: "Time taken back", accessor: "periodDaysReversed" },
  { title: "Requested", accessor: "requestedAt" },
  { title: "Action", accessor: "_action" },
];

function formatMoney(amount, currency = "NGN") {
  return `${currency || "NGN"} ${Number(amount || 0).toLocaleString()}`;
}

function statusMeta(status) {
  return refundStatusMeta[status] || { label: status, badge: "bg-gray-100 text-gray-600", hint: "" };
}

function timeTakeBack(refund) {
  if (refund.status !== "PROCESSED") return "Taken back once processed";
  if (!refund.periodReversedAt) return "Not taken back yet";
  const days = refund.periodDaysReversed ?? 0;
  return days > 0 ? `${days} day${days === 1 ? "" : "s"} removed` : "No time to remove";
}

const loadPage = (page) => refundsStore.fetchRefunds({ page });

onMounted(() => refundsStore.fetchRefunds({ page: 0 }));
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <DashboardPaymentAlertEmailsWarning />

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.6rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Subscription Refunds</h1>
          <p class="mt-[0.4rem] max-w-[80rem] text-[#616161]">
            Refunds of duplicate subscription payments, newest first. Full amount only, Paystack only (Monnify refunds
            stay manual), and the provider keeps its processing fee. The merchant's extra time is taken back when a
            refund is processed, not when it is requested. Start a refund from
            <NuxtLink to="/dashboard/billing/duplicate-payments" class="font-[700] text-primary">Duplicate payments</NuxtLink>.
          </p>
        </div>
        <BaseButton radius="8px" variant="outline" :loading="refundsStore.loading" @click="loadPage(refundsStore.page)">
          Reload
        </BaseButton>
      </div>
    </section>

    <p v-if="refundsStore.error" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">
      {{ refundsStore.error }}
    </p>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <DataTable
        :table-header="tableHeader"
        :table-data="refundsStore.refunds"
        :loading="refundsStore.loading"
        pagination-type="cursor"
        :has-prev="refundsStore.hasPrevious"
        :has-next="refundsStore.hasNext"
        :current-page="refundsStore.page + 1"
        :current-limit="refundsStore.limit"
        empty-state-title="No refunds yet"
        empty-state-description="No subscription payment has been refunded."
        @prev="loadPage(refundsStore.page - 1)"
        @next="loadPage(refundsStore.page + 1)"
        @change-limit="refundsStore.fetchRefunds({ page: 0, limit: $event })"
      >
        <template #cell(tenantId)="{ row }">
          <NuxtLink :to="`/dashboard/merchants/${row.tenantId}`" class="font-[700] text-primary hover:underline">
            {{ row.tenantId }}
          </NuxtLink>
          <p class="text-[1.2rem] text-[#616161]">{{ row.transactionReference }}</p>
        </template>

        <template #cell(amount)="{ row }">
          {{ formatMoney(row.amount, row.currency) }}
          <p class="text-[1.2rem] text-[#616161]">{{ row.provider }}</p>
        </template>

        <template #cell(status)="{ row }">
          <span
            :class="statusMeta(row.status).badge"
            class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
            :title="statusMeta(row.status).hint"
          >
            {{ statusMeta(row.status).label }}
          </span>
          <p v-if="row.providerMessage" class="mt-[0.3rem] max-w-[24rem] text-[1.2rem] text-[#616161]">
            {{ row.providerMessage }}
          </p>
          <p v-if="statusMeta(row.status).hint && !isRefundFinal(row.status)" class="mt-[0.3rem] max-w-[24rem] text-[1.2rem] text-[#9A4A00]">
            {{ statusMeta(row.status).hint }}
          </p>
        </template>

        <template #cell(reason)="{ row }">
          <span class="block max-w-[24rem] whitespace-normal">{{ row.reason || "No reason recorded" }}</span>
        </template>

        <template #cell(periodDaysReversed)="{ row }">
          {{ timeTakeBack(row) }}
          <p v-if="row.periodReversalNote" class="max-w-[24rem] whitespace-normal text-[1.2rem] text-[#616161]">
            {{ row.periodReversalNote }}
          </p>
        </template>

        <template #cell(requestedAt)="{ row }">
          {{ row.requestedAt ? formatDate(row.requestedAt) : "N/A" }}
        </template>

        <template #cell(_action)="{ row }">
          <BaseButton
            v-if="!isRefundFinal(row.status)"
            size="sm"
            radius="8px"
            variant="outline"
            :loading="refundsStore.refreshingId === row.id"
            @click="refundsStore.refreshRefund(row.id)"
          >
            Refresh
          </BaseButton>
        </template>
      </DataTable>
    </section>
  </div>
</template>
