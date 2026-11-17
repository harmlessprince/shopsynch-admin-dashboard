<script setup>
import { formatDateTime } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-api-usage",
});

useHead({
  title: "Store API usage - ShopSynch Admin",
});

const usageStore = useAdminBillingApiUsageStore();
const route = useRoute();

const tenantId = ref(String(route.query.tenantId || ""));
const month = ref("");
const searchedTenantId = ref("");

const usage = computed(() => usageStore.usage);
const count = (value) => Number(value ?? 0).toLocaleString("en-NG");
const naira = (value) => `NGN ${Number(value ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const optionalCount = (value, empty = "No limit") => (value === null || value === undefined ? empty : count(value));
const optionalPercent = (value) => (value === null || value === undefined ? "Not set" : `${value}%`);
const modeLabel = (mode) => ({ NONE: "Off", ALERT_ONLY: "Alert only", THROTTLE: "Throttle (429)", BLOCK: "Block", ADMIN_REVIEW: "Flag for admin review" })[mode] || mode || "Not set";
const dateLabel = (value) => new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const hasIncluded = computed(() => Number(usage.value?.includedMonthlyCalls) > 0);
const hasTestCap = computed(() => Number(usage.value?.testMonthlySafetyCap) > 0);
const livePercent = computed(() => (hasIncluded.value ? (Number(usage.value.liveCalls) / Number(usage.value.includedMonthlyCalls)) * 100 : 0));
const testPercent = computed(() => (hasTestCap.value ? (Number(usage.value.testCalls) / Number(usage.value.testMonthlySafetyCap)) * 100 : 0));
const barWidth = (percent) => `${Math.min(100, Math.max(0, percent))}%`;

const policyRows = computed(() => {
  const value = usage.value;
  if (!value) return [];
  return [
    ["Included live calls per month", optionalCount(value.includedMonthlyCalls)],
    ["Overage block size (calls)", optionalCount(value.overageBlockSizeCalls, "No overage billing")],
    ["Overage price per block", value.overagePricePerBlock == null ? "No overage billing" : naira(value.overagePricePerBlock)],
    ["Live calls per minute", optionalCount(value.liveRateLimitPerMinute)],
    ["Test calls per minute", optionalCount(value.testRateLimitPerMinute)],
    ["Test calls per month cap", optionalCount(value.testMonthlySafetyCap)],
    ["Warning notice at", optionalPercent(value.quotaWarningThresholdPercent)],
    ["Limit notice at", optionalPercent(value.quotaLimitThresholdPercent)],
    ["Live quota enforcement", modeLabel(value.enforcementMode)],
    ["Test cap enforcement", modeLabel(value.testCapEnforcementMode)],
    ["Live keys allowed", value.liveKeysAllowed === false ? "No" : "Yes"],
  ];
});

async function load() {
  const nextTenantId = tenantId.value.trim();
  if (!nextTenantId) return;
  searchedTenantId.value = nextTenantId;
  await usageStore.fetchUsage(nextTenantId, month.value);
}

onMounted(() => {
  if (tenantId.value) load();
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <DashboardBillingTabs />

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h1 class="text-[2rem] font-[700] text-[#000]">Store API usage</h1>
      <p class="mt-[0.4rem] max-w-[80rem] text-[#616161]">
        What a store's live and test API calls came to in a month, against the policy that applies to it, with the most
        recent times it went over a limit. Over-limit events are recorded at most once per store per minute.
      </p>
      <form class="mt-[1.6rem] grid gap-[1.2rem] md:grid-cols-[1fr_16rem_auto]" @submit.prevent="load">
        <AppInput v-model="tenantId" label="Tenant ID" name="apiUsageTenantId" placeholder="Enter tenant ID" />
        <AppInput v-model="month" label="Month (UTC)" name="apiUsageMonth" type="month" />
        <BaseButton type="submit" radius="8px" class="self-end" :loading="usageStore.loading" :disabled="!tenantId">
          Load usage
        </BaseButton>
      </form>
    </section>

    <p v-if="usageStore.error" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ usageStore.error }}</p>

    <template v-if="usage">
      <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
        <div class="flex flex-wrap items-center gap-[1rem]">
          <h2 class="text-[1.8rem] font-[700] text-[#000]">
            {{ dateLabel(usage.periodStart) }} to {{ dateLabel(new Date(new Date(usage.periodEnd).getTime() - 1)) }}
          </h2>
          <TenantHoverCard :tenant-id="usage.tenantId" />
          <StatusBadge v-if="usage.apiLimitOverrideActive" tone="info" label="API limit override active" />
        </div>
        <p v-if="usage.apiLimitOverrideActive" class="mt-[0.6rem] text-[#616161]">
          An API limit override replaces this store's plan policy, so the policy below is the override.
        </p>

        <div class="mt-[1.6rem] grid gap-[1.6rem] lg:grid-cols-2">
          <div class="space-y-[0.8rem]">
            <div class="flex items-baseline justify-between">
              <h3 class="font-[700] text-[#000]">Live calls</h3>
              <span>{{ hasIncluded ? `${count(usage.liveCalls)} of ${count(usage.includedMonthlyCalls)}` : `${count(usage.liveCalls)} used` }}</span>
            </div>
            <div v-if="hasIncluded" class="h-[6px] w-full overflow-hidden rounded-full bg-[#F2F2F2]" role="meter" :aria-valuenow="Math.round(livePercent)" aria-valuemin="0" aria-valuemax="100" aria-label="Live calls used">
              <div class="h-full rounded-full bg-primary" :style="{ width: barWidth(livePercent) }" />
            </div>
            <p class="text-[1.2rem] text-[#616161]">
              {{ hasIncluded ? `${Math.round(livePercent)}% used, ${optionalCount(usage.remainingLiveQuota, "0")} included calls left.` : "No monthly limit on live calls." }}
            </p>
          </div>
          <div class="space-y-[0.8rem]">
            <div class="flex items-baseline justify-between">
              <h3 class="font-[700] text-[#000]">Test calls</h3>
              <span>{{ hasTestCap ? `${count(usage.testCalls)} of ${count(usage.testMonthlySafetyCap)}` : `${count(usage.testCalls)} used` }}</span>
            </div>
            <div v-if="hasTestCap" class="h-[6px] w-full overflow-hidden rounded-full bg-[#F2F2F2]" role="meter" :aria-valuenow="Math.round(testPercent)" aria-valuemin="0" aria-valuemax="100" aria-label="Test calls used">
              <div class="h-full rounded-full bg-primary" :style="{ width: barWidth(testPercent) }" />
            </div>
            <p class="text-[1.2rem] text-[#616161]">{{ hasTestCap ? `${Math.round(testPercent)}% of the test cap.` : "No monthly cap on test calls." }}</p>
          </div>
        </div>

        <dl class="mt-[2rem] grid gap-[1.2rem] sm:grid-cols-3">
          <div><dt class="text-[1.2rem] text-[#616161]">Calls over included</dt><dd class="text-[1.8rem] font-[700]">{{ count(usage.callsOverIncluded) }}</dd></div>
          <div><dt class="text-[1.2rem] text-[#616161]">Overage blocks used</dt><dd class="text-[1.8rem] font-[700]">{{ count(usage.overageBlocksUsed) }}</dd></div>
          <div><dt class="text-[1.2rem] text-[#616161]">Estimated overage charge</dt><dd class="text-[1.8rem] font-[700]">{{ naira(usage.estimatedOverageCharge) }}</dd></div>
        </dl>
        <p class="mt-[0.8rem] text-[1.2rem] text-[#616161]">
          The estimate uses the same maths as the overage invoice, before VAT. The invoice itself skips stores whose plan has no live keys or whose subscription is exempted.
        </p>
      </section>

      <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
        <h2 class="text-[1.8rem] font-[700] text-[#000]">Effective policy</h2>
        <dl class="mt-[1.2rem] grid gap-x-[2.4rem] gap-y-[1rem] sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="row in policyRows" :key="row[0]">
            <dt class="text-[1.2rem] text-[#616161]">{{ row[0] }}</dt>
            <dd class="font-[600]">{{ row[1] }}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
        <h2 class="text-[1.8rem] font-[700] text-[#000]">Recent over-limit events</h2>
        <p class="mt-[0.4rem] text-[#616161]">Up to the 25 most recent in this month, newest first.</p>
        <div v-if="usage.recentGuardRailEvents?.length" class="mt-[1.2rem] overflow-x-auto">
          <table class="w-full text-left">
            <thead class="text-[1.2rem] text-[#616161]">
              <tr>
                <th class="py-[0.8rem] pr-[1.6rem] font-[600]">Time</th>
                <th class="py-[0.8rem] pr-[1.6rem] font-[600]">Mode</th>
                <th class="py-[0.8rem] pr-[1.6rem] font-[600]">Limit hit</th>
                <th class="py-[0.8rem] pr-[1.6rem] font-[600]">What happened</th>
                <th class="py-[0.8rem] pr-[1.6rem] font-[600]">Reached</th>
                <th class="py-[0.8rem] font-[600]">Key</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(event, index) in usage.recentGuardRailEvents" :key="index" class="border-t border-slate-100 align-top">
                <td class="py-[1rem] pr-[1.6rem] whitespace-nowrap">{{ formatDateTime(event.triggeredAt) }}</td>
                <td class="py-[1rem] pr-[1.6rem]">{{ event.environment }}</td>
                <td class="py-[1rem] pr-[1.6rem]">{{ event.type }}<p v-if="event.endpointGroup" class="text-[1.2rem] text-[#616161]">{{ event.endpointGroup }}</p></td>
                <td class="py-[1rem] pr-[1.6rem]">{{ event.action }}<p v-if="event.message" class="max-w-[28rem] whitespace-normal text-[1.2rem] text-[#616161]">{{ event.message }}</p></td>
                <td class="py-[1rem] pr-[1.6rem]">{{ count(event.observedValue) }} of {{ count(event.limitValue) }}</td>
                <td class="py-[1rem] font-mono">{{ event.apiKeyLastFour ? `…${event.apiKeyLastFour}` : "N/A" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="mt-[1.2rem] text-[#616161]">No limit was hit this month.</p>
      </section>
    </template>
  </div>
</template>
