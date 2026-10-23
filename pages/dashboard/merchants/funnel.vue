<script setup>
import { logger, formatDate } from "~/utils/helpers.js";
import { useVfm } from "vue-final-modal";
import SendReminderModal from "~/components/Modals/SendReminderModal.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-merchants-funnel",
});

const store = useAdminMerchantsStore();
const toastStore = useToastStore();
const vfm = useVfm();

const minStalledDays = ref(3);
const selectedStepFilter = ref("");
const runningSnapshot = ref(false);
const runningEmailDigest = ref(false);
const runningBackfill = ref(false);
const exportingCsv = ref(false);
const selectedMerchantForReminder = ref(null);

const funnel = computed(() => store.funnel);
const steps = computed(() => funnel.value?.stepMetrics || []);

const filteredStalledMerchants = computed(() => {
  const items = funnel.value?.stalledMerchants || [];
  if (!selectedStepFilter.value) {
    return items;
  }
  return items.filter(
    (item) =>
      item.currentFunnelStep === selectedStepFilter.value ||
      item.nextFunnelStep === selectedStepFilter.value,
  );
});

async function loadFunnel() {
  try {
    await store.fetchMerchantFunnel({ stalledDays: minStalledDays.value });
  } catch (err) {
    logger.error("Failed to fetch merchant activation funnel", err);
  }
}

async function handleRunSnapshot(sendEmail = false) {
  if (sendEmail) {
    runningEmailDigest.value = true;
  } else {
    runningSnapshot.value = true;
  }
  try {
    await store.runMerchantFunnelSnapshot(sendEmail);
    await loadFunnel();
  } catch (err) {
    logger.error("Failed to capture funnel snapshot", err);
  } finally {
    runningSnapshot.value = false;
    runningEmailDigest.value = false;
  }
}

async function handleBackfillClassifications() {
  runningBackfill.value = true;
  try {
    await store.backfillMerchantClassifications();
    await loadFunnel();
  } catch (err) {
    logger.error("Failed to backfill classifications", err);
  } finally {
    runningBackfill.value = false;
  }
}

