<script setup>
import { logger, formatDate } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";
import { useAdminLifecycleStore } from "~/stores/adminLifecycle.store.js";
import { lifecycleStageLabels, outreachReasonLabels, outreachStatusBadge, humanizeMetricKey } from "~/utils/outreachFlags.js";
import {
  LIFECYCLE_STAGE_ORDER,
  lifecycleStageHints,
  lifecycleStageBadge,
  CLASSIFICATION_OPTIONS,
  classificationBadge,
  messageStatusBadge,
  messageTypeLabels,
  skipReasonLabels,
  resolveRolloutState,
} from "~/utils/lifecycle.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-merchants-lifecycle",
});

useHead({ title: "Lifecycle Messaging - ShopSynch" });

const lifecycleStore = useAdminLifecycleStore();
const router = useRouter();

// One filter drives both the stage cards and the list, so their numbers stay in step. "" means every store.
const stage = ref("");
const classification = ref("");
const page = ref(1);
const limit = ref(50);

const overview = computed(() => lifecycleStore.overview);
const rolloutState = computed(() => resolveRolloutState(overview.value));
const totalActiveStores = computed(() =>
  LIFECYCLE_STAGE_ORDER.reduce((sum, stageCode) => sum + (overview.value?.stageCounts?.[stageCode] || 0), 0),
);
const selectedClassificationLabel = computed(
  () => CLASSIFICATION_OPTIONS.find((option) => option.value === classification.value)?.label || "",
);
// A backend that predates the filter ignores it and echoes nothing, so the cards would silently show every store.
const overviewIgnoredFilter = computed(
  () => Boolean(overview.value) && (overview.value.classification || "") !== classification.value,
);

const tableHeader = [
  { title: "Store", accessor: "storeName" },
  { title: "Stage", accessor: "stage" },
  { title: "Sales", accessor: "lastPaidOrderAt" },
  { title: "Last email", accessor: "lastMessage" },
  { title: "Open flag", accessor: "openFlag" },
];

const params = computed(() => ({
  stage: stage.value || undefined,
  classification: classification.value || undefined,
  page: page.value - 1,
  limit: limit.value,
}));

async function loadOverview() {
  try {
    await lifecycleStore.fetchOverview({ classification: classification.value || undefined });
  } catch (err) {
    logger.error("Failed to load the lifecycle overview", err);
  }
}

async function loadStores(nextPage = page.value) {
  try {
    page.value = nextPage;
    await lifecycleStore.fetchStores(params.value);
  } catch (err) {
    logger.error("Failed to load lifecycle stores", err);
  }
}

function toggleStage(stageCode) {
  stage.value = stage.value === stageCode ? "" : stageCode;
  loadStores(1);
}

function selectClassification(nextClassification) {
  if (classification.value === nextClassification) return;
  classification.value = nextClassification;
  loadOverview();
  loadStores(1);
}

function changeLimit(nextLimit) {
  limit.value = nextLimit;
  loadStores(1);
}

function messageDetail(message) {
  if (message.status === "SKIPPED") return skipReasonLabels[message.skipReason] || message.skipReason || "";
  return message.tipKey ? humanizeMetricKey(message.tipKey) : "";
}

