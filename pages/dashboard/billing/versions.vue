<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useAdminBillingPlansStore } from "~/stores/adminBillingPlans.store.js";
import { useAdminPlanVersionsStore } from "~/stores/adminPlanVersions.store.js";
import { useAdminVersionMovesStore } from "~/stores/adminVersionMoves.store.js";
import { formatDateTime, formatEffectiveFrom } from "~/utils/helpers.js";
import { versionStatusMeta } from "~/utils/addOnCatalogue.js";
import { moveStatusMeta, renewalPolicyLabel } from "~/utils/planVersions.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-versions",
});

useHead({
  title: "Plan Versions - ShopSynch Admin",
});

const plansStore = useAdminBillingPlansStore();
const store = useAdminPlanVersionsStore();
const movesStore = useAdminVersionMovesStore();

const planId = ref("");
const versionDrawer = ref(false);
const versionInitial = ref("");
const moveDrawer = ref(false);
const moveTo = ref("");
const detailDrawer = ref(false);
const detailMove = ref(null);

const plan = computed(() => plansStore.plans.find((p) => (p.id || p._id) === planId.value) || null);
const planName = computed(() => plan.value?.name || plan.value?.code || "");
const versions = computed(() => store.versionsByPlan[planId.value] || []);
const adoption = computed(() => store.adoptionByPlan[planId.value] || []);
const live = computed(() => versions.value.find((v) => v.latestForNewPurchases) || null);
const adoptionFor = (version) => adoption.value.find((row) => row.versionNumber === version.versionNumber) || null;
const planMoves = computed(() => movesStore.moves.filter((m) => m.kind === "PLAN" && m.planId === planId.value));
const merchantTotal = computed(() => versions.value.reduce((sum, v) => sum + Number(v.merchantCount || 0), 0));

watch(planId, (id) => id && store.fetchPlan(id));

function openVersion(id) {
  versionInitial.value = id;
  versionDrawer.value = true;
}

function openMove(version = null) {
  moveTo.value = version?.versionNumber || "";
  versionDrawer.value = false;
  moveDrawer.value = true;
}

function openMoveDetail(move) {
  detailMove.value = move;
  detailDrawer.value = true;
}

