<script setup>
import { reactive, ref, computed } from "vue";
import { useAdminPlanVersionsStore } from "~/stores/adminPlanVersions.store.js";

const props = defineProps({
  planId: { type: String, required: true },
  planName: { type: String, default: "" },
  // The draft being edited, or null to create one.
  version: { type: Object, default: null },
  // The version new purchases use now; a new draft starts as a copy of it.
  base: { type: Object, default: null },
});

const emit = defineEmits(["saved", "cancel"]);
const store = useAdminPlanVersionsStore();
const isEdit = computed(() => Boolean(props.version));
const source = props.version || props.base;

const toText = (v) => (v === null || v === undefined ? "" : String(v));
const json = (v) => (v && Object.keys(v).length ? JSON.stringify(v, null, 2) : "");

const form = reactive({
  prices: (source?.prices || []).map((p) => ({
    periodUnitCount: toText(p.periodUnitCount),
    amount: toText(p.amount),
    baselineAmount: toText(p.baselineAmount),
    active: p.active !== false,
    publicVisible: p.publicVisible !== false,
    adminOnly: Boolean(p.adminOnly),
    sortOrder: p.sortOrder,
  })),
  features: (source?.limits?.featureEntitlements || []).join("\n"),
  usage: Object.entries(source?.limits?.usageLimits || {}).map(([key, value]) => ({ key, value: toText(value) })),
  accessRules: json(source?.limits?.featureAccessRules),
  apiPolicy: json(source?.limits?.apiUsagePolicy),
  changeNote: "",
  reason: "",
});
const editLimits = ref(isEdit.value || Boolean(source?.limits));
const localErrors = ref({});

const addPrice = () => form.prices.push({ periodUnitCount: "", amount: "", baselineAmount: "", active: true, publicVisible: true, adminOnly: false });
const removePrice = (index) => form.prices.splice(index, 1);
const addUsage = () => form.usage.push({ key: "", value: "" });
const removeUsage = (index) => form.usage.splice(index, 1);

const asValue = (text) => {
  const t = String(text).trim();
  if (t !== "" && !Number.isNaN(Number(t))) return Number(t);
  if (t === "true") return true;
  if (t === "false") return false;
  return t;
};

