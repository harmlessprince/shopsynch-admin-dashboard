<script setup>
import { reactive, ref, computed, onMounted } from "vue";
import { useAdminPlanVersionsStore } from "~/stores/adminPlanVersions.store.js";
import { displayValue, humanizeKey } from "~/utils/planVersions.js";

const props = defineProps({
  version: { type: Object, required: true },
});

const emit = defineEmits(["done", "cancel"]);
const store = useAdminPlanVersionsStore();

const impact = ref(null);
const impactLoading = ref(true);
const form = reactive({ mode: "NOW", effectiveFrom: "", reason: "" });

const modeOptions = [
  { label: "Publish now", value: "NOW" },
  { label: "Schedule for later", value: "LATER" },
];

onMounted(async () => {
  impact.value = await store.fetchImpact(props.version.id);
  impactLoading.value = false;
});

const keptVersions = computed(() => impact.value?.versionsMerchantsKeep || []);

async function submit() {
  store.clearErrors();
  let effectiveFrom = "";
  if (form.mode === "LATER") {
    const date = new Date(form.effectiveFrom);
    if (!form.effectiveFrom || Number.isNaN(date.getTime())) {
      store.fieldErrors = { effectiveFrom: "Choose when this version starts." };
      return;
    }
    effectiveFrom = date.toISOString();
  }
  const saved = await store.publishVersion(props.version.id, { effectiveFrom, reason: form.reason }, props.version.planId);
  if (saved) emit("done", saved);
}
</script>

<template>
  <form class="space-y-[2rem]" @submit.prevent="submit">
    <div>
      <h3 class="text-[1.6rem] font-[700] text-slate-900">Publish version {{ version.versionNumber }}</h3>
      <p class="mt-[0.4rem] text-[1.3rem] text-slate-500">
        New purchases will use this version's prices and limits. Existing merchants keep their version and price unless you move them.
      </p>
    </div>

    <section class="rounded-[8px] border border-slate-200 bg-slate-50 p-[1.6rem]">
      <h4 class="font-[700] text-slate-900">Impact</h4>
      <p v-if="impactLoading" class="mt-[0.8rem] italic text-slate-400">Checking the impact...</p>
      <template v-else-if="impact">
        <p class="mt-[0.8rem]">
          <span class="text-[2rem] font-[700] text-slate-900">{{ impact.existingMerchantsAffected }}</span>
          existing merchants affected
        </p>
        <p class="mt-[0.4rem] text-slate-600">
          {{ impact.newPurchasesWouldUse ? "Once it starts, new purchases will use this version." : "New purchases will keep using the current version." }}
          <template v-if="impact.currentLatest">Today they use version {{ impact.currentLatest.versionNumber }}.</template>
        </p>
        <p v-if="impact.fewerFeatures" class="mt-[1rem] rounded-[6px] bg-[#FFF8EB] p-[1rem] font-[600] text-[#9A4A00]">
          {{ impact.fewerFeaturesWarning || "This version gives less than the one new purchases use today." }}
        </p>
        <div v-if="impact.featuresAdded?.length" class="mt-[1.2rem]">
          <p class="text-[1.2rem] font-[700] uppercase tracking-wide text-slate-500">Features added</p>
          <p class="text-slate-700">{{ impact.featuresAdded.map(humanizeKey).join(", ") }}</p>
        </div>
        <div v-if="impact.featuresRemoved?.length" class="mt-[1.2rem]">
          <p class="text-[1.2rem] font-[700] uppercase tracking-wide text-slate-500">Features removed</p>
          <p class="text-slate-700">{{ impact.featuresRemoved.map(humanizeKey).join(", ") }}</p>
        </div>
        <div v-if="impact.limitChanges?.length" class="mt-[1.2rem]">
          <p class="text-[1.2rem] font-[700] uppercase tracking-wide text-slate-500">Limit changes</p>
          <ul class="mt-[0.4rem] space-y-[0.2rem]">
            <li v-for="change in impact.limitChanges" :key="change.key" class="flex justify-between gap-[1.6rem]">
              <span class="text-slate-600">{{ humanizeKey(change.key) }}</span>
              <span class="font-[600] text-slate-900">{{ displayValue(change.currentValue) }} to {{ displayValue(change.latestValue) }}</span>
            </li>
          </ul>
        </div>
        <div v-if="keptVersions.length" class="mt-[1.2rem]">
          <p class="text-[1.2rem] font-[700] uppercase tracking-wide text-slate-500">Merchants stay on</p>
          <ul class="mt-[0.4rem] space-y-[0.2rem]">
            <li v-for="kept in keptVersions" :key="kept.id" class="flex justify-between">
              <span>Version {{ kept.versionNumber }}</span>
              <span class="text-slate-600">{{ kept.merchantCount }} merchant{{ kept.merchantCount === 1 ? "" : "s" }}</span>
            </li>
          </ul>
        </div>
      </template>
      <p v-if="store.actionError && !impact" class="mt-[0.8rem] font-[600] text-[#B42318]">{{ store.actionError }}</p>
    </section>

    <BaseSelectInput v-model="form.mode" :options="modeOptions" label="When" />
    <AppInput
      v-if="form.mode === 'LATER'"
      v-model="form.effectiveFrom"
      type="datetime-local"
      label="Starts at"
      hint="A future time schedules the version; a background job publishes it then."
      :error="store.fieldError('effectiveFrom')"
    />
    <BaseTextArea v-model="form.reason" label="Reason" :rows="3" :maxlength="500" placeholder="Why you are publishing this" :error="store.fieldError('reason')" />

    <p v-if="store.actionError && impact" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.actionError }}</p>

    <div class="flex justify-end gap-[1rem]">
      <BaseButton radius="8px" variant="outline" :disabled="store.saving" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton type="submit" radius="8px" bold :loading="store.saving">
        {{ form.mode === "LATER" ? "Schedule version" : "Publish now" }}
      </BaseButton>
    </div>
  </form>
</template>
