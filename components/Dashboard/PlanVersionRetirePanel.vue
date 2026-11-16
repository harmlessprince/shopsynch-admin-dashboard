<script setup>
import { computed, reactive, ref } from "vue";
import { useAdminPlanVersionsStore } from "~/stores/adminPlanVersions.store.js";
import { unplacedErrors, focusFirstError } from "~/utils/billingAdminWrite.js";

const props = defineProps({
  version: { type: Object, required: true },
});

const emit = defineEmits(["done", "cancel"]);
const formEl = ref(null);
const store = useAdminPlanVersionsStore();
const form = reactive({ reason: "" });

const summaryErrors = computed(() => unplacedErrors(store.fieldErrors, ["reason"]));

async function submit() {
  const saved = await store.retireVersion(props.version.id, { reason: form.reason }, props.version.planId);
  if (saved) emit("done", saved);
  else focusFirstError(formEl.value);
}
</script>

<template>
  <form ref="formEl" class="space-y-[2rem]" @submit.prevent="submit">
    <BillingErrorSummary :errors="summaryErrors" />
    <div>
      <h3 class="text-[1.6rem] font-[700] text-slate-900">Retire version {{ version.versionNumber }}</h3>
      <p class="mt-[0.4rem] text-[1.3rem] text-slate-500">
        <template v-if="version.status === 'DRAFT'">Retiring a draft discards it.</template>
        <template v-else-if="version.status === 'SCHEDULED'">Retiring a scheduled version cancels its schedule.</template>
        <template v-else>
          Nobody can buy or be moved to this version afterwards. The {{ version.merchantCount }}
          merchant{{ version.merchantCount === 1 ? "" : "s" }} on it keep their price; set a renewal policy if they should move.
        </template>
        The version new purchases use right now cannot be retired: publish a newer one first.
      </p>
    </div>
    <BaseTextArea v-model="form.reason" label="Reason" :rows="3" :maxlength="500" placeholder="Why you are retiring this version" :error="store.fieldError('reason')" />
    <p v-if="store.actionError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.actionError }}</p>
    <div class="flex justify-end gap-[1rem]">
      <BaseButton radius="8px" variant="outline" :disabled="store.saving" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton type="submit" radius="8px" variant="danger" bold :loading="store.saving">Retire version</BaseButton>
    </div>
  </form>
</template>
