<script setup>
import { computed, reactive, ref } from "vue";
import { useAdminCapacityAddOnsStore } from "~/stores/adminCapacityAddOns.store.js";
import { unplacedErrors, focusFirstError } from "~/utils/billingAdminWrite.js";
import { addOnTypeMeta } from "~/utils/addOnCatalogue.js";

const props = defineProps({
  type: { type: String, required: true },
  // The draft being edited, or null to create one.
  version: { type: Object, default: null },
  // The version a new draft starts from (the one new purchases use), so nothing has to be retyped and no plan limit is dropped by accident.
  baseVersion: { type: Object, default: null },
  plans: { type: Array, default: () => [] },
});

const emit = defineEmits(["saved", "cancel"]);
const formEl = ref(null);
const store = useAdminCapacityAddOnsStore();

const isEdit = computed(() => Boolean(props.version));

const seed = props.version || props.baseVersion;

const form = reactive({
  prices: Object.entries(seed?.amountsByPeriodUnit || { 3: "" }).map(([period, amount]) => ({
    period: String(period),
    amount: amount === "" ? "" : String(amount),
  })),
  max: {},
  onSale: seed?.onSale ?? true,
  changeNote: props.version?.changeNote ?? "",
  reason: "",
});

// One row per known plan, plus any plan code already on the draft that is no longer listed.
const planRows = computed(() => {
  const rows = props.plans.map((plan) => ({ code: plan.code, name: plan.name || plan.code }));
  for (const code of Object.keys(seed?.maxQuantityByPlanCode || {})) {
    if (!rows.some((row) => row.code === code)) rows.push({ code, name: code });
  }
  return rows;
});

for (const [code, value] of Object.entries(seed?.maxQuantityByPlanCode || {})) {
  form.max[code] = String(value);
}

const addPrice = () => form.prices.push({ period: "", amount: "" });
const removePrice = (index) => form.prices.splice(index, 1);

const summaryErrors = computed(() => unplacedErrors(store.fieldErrors, ["amountsByPeriodUnit", "maxQuantityByPlanCode", "changeNote", "reason"]));

async function submit() {
  store.clearErrors();
  const amountsByPeriodUnit = {};
  for (const row of form.prices) {
    if (row.period.trim() === "" && row.amount === "") continue;
    if (!/^[1-9]\d*$/.test(row.period.trim()) || row.amount === "") {
      store.fieldErrors = { amountsByPeriodUnit: "Each price needs a whole number of 30-day periods and an amount." };
      return;
    }
    amountsByPeriodUnit[row.period.trim()] = row.amount;
  }
  // A plan left blank is omitted, which means that plan may hold none.
  const maxQuantityByPlanCode = {};
  for (const [code, value] of Object.entries(form.max)) {
    if (String(value ?? "").trim() !== "") maxQuantityByPlanCode[code] = value;
  }
  const saved = await store.saveDraft(
    {
      type: props.type,
      amountsByPeriodUnit,
      maxQuantityByPlanCode,
      onSale: form.onSale,
      changeNote: form.changeNote,
      reason: form.reason,
    },
    props.version?.id || null,
  );
  if (saved) emit("saved", saved);
  else focusFirstError(formEl.value);
}
</script>

<template>
  <form ref="formEl" class="space-y-[2rem]" @submit.prevent="submit">
    <BillingErrorSummary :errors="summaryErrors" />
    <div>
      <h3 class="text-[1.6rem] font-[700] text-slate-900">
        {{ isEdit ? `Edit draft v${version.versionNumber}` : `New draft for ${addOnTypeMeta[type]?.label}` }}
      </h3>
      <p class="mt-[0.4rem] text-[1.3rem] text-slate-500">
        A draft changes nothing. Nobody is charged this price until you publish it, and then it applies to new
        purchases only.
      </p>
      <p v-if="!isEdit && baseVersion" class="mt-[0.4rem] text-[1.3rem] text-slate-500">
        Started from version {{ baseVersion.versionNumber }}. Change only what is different.
      </p>
    </div>

    <section class="space-y-[1rem]">
      <div class="flex items-center justify-between">
        <h4 class="font-[700] text-slate-900">Price of one unit</h4>
        <BaseButton size="sm" radius="8px" variant="outline" @click="addPrice">Add period</BaseButton>
      </div>
      <div v-for="(row, index) in form.prices" :key="index" class="grid grid-cols-[1fr_1fr_auto] items-end gap-[1rem]">
        <AppInput v-model="row.period" type="number" label="Period (x 30 days)" placeholder="3" />
        <AppInput v-model="row.amount" type="number" allow-decimal label="Price per unit" placeholder="4500" />
        <BaseButton size="sm" radius="8px" variant="outline" :disabled="form.prices.length === 1" @click="removePrice(index)">
          Remove
        </BaseButton>
      </div>
      <p v-if="store.fieldError('amountsByPeriodUnit')" class="text-[1.3rem] font-[600] text-[#B42318]">
        {{ store.fieldError("amountsByPeriodUnit") }}
      </p>
    </section>

    <section class="space-y-[1rem]">
      <div>
        <h4 class="font-[700] text-slate-900">Most units per plan</h4>
        <p class="text-[1.3rem] text-slate-500">Leave a plan blank and merchants on it cannot buy this add-on.</p>
      </div>
      <div class="grid grid-cols-1 gap-[1rem] sm:grid-cols-2">
        <AppInput
          v-for="row in planRows"
          :key="row.code"
          v-model="form.max[row.code]"
          type="number"
          :label="row.name"
          placeholder="None"
          :error="store.fieldError(`maxQuantityByPlanCode.${row.code}`)"
        />
      </div>
      <p v-if="store.fieldError('maxQuantityByPlanCode')" class="text-[1.3rem] font-[600] text-[#B42318]">
        {{ store.fieldError("maxQuantityByPlanCode") }}
      </p>
    </section>

    <!-- TODO: replace with a shared checkbox component if one is added; none exists in components/ today. -->
    <label class="flex items-center gap-[0.8rem] font-[600] text-slate-700">
      <input v-model="form.onSale" type="checkbox" class="h-[1.8rem] w-[1.8rem] accent-primary">
      On sale (untick to pause new purchases)
    </label>

    <AppInput v-model="form.changeNote" label="Change note" placeholder="What changed and why" :maxlength="500" :error="store.fieldError('changeNote')" />
    <BaseTextArea v-model="form.reason" label="Reason" :rows="3" :maxlength="500" placeholder="Why you are doing this, kept on the audit log" :error="store.fieldError('reason')" />

    <p v-if="store.actionError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.actionError }}</p>

    <div class="flex justify-end gap-[1rem]">
      <BaseButton radius="8px" variant="outline" :disabled="store.saving" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton type="submit" radius="8px" bold :loading="store.saving">{{ isEdit ? "Save draft" : "Create draft" }}</BaseButton>
    </div>
  </form>
</template>
