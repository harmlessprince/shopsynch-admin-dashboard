<script setup>
import { formatDate } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-payment-gateway-webhooks",
});

useHead({
  title: "Incoming Payment Webhooks - ShopSynch Admin",
});

const webhooksStore = useAdminIncomingWebhooksStore();

const statusMeta = {
  RECEIVED: { label: "Received", badge: "bg-[#D0E8FF] text-[#335C85]", hint: "Being processed now. If it stays here for more than a few minutes it was abandoned and is retried on the provider's next delivery." },
  PROCESSED: { label: "Processed", badge: "bg-[#B5F9B4] text-[#3CA745]", hint: "Handled." },
  IGNORED: { label: "Ignored", badge: "bg-[#F3F4F6] text-[#6B7280]", hint: "A business rule declined it (for example payment not complete). Repeating it changes nothing." },
  FAILED: { label: "Failed", badge: "bg-[#FFBFBF] text-[#B42318]", hint: "Processing failed. The provider retries and the backend processes it again. An alert fires on the third failure." },
  UNMATCHED: { label: "Unmatched", badge: "bg-[#FFE4C2] text-[#9A4A00]", hint: "A genuine, signed event for a reference nothing here knows. The merchant may have paid with nothing recorded. Needs a person." },
};

const statuses = Object.keys(statusMeta);
const needsAction = ["FAILED", "UNMATCHED"];

const statusOptions = [
  { label: "All statuses", value: "" },
  ...statuses.map((value) => ({ label: statusMeta[value].label, value })),
];

const tableHeader = [
  { title: "Received", accessor: "receivedAt" },
  { title: "Provider", accessor: "provider" },
  { title: "Reference", accessor: "reference" },
  { title: "Status", accessor: "status" },
  { title: "Attempts", accessor: "attempts" },
  { title: "Details", accessor: "_action" },
];

const referenceInput = ref("");
const selected = ref(null);

// The payload carries customer details: show it only here, and never log it.
const prettyPayload = computed(() => {
  const raw = selected.value?.payload;
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
});

const headerEntries = computed(() => Object.entries(selected.value?.headers || {}));

function meta(status) {
  return statusMeta[status] || { label: status, badge: "bg-gray-100 text-gray-600", hint: "" };
}

const load = (params) => webhooksStore.fetchWebhooks(params);

function searchReference() {
  load({ reference: referenceInput.value.trim(), page: 0 });
}

function clearReference() {
  referenceInput.value = "";
  load({ reference: "", page: 0 });
}

function reloadAll() {
  webhooksStore.fetchSummary();
  load({ page: webhooksStore.page });
}

