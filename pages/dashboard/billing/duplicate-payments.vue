<script setup>
import { formatDate } from "~/utils/helpers.js";
import { refundStatusMeta } from "~/utils/billingRefunds.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-duplicate-payments",
});

useHead({
  title: "Duplicate Subscription Payments - ShopSynch Admin",
});

const shadowStore = useAdminBillingShadowStore();
const refundsStore = useAdminBillingRefundsStore();

const typeOptions = [
  { label: "Would be duplicate", value: "WOULD_BE_DUPLICATE" },
  { label: "Would apply", value: "WOULD_APPLY" },
  { label: "Attempt", value: "ATTEMPT" },
];

const summaryTiles = [
  { type: "WOULD_BE_DUPLICATE", label: "Would be duplicate", hint: "A later payment for a billing period that is already paid." },
  { type: "WOULD_APPLY", label: "Would apply", hint: "The first payment for a billing period." },
  { type: "ATTEMPT", label: "Attempts", hint: "Checkouts mapped to the billing period they pay for." },
];

const tableHeader = [
  { title: "Merchant", accessor: "tenantId" },
  { title: "Payment", accessor: "providerReference" },
  { title: "Amount", accessor: "amount" },
  { title: "Observed", accessor: "createdAt" },
  { title: "Refund", accessor: "_action" },
];

const refundTarget = ref(null);
const refundNote = ref("");

const isDuplicateView = computed(() => shadowStore.type === "WOULD_BE_DUPLICATE");

// Only an active refund blocks a new one; a FAILED refund frees the payment to be refunded again.
const activeRefundByPayment = computed(() => {
  const byPayment = {};
  for (const refund of refundsStore.refunds) {
    if (refund.active) byPayment[refund.paymentId] = refund;
  }
  return byPayment;
});

const noteError = computed(() => {
  const error = refundsStore.requestErrors?.note;
  return Array.isArray(error) ? error.join(" ") : error || "";
});

function formatMoney(amount, currency = "NGN") {
  return `${currency || "NGN"} ${Number(amount || 0).toLocaleString()}`;
}

function channelLabel(channel) {
  return channel === "BANK_TRANSFER" ? "Bank transfer" : channel === "CARD" ? "Card" : channel;
}

function statusMeta(status) {
  return refundStatusMeta[status] || { label: status, badge: "bg-gray-100 text-gray-600" };
}

function openRefund(entry) {
  refundTarget.value = entry;
  refundNote.value = "";
  refundsStore.requestErrors = {};
}

function closeRefund() {
  if (refundsStore.requesting) return;
  refundTarget.value = null;
}

async function confirmRefund() {
  const refund = await refundsStore.requestRefund({
    paymentId: refundTarget.value.paymentId,
    note: refundNote.value.trim(),
  });
  if (!refund) return;
  refundTarget.value = null;
  await refundsStore.fetchRefunds({ page: 0, limit: 200 });
}

const loadEntries = (params) => shadowStore.fetchEntries(params);

