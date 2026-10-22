<script setup>
import { computed, reactive, watch } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  // The offer being edited, or null to create one.
  offer: { type: Object, default: null },
  plans: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["close", "submit"]);

const isEdit = computed(() => Boolean(props.offer));

const statusOptions = [
  { label: "Draft (not open yet)", value: "DRAFT" },
  { label: "Active (open now)", value: "ACTIVE" },
];

const form = reactive({
  code: "",
  name: "",
  description: "",
  status: "DRAFT",
  startsAt: "",
  endsAt: "",
  publicVisible: false,
  eligiblePlanCodes: [],
  trialDays: "",
  maxRedemptions: "",
  priceOverrides: [],
  perks: [],
});

const dateOnly = (iso) => (iso ? String(iso).slice(0, 10) : "");

function fill(offer) {
  form.code = offer?.code ?? "";
  form.name = offer?.name ?? "";
  form.description = offer?.description ?? "";
  form.status = "DRAFT";
  form.startsAt = dateOnly(offer?.startsAt);
  form.endsAt = dateOnly(offer?.endsAt);
  form.publicVisible = offer?.publicVisible ?? false;
  form.eligiblePlanCodes = [...(offer?.eligiblePlanCodes ?? [])];
  form.trialDays = offer?.trialDays ? String(offer.trialDays) : "";
  form.maxRedemptions = offer?.maxRedemptions ? String(offer.maxRedemptions) : "";
  form.priceOverrides = (offer?.priceOverrides ?? []).map((override) => ({
    planCode: override.planCode,
    periodUnitCount: String(override.periodUnitCount),
    amount: String(override.amount),
    lockedForLife: override.lockedForLife,
  }));
  form.perks = (offer?.perks ?? []).map((perk) => ({
    perkCode: perk.perkCode,
    quantity: perk.quantity == null ? "" : String(perk.quantity),
    description: perk.description ?? "",
  }));
}

watch(() => props.open, (isOpen) => {
  if (isOpen) fill(props.offer);
});

const planChoices = computed(() => {
  const known = props.plans.map((plan) => ({ code: plan.code, name: plan.name }));
  // Keep an eligible plan that is no longer listed so editing never silently drops it.
  for (const code of form.eligiblePlanCodes) {
    if (!known.some((plan) => plan.code === code)) known.push({ code, name: code });
  }
  return known;
});

const overridePlanOptions = computed(() => [
  { label: "Choose a plan", value: "" },
  ...form.eligiblePlanCodes.map((code) => ({ label: code, value: code })),
]);

// The backend names errors by field (for example "priceOverrides[0].amount"); show the first per field.
function fieldError(name) {
  const error = props.errors?.[name];
  return Array.isArray(error) ? error.join(" ") : error || "";
}

const otherErrors = computed(() => {
  const known = ["code", "name", "description", "startsAt", "endsAt", "eligiblePlanCodes", "trialDays", "maxRedemptions"];
  return Object.entries(props.errors || {})
    .filter(([name]) => !known.includes(name))
    .map(([name, message]) => `${name}: ${Array.isArray(message) ? message.join(" ") : message}`);
});

function togglePlan(code) {
  form.eligiblePlanCodes = form.eligiblePlanCodes.includes(code)
    ? form.eligiblePlanCodes.filter((existing) => existing !== code)
    : [...form.eligiblePlanCodes, code];
}

const addOverride = () => form.priceOverrides.push({ planCode: "", periodUnitCount: "3", amount: "", lockedForLife: false });
const removeOverride = (index) => form.priceOverrides.splice(index, 1);
const addPerk = () => form.perks.push({ perkCode: "", quantity: "", description: "" });
const removePerk = (index) => form.perks.splice(index, 1);

const toNumber = (value) => (String(value ?? "").trim() === "" ? null : Number(value));
const toInstant = (date) => (date ? `${date}T00:00:00Z` : null);