onMounted(() => {
  loadOverview();
  loadStores();
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color pb-[4rem]">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm space-y-[1.6rem]">
      <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-start lg:justify-between">
        <div>
          <NuxtLink
            to="/dashboard/merchants"
            class="inline-flex items-center gap-[0.5rem] text-[1.3rem] font-[700] text-primary hover:underline"
          >
            <span class="material-symbols-outlined text-[1.7rem]">arrow_back</span>
            Back to Merchants
          </NuxtLink>
          <h1 class="mt-[0.4rem] text-[2.2rem] font-[700] text-[#000]">Lifecycle Messaging</h1>
          <p class="mt-[0.2rem] text-[1.3rem] text-slate-600">
            Where every active store is in its journey, and what we last sent it. Click a stage to see its stores.
          </p>
        </div>
        <NuxtLink
          to="/dashboard/merchants/outreach"
          class="rounded-[8px] border border-primary bg-primary/5 px-[1.4rem] py-[0.9rem] font-[700] text-primary flex items-center gap-2 hover:bg-primary/10 transition-colors w-fit"
        >
          <span class="material-symbols-outlined text-[1.8rem]">support_agent</span>
          <span>Outreach Queue<template v-if="overview?.totalOpenFlags"> ({{ overview.totalOpenFlags }} open)</template></span>
        </NuxtLink>
      </div>

      <div v-if="lifecycleStore.overviewError" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
        {{ lifecycleStore.overviewError }}
      </div>

      <div v-else-if="lifecycleStore.overviewLoading && !overview" class="flex items-center py-[2rem] text-[#616161]">
        <span class="animate-spin material-symbols-outlined mr-[1rem] text-[2.4rem] text-primary">progress_activity</span>
        Working out where every store is...
      </div>

      <template v-else-if="overview">
        <!-- Is it sending? -->
        <div :class="['rounded-[8px] border p-[1.6rem] flex flex-col gap-[0.6rem] lg:flex-row lg:items-center lg:justify-between', rolloutState.tone]">
          <div>
            <p class="text-[1.5rem] font-[800]">Messaging: {{ rolloutState.label }}</p>
            <p class="text-[1.3rem]">{{ rolloutState.description }}</p>
          </div>
          <div class="text-[1.25rem] lg:text-right">
            <p v-if="overview.lastRun">
              Last run {{ formatDate(overview.lastRun.ranAt) }} for the week of {{ formatDate(overview.lastRun.weekStartDate) }}:
              <strong>{{ overview.lastRun.sentCount }}</strong> sent,
              <strong>{{ overview.lastRun.dryRunCount }}</strong> dry run,
              <strong>{{ overview.lastRun.skippedCount }}</strong> skipped,
              <strong>{{ overview.lastRun.failedCount }}</strong> failed
            </p>
            <p v-else>No weekly run yet.</p>
            <p class="opacity-80">
              Slipping after {{ overview.slippingDays }}+ days quiet (longer for stores that sell in bursts), dormant after
              {{ overview.dormantDays }}.
            </p>
          </div>
        </div>

        <!-- Which stores to look at -->
        <div class="flex flex-wrap items-center gap-[0.8rem]">
          <span class="text-[1.3rem] font-[700] text-slate-700">Show</span>
          <button
            v-for="option in CLASSIFICATION_OPTIONS"
            :key="option.value || 'all'"
            type="button"
            :class="[
              'rounded-full px-[1.4rem] py-[0.6rem] text-[1.3rem] font-[700] transition-colors',
              classification === option.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            ]"
            @click="selectClassification(option.value)"
          >
            {{ option.label }}
          </button>
          <span v-if="lifecycleStore.overviewLoading" class="inline-flex items-center gap-[0.6rem] text-[1.25rem] text-slate-500">
            <span class="animate-spin material-symbols-outlined text-[1.8rem] text-primary">progress_activity</span>
            Updating the counts...
          </span>
        </div>

        <div v-if="overviewIgnoredFilter && !lifecycleStore.overviewLoading" class="rounded-[8px] border border-amber-300 bg-amber-50 p-[1.2rem] text-[1.3rem] text-amber-900">
          This backend cannot limit the stage counts to {{ selectedClassificationLabel.toLowerCase() }} stores yet, so the cards below show every active store.
          The list is filtered.
        </div>

        <!-- Stage distribution, doubles as the list filter -->
        <div :class="['grid grid-cols-2 gap-[1rem] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 transition-opacity', lifecycleStore.overviewLoading ? 'opacity-50' : '']">
          <button
            v-for="stageCode in LIFECYCLE_STAGE_ORDER"
            :key="stageCode"
            type="button"
            :class="[
              'rounded-[8px] border p-[1.4rem] text-left transition-colors',
              stage === stageCode ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-slate-200 bg-white hover:bg-slate-50',
            ]"
            @click="toggleStage(stageCode)"
          >
            <p class="text-[1.2rem] font-[700] uppercase tracking-wider text-slate-500">{{ lifecycleStageLabels[stageCode] }}</p>
            <p class="mt-[0.4rem] text-[2.6rem] font-[800] text-slate-900">{{ overview.stageCounts?.[stageCode] ?? 0 }}</p>
            <p class="mt-[0.2rem] text-[1.15rem] text-slate-600">{{ lifecycleStageHints[stageCode] }}</p>
          </button>
        </div>
        <p class="text-[1.2rem] text-slate-500">
          {{ totalActiveStores }} active
          {{ classification ? selectedClassificationLabel.toLowerCase() + " stores" : "stores in total, including internal and test stores" }}.
        </p>
      </template>
    </section>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm space-y-[1.4rem]">
      <div class="flex flex-wrap items-end justify-between gap-[1rem]">
        <div>
          <h2 class="text-[1.8rem] font-[700] text-[#000]">
            Stores<template v-if="stage"> in {{ lifecycleStageLabels[stage] }}</template>
            <span class="ml-[0.4rem] text-slate-500 font-[600]">({{ lifecycleStore.total }})</span>
          </h2>
          <p class="text-[1.2rem] text-slate-500">The stage cards count active stores only; this list also includes inactive ones.</p>
          <button v-if="stage" type="button" class="text-[1.25rem] font-[700] text-primary hover:underline" @click="toggleStage(stage)">
            Show every stage
          </button>
        </div>
      </div>

      <div v-if="lifecycleStore.storesError" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
        {{ lifecycleStore.storesError }}
      </div>

      <DataTable
        :table-header="tableHeader"
        :table-data="lifecycleStore.stores"
        :pagination="lifecycleStore.paginatedData"
        :loading="lifecycleStore.storesLoading"
        has-action
        has-show
        @show="router.push(`/dashboard/merchants/${$event}`)"
        @fetch-page="loadStores"
        @change-limit="changeLimit"
      >
        <template #cell(storeName)="{ row }">
          <div class="space-y-[0.3rem]">
            <div class="flex flex-wrap items-center gap-[0.6rem]">
              <NuxtLink :to="`/dashboard/merchants/${row.tenantId}`" class="font-[700] text-primary hover:underline" @click.stop>
                {{ row.storeName || row.slug || row.tenantId }}
              </NuxtLink>
              <span
                :class="['inline-flex rounded-full px-[0.8rem] py-[0.1rem] text-[1.1rem] font-[700]', classificationBadge[row.classification]?.class]"
              >
                {{ classificationBadge[row.classification]?.label || row.classification }}
              </span>
              <span
                v-if="row.lifecycleMessagingTestEnabled"
                class="inline-flex rounded-full bg-blue-100 px-[0.8rem] py-[0.1rem] text-[1.1rem] font-[700] text-blue-800"
                title="Receives lifecycle emails while messaging is limited to test stores"
              >
                Test email on
              </span>
              <span
                v-if="!row.active"
                class="inline-flex rounded-full bg-red-100 px-[0.8rem] py-[0.1rem] text-[1.1rem] font-[700] text-red-700"
              >
                Inactive
              </span>
            </div>
            <p class="text-[1.2rem] text-dashboard_text_color">{{ row.slug || row.tenantId }}</p>
          </div>
        </template>

        <template #cell(stage)="{ row }">
          <span :class="['inline-flex rounded-full px-[1rem] py-[0.2rem] text-[1.2rem] font-[700]', lifecycleStageBadge[row.stage]]">
            {{ lifecycleStageLabels[row.stage] || row.stage }}
          </span>
        </template>

        <template #cell(lastPaidOrderAt)="{ row }">
          <div class="space-y-[0.2rem]">
            <p>{{ row.lastPaidOrderAt ? formatDate(row.lastPaidOrderAt) : "No paid order yet" }}</p>
            <p class="text-[1.2rem] text-dashboard_text_color">{{ row.paidOrdersLast30Days }} in the last 30 days</p>
          </div>
        </template>

        <template #cell(lastMessage)="{ row }">
          <p v-if="!row.lastMessage" class="text-slate-400">Nothing yet</p>
          <div v-else class="space-y-[0.3rem]">
            <div class="flex flex-wrap items-center gap-[0.6rem]">
              <span
                :class="['inline-flex rounded-full px-[0.9rem] py-[0.15rem] text-[1.15rem] font-[700]', messageStatusBadge[row.lastMessage.status]?.class]"
              >
                {{ messageStatusBadge[row.lastMessage.status]?.label || row.lastMessage.status }}
              </span>
              <span class="text-[1.25rem] text-slate-700">
                {{ messageTypeLabels[row.lastMessage.messageType] || row.lastMessage.messageType }}
              </span>
            </div>
            <p class="text-[1.2rem] text-dashboard_text_color">
              {{ formatDate(row.lastMessage.sentAt || row.lastMessage.createdAt) }}<template v-if="messageDetail(row.lastMessage)"> · {{ messageDetail(row.lastMessage) }}</template>
            </p>
          </div>
        </template>

        <template #cell(openFlag)="{ row }">
          <span v-if="!row.openFlag" class="text-slate-400">None</span>
          <NuxtLink v-else to="/dashboard/merchants/outreach" class="block space-y-[0.3rem]" @click.stop>
            <span class="font-[700] text-slate-900">{{ outreachReasonLabels[row.openFlag.reason] || row.openFlag.reason }}</span>
            <span class="flex items-center gap-[0.5rem]">
              <span
                :class="['inline-flex rounded-full px-[0.9rem] py-[0.1rem] text-[1.1rem] font-[700]', outreachStatusBadge[row.openFlag.status]?.class]"
              >
                {{ outreachStatusBadge[row.openFlag.status]?.label || row.openFlag.status }}
              </span>
              <span
                v-if="row.openFlag.pauseAutomatedEmails"
                class="material-symbols-outlined text-[1.6rem] text-amber-600"
                title="Automated emails are paused for this merchant"
              >
                pause_circle
              </span>
            </span>
          </NuxtLink>
        </template>
      </DataTable>
    </section>
  </div>
</template>