function parseJson(text, field) {
  if (!text.trim()) return undefined;
  try {
    const value = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch {
    // falls through to the error below
  }
  localErrors.value[field] = "Enter a valid JSON object.";
  return undefined;
}

async function submit() {
  store.clearErrors();
  localErrors.value = {};
  const prices = form.prices
    .filter((row) => String(row.periodUnitCount).trim() !== "" || String(row.amount).trim() !== "")
    .map((row) => ({ ...row }));
  let limits;
  if (editLimits.value) {
    limits = {
      featureEntitlements: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
      usageLimits: Object.fromEntries(form.usage.filter((u) => u.key.trim()).map((u) => [u.key.trim(), asValue(u.value)])),
      featureAccessRules: parseJson(form.accessRules, "featureAccessRules"),
      apiUsagePolicy: parseJson(form.apiPolicy, "apiUsagePolicy"),
    };
    if (Object.keys(localErrors.value).length) return;
  }
  const saved = await store.saveDraft(
    { planId: props.planId, prices: prices.length ? prices : undefined, limits, changeNote: form.changeNote, reason: form.reason },
    props.version?.id || null,
  );
  if (saved) emit("saved", saved);
}

const err = (name) => localErrors.value[name] || store.fieldError(name);
</script>

<template>
  <form class="space-y-[2rem]" @submit.prevent="submit">
    <div>
      <h3 class="text-[1.6rem] font-[700] text-slate-900">
        {{ isEdit ? `Edit draft v${version.versionNumber}` : `New draft for ${planName}` }}
      </h3>
      <p class="mt-[0.4rem] text-[1.3rem] text-slate-500">
        A draft changes nothing. Existing merchants keep their price unless you move them later.
        <template v-if="!isEdit && base">It starts as a copy of version {{ base.versionNumber }}, the one new purchases use.</template>
      </p>
    </div>

    <section class="space-y-[1rem]">
      <div class="flex items-center justify-between">
        <h4 class="font-[700] text-slate-900">Price per billing period</h4>
        <BaseButton size="sm" radius="8px" variant="outline" @click="addPrice">Add period</BaseButton>
      </div>
      <div v-for="(row, index) in form.prices" :key="index" class="space-y-[0.8rem] rounded-[8px] border border-slate-200 p-[1.2rem]">
        <div class="grid grid-cols-1 gap-[1rem] sm:grid-cols-3">
          <AppInput v-model="row.periodUnitCount" type="number" label="Period (x 30 days)" placeholder="3" :error="store.fieldError(`prices[${index}].periodUnitCount`)" />
          <AppInput v-model="row.amount" type="number" allow-decimal label="Price" placeholder="15000" :error="store.fieldError(`prices[${index}].amount`)" />
          <AppInput v-model="row.baselineAmount" type="number" allow-decimal label="List price (optional)" hint="Shown struck through" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-[1rem]">
          <div class="flex flex-wrap gap-[1.6rem] text-slate-700">
            <!-- TODO: replace with a shared checkbox component if one is added; none exists in components/ today. -->
            <label class="flex items-center gap-[0.6rem]"><input v-model="row.active" type="checkbox" class="h-[1.6rem] w-[1.6rem] accent-primary"> Active</label>
            <label class="flex items-center gap-[0.6rem]"><input v-model="row.publicVisible" type="checkbox" class="h-[1.6rem] w-[1.6rem] accent-primary"> Shown publicly</label>
            <label class="flex items-center gap-[0.6rem]"><input v-model="row.adminOnly" type="checkbox" class="h-[1.6rem] w-[1.6rem] accent-primary"> Admin only</label>
          </div>
          <BaseButton size="sm" radius="8px" variant="outline" @click="removePrice(index)">Remove</BaseButton>
        </div>
      </div>
      <p v-if="!form.prices.length" class="text-slate-500">No prices listed: the draft keeps the current prices.</p>
      <p v-if="err('prices')" class="text-[1.3rem] font-[600] text-[#B42318]">{{ err("prices") }}</p>
    </section>

    <section class="space-y-[1.2rem]">
      <div class="flex items-center justify-between">
        <h4 class="font-[700] text-slate-900">Features and limits</h4>
        <label class="flex items-center gap-[0.6rem] text-slate-700">
          <input v-model="editLimits" type="checkbox" class="h-[1.6rem] w-[1.6rem] accent-primary"> Change limits
        </label>
      </div>
      <p v-if="!editLimits" class="text-slate-500">Limits are left as they are{{ isEdit ? "" : ": copied from the current version" }}.</p>
      <template v-else>
        <BaseTextArea v-model="form.features" label="Features (one per line)" :rows="5" :error="err('limits.featureEntitlements')" />
        <div class="space-y-[0.8rem]">
          <div class="flex items-center justify-between">
            <span class="font-[600] text-slate-700">Usage limits</span>
            <BaseButton size="sm" radius="8px" variant="outline" @click="addUsage">Add limit</BaseButton>
          </div>
          <div v-for="(row, index) in form.usage" :key="index" class="grid grid-cols-[1fr_1fr_auto] items-end gap-[1rem]">
            <AppInput v-model="row.key" label="Limit name" />
            <AppInput v-model="row.value" label="Value" />
            <BaseButton size="sm" radius="8px" variant="outline" @click="removeUsage(index)">Remove</BaseButton>
          </div>
          <p v-if="err('limits.usageLimits')" class="text-[1.3rem] font-[600] text-[#B42318]">{{ err("limits.usageLimits") }}</p>
        </div>
        <BaseTextArea v-model="form.accessRules" label="Access levels (JSON, advanced)" :rows="4" :error="err('featureAccessRules') || err('limits.featureAccessRules')" />
        <BaseTextArea v-model="form.apiPolicy" label="API usage policy (JSON, advanced)" :rows="4" :error="err('apiUsagePolicy') || err('limits.apiUsagePolicy')" />
      </template>
    </section>

    <AppInput v-model="form.changeNote" label="Change note" placeholder="What changed and why" :maxlength="500" :error="err('changeNote')" />
    <BaseTextArea v-model="form.reason" label="Reason" :rows="3" :maxlength="500" placeholder="Why you are doing this, kept on the audit log" :error="err('reason')" />

    <p v-if="store.actionError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.actionError }}</p>

    <div class="flex justify-end gap-[1rem]">
      <BaseButton radius="8px" variant="outline" :disabled="store.saving" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton type="submit" radius="8px" bold :loading="store.saving">{{ isEdit ? "Save draft" : "Create draft" }}</BaseButton>
    </div>
  </form>
</template>
