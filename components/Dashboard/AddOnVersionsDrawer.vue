<script setup>
import { ref, computed, watch } from "vue";
import { useAdminCapacityAddOnsStore } from "~/stores/adminCapacityAddOns.store.js";
import { useAdminBillingPlansStore } from "~/stores/adminBillingPlans.store.js";
import { formatEffectiveFrom } from "~/utils/helpers.js";
import { addOnTypeMeta, versionStatusMeta, sortedPeriodEntries, formatAddOnMoney } from "~/utils/addOnCatalogue.js";

const props = defineProps({
  open: { type: Boolean, required: true },
  type: { type: String, default: "" },
});

const emit = defineEmits(["update:open"]);
const store = useAdminCapacityAddOnsStore();
const plansStore = useAdminBillingPlansStore();

// One drawer, one panel at a time: list | detail | draft | publish | retire | policy.
const panel = ref("list");
const selectedId = ref(null);

const versions = computed(() => store.versionsByType[props.type] || []);
// Re-read from the store so the detail reflects the latest save.
const selected = computed(() => versions.value.find((version) => version.id === selectedId.value) || null);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    panel.value = "list";
    selectedId.value = null;
    store.clearErrors();
    if (!plansStore.plans.length) plansStore.fetchPlans().catch(() => {});
  },
);

function go(next, id = selectedId.value) {
  store.clearErrors();
  selectedId.value = id;
  panel.value = next;
}

const backToDetail = () => go(selected.value ? "detail" : "list");
const close = () => emit("update:open", false);

function afterSave(saved) {
  go("detail", saved?.id || selectedId.value);
}
</script>

<template>
  <Drawer :open="open" content-class="p-0" @update:open="emit('update:open', $event)">
    <div class="flex items-center justify-between border-b border-slate-100 px-[2.4rem] py-[1.8rem]">
      <div class="flex items-center gap-[1rem]">
        <BaseButton v-if="panel !== 'list'" size="sm" radius="8px" variant="ghost" @click="panel === 'detail' || !selected ? go('list') : backToDetail()">
          <span class="material-symbols-outlined">arrow_back</span>
        </BaseButton>
        <h2 class="text-[1.8rem] font-[700] text-slate-900">{{ addOnTypeMeta[type]?.label }} versions</h2>
      </div>
      <BaseButton size="sm" radius="8px" variant="ghost" aria-label="Close" @click="close">
        <span class="material-symbols-outlined">close</span>
      </BaseButton>
    </div>

    <div class="flex-1 overflow-y-auto px-[2.4rem] py-[2rem] text-[1.4rem] text-dashboard_text_color">
      <template v-if="panel === 'list'">
        <div class="mb-[1.6rem] flex items-start justify-between gap-[1.6rem]">
          <p class="text-slate-500">
            Newest first. A new price applies to new purchases only; merchants keep the version they bought.
          </p>
          <BaseButton size="sm" radius="8px" bold @click="go('draft', null)">New draft</BaseButton>
        </div>
        <p v-if="!versions.length" class="py-[3rem] text-center italic text-slate-400">No versions yet. Create a draft to start.</p>
        <ul class="space-y-[1.2rem]">
          <li v-for="version in versions" :key="version.id">
            <button type="button" class="w-full rounded-[10px] border border-slate-200 p-[1.6rem] text-left transition-colors hover:border-primary" @click="go('detail', version.id)">
              <div class="flex flex-wrap items-center justify-between gap-[0.8rem]">
                <div class="flex items-center gap-[0.8rem]">
                  <span class="font-[700] text-slate-900">Version {{ version.versionNumber }}</span>
                  <StatusBadge v-bind="versionStatusMeta[version.status] || { label: version.status }" />
                  <StatusBadge v-if="version.latestForNewPurchases" tone="info" label="New purchases" />
                </div>
                <span class="text-[1.2rem] text-slate-500">{{ formatEffectiveFrom(version.effectiveFrom, "Not published") }}</span>
              </div>
              <p class="mt-[0.8rem] text-slate-700">
                <template v-for="([period, amount], index) in sortedPeriodEntries(version.amountsByPeriodUnit)" :key="period">
                  <span v-if="index">, </span>{{ formatAddOnMoney(amount, version.currency) }} / {{ period }} mo
                </template>
              </p>
              <p class="mt-[0.4rem] text-[1.2rem] text-slate-500">
                {{ version.merchantCount }} merchant{{ version.merchantCount === 1 ? "" : "s" }} ·
                {{ version.unitsHeld }} unit{{ version.unitsHeld === 1 ? "" : "s" }} held
              </p>
            </button>
          </li>
        </ul>
      </template>

      <DashboardAddOnVersionDetail
        v-else-if="panel === 'detail' && selected"
        :version="selected"
        @edit="go('draft')"
        @publish="go('publish')"
        @retire="go('retire')"
        @policy="go('policy')"
      />
      <DashboardAddOnDraftForm
        v-else-if="panel === 'draft'"
        :key="selectedId || 'new'"
        :type="type"
        :version="selected"
        :plans="plansStore.plans"
        @saved="afterSave"
        @cancel="backToDetail"
      />
      <DashboardAddOnPublishPanel v-else-if="panel === 'publish' && selected" :version="selected" @done="afterSave" @cancel="backToDetail" />
      <DashboardAddOnRetirePanel v-else-if="panel === 'retire' && selected" :version="selected" @done="afterSave" @cancel="backToDetail" />
      <DashboardAddOnRenewalPolicyPanel v-else-if="panel === 'policy' && selected" :version="selected" @done="afterSave" @cancel="backToDetail" />
    </div>
  </Drawer>
</template>
