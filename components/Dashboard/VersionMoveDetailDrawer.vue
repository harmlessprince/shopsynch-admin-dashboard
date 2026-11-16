<script setup>
import { reactive, computed, watch } from "vue";
import { useAdminVersionMovesStore } from "~/stores/adminVersionMoves.store.js";
import { formatDateTime } from "~/utils/helpers.js";
import { moveStatusMeta } from "~/utils/planVersions.js";

const props = defineProps({
  open: { type: Boolean, required: true },
  move: { type: Object, default: null },
});

const emit = defineEmits(["update:open"]);
const store = useAdminVersionMovesStore();
const form = reactive({ reason: "" });

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    store.clearErrors();
    form.reason = "";
    if (props.move?.id) store.fetchMove(props.move.id);
  },
);

// Re-read from the store so the drawer reflects the cancel result.
const current = computed(() => store.moves.find((m) => m.id === props.move?.id) || props.move);
const canCancel = computed(() => current.value?.status === "SCHEDULED");

async function cancel() {
  await store.cancelMove(current.value.id, { reason: form.reason });
}
</script>

<template>
  <Drawer :open="open" content-class="p-0" @update:open="emit('update:open', $event)">
    <div class="flex items-center justify-between border-b border-slate-100 px-[2.4rem] py-[1.8rem]">
      <h2 class="text-[1.8rem] font-[700] text-slate-900">Move details</h2>
      <BaseButton size="sm" radius="8px" variant="ghost" aria-label="Close" @click="emit('update:open', false)">
        <span class="material-symbols-outlined">close</span>
      </BaseButton>
    </div>

    <div v-if="current" class="flex-1 space-y-[2rem] overflow-y-auto px-[2.4rem] py-[2rem] text-[1.4rem] text-dashboard_text_color">
      <div class="flex flex-wrap items-center gap-[1rem]">
        <h3 class="text-[1.6rem] font-[700] text-slate-900">
          {{ current.planCode || current.addOnType }}: {{ current.fromVersionNumber ? `v${current.fromVersionNumber}` : "other versions" }} to v{{ current.toVersionNumber }}
        </h3>
        <StatusBadge v-bind="moveStatusMeta[current.status] || { label: current.status }" />
      </div>

      <dl class="grid grid-cols-2 gap-[1.2rem] sm:grid-cols-4">
        <div><dt class="text-[1.2rem] text-slate-500">Applied</dt><dd class="font-[700]">{{ current.appliedCount }}</dd></div>
        <div><dt class="text-[1.2rem] text-slate-500">Pending</dt><dd class="font-[700]">{{ current.pendingCount }}</dd></div>
        <div><dt class="text-[1.2rem] text-slate-500">Skipped</dt><dd class="font-[700]">{{ current.skippedCount }}</dd></div>
        <div><dt class="text-[1.2rem] text-slate-500">Cancelled</dt><dd class="font-[700]">{{ current.cancelledCount }}</dd></div>
      </dl>
      <p class="text-slate-600">
        Created {{ current.createdAt ? formatDateTime(current.createdAt) : "" }}<span v-if="current.createdBy"> by admin {{ current.createdBy }}</span>.
        Reason: {{ current.reason }}
      </p>
      <p v-if="current.noticeDays" class="text-slate-600">
        Merchants whose price goes up are given {{ current.noticeDays }} days' notice first.
      </p>
      <p v-if="current.status === 'CANCELLED'" class="rounded-[8px] bg-slate-50 p-[1.2rem] text-slate-600">
        Cancelled {{ current.cancelledAt ? formatDateTime(current.cancelledAt) : "" }}<span v-if="current.cancelledBy"> by admin {{ current.cancelledBy }}</span>: {{ current.cancelReason }}
      </p>

      <section v-if="canCancel" class="space-y-[1.2rem] rounded-[8px] border border-slate-200 p-[1.6rem]">
        <h4 class="font-[700] text-slate-900">Cancel this move</h4>
        <p class="text-slate-600">Merchants who have not been moved yet stay on their current version.</p>
        <BaseTextArea v-model="form.reason" label="Reason" :rows="2" :maxlength="500" :error="store.fieldError('reason')" />
        <p v-if="store.actionError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.actionError }}</p>
        <div class="flex justify-end">
          <BaseButton radius="8px" variant="danger" :loading="store.saving" @click="cancel">Cancel scheduled move</BaseButton>
        </div>
      </section>

      <section>
        <h4 class="mb-[1rem] font-[700] text-slate-900">Merchants</h4>
        <DashboardVersionMoveRows :rows="current.rows" />
      </section>
    </div>
  </Drawer>
</template>