async function handleExportStalledCsv() {
  exportingCsv.value = true;
  try {
    const csvContent = await store.exportStalledMerchantsCsv({
      stalledDays: minStalledDays.value,
      funnelStep: selectedStepFilter.value || undefined,
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `stalled-merchants-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    logger.error("Failed to export stalled merchants CSV", err);
    toastStore.error("Failed to export stalled merchants CSV", "");
  } finally {
    exportingCsv.value = false;
  }
}

function toggleStepFilter(stepCode) {
  if (selectedStepFilter.value === stepCode) {
    selectedStepFilter.value = "";
  } else {
    selectedStepFilter.value = stepCode;
  }
}

function formatWhatsAppUrl(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/[^0-9]/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("0") && digits.length === 11 ? `234${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

async function copyText(value, label) {
  if (!value || !import.meta.client) return;
  try {
    await navigator.clipboard.writeText(value);
    toastStore.success(`${label} copied`, "");
  } catch (err) {
    logger.error("Clipboard copy failed", err);
  }
}

function openReminderForStalled(item) {
  selectedMerchantForReminder.value = {
    id: item.tenantId,
    businessTradingName: item.businessTradingName,
    ownerFullName: item.ownerFullName,
    ownerEmail: item.ownerEmail,
  };
  vfm.open("sendReminderModal");
}

onMounted(loadFunnel);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color pb-[4rem]">
    <DashboardFunnelDigestEmailsNotice />

    <!-- Top Header & Actions -->
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm space-y-[1.4rem]">
      <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <NuxtLink
            to="/dashboard/merchants"
            class="inline-flex items-center gap-[0.5rem] text-[1.3rem] font-[700] text-primary hover:underline"
          >
            <span class="material-symbols-outlined text-[1.7rem]">arrow_back</span>
            Back to Merchants
          </NuxtLink>
          <h1 class="mt-[0.4rem] text-[2.2rem] font-[700] text-[#000]">Merchant Activation Funnel</h1>
          <p class="mt-[0.2rem] text-[1.3rem] text-slate-600">
            Real merchant conversion across all 12 onboarding and activation milestones (Internal &amp; Test stores excluded).
            <span v-if="funnel?.generatedAt" class="ml-2 text-slate-400">
              • Snapshot as of {{ formatDate(funnel.generatedAt) }}
            </span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-[0.8rem]">
          <button
            type="button"
            :disabled="runningBackfill"
            class="rounded-[8px] border border-slate-300 bg-white px-[1.3rem] py-[0.8rem] text-[1.3rem] font-[700] text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            @click="handleBackfillClassifications"
          >
            <span class="material-symbols-outlined text-[1.7rem]">category</span>
            <span>{{ runningBackfill ? "Reclassifying..." : "Backfill Classifications" }}</span>
          </button>

          <button
            type="button"
            :disabled="runningSnapshot"
            class="rounded-[8px] border border-primary bg-primary/5 px-[1.3rem] py-[0.8rem] text-[1.3rem] font-[700] text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 flex items-center gap-2"
            @click="handleRunSnapshot(false)"
          >
            <span class="material-symbols-outlined text-[1.7rem]">photo_camera</span>
            <span>{{ runningSnapshot ? "Saving..." : "Capture Weekly Snapshot" }}</span>
          </button>

          <button
            type="button"
            :disabled="runningEmailDigest"
            class="rounded-[8px] bg-primary px-[1.4rem] py-[0.8rem] text-[1.3rem] font-[700] text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            @click="handleRunSnapshot(true)"
          >
            <span class="material-symbols-outlined text-[1.7rem]">outgoing_mail</span>
            <span>{{ runningEmailDigest ? "Sending..." : "Capture & Email Digest" }}</span>
          </button>

          <button
            type="button"
            :disabled="exportingCsv"
            class="rounded-[8px] border border-emerald-600 bg-emerald-50 px-[1.3rem] py-[0.8rem] text-[1.3rem] font-[700] text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center gap-2"
            @click="handleExportStalledCsv"
          >
            <span class="material-symbols-outlined text-[1.7rem]">download</span>
            <span>{{ exportingCsv ? "Exporting..." : "Export Stalled CSV" }}</span>
          </button>
        </div>
      </div>
    </section>

    <div v-if="store.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ store.error }}
    </div>

    <div v-if="store.funnelLoading && !funnel" class="flex items-center justify-center py-[6rem] text-[#616161]">
      <span class="animate-spin material-symbols-outlined mr-[1rem] text-[2.4rem] text-primary">progress_activity</span>
      Loading merchant activation funnel...
    </div>

    <template v-else-if="funnel">
      <!-- KPI Summary Cards -->
      <section class="grid grid-cols-1 gap-[1.2rem] sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-[8px] bg-white p-[1.8rem] shadow-sm border border-slate-100">
          <p class="text-[1.2rem] font-[700] uppercase tracking-wider text-slate-500">Real Merchants</p>
          <p class="mt-[0.6rem] text-[2.8rem] font-[800] text-slate-900">{{ funnel.totalRealMerchants }}</p>
          <p class="mt-[0.3rem] text-[1.25rem] font-[600] text-emerald-700">
            +{{ funnel.newRealSignupsThisWeek }} signed up this week
          </p>
        </div>

        <div class="rounded-[8px] bg-white p-[1.8rem] shadow-sm border border-amber-200">
          <p class="text-[1.2rem] font-[700] uppercase tracking-wider text-amber-800">
            Stalled &ge; {{ minStalledDays }} Days
          </p>
          <p class="mt-[0.6rem] text-[2.8rem] font-[800] text-amber-700">{{ funnel.stalledRealMerchantsCount }}</p>
          <p class="mt-[0.3rem] text-[1.25rem] text-slate-600">
            No funnel progress for {{ minStalledDays }}+ days
          </p>
        </div>

        <div class="rounded-[8px] bg-white p-[1.8rem] shadow-sm border border-slate-100">
          <p class="text-[1.2rem] font-[700] uppercase tracking-wider text-slate-500">Paid Plans</p>
          <p class="mt-[0.6rem] text-[2.8rem] font-[800] text-primary">{{ funnel.paidSubscriptionCount }}</p>
          <p class="mt-[0.3rem] text-[1.25rem] text-slate-600">
            {{ funnel.trialStartedCount }} trials started
          </p>
        </div>

        <div class="rounded-[8px] bg-white p-[1.8rem] shadow-sm border border-slate-100">
          <p class="text-[1.2rem] font-[700] uppercase tracking-wider text-slate-500">Excluded Noise</p>
          <p class="mt-[0.6rem] text-[2.8rem] font-[800] text-slate-700">
            {{ (funnel.totalInternalMerchants || 0) + (funnel.totalTestMerchants || 0) }}
          </p>
          <p class="mt-[0.3rem] text-[1.25rem] text-slate-600">
            {{ funnel.totalInternalMerchants }} internal • {{ funnel.totalTestMerchants }} test/smoke stores
          </p>
        </div>
      </section>

      <!-- 12-Step Funnel Breakdown -->
      <section class="rounded-[8px] bg-white p-[2rem] shadow-sm space-y-[1.4rem]">
        <div class="flex flex-col gap-[0.6rem] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-[1.8rem] font-[700] text-[#000]">12-Step Activation Funnel Breakdown</h2>
            <p class="text-[1.25rem] text-slate-600">
              Click any step row to filter the stalled outreach list below to merchants at or blocked by that step.
            </p>
          </div>
          <button
            v-if="selectedStepFilter"
            type="button"
            class="rounded-[6px] bg-slate-100 px-[1.2rem] py-[0.5rem] text-[1.2rem] font-[700] text-slate-700 hover:bg-slate-200 w-fit"
            @click="selectedStepFilter = ''"
          >
            Clear step filter ({{ selectedStepFilter }})
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-[1.15rem] font-[700] uppercase tracking-wider text-slate-600">
                <th class="py-[1rem] px-[1.2rem]">#</th>
                <th class="py-[1rem] px-[1.2rem]">Milestone Step</th>
                <th class="py-[1rem] px-[1.2rem] text-right">Reached</th>
                <th class="py-[1rem] px-[1.2rem] text-right">WoW Delta</th>
                <th class="py-[1rem] px-[1.2rem] w-[220px]">% of Signups</th>
                <th class="py-[1rem] px-[1.2rem] text-right">% of Prev Step</th>
                <th class="py-[1rem] px-[1.2rem] text-right">Currently Here</th>
                <th class="py-[1rem] px-[1.2rem] text-right">Stalled (&ge;{{ minStalledDays }}d)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-[1.35rem]">
              <tr
                v-for="(step, stepIndex) in steps"
                :key="step.step"
                :class="[
                  'cursor-pointer transition-colors hover:bg-blue-50/50',
                  selectedStepFilter === step.step ? 'bg-blue-50 font-[600]' : '',
                ]"
                @click="toggleStepFilter(step.step)"
              >
                <td class="py-[1.1rem] px-[1.2rem] text-slate-500 font-mono">{{ stepIndex + 1 }}</td>
                <td class="py-[1.1rem] px-[1.2rem] font-[700] text-slate-900">{{ step.label }}</td>
                <td class="py-[1.1rem] px-[1.2rem] text-right font-[700] text-slate-900">{{ step.reachedCount }}</td>
                <td class="py-[1.1rem] px-[1.2rem] text-right">
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-[0.8rem] py-[0.15rem] text-[1.15rem] font-[700]',
                      step.weekOverWeekDelta > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : step.weekOverWeekDelta < 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600',
                    ]"
                  >
                    {{ step.weekOverWeekDelta > 0 ? `+${step.weekOverWeekDelta}` : step.weekOverWeekDelta }}
                  </span>
                </td>
                <td class="py-[1.1rem] px-[1.2rem]">
                  <div class="flex items-center gap-[0.8rem]">
                    <div class="h-[0.8rem] flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        class="h-full rounded-full bg-primary transition-all"
                        :style="{ width: `${Math.min(100, step.conversionFromSignedUpPercent || 0)}%` }"
                      />
                    </div>
                    <span class="w-[4.5rem] text-right text-[1.2rem] font-[600] text-slate-700">
                      {{ step.conversionFromSignedUpPercent }}%
                    </span>
                  </div>
                </td>
                <td class="py-[1.1rem] px-[1.2rem] text-right text-slate-600">
                  {{ step.conversionFromPreviousPercent }}%
                </td>
                <td class="py-[1.1rem] px-[1.2rem] text-right font-[600] text-slate-800">
                  {{ step.currentStepCount }}
                </td>
                <td class="py-[1.1rem] px-[1.2rem] text-right">
                  <span
                    v-if="step.stalledCount > 0"
                    class="inline-flex items-center rounded-full bg-amber-100 px-[0.9rem] py-[0.2rem] text-[1.2rem] font-[700] text-amber-800"
                  >
                    {{ step.stalledCount }}
                  </span>
                  <span v-else class="text-slate-400">0</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Stalled Real Merchants Outreach Table -->
      <section class="rounded-[8px] bg-white p-[2rem] shadow-sm space-y-[1.4rem]">
        <div class="flex flex-col gap-[1rem] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-[1.8rem] font-[700] text-[#000]">
              Stalled Real Merchants — Direct Outreach List ({{ filteredStalledMerchants.length }})
            </h2>
            <p class="text-[1.25rem] text-slate-600">
              Real merchants who have not reached their first paid order and have made no funnel progress for at least {{ minStalledDays }} days. Stores waiting on our compliance review are not listed.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-[0.8rem]">
            <select
              v-model="selectedStepFilter"
              class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.8rem] text-[1.3rem]"
            >
              <option value="">All funnel steps</option>
              <option v-for="step in steps" :key="step.step" :value="step.step">
                {{ step.label }}
              </option>
            </select>

            <select
              v-model.number="minStalledDays"
              class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.8rem] text-[1.3rem]"
              @change="loadFunnel"
            >
              <option :value="1">Stalled 1+ days</option>
              <option :value="3">Stalled 3+ days</option>
              <option :value="7">Stalled 7+ days</option>
              <option :value="14">Stalled 14+ days</option>
            </select>
          </div>
        </div>

        <div v-if="filteredStalledMerchants.length === 0" class="py-[4rem] text-center text-slate-500">
          No stalled real merchants match the current filter.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-[1.15rem] font-[700] uppercase tracking-wider text-slate-600">
                <th class="py-[1rem] px-[1.2rem]">Store</th>
                <th class="py-[1rem] px-[1.2rem]">Owner &amp; Direct Contact</th>
                <th class="py-[1rem] px-[1.2rem]">Last Completed Step</th>
                <th class="py-[1rem] px-[1.2rem]">Next Blocker</th>
                <th class="py-[1rem] px-[1.2rem] text-right">Days Stalled</th>
                <th class="py-[1rem] px-[1.2rem]">Signed Up</th>
                <th class="py-[1rem] px-[1.2rem] text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-[1.3rem]">
              <tr
                v-for="item in filteredStalledMerchants"
                :key="item.tenantId"
                class="hover:bg-slate-50/80"
              >
                <td class="py-[1.2rem] px-[1.2rem]">
                  <NuxtLink
                    :to="`/dashboard/merchants/${item.tenantId}`"
                    class="font-[700] text-primary hover:underline block"
                  >
                    {{ item.businessTradingName || "Untitled Merchant" }}
                  </NuxtLink>
                  <p class="text-[1.15rem] text-slate-500">
                    {{ item.slug || item.tenantId }} • {{ item.currentMode || "test" }}
                  </p>
                </td>

                <td class="py-[1.2rem] px-[1.2rem] space-y-[0.3rem]">
                  <p class="font-[600] text-slate-900">{{ item.ownerFullName || "—" }}</p>
                  <div v-if="item.ownerEmail" class="flex items-center gap-[0.5rem] text-[1.2rem]">
                    <a :href="`mailto:${item.ownerEmail}`" class="text-primary hover:underline">
                      {{ item.ownerEmail }}
                    </a>
                    <button
                      type="button"
                      class="text-slate-400 hover:text-slate-700"
                      title="Copy email"
                      @click="copyText(item.ownerEmail, 'Email')"
                    >
                      <span class="material-symbols-outlined text-[1.4rem]">content_copy</span>
                    </button>
                  </div>
                  <div
                    v-if="item.ownerPhoneNumber || item.businessPrimaryPhoneNumber"
                    class="flex items-center gap-[0.6rem] text-[1.2rem]"
                  >
                    <a
                      :href="`tel:${item.ownerPhoneNumber || item.businessPrimaryPhoneNumber}`"
                      class="font-[600] text-slate-700 hover:underline"
                    >
                      {{ item.ownerPhoneNumber || item.businessPrimaryPhoneNumber }}
                    </a>
                    <a
                      v-if="formatWhatsAppUrl(item.ownerPhoneNumber || item.businessPrimaryPhoneNumber)"
                      :href="formatWhatsAppUrl(item.ownerPhoneNumber || item.businessPrimaryPhoneNumber)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-emerald-600 font-[700] hover:underline"
                    >
                      WhatsApp
                    </a>
                    <button
                      type="button"
                      class="text-slate-400 hover:text-slate-700"
                      title="Copy phone"
                      @click="copyText(item.ownerPhoneNumber || item.businessPrimaryPhoneNumber, 'Phone')"
                    >
                      <span class="material-symbols-outlined text-[1.4rem]">content_copy</span>
                    </button>
                  </div>
                </td>

                <td class="py-[1.2rem] px-[1.2rem]">
                  <span class="inline-flex items-center rounded-full bg-blue-50 px-[0.9rem] py-[0.2rem] text-[1.2rem] font-[700] text-blue-800">
                    {{ item.currentFunnelStepLabel || item.currentFunnelStep }}
                  </span>
                </td>

                <td class="py-[1.2rem] px-[1.2rem]">
                  <span class="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-[0.9rem] py-[0.2rem] text-[1.2rem] font-[700] text-amber-900">
                    {{ item.nextFunnelStepLabel || item.nextFunnelStep || "—" }}
                  </span>
                </td>

                <td class="py-[1.2rem] px-[1.2rem] text-right">
                  <span class="font-[800] text-amber-700">{{ item.daysInCurrentStep }}d</span>
                </td>

                <td class="py-[1.2rem] px-[1.2rem] text-slate-600">
                  {{ formatDate(item.signedUpAt) }}
                </td>

                <td class="py-[1.2rem] px-[1.2rem] text-right">
                  <div class="inline-flex items-center gap-[0.6rem]">
                    <button
                      type="button"
                      class="rounded-[6px] bg-primary/10 px-[1rem] py-[0.5rem] text-[1.2rem] font-[700] text-primary hover:bg-primary/20"
                      @click="openReminderForStalled(item)"
                    >
                      Remind
                    </button>
                    <NuxtLink
                      :to="`/dashboard/merchants/${item.tenantId}`"
                      class="rounded-[6px] border border-slate-200 px-[1rem] py-[0.5rem] text-[1.2rem] font-[600] text-slate-700 hover:bg-slate-100"
                    >
                      View
                    </NuxtLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <ClientOnly>
      <SendReminderModal
        :merchant="selectedMerchantForReminder"
        @sent="loadFunnel()"
        @closed="selectedMerchantForReminder = null"
      />
    </ClientOnly>
  </div>
</template>