onMounted(() => {
  shadowStore.fetchSummary();
  shadowStore.fetchEntries({ page: 0 });
  refundsStore.fetchRefunds({ page: 0, limit: 200 });
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <DashboardPaymentAlertEmailsWarning />

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h1 class="text-[2rem] font-[700] text-[#000]">Duplicate Subscription Payments</h1>
      <p class="mt-[0.4rem] max-w-[84rem] text-[#616161]">
        This is observation only today. The backend records what a one-invoice-per-billing-period rule would do, but it
        never changes a charge or a subscription. Reviewing these over at least one full billing cycle tells us whether
        the rule is safe to enforce. A refund started here is the only action that changes anything; follow it on
        <NuxtLink to="/dashboard/billing/refunds" class="font-[700] text-primary">Subscription refunds</NuxtLink>.
      </p>
    </section>

    <section class="grid gap-[1.2rem] md:grid-cols-3">
      <button
        v-for="tile in summaryTiles"
        :key="tile.type"
        type="button"
        class="rounded-[8px] bg-white p-[1.6rem] text-left shadow-sm border-2"
        :class="shadowStore.type === tile.type ? 'border-primary' : 'border-transparent'"
        @click="loadEntries({ type: tile.type, page: 0 })"
      >
        <p class="text-[1.2rem] font-[700] uppercase tracking-wide text-[#616161]">{{ tile.label }}</p>
        <p class="mt-[0.4rem] text-[2.8rem] font-[800] text-[#000]">
          {{ shadowStore.loadingSummary ? "…" : (shadowStore.summary[tile.type] ?? 0) }}
        </p>
        <p class="mt-[0.2rem] text-[1.2rem] text-[#616161]">{{ tile.hint }}</p>
      </button>
    </section>

    <p v-if="shadowStore.error" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">
      {{ shadowStore.error }}
    </p>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <div class="flex flex-col gap-[1rem] border-b border-[#EDEFF2] p-[1.6rem] sm:flex-row sm:items-end sm:justify-between">
        <div class="w-full sm:w-[28rem]">
          <BaseSelectInput
            :model-value="shadowStore.type"
            :options="typeOptions"
            label="Observation type"
            @update:model-value="loadEntries({ type: $event, page: 0 })"
          />
        </div>
      </div>

      <DataTable
        :table-header="tableHeader"
        :table-data="shadowStore.entries"
        :loading="shadowStore.loadingEntries"
        pagination-type="cursor"
        :has-prev="shadowStore.hasPrevious"
        :has-next="shadowStore.hasNext"
        :current-page="shadowStore.page + 1"
        :current-limit="shadowStore.limit"
        empty-state-title="Nothing observed"
        empty-state-description="No observations of this type have been recorded."
        @prev="loadEntries({ page: shadowStore.page - 1 })"
        @next="loadEntries({ page: shadowStore.page + 1 })"
        @change-limit="loadEntries({ page: 0, limit: $event })"
      >
        <template #cell(tenantId)="{ row }">
          <NuxtLink :to="`/dashboard/merchants/${row.tenantId}`" class="font-[700] text-primary hover:underline">
            {{ row.tenantId }}
          </NuxtLink>
        </template>

        <template #cell(providerReference)="{ row }">
          <p class="font-[700] text-[#000]">{{ row.providerReference }}</p>
          <p v-if="row.firstPaymentId" class="text-[1.2rem] text-[#616161]">
            Period first paid by payment {{ row.firstPaymentId }}
          </p>
          <p v-if="row.note" class="max-w-[28rem] whitespace-normal text-[1.2rem] text-[#616161]">{{ row.note }}</p>
        </template>

        <template #cell(amount)="{ row }">
          {{ formatMoney(row.amount, row.currency) }}
          <p class="text-[1.2rem] text-[#616161]">{{ row.provider }} · {{ channelLabel(row.channel) }}</p>
        </template>

        <template #cell(createdAt)="{ row }">
          {{ row.createdAt ? formatDate(row.createdAt) : "N/A" }}
        </template>

        <template #cell(_action)="{ row }">
          <template v-if="isDuplicateView && row.paymentId">
            <NuxtLink v-if="activeRefundByPayment[row.paymentId]" to="/dashboard/billing/refunds">
              <span
                :class="statusMeta(activeRefundByPayment[row.paymentId].status).badge"
                class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
              >
                Refund {{ statusMeta(activeRefundByPayment[row.paymentId].status).label.toLowerCase() }}
              </span>
            </NuxtLink>
            <BaseButton v-else size="sm" radius="8px" variant="outline" @click="openRefund(row)">
              Refund
            </BaseButton>
          </template>
        </template>
      </DataTable>
    </section>

    <div
      v-if="refundTarget"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-[48rem] rounded-[12px] border border-slate-200 bg-white p-[2.4rem] shadow-xl">
        <h3 class="text-[1.8rem] font-[700] text-slate-900">Refund this duplicate payment?</h3>
        <p class="mt-[1.2rem] text-[1.4rem] leading-relaxed text-slate-600">
          Payment <strong>{{ refundTarget.providerReference }}</strong> of
          <strong>{{ formatMoney(refundTarget.amount, refundTarget.currency) }}</strong> will be refunded through the
          provider. The full amount is returned and the provider keeps its processing fee. The merchant's extra time
          is taken back once the refund is processed.
        </p>
        <div class="mt-[1.6rem]">
          <BaseTextArea
            v-model="refundNote"
            label="Reason for the refund"
            placeholder="Why is this payment being refunded?"
            :rows="3"
            :error="noteError"
          />
        </div>
        <div class="mt-[2.4rem] flex justify-end gap-[1.2rem]">
          <BaseButton radius="8px" variant="outline" :disabled="refundsStore.requesting" @click="closeRefund">
            Cancel
          </BaseButton>
          <BaseButton radius="8px" bold :loading="refundsStore.requesting" @click="confirmRefund">
            Refund payment
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