function submit() {
  const payload = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    startsAt: toInstant(form.startsAt),
    endsAt: toInstant(form.endsAt),
    publicVisible: form.publicVisible,
    eligiblePlanCodes: form.eligiblePlanCodes,
    trialDays: toNumber(form.trialDays),
    maxRedemptions: toNumber(form.maxRedemptions),
    priceOverrides: form.priceOverrides.map((override) => ({
      planCode: override.planCode,
      periodUnitCount: toNumber(override.periodUnitCount),
      amount: toNumber(override.amount),
      lockedForLife: override.lockedForLife,
    })),
    perks: form.perks.map((perk) => ({
      perkCode: perk.perkCode.trim(),
      quantity: toNumber(perk.quantity),
      description: perk.description.trim() || null,
    })),
  };
  // The code and status are only read on create.
  if (!isEdit.value) {
    payload.code = form.code.trim();
    payload.status = form.status;
  }
  emit("submit", payload);
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
    role="dialog"
    aria-modal="true"
  >
    <form
      class="max-h-[92vh] w-full max-w-[72rem] overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-[2.4rem] shadow-xl"
      @submit.prevent="submit"
    >
      <h3 class="text-[1.8rem] font-[700] text-slate-900">{{ isEdit ? `Edit ${offer.name}` : "New pricing offer" }}</h3>
      <p class="mt-[0.4rem] text-[1.3rem] text-slate-600">
        <template v-if="isEdit">
          Saving replaces the offer's configuration. The code, status and redemption count do not change, the cap
          cannot drop below the redemptions already made, and prices already locked for stores are unaffected.
        </template>
        <template v-else>An offer starts as a draft unless you make it active. Stores can only redeem an active offer.</template>
      </p>

      <div class="mt-[2rem] grid gap-[1.6rem] sm:grid-cols-2">
        <AppInput v-model="form.code" label="Offer code" placeholder="founding" :readonly="isEdit" :error="fieldError('code')" />
        <AppInput v-model="form.name" label="Name" placeholder="Founding Merchant" :error="fieldError('name')" />
        <div class="sm:col-span-2">
          <BaseTextArea v-model="form.description" label="Description" :rows="2" :error="fieldError('description')" />
        </div>
        <BaseSelectInput v-if="!isEdit" v-model="form.status" :options="statusOptions" label="Start as" />
        <div class="flex items-end pb-[1rem]">
          <!-- TODO: replace with a shared checkbox component if one is added; none exists in components/ today. -->
          <label class="flex items-center gap-[0.8rem] font-[600] text-slate-700">
            <input v-model="form.publicVisible" type="checkbox" class="h-[1.8rem] w-[1.8rem] accent-primary">
            Show on the public pricing page
          </label>
        </div>
        <AppInput v-model="form.startsAt" type="date" label="Starts (optional)" :error="fieldError('startsAt')" />
        <AppInput v-model="form.endsAt" type="date" label="Ends (optional)" :error="fieldError('endsAt')" />
        <AppInput
          v-model="form.trialDays"
          type="number"
          label="Trial days (optional)"
          placeholder="e.g. 30"
          hint="Leave empty to use the plan's trial."
          :error="fieldError('trialDays')"
        />
        <AppInput
          v-model="form.maxRedemptions"
          type="number"
          label="Redemption cap (optional)"
          placeholder="e.g. 50"
          hint="Leave empty for unlimited."
          :error="fieldError('maxRedemptions')"
        />
      </div>

      <fieldset class="mt-[2rem]">
        <legend class="text-[1.4rem] font-[700] text-slate-900">Eligible plans</legend>
        <div class="mt-[0.8rem] flex flex-wrap gap-[1rem]">
          <label
            v-for="plan in planChoices"
            :key="plan.code"
            class="flex items-center gap-[0.6rem] rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.6rem]"
          >
            <input
              type="checkbox"
              class="h-[1.6rem] w-[1.6rem] accent-primary"
              :checked="form.eligiblePlanCodes.includes(plan.code)"
              @change="togglePlan(plan.code)"
            >
            {{ plan.name }} <span class="text-[1.2rem] text-slate-500">({{ plan.code }})</span>
          </label>
        </div>
        <p v-if="fieldError('eligiblePlanCodes')" class="mt-[0.6rem] text-[1.2rem] font-[600] text-rose-600">
          {{ fieldError("eligiblePlanCodes") }}
        </p>
      </fieldset>

      <div class="mt-[2rem]">
        <div class="flex items-center justify-between">
          <h4 class="text-[1.4rem] font-[700] text-slate-900">Price overrides</h4>
          <BaseButton size="sm" radius="8px" variant="outline" @click="addOverride">Add override</BaseButton>
        </div>
        <p class="text-[1.2rem] text-slate-500">
          A period without an override charges list price and is never locked. A locked price is frozen for as long
          as the subscription stays continuous.
        </p>
        <div
          v-for="(override, index) in form.priceOverrides"
          :key="index"
          class="mt-[1rem] grid items-end gap-[1rem] rounded-[8px] border border-slate-200 p-[1.2rem] sm:grid-cols-[1.4fr_1fr_1fr_auto_auto]"
        >
          <BaseSelectInput v-model="override.planCode" :options="overridePlanOptions" label="Plan" :error="fieldError(`priceOverrides[${index}].planCode`)" />
          <AppInput v-model="override.periodUnitCount" type="number" label="x 30 days" :error="fieldError(`priceOverrides[${index}].periodUnitCount`)" />
          <AppInput v-model="override.amount" type="number" label="Amount (NGN)" :error="fieldError(`priceOverrides[${index}].amount`)" />
          <label class="flex items-center gap-[0.6rem] pb-[1rem] font-[600] text-slate-700">
            <input v-model="override.lockedForLife" type="checkbox" class="h-[1.6rem] w-[1.6rem] accent-primary">
            Locked
          </label>
          <BaseButton size="sm" radius="8px" variant="outline" @click="removeOverride(index)">Remove</BaseButton>
        </div>
      </div>

      <div class="mt-[2rem]">
        <div class="flex items-center justify-between">
          <h4 class="text-[1.4rem] font-[700] text-slate-900">Perks</h4>
          <BaseButton size="sm" radius="8px" variant="outline" @click="addPerk">Add perk</BaseButton>
        </div>
        <p class="text-[1.2rem] text-slate-500">
          Billing only records a perk. The module that owns it grants it when the offer is redeemed.
        </p>
        <div
          v-for="(perk, index) in form.perks"
          :key="index"
          class="mt-[1rem] grid items-end gap-[1rem] rounded-[8px] border border-slate-200 p-[1.2rem] sm:grid-cols-[1.4fr_0.6fr_2fr_auto]"
        >
          <AppInput v-model="perk.perkCode" label="Perk code" placeholder="WHATSAPP_UTILITY_CREDITS" :error="fieldError(`perks[${index}].perkCode`)" />
          <AppInput v-model="perk.quantity" type="number" label="Quantity" :error="fieldError(`perks[${index}].quantity`)" />
          <AppInput v-model="perk.description" label="Description" />
          <BaseButton size="sm" radius="8px" variant="outline" @click="removePerk(index)">Remove</BaseButton>
        </div>
      </div>

      <ul v-if="otherErrors.length" class="mt-[1.6rem] space-y-[0.4rem] rounded-[8px] bg-[#FFBFBF] p-[1.2rem] text-[1.3rem] font-[600] text-[#B42318]">
        <li v-for="message in otherErrors" :key="message">{{ message }}</li>
      </ul>

      <div class="mt-[2.4rem] flex justify-end gap-[1.2rem]">
        <BaseButton radius="8px" variant="outline" :disabled="saving" @click="emit('close')">Cancel</BaseButton>
        <BaseButton type="submit" radius="8px" bold :loading="saving">
          {{ isEdit ? "Save changes" : "Create offer" }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
