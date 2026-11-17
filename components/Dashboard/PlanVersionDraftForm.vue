<script setup>
import { reactive, ref, computed } from "vue";
import { useAdminPlanVersionsStore } from "~/stores/adminPlanVersions.store.js";
import { errorsUnder, unplacedErrors, focusFirstError } from "~/utils/billingAdminWrite.js";

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
    // A period already on the version cannot be deleted: leaving it out keeps its live setting. Untick Active to switch it off.
    existing: true,
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
const formEl = ref(null);

const LIMIT_HINT = 'Remove those keys from the JSON, or untick "Change limits" to keep the current limits as they are.';
const withLimitPrefix = (name) => [name, `limits.${name}`];
const limitNames = ["featureEntitlements", "usageLimits", "featureAccessRules", "apiUsagePolicy"].flatMap(withLimitPrefix);
const visibleNames = computed(() => ["prices", "changeNote", "reason", ...(editLimits.value ? limitNames : [])]);
const accessRuleErrors = computed(() => errorsUnder(store.fieldErrors, withLimitPrefix("featureAccessRules")));
const usageErrors = computed(() => errorsUnder(store.fieldErrors, withLimitPrefix("usageLimits")));
const apiPolicyErrors = computed(() => errorsUnder(store.fieldErrors, withLimitPrefix("apiUsagePolicy")));
// Refusals no visible field shows (including limit keys while "Change limits" is off).
const summaryErrors = computed(() => unplacedErrors(store.fieldErrors, visibleNames.value));
const summaryHint = computed(() => (!editLimits.value && summaryErrors.value.some((e) => limitNames.some((n) => e.key.startsWith(`${n}.`) || e.key === n)) ? LIMIT_HINT : ""));

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
    .map(({ existing, ...row }) => row);
  let limits;
  if (editLimits.value) {
    limits = {
      featureEntitlements: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
      usageLimits: Object.fromEntries(form.usage.filter((u) => u.key.trim()).map((u) => [u.key.trim(), asValue(u.value)])),
      featureAccessRules: parseJson(form.accessRules, "featureAccessRules"),
      apiUsagePolicy: parseJson(form.apiPolicy, "apiUsagePolicy"),
    };
    if (Object.keys(localErrors.value).length) {
      focusFirstError(formEl.value);
      return;
    }
  }
  const saved = await store.saveDraft(
    { planId: props.planId, prices: prices.length ? prices : undefined, limits, changeNote: form.changeNote, reason: form.reason },
    props.version?.id || null,
  );
  if (saved) emit("saved", saved);
  else focusFirstError(formEl.value);
}

// Exact-name error for a field; nested keys are listed separately under the field.
const err = (name) => localErrors.value[name] || store.fieldErrors[name] || "";
</script>

<template>
  <form ref="formEl" class="space-y-[2rem]" @submit.prevent="submit">
    <BillingErrorSummary :errors="summaryErrors" :hint="summaryHint" />
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
          <BaseButton v-if="!row.existing" size="sm" radius="8px" variant="outline" @click="removePrice(index)">Remove</BaseButton>
          <span v-else class="text-[1.2rem] text-slate-500">To switch this period off, untick Active.</span>
        </div>
      </div>
      <p v-if="!form.prices.length" class="text-slate-500">No prices listed: the draft keeps the current prices.</p>
      <p v-if="store.fieldError('prices')" class="text-[1.3rem] font-[600] text-[#B42318]">{{ store.fieldError("prices") }}</p>
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
        <BaseTextArea v-model="form.features" label="Features (one per line)" :rows="5" :error="err('featureEntitlements') || err('limits.featureEntitlements')" />
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
          <p v-if="err('usageLimits') || err('limits.usageLimits')" class="text-[1.3rem] font-[600] text-[#B42318]">{{ err("usageLimits") || err("limits.usageLimits") }}</p>
          <BillingErrorSummary :errors="usageErrors.filter((e) => e.key !== 'usageLimits' && e.key !== 'limits.usageLimits')" title="These usage limits were refused" :hint="LIMIT_HINT" />
        </div>
        <BaseTextArea v-model="form.accessRules" label="Access levels (JSON, advanced)" :rows="4" :error="err('featureAccessRules') || err('limits.featureAccessRules')" />
        <BillingErrorSummary :errors="accessRuleErrors.filter((e) => e.key !== 'featureAccessRules' && e.key !== 'limits.featureAccessRules')" title="These access levels were refused" :hint="LIMIT_HINT" />
        <BaseTextArea v-model="form.apiPolicy" label="API usage policy (JSON, advanced)" :rows="4" :error="err('apiUsagePolicy') || err('limits.apiUsagePolicy')" />
        <BillingErrorSummary :errors="apiPolicyErrors.filter((e) => e.key !== 'apiUsagePolicy' && e.key !== 'limits.apiUsagePolicy')" title="These API policy entries were refused" :hint="LIMIT_HINT" />
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
