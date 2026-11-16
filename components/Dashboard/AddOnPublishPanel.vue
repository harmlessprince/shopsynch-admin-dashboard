<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useAdminCapacityAddOnsStore } from "~/stores/adminCapacityAddOns.store.js";
import { unplacedErrors, focusFirstError } from "~/utils/billingAdminWrite.js";

const props = defineProps({
  version: { type: Object, required: true },
});

const emit = defineEmits(["done", "cancel"]);
const formEl = ref(null);
const store = useAdminCapacityAddOnsStore();

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

const summaryErrors = computed(() => unplacedErrors(store.fieldErrors, ["reason", ...(form.mode === 'LATER' ? ["effectiveFrom"] : [])]));

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
  const saved = await store.publishVersion(props.version.id, { effectiveFrom, reason: form.reason }, props.version.type);
  if (saved) emit("done", saved);
  else focusFirstError(formEl.value);
}
</script>

<template>
  <form ref="formEl" class="space-y-[2rem]" @submit.prevent="submit">
    <BillingErrorSummary :errors="summaryErrors" />
    <div>
      <h3 class="text-[1.6rem] font-[700] text-slate-900">Publish version {{ version.versionNumber }}</h3>
      <p class="mt-[0.4rem] text-[1.3rem] text-slate-500">
        The new price applies to new purchases only. Merchants who already hold this add-on keep the version they bought.
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
          {{
            impact.newPurchasesWouldUse
              ? "Once it starts, new purchases will use this version."
              : "New purchases will keep using the current version."
          }}
        </p>
        <div v-if="impact.currentLatest" class="mt-[1.2rem] text-slate-600">
          Today new purchases use version {{ impact.currentLatest.versionNumber }}.
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
    </section>

    <BaseSelectInput v-model="form.mode" :options="modeOptions" label="When" />
    <AppInput
      v-if="form.mode === 'LATER'"
      v-model="form.effectiveFrom"
      type="datetime-local"
      label="Starts at"
      hint="A future time schedules the version. Until then it is not used."
      :error="store.fieldError('effectiveFrom')"
    />
    <BaseTextArea v-model="form.reason" label="Reason" :rows="3" :maxlength="500" placeholder="Why you are publishing this" :error="store.fieldError('reason')" />

    <p v-if="store.actionError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.actionError }}</p>

    <div class="flex justify-end gap-[1rem]">
      <BaseButton radius="8px" variant="outline" :disabled="store.saving" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton type="submit" radius="8px" bold :loading="store.saving">
        {{ form.mode === "LATER" ? "Schedule version" : "Publish now" }}
      </BaseButton>
    </div>
  </form>
</template>
