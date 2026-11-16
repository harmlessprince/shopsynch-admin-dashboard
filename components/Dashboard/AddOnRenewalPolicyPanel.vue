<script setup>
import { reactive, computed, ref } from "vue";
import { useAdminCapacityAddOnsStore } from "~/stores/adminCapacityAddOns.store.js";
import { formatDateTime } from "~/utils/helpers.js";
import { renewalPolicyLabel } from "~/utils/planVersions.js";

const props = defineProps({
  version: { type: Object, required: true },
});

const emit = defineEmits(["done", "cancel"]);
const store = useAdminCapacityAddOnsStore();

const adoption = computed(() =>
  (store.adoptionByType[props.version.type] || []).find((row) => row.versionNumber === props.version.versionNumber) || null,
);
// The newest proposal for this version still waiting for approval.
const proposed = computed(
  () =>
    (store.policiesByType[props.version.type] || []).find(
      (policy) => policy.versionNumber === props.version.versionNumber && policy.status === "PROPOSED",
    ) || null,
);
// Merchants can only be moved to a newer published version.
const targetOptions = computed(() => [
  { label: "Choose a version", value: "" },
  ...(store.versionsByType[props.version.type] || [])
    .filter((v) => v.status === "PUBLISHED" && v.versionNumber > props.version.versionNumber)
    .map((v) => ({ label: `Version ${v.versionNumber}`, value: String(v.versionNumber) })),
]);
const policyOptions = [
  { label: "Continue on this version", value: "CONTINUE" },
  { label: "Sunset: move to a newer version", value: "SUNSET" },
];

// Starts on the policy the version has today, so saving a reason alone never silently reverses a sunset.
const currentPolicy = policyOptions.some((option) => option.value === adoption.value?.renewalPolicy) ? adoption.value.renewalPolicy : "CONTINUE";
const form = reactive({ policy: currentPolicy, sunsetAt: "", targetVersionNumber: "", acknowledgeFewerFeatures: false, reason: "" });
const approveForm = reactive({ reason: "" });
// The store keeps one error bag, so remember which form was submitted last and show "reason" errors only there.
const lastAction = ref("");
const reasonError = (action) => (lastAction.value === action ? store.fieldError("reason") : "");

async function submit() {
  lastAction.value = "set";
  store.clearErrors();
  const raw = { versionNumber: props.version.versionNumber, policy: form.policy, reason: form.reason };
  if (form.policy === "SUNSET") {
    const date = new Date(form.sunsetAt);
    raw.sunsetAt = form.sunsetAt && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
    raw.targetVersionNumber = form.targetVersionNumber || undefined;
    raw.acknowledgeFewerFeatures = form.acknowledgeFewerFeatures;
  }
  const saved = await store.setRenewalPolicy(raw, props.version.type);
  if (saved) {
    form.reason = "";
    if (saved.status === "APPROVED") emit("done", saved);
  }
}

async function approve() {
  lastAction.value = "approve";
  const saved = await store.approvePolicy(proposed.value.id, { reason: approveForm.reason }, props.version.type);
  if (saved) emit("done", saved);
}
</script>

<template>
  <div class="space-y-[2rem]">
    <div>
      <h3 class="text-[1.6rem] font-[700] text-slate-900">Renewal policy for version {{ version.versionNumber }}</h3>
      <p class="mt-[0.4rem] text-[1.3rem] text-slate-500">
        Decides what happens to merchants who hold this version when they renew. It never changes a price for new purchases.
      </p>
    </div>

    <section v-if="adoption" class="rounded-[8px] border border-slate-200 bg-slate-50 p-[1.6rem]">
      <h4 class="font-[700] text-slate-900">Today</h4>
      <p class="mt-[0.4rem] text-slate-600">
        Policy: <span class="font-[600]">{{ renewalPolicyLabel(adoption.renewalPolicy) }}</span>
        <template v-if="adoption.sunsetAt">
          , sunset {{ formatDateTime(adoption.sunsetAt) }}
          <template v-if="adoption.sunsetTargetVersionNumber"> to version {{ adoption.sunsetTargetVersionNumber }}</template>
        </template>
      </p>
      <p class="text-slate-600">{{ adoption.switchedCount }} moved, {{ adoption.remainingCount }} still on this version.</p>
    </section>

    <section v-if="proposed" class="space-y-[1.2rem] rounded-[8px] border border-[#F5C26B] bg-[#FFF8EB] p-[1.6rem]">
      <h4 class="font-[700] text-slate-900">Waiting for approval</h4>
      <p class="text-slate-700">
        {{ renewalPolicyLabel(proposed.policy) }}
        <template v-if="proposed.policy === 'SUNSET'">
          on {{ formatDateTime(proposed.sunsetAt) }}, moving merchants to version {{ proposed.targetVersionNumber }}.
        </template>
        Proposed by {{ proposed.proposedBy || "an admin" }}. Approving notifies the merchants on this version.
      </p>
      <p v-if="proposed.fewerFeaturesWarning" class="font-[600] text-[#9A4A00]">{{ proposed.fewerFeaturesWarning }}</p>
      <BaseTextArea v-model="approveForm.reason" label="Reason for approving" :rows="2" :maxlength="500" :error="reasonError('approve')" />
      <div class="flex justify-end">
        <BaseButton radius="8px" bold :loading="store.saving" @click="approve">Approve</BaseButton>
      </div>
    </section>

    <form class="space-y-[1.4rem]" @submit.prevent="submit">
      <h4 class="font-[700] text-slate-900">{{ proposed ? "Replace the proposal" : "Set a policy" }}</h4>
      <BaseSelectInput v-model="form.policy" :options="policyOptions" label="Policy" :error="store.fieldError('policy')" />
      <template v-if="form.policy === 'SUNSET'">
        <BaseSelectInput v-model="form.targetVersionNumber" :options="targetOptions" label="Move merchants to" :error="store.fieldError('targetVersionNumber')" />
        <AppInput v-model="form.sunsetAt" type="datetime-local" label="Sunset date" hint="Must leave enough notice for merchants." :error="store.fieldError('sunsetAt')" />
        <!-- TODO: replace with a shared checkbox component if one is added; none exists in components/ today. -->
        <label class="flex items-center gap-[0.8rem] font-[600] text-slate-700">
          <input v-model="form.acknowledgeFewerFeatures" type="checkbox" class="h-[1.8rem] w-[1.8rem] accent-primary">
          I accept that the target version may have lower limits
        </label>
      </template>
      <BaseTextArea v-model="form.reason" label="Reason" :rows="3" :maxlength="500" :error="reasonError('set')" />
      <p v-if="store.actionError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.actionError }}</p>
      <div class="flex justify-end gap-[1rem]">
        <BaseButton radius="8px" variant="outline" :disabled="store.saving" @click="emit('cancel')">Back</BaseButton>
        <BaseButton type="submit" radius="8px" bold :loading="store.saving">Save policy</BaseButton>
      </div>
    </form>
  </div>
</template>