onMounted(async () => {
  await Promise.allSettled([plansStore.fetchPlans(), movesStore.fetchMoves()]);
  const first = plansStore.plans[0];
  if (first) planId.value = first.id || first._id;
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <DashboardBillingTabs />

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h1 class="text-[2rem] font-[700] text-[#000]">Plan Versions</h1>
      <p class="mt-[0.4rem] max-w-[80rem] text-[#616161]">
        Each plan keeps its prices and limits as versions. Publishing a new version changes what new purchases get. Price
        changes do not affect existing merchants unless they are moved to the new version.
      </p>
      <div class="mt-[1.6rem] flex flex-wrap gap-[0.8rem]">
        <BaseButton
          v-for="p in plansStore.plans"
          :key="p.id || p._id"
          size="sm"
          radius="8px"
          :variant="(p.id || p._id) === planId ? 'primary' : 'outline'"
          @click="planId = p.id || p._id"
        >
          {{ p.name || p.code }}
        </BaseButton>
        <p v-if="!plansStore.plans.length && !plansStore.loading" class="italic text-slate-400">No plans found.</p>
      </div>
    </section>

    <p v-if="store.loadError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.loadError }}</p>

    <template v-if="planId">
      <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
        <div class="flex flex-col gap-[1.6rem] lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 class="text-[1.8rem] font-[700] text-slate-900">{{ planName }}</h2>
            <p v-if="live" class="mt-[0.4rem] text-slate-500">
              New purchases use version {{ live.versionNumber }}<span v-if="live.effectiveFrom"> since {{ formatEffectiveFrom(live.effectiveFrom) }}</span>.
            </p>
            <p v-else-if="store.loading" class="mt-[0.4rem] italic text-slate-400">Loading...</p>
            <p v-else class="mt-[0.4rem] italic text-slate-400">No version is published for this plan.</p>
            <div v-if="live" class="mt-[1.2rem] max-w-[36rem]"><DashboardPlanVersionPrices :prices="live.prices" /></div>
          </div>
          <div class="flex flex-col items-start gap-[1.2rem] lg:items-end">
            <dl class="flex gap-[2.4rem]">
              <div><dt class="text-[1.2rem] text-slate-500">Versions</dt><dd class="text-[1.8rem] font-[700] text-slate-900">{{ versions.length }}</dd></div>
              <div><dt class="text-[1.2rem] text-slate-500">Merchants</dt><dd class="text-[1.8rem] font-[700] text-slate-900">{{ merchantTotal.toLocaleString() }}</dd></div>
            </dl>
            <div class="flex flex-wrap gap-[0.8rem]">
              <BaseButton size="sm" radius="8px" variant="outline" :loading="store.loading" @click="store.fetchPlan(planId)">Reload</BaseButton>
              <BaseButton size="sm" radius="8px" variant="outline" :disabled="versions.length < 2" @click="openMove()">Move merchants</BaseButton>
              <BaseButton size="sm" radius="8px" bold @click="openVersion('new')">New draft</BaseButton>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-[1.2rem]">
        <h2 class="text-[1.6rem] font-[700] text-slate-900">Versions, newest first</h2>
        <p v-if="!versions.length && !store.loading" class="rounded-[8px] bg-white p-[2.4rem] text-center italic text-slate-400 shadow-sm">No versions yet. Create a draft to start.</p>
        <button
          v-for="version in versions"
          :key="version.id"
          type="button"
          class="block w-full rounded-[10px] border border-slate-200 bg-white p-[1.6rem] text-left shadow-sm transition-colors hover:border-primary"
          @click="openVersion(version.id)"
        >
          <div class="flex flex-wrap items-center justify-between gap-[0.8rem]">
            <div class="flex items-center gap-[0.8rem]">
              <span class="font-[700] text-slate-900">Version {{ version.versionNumber }}</span>
              <StatusBadge v-bind="versionStatusMeta[version.status] || { label: version.status }" />
              <StatusBadge v-if="version.latestForNewPurchases" tone="info" label="New purchases" />
            </div>
            <span class="text-[1.2rem] text-slate-500">{{ formatEffectiveFrom(version.effectiveFrom, "Not published") }}</span>
          </div>
          <p class="mt-[0.8rem] text-slate-700">
            <template v-for="(price, index) in version.prices" :key="price.periodUnitCount">
              <span v-if="index">, </span>{{ price.currency }} {{ Number(price.amount).toLocaleString() }} / {{ price.periodUnitCount }} mo
            </template>
            <span v-if="!version.prices?.length" class="text-slate-400">No prices</span>
          </p>
          <p class="mt-[0.4rem] text-[1.2rem] text-slate-500">
            {{ version.merchantCount }} merchant{{ version.merchantCount === 1 ? "" : "s" }}
            <template v-if="adoptionFor(version)"> · {{ adoptionFor(version).switchedCount }} moved away · renewal: {{ renewalPolicyLabel(adoptionFor(version).renewalPolicy).toLowerCase() }}<template v-if="adoptionFor(version).policyStatus === 'PROPOSED'"> (waiting for approval)</template></template>
            <template v-if="version.changeNote"> · {{ version.changeNote }}</template>
          </p>
        </button>
      </section>

      <section class="space-y-[1.2rem]">
        <h2 class="text-[1.6rem] font-[700] text-slate-900">Cohort moves</h2>
        <p class="text-slate-500">Moves of merchants between versions of this plan. A move that raises a price waits out the notice period. Only the latest 50 moves across all plans are loaded, so older moves for this plan may not appear.</p>
        <p v-if="movesStore.loadError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ movesStore.loadError }}</p>
        <p v-else-if="!planMoves.length" class="rounded-[8px] bg-white p-[2.4rem] text-center italic text-slate-400 shadow-sm">No recent moves for this plan.</p>
        <button
          v-for="move in planMoves"
          :key="move.id"
          type="button"
          class="block w-full rounded-[10px] border border-slate-200 bg-white p-[1.6rem] text-left shadow-sm transition-colors hover:border-primary"
          @click="openMoveDetail(move)"
        >
          <div class="flex flex-wrap items-center justify-between gap-[0.8rem]">
            <div class="flex items-center gap-[0.8rem]">
              <span class="font-[700] text-slate-900">{{ move.fromVersionNumber ? `Version ${move.fromVersionNumber}` : "Other versions" }} to version {{ move.toVersionNumber }}</span>
              <StatusBadge v-bind="moveStatusMeta[move.status] || { label: move.status }" />
            </div>
            <span class="text-[1.2rem] text-slate-500">{{ move.createdAt ? formatDateTime(move.createdAt) : "" }}</span>
          </div>
          <p class="mt-[0.4rem] text-[1.2rem] text-slate-500">
            {{ move.appliedCount }} applied · {{ move.pendingCount }} pending · {{ move.skippedCount }} skipped · {{ move.cancelledCount }} cancelled
          </p>
        </button>
      </section>
    </template>

    <DashboardPlanVersionDrawer
      v-model:open="versionDrawer"
      :plan-id="planId"
      :plan-name="planName"
      :initial="versionInitial"
      @move="openMove"
    />
    <DashboardVersionMoveDrawer
      v-model:open="moveDrawer"
      :plan-id="planId"
      :plan-name="planName"
      :versions="versions"
      :initial-to="moveTo"
      @done="movesStore.fetchMoves()"
    />
    <DashboardVersionMoveDetailDrawer v-model:open="detailDrawer" :move="detailMove" />
  </div>
</template>
