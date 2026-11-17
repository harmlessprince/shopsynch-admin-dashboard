<script setup>
import { capacityAddOnTypes } from "~/schemas/capacityAddOnAdmin.schema";
import { addOnTypeLabel } from "./addOnMeta.js";

// Grant (type, quantity, reason) or revoke (reason only). Both need a reason, which goes in the audit log.
const props = defineProps({
  mode: { type: String, required: true }, // "grant" | "revoke"
  addOn: { type: Object, default: null },
});
const emit = defineEmits(["close"]);

const store = useAdminMerchantAddOnsStore();

const type = ref("STAFF");
const quantity = ref(1);
const reason = ref("");

const typeOptions = capacityAddOnTypes.map((value) => ({ value, label: addOnTypeLabel(value) }));
const isGrant = computed(() => props.mode === "grant");

onMounted(() => store.clearFormErrors());

async function submit() {
  const ok = isGrant.value
    ? await store.grant({ type: type.value, quantity: quantity.value, reason: reason.value })
    : await store.revoke(props.addOn.id, { reason: reason.value });
  if (ok) emit("close");
}

function close() {
  if (!store.saving) emit("close");
}
</script>

<template>
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]" role="dialog" aria-modal="true">
    <form class="w-full max-w-[48rem] rounded-[12px] border border-slate-200 bg-white p-[2.4rem] shadow-xl" @submit.prevent="submit">
      <h3 class="text-[1.8rem] font-[700] text-slate-900">
        {{ isGrant ? "Grant a capacity add-on" : "Revoke this add-on?" }}
      </h3>
      <p v-if="isGrant" class="mt-[0.8rem] text-[1.4rem] leading-relaxed text-slate-600">
        A grant is free and has no end date. The plan maximum still applies.
      </p>
      <p v-else class="mt-[0.8rem] text-[1.4rem] leading-relaxed text-slate-600">
        {{ addOn.quantity }} extra {{ addOnTypeLabel(addOn.type).toLowerCase() }} capacity ends now. No refund is issued.
      </p>

      <div v-if="isGrant" class="mt-[1.6rem] grid grid-cols-2 gap-[1.2rem]">
        <BaseSelectInput v-model="type" label="Capacity" :options="typeOptions" :error="store.fieldErrors.type" />
        <AppInput v-model="quantity" type="number" label="Quantity" :error="store.fieldErrors.quantity" />
      </div>

      <div class="mt-[1.6rem]">
        <BaseTextArea
          v-model="reason"
          label="Reason (required)"
          placeholder="Why is this being done? This is saved in the audit log."
          :rows="3"
          :maxlength="500"
          :error="store.fieldErrors.reason"
        />
      </div>

      <p v-if="store.formError" class="mt-[1.2rem] rounded-[8px] bg-[#FFBFBF] p-[1.2rem] text-[1.3rem] font-[600] text-[#B42318]" role="alert">
        {{ store.formError }}
      </p>

      <div class="mt-[2.4rem] flex justify-end gap-[1.2rem]">
        <BaseButton radius="8px" variant="outline" :disabled="store.saving" @click="close">Cancel</BaseButton>
        <BaseButton radius="8px" bold type="submit" :variant="isGrant ? 'primary' : 'danger'" :loading="store.saving">
          {{ isGrant ? "Grant add-on" : "Revoke add-on" }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
