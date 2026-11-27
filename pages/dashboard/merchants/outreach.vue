<script setup>
import { logger, formatDate } from "~/utils/helpers.js";
import { useVfm } from "vue-final-modal";
import DataTable from "~/components/table/DataTable.vue";
import OutreachFlagModal from "~/components/Modals/OutreachFlagModal.vue";
import { useAdminOutreachFlagsStore } from "~/stores/adminOutreachFlags.store.js";
import { useAuthStore } from "~/stores/auth.store.js";
import {
  OUTREACH_STATUS_OPTIONS,
  OUTREACH_REASON_OPTIONS,
  outreachStatusBadge,
  outreachReasonLabels,
  outreachActionLabels,
  lifecycleStageLabels,
} from "~/utils/outreachFlags.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-merchants-outreach",
});

useHead({ title: "Outreach Queue - ShopSynch" });

const flagsStore = useAdminOutreachFlagsStore();
const authStore = useAuthStore();
const vfm = useVfm();

// "" means every status. The queue opens on flags nobody has picked up yet.
const status = ref("OPEN");
const reason = ref("");
const assignee = ref("");
const page = ref(1);
const limit = ref(50);
const selectedFlag = ref(null);

const statusTabs = [{ label: "All", value: "" }, ...OUTREACH_STATUS_OPTIONS];

const tableHeader = [
  { title: "Merchant", accessor: "storeName" },
  { title: "Why we flagged them", accessor: "reason" },
  { title: "Raised", accessor: "raisedAt" },
  { title: "Emails sent", accessor: "lifecycleEmailsSentCount" },
  { title: "Status", accessor: "status" },
  { title: "Assigned to", accessor: "assigneeEmail" },
];

const params = computed(() => ({
  status: status.value || undefined,
  reason: reason.value || undefined,
  assignee: assignee.value.trim() || undefined,
  page: page.value - 1,
  limit: limit.value,
}));

async function fetchFlags(nextPage = page.value) {
  try {
    page.value = nextPage;
    await flagsStore.fetchFlags(params.value);
  } catch (err) {
    logger.error("Failed to load the outreach queue", err);
  }
}

function selectStatus(nextStatus) {
  status.value = nextStatus;
  fetchFlags(1);
}

// The assignee box applies on Enter or when the admin leaves it, but only if the text actually changed.
let appliedAssignee = "";

function applyAssigneeFilter() {
  const typedAssignee = assignee.value.trim();
  if (typedAssignee === appliedAssignee) return;
  appliedAssignee = typedAssignee;
  fetchFlags(1);
}

function toggleAssignedToMe() {
  const myEmail = authStore.user?.email || "";
  assignee.value = assignee.value === myEmail ? "" : myEmail;
  applyAssigneeFilter();
}

function changeLimit(nextLimit) {
  limit.value = nextLimit;
  fetchFlags(1);
}

function openFlag(flagId) {
  selectedFlag.value = flagsStore.flags.find((flag) => flag.id === flagId) || null;
  if (selectedFlag.value) vfm.open("outreachFlagModal");
}

