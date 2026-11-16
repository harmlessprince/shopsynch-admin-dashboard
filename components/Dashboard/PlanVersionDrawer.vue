<script setup>
import { ref, computed, watch } from "vue";
import { useAdminPlanVersionsStore } from "~/stores/adminPlanVersions.store.js";

const props = defineProps({
  open: { type: Boolean, required: true },
  planId: { type: String, default: "" },
  planName: { type: String, default: "" },
  // Version id to show on open, or "new" to start a draft.
  initial: { type: String, default: "" },
});

const emit = defineEmits(["update:open", "move"]);
const store = useAdminPlanVersionsStore();

// One drawer, one panel at a time: detail | draft | publish | retire | policy.
const panel = ref("detail");
const selectedId = ref(null);

const versions = computed(() => store.versionsByPlan[props.planId] || []);
const selected = computed(() => versions.value.find((v) => v.id === selectedId.value) || null);
const live = computed(() => versions.value.find((v) => v.latestForNewPurchases) || null);
const adoption = computed(() => {
  if (!selected.value) return null;
  return (store.adoptionByPlan[props.planId] || []).find((row) => row.versionNumber === selected.value.versionNumber) || null;
});

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    store.clearErrors();
    if (props.initial === "new") {
      selectedId.value = null;
      panel.value = "draft";
    } else {
      selectedId.value = props.initial;
      panel.value = "detail";
    }
  },
);

function go(next) {
  store.clearErrors();
  panel.value = next;
}
const back = () => (selected.value ? go("detail") : emit("update:open", false));
function afterSave(saved) {
  selectedId.value = saved?.id || selectedId.value;
  go("detail");
}
// A retired draft no longer exists as an option worth showing.
function afterRetire(saved) {
  selectedId.value = saved?.id || selectedId.value;
  go("detail");
}
</script>

<template>
  <Drawer :open="open" content-class="p-0" @update:open="emit('update:open', $event)">
    <div class="flex items-center justify-between border-b border-slate-100 px-[2.4rem] py-[1.8rem]">
      <div class="flex items-center gap-[1rem]">
        <BaseButton v-if="panel !== 'detail'" size="sm" radius="8px" variant="ghost" @click="back">
          <span class="material-symbols-outlined">arrow_back</span>
        </BaseButton>
        <h2 class="text-[1.8rem] font-[700] text-slate-900">{{ planName }} version</h2>
      </div>
      <button type="button" class="flex h-[3.2rem] w-[3.2rem] items-center justify-center rounded-[6px] text-slate-500 hover:bg-slate-100" aria-label="Close" @click="emit('update:open', false)">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-[2.4rem] py-[2rem] text-[1.4rem] text-dashboard_text_color">
      <DashboardPlanVersionDetail
        v-if="panel === 'detail' && selected"
        :version="selected"
        :adoption="adoption"
        @edit="go('draft')"
        @publish="go('publish')"
        @retire="go('retire')"
        @policy="go('policy')"
        @move="emit('move', selected)"
      />
      <DashboardPlanVersionDraftForm
        v-else-if="panel === 'draft'"
        :key="selectedId || 'new'"
        :plan-id="planId"
        :plan-name="planName"
        :version="selected"
        :base="live"
        @saved="afterSave"
        @cancel="back"
      />
      <DashboardPlanVersionPublishPanel v-else-if="panel === 'publish' && selected" :version="selected" @done="afterSave" @cancel="back" />
      <DashboardPlanVersionRetirePanel v-else-if="panel === 'retire' && selected" :version="selected" @done="afterRetire" @cancel="back" />
      <DashboardPlanVersionPolicyPanel v-else-if="panel === 'policy' && selected" :version="selected" @done="afterSave" @cancel="back" />
    </div>
  </Drawer>
</template>
