<script setup>
import { reactive, computed, watch } from "vue";
import { useAdminVersionMovesStore } from "~/stores/adminVersionMoves.store.js";

const props = defineProps({
  open: { type: Boolean, required: true },
  planId: { type: String, default: "" },
  planName: { type: String, default: "" },
  versions: { type: Array, default: () => [] },
  // Version number to preselect as the target.
  initialTo: { type: [Number, String], default: "" },
});

const emit = defineEmits(["update:open", "done"]);
const store = useAdminVersionMovesStore();

const form = reactive({ from: "", to: "", tenants: "", reason: "" });

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    store.resetPreview();
    Object.assign(form, { from: "", to: props.initialTo ? String(props.initialTo) : "", tenants: "", reason: "" });
  },
);
// Any change to the move invalidates the dry run.
watch(() => [form.from, form.to, form.tenants], () => store.preview && store.resetPreview());

const fromOptions = computed(() => [
  { label: "Every other version", value: "" },
  ...props.versions
    .filter((v) => v.status === "PUBLISHED" || v.status === "RETIRED")
    .map((v) => ({ label: `Version ${v.versionNumber}`, value: String(v.versionNumber) })),
]);
const toOptions = computed(() => [
  { label: "Choose a version", value: "" },
  ...props.versions.filter((v) => v.status === "PUBLISHED").map((v) => ({ label: `Version ${v.versionNumber}`, value: String(v.versionNumber) })),
]);

const request = () => {
  const tenantIds = form.tenants.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  return {
    kind: "PLAN",
    planId: props.planId,
    fromVersionNumber: form.from || undefined,
    toVersionNumber: form.to || undefined,
    tenantIds: tenantIds.length ? tenantIds : undefined,
  };
};

const preview = computed(() => store.preview);
const raises = computed(() => (preview.value?.rows || []).some((row) => row.direction === "INCREASE" && row.status !== "SKIPPED"));
const movable = computed(() => (preview.value?.rows || []).filter((row) => row.status !== "SKIPPED").length);

const runPreview = () => store.previewMove(request());

async function confirm() {
  const saved = await store.confirmMove({ ...request(), reason: form.reason });
  if (saved) {
    emit("done", saved);
    emit("update:open", false);
  }
}
</script>

<template>
  <Drawer :open="open" content-class="p-0" @update:open="emit('update:open', $event)">
    <div class="flex items-center justify-between border-b border-slate-100 px-[2.4rem] py-[1.8rem]">
      <h2 class="text-[1.8rem] font-[700] text-slate-900">Move {{ planName }} merchants</h2>
      <BaseButton size="sm" radius="8px" variant="ghost" aria-label="Close" @click="emit('update:open', false)">
        <span class="material-symbols-outlined">close</span>
      </BaseButton>
    </div>

    <div class="flex-1 space-y-[2rem] overflow-y-auto px-[2.4rem] py-[2rem] text-[1.4rem] text-dashboard_text_color">
      <p class="rounded-[8px] bg-slate-50 p-[1.2rem] text-[1.3rem] text-slate-600">
        Publishing a version never changes existing merchants. They change only when they switch themselves or when you move them here.
        Run the dry run first: nothing is changed until you confirm.
      </p>

      <section class="space-y-[1.2rem]">
        <BaseSelectInput v-model="form.from" :options="fromOptions" label="Move merchants from" :error="store.fieldError('fromVersionNumber')" />
        <BaseSelectInput v-model="form.to" :options="toOptions" label="Move merchants to" :error="store.fieldError('toVersionNumber')" />
        <BaseTextArea
          v-model="form.tenants"
          label="Only these merchants (optional)"
          :rows="3"
          placeholder="Merchant ids separated by commas or new lines. Leave empty for everyone on the version."
          :error="store.fieldError('tenantIds')"
        />
        <p v-if="store.fieldError('planId')" class="text-[1.3rem] font-[600] text-[#B42318]">{{ store.fieldError("planId") }}</p>
        <p v-if="store.actionError && !preview" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.actionError }}</p>
        <div class="flex justify-end">
          <BaseButton radius="8px" variant="outline" :loading="store.saving && !preview" @click="runPreview">Run dry run</BaseButton>
        </div>
      </section>

      <template v-if="preview">
        <section class="grid grid-cols-2 gap-[1.2rem] rounded-[8px] border border-slate-200 p-[1.4rem] sm:grid-cols-4">
          <div><p class="text-[1.2rem] text-slate-500">Will move</p><p class="text-[1.8rem] font-[700] text-slate-900">{{ movable }}</p></div>
          <div><p class="text-[1.2rem] text-slate-500">At next renewal</p><p class="text-[1.8rem] font-[700] text-slate-900">{{ preview.applyAtNextRenewalCount }}</p></div>
          <div><p class="text-[1.2rem] text-slate-500">Need notice</p><p class="text-[1.8rem] font-[700] text-slate-900">{{ preview.noticeRequiredCount }}</p></div>
          <div><p class="text-[1.2rem] text-slate-500">Skipped</p><p class="text-[1.8rem] font-[700] text-slate-900">{{ preview.skippedCount }}</p></div>
        </section>

        <p v-if="raises" class="rounded-[8px] bg-[#FFF8EB] p-[1.2rem] font-[600] text-[#9A4A00]">
          This move raises the price for some merchants, so they must get {{ preview.noticeDays }} days notice first.
          Each row shows when its notice ends and when the new price applies.
        </p>

        <section>
          <h3 class="mb-[1rem] font-[700] text-slate-900">Affected merchants</h3>
          <DashboardVersionMoveRows :rows="preview.rows" :show-status="false" />
        </section>

        <section class="space-y-[1.2rem] border-t border-slate-100 pt-[1.6rem]">
          <BaseTextArea v-model="form.reason" label="Reason" :rows="3" :maxlength="500" placeholder="Why you are moving these merchants" :error="store.fieldError('reason')" />
          <p v-if="store.actionError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.actionError }}</p>
          <div class="flex justify-end gap-[1rem]">
            <BaseButton radius="8px" variant="outline" :disabled="store.saving" @click="emit('update:open', false)">Cancel</BaseButton>
            <BaseButton radius="8px" bold :loading="store.saving" :disabled="!movable" @click="confirm">Confirm move</BaseButton>
          </div>
        </section>
      </template>
    </div>
  </Drawer>
</template>