onMounted(() => {
  webhooksStore.fetchSummary();
  load({ page: 0 });
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <DashboardPaymentAlertEmailsWarning />

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.6rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <NuxtLink to="/dashboard/payment-gateways" class="text-[1.3rem] font-[600] text-primary hover:underline">
            &larr; Payment Gateways
          </NuxtLink>
          <h1 class="mt-[0.4rem] text-[2rem] font-[700] text-[#000]">Incoming Payment Webhooks</h1>
          <p class="mt-[0.4rem] max-w-[84rem] text-[#616161]">
            Every signature-verified webhook from Paystack and Monnify, stored before it is processed. Use it to answer
            "I paid and nothing happened", and to find webhooks that failed or matched nothing.
          </p>
        </div>
        <BaseButton radius="8px" variant="outline" :loading="webhooksStore.loading" @click="reloadAll">
          Reload
        </BaseButton>
      </div>
    </section>

    <section class="grid gap-[1.2rem] sm:grid-cols-2 lg:grid-cols-5">
      <button
        v-for="name in statuses"
        :key="name"
        type="button"
        class="rounded-[8px] bg-white p-[1.6rem] text-left shadow-sm border-2"
        :class="[
          webhooksStore.status === name && !webhooksStore.reference ? 'border-primary' : 'border-transparent',
          needsAction.includes(name) && (webhooksStore.summary[name] ?? 0) > 0 ? 'ring-2 ring-[#FFBFBF]' : '',
        ]"
        :data-testid="`webhook-tile-${name}`"
        @click="referenceInput = ''; load({ status: name, reference: '', page: 0 })"
      >
        <p class="flex items-center gap-[0.6rem] text-[1.2rem] font-[700] uppercase tracking-wide text-[#616161]">
          {{ meta(name).label }}
          <span
            v-if="needsAction.includes(name) && (webhooksStore.summary[name] ?? 0) > 0"
            class="rounded-full bg-[#B42318] px-[0.8rem] py-[0.1rem] text-[1.1rem] text-white"
          >
            needs action
          </span>
        </p>
        <p class="mt-[0.4rem] text-[2.8rem] font-[800] text-[#000]">
          {{ webhooksStore.loadingSummary ? "…" : (webhooksStore.summary[name] ?? 0) }}
        </p>
      </button>
    </section>

    <p v-if="webhooksStore.error" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">
      {{ webhooksStore.error }}
    </p>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <div class="flex flex-col gap-[1rem] border-b border-[#EDEFF2] p-[1.6rem] lg:flex-row lg:items-end">
        <BaseSelectInput
          :model-value="webhooksStore.status"
          :options="statusOptions"
          label="Status"
          input-class="min-w-[20rem]"
          @update:model-value="referenceInput = ''; load({ status: $event, reference: '', page: 0 })"
        />
        <form class="flex flex-1 items-end gap-[1rem]" @submit.prevent="searchReference">
          <div class="flex-1">
            <AppInput v-model="referenceInput" label="Payment reference" placeholder="Search by payment reference" />
          </div>
          <BaseButton type="submit" radius="8px" :disabled="!referenceInput.trim()">Search</BaseButton>
          <BaseButton v-if="webhooksStore.reference" radius="8px" variant="outline" @click="clearReference">
            Clear
          </BaseButton>
        </form>
      </div>
      <p v-if="webhooksStore.reference" class="border-b border-[#EDEFF2] bg-[#FAFAFA] px-[1.6rem] py-[1rem] text-[1.3rem] text-[#616161]">
        Showing everything the providers sent for <strong>{{ webhooksStore.reference }}</strong>. The status filter is
        ignored while a reference is searched.
      </p>

      <DataTable
        :table-header="tableHeader"
        :table-data="webhooksStore.webhooks"
        :loading="webhooksStore.loading"
        pagination-type="cursor"
        :has-prev="webhooksStore.hasPrevious"
        :has-next="webhooksStore.hasNext"
        :current-page="webhooksStore.page + 1"
        :current-limit="webhooksStore.limit"
        empty-state-title="No webhooks found"
        empty-state-description="No stored webhook matches this filter."
        @prev="load({ page: webhooksStore.page - 1 })"
        @next="load({ page: webhooksStore.page + 1 })"
        @change-limit="load({ page: 0, limit: $event })"
      >
        <template #cell(receivedAt)="{ row }">
          {{ row.receivedAt ? formatDate(row.receivedAt) : "N/A" }}
        </template>

        <template #cell(provider)="{ row }">
          {{ row.provider }}
          <p class="text-[1.2rem] text-[#616161]">{{ row.eventType }}</p>
        </template>

        <template #cell(reference)="{ row }">
          <p class="font-[700] text-[#000]">{{ row.reference || "No reference" }}</p>
          <p class="text-[1.2rem] text-[#616161]">{{ row.targetKind }}</p>
          <NuxtLink v-if="row.tenantId" :to="`/dashboard/merchants/${row.tenantId}`" class="text-[1.2rem] font-[600] text-primary hover:underline">
            {{ row.tenantId }}
          </NuxtLink>
        </template>

        <template #cell(status)="{ row }">
          <span
            :class="meta(row.status).badge"
            class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
            :title="meta(row.status).hint"
          >
            {{ meta(row.status).label }}
          </span>
          <p v-if="row.lastError" class="mt-[0.3rem] max-w-[28rem] whitespace-normal text-[1.2rem] text-[#B42318]">
            {{ row.lastError }}
          </p>
        </template>

        <template #cell(attempts)="{ row }">
          {{ row.attempts }}
          <p v-if="row.duplicateCount" class="text-[1.2rem] text-[#616161]">
            {{ row.duplicateCount }} duplicate {{ row.duplicateCount === 1 ? "delivery" : "deliveries" }}
          </p>
        </template>

        <template #cell(_action)="{ row }">
          <BaseButton size="sm" radius="8px" variant="outline" @click="selected = row">View</BaseButton>
        </template>
      </DataTable>
    </section>

    <div
      v-if="selected"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
      role="dialog"
      aria-modal="true"
      @click.self="selected = null"
    >
      <div class="max-h-[90vh] w-full max-w-[72rem] overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-[2.4rem] shadow-xl">
        <div class="flex items-start justify-between gap-[1.2rem]">
          <div>
            <h3 class="text-[1.8rem] font-[700] text-slate-900">{{ selected.eventType }}</h3>
            <p class="text-[1.3rem] text-slate-600">{{ selected.provider }} · {{ selected.reference || "No reference" }}</p>
          </div>
          <BaseButton size="sm" radius="8px" variant="outline" @click="selected = null">Close</BaseButton>
        </div>

        <dl class="mt-[1.6rem] grid grid-cols-2 gap-[1rem] text-[1.3rem]">
          <div>
            <dt class="font-[700] text-[#616161]">Status</dt>
            <dd>{{ meta(selected.status).label }}</dd>
          </div>
          <div>
            <dt class="font-[700] text-[#616161]">Attempts</dt>
            <dd>{{ selected.attempts }}</dd>
          </div>
          <div>
            <dt class="font-[700] text-[#616161]">Duplicate deliveries</dt>
            <dd>{{ selected.duplicateCount }}</dd>
          </div>
          <div>
            <dt class="font-[700] text-[#616161]">Received</dt>
            <dd>{{ selected.receivedAt ? formatDate(selected.receivedAt) : "N/A" }}</dd>
          </div>
          <div>
            <dt class="font-[700] text-[#616161]">Last attempt</dt>
            <dd>{{ selected.lastAttemptAt ? formatDate(selected.lastAttemptAt) : "N/A" }}</dd>
          </div>
          <div>
            <dt class="font-[700] text-[#616161]">Processed</dt>
            <dd>{{ selected.processedAt ? formatDate(selected.processedAt) : "N/A" }}</dd>
          </div>
        </dl>

        <p class="mt-[1.2rem] text-[1.3rem] text-[#616161]">{{ meta(selected.status).hint }}</p>
        <p v-if="selected.lastError" class="mt-[1rem] rounded-[8px] bg-[#FFBFBF] p-[1rem] text-[1.3rem] font-[600] text-[#B42318]">
          Last error: {{ selected.lastError }}
        </p>

        <h4 class="mt-[2rem] text-[1.4rem] font-[700] text-slate-900">Headers</h4>
        <ul v-if="headerEntries.length" class="mt-[0.6rem] space-y-[0.4rem] text-[1.2rem]">
          <li v-for="[name, value] in headerEntries" :key="name" class="break-all">
            <span class="font-[700]">{{ name }}:</span> {{ value }}
          </li>
        </ul>
        <p v-else class="mt-[0.6rem] text-[1.3rem] text-[#616161]">No headers stored.</p>

        <h4 class="mt-[2rem] text-[1.4rem] font-[700] text-slate-900">Payload</h4>
        <p class="text-[1.2rem] text-[#616161]">Contains customer details. Do not copy it into tickets or chats.</p>
        <pre
          class="mt-[0.6rem] max-h-[36rem] overflow-auto rounded-[8px] bg-[#0F172A] p-[1.2rem] text-[1.2rem] text-slate-100"
          data-testid="webhook-payload"
        >{{ prettyPayload || "No payload stored." }}</pre>
      </div>
    </div>
  </div>
</template>