onMounted(fetchFlags);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color pb-[4rem]">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm space-y-[1.6rem]">
      <div>
        <NuxtLink
          to="/dashboard/merchants"
          class="inline-flex items-center gap-[0.5rem] text-[1.3rem] font-[700] text-primary hover:underline"
        >
          <span class="material-symbols-outlined text-[1.7rem]">arrow_back</span>
          Back to Merchants
        </NuxtLink>
        <h1 class="mt-[0.4rem] text-[2.2rem] font-[700] text-[#000]">Outreach Queue</h1>
        <p class="mt-[0.2rem] text-[1.3rem] text-slate-600">
          Merchants who need a person: a call or a demo. Open a row to see why we flagged them, then record what you did.
          A flag closes on its own when the merchant moves on.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-[0.8rem]">
        <button
          v-for="tab in statusTabs"
          :key="tab.value || 'all'"
          type="button"
          :class="[
            'rounded-full px-[1.4rem] py-[0.6rem] text-[1.3rem] font-[700] transition-colors',
            status === tab.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
          ]"
          @click="selectStatus(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="flex flex-wrap items-end gap-[1rem]">
        <div class="w-full sm:w-[24rem]">
          <BaseSelectInput
            v-model="reason"
            name="reason"
            label="Reason"
            :options="[{ label: 'All reasons', value: '' }, ...OUTREACH_REASON_OPTIONS]"
            @update:model-value="fetchFlags(1)"
          />
        </div>
        <div class="w-full sm:w-[28rem]">
          <AppInput
            v-model="assignee"
            name="assignee"
            label="Assigned to (email)"
            placeholder="Anyone"
            @keyup.enter="applyAssigneeFilter"
            @blur="applyAssigneeFilter"
          />
        </div>
        <button
          type="button"
          :class="[
            'rounded-[8px] border px-[1.4rem] py-[1rem] text-[1.3rem] font-[700] transition-colors',
            assignee && assignee === authStore.user?.email
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
          ]"
          @click="toggleAssignedToMe"
        >
          Assigned to me
        </button>
      </div>
    </section>

    <div v-if="flagsStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ flagsStore.error }}
    </div>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <DataTable
        :table-header="tableHeader"
        :table-data="flagsStore.flags"
        :pagination="flagsStore.paginatedData"
        :loading="flagsStore.loading"
        has-action
        has-show
        @show="openFlag"
        @fetch-page="fetchFlags"
        @change-limit="changeLimit"
      >
        <template #cell(storeName)="{ row }">
          <div class="space-y-[0.2rem]">
            <NuxtLink :to="`/dashboard/merchants/${row.tenantId}`" class="font-[700] text-primary hover:underline" @click.stop>
              {{ row.storeName || row.slug || row.tenantId }}
            </NuxtLink>
            <p class="text-[1.2rem] text-dashboard_text_color">{{ row.slug || row.tenantId }}</p>
          </div>
        </template>

        <template #cell(reason)="{ row }">
          <div class="space-y-[0.4rem]">
            <p class="font-[700] text-[#000]">{{ outreachReasonLabels[row.reason] || row.reason }}</p>
            <span class="inline-flex rounded-full bg-slate-100 px-[0.9rem] py-[0.15rem] text-[1.15rem] font-[700] text-slate-700">
              {{ outreachActionLabels[row.suggestedAction] || row.suggestedAction }}
            </span>
          </div>
        </template>

        <template #cell(raisedAt)="{ row }">
          <div class="space-y-[0.2rem]">
            <p>{{ formatDate(row.raisedAt) }}</p>
            <p class="text-[1.2rem] text-dashboard_text_color">
              {{ lifecycleStageLabels[row.raisedAtStage] || row.raisedAtStage || "—" }}
            </p>
          </div>
        </template>

        <template #cell(status)="{ row }">
          <span
            :class="['inline-flex rounded-full px-[1rem] py-[0.2rem] text-[1.2rem] font-[700]', outreachStatusBadge[row.status]?.class]"
          >
            {{ outreachStatusBadge[row.status]?.label || row.status }}
          </span>
        </template>

        <template #cell(assigneeEmail)="{ row }">
          <div class="flex items-center gap-[0.6rem]">
            <span :class="row.assigneeEmail ? 'text-slate-900' : 'text-slate-400'">
              {{ row.assigneeEmail || "Unassigned" }}
            </span>
            <span
              v-if="row.pauseAutomatedEmails"
              class="material-symbols-outlined text-[1.8rem] text-amber-600"
              title="Automated emails are paused for this merchant"
            >
              pause_circle
            </span>
          </div>
        </template>
      </DataTable>
    </section>

    <ClientOnly>
      <OutreachFlagModal :flag="selectedFlag" @saved="fetchFlags()" @closed="selectedFlag = null" />
    </ClientOnly>
  </div>
</template>
