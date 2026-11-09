<script setup>
const props = defineProps({
  tenantId: {
    type: String,
    required: true,
  },
});

const billingOperationsStore = useAdminBillingOperationsStore();
const plansStore = useAdminBillingPlansStore();

function toIsoDateTime(value) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

const emptyManualPaymentForm = () => ({
  planCode: "",
  periodUnitCount: "1",
  currency: "NGN",
  reference: "",
  paymentDate: "",
  amountPaid: "",
  note: "",
});
const manualPaymentForm = ref(emptyManualPaymentForm());

const manualPaymentPlanOptions = computed(() => [
  { label: "Select plan...", value: "" },
  ...(plansStore.plans || [])
    .filter((plan) => plan.status === "ACTIVE" && plan.publicVisible && !plan.adminOnly)
    .map((plan) => ({ label: plan.name || plan.code, value: plan.code })),
]);

const canRecordManualPayment = computed(() => {
  const form = manualPaymentForm.value;
  return Boolean(form.planCode && Number(form.periodUnitCount) >= 1 && form.reference.trim() && form.note.trim());
});

async function recordManualPayment() {
  if (!props.tenantId || !canRecordManualPayment.value) return;
  const form = manualPaymentForm.value;
  const result = await billingOperationsStore.recordManualPayment(props.tenantId, {
    planCode: form.planCode,
    periodUnitCount: Number(form.periodUnitCount),
    currency: form.currency?.trim() || undefined,
    reference: form.reference.trim(),
    paymentDate: toIsoDateTime(form.paymentDate),
    amountPaid: form.amountPaid ? Number(form.amountPaid) : undefined,
    note: form.note.trim(),
  });
  if (result) manualPaymentForm.value = emptyManualPaymentForm();
}
</script>

<template>
<section class="rounded-[10px] bg-white p-[2.4rem] shadow-sm">
  <div class="flex items-center gap-[0.6rem]">
    <span class="material-symbols-outlined text-primary text-[2rem]">payments</span>
    <h2 class="text-[1.8rem] font-[800] text-[#000]">Record manual payment</h2>
  </div>
  <p class="mt-[0.4rem] max-w-[72rem] text-[1.35rem] leading-[2rem] text-[#616161]">
    Use this when the merchant already paid by transfer or cash and never raised an invoice. It creates the invoice, marks it paid, activates or extends the subscription and issues the receipt.
  </p>
  <form class="mt-[1.6rem] grid gap-[1.2rem] md:grid-cols-2 xl:grid-cols-3" @submit.prevent="recordManualPayment">
    <BaseSelectInput
      v-model="manualPaymentForm.planCode"
      :options="manualPaymentPlanOptions"
      label="Plan"
      name="planCode"
    />
    <AppInput
      v-model="manualPaymentForm.periodUnitCount"
      label="Billing units (30 days each)"
      name="periodUnitCount"
      type="number"
    />
    <AppInput v-model="manualPaymentForm.currency" label="Currency" name="currency" placeholder="NGN" />
    <AppInput
      v-model="manualPaymentForm.reference"
      label="Payment reference"
      name="reference"
      placeholder="BANK-TRANSFER-123"
    />
    <AppInput
      v-model="manualPaymentForm.paymentDate"
      label="Paid date"
      name="paymentDate"
      type="datetime-local"
    />
    <AppInput
      v-model="manualPaymentForm.amountPaid"
      label="Amount received (optional)"
      name="amountPaid"
      type="number"
      placeholder="Leave empty to charge the plan price"
    />
    <div class="md:col-span-2 xl:col-span-3">
      <BaseTextArea
        v-model="manualPaymentForm.note"
        label="Note"
        name="note"
        placeholder="Why this is recorded by an admin, e.g. transfer received, merchant could not use checkout"
        :rows="2"
        resize="none"
      />
    </div>
    <p class="text-[1.25rem] leading-[1.8rem] text-[#616161] md:col-span-2 xl:col-span-3">
      Amount received is the total paid, VAT included. It replaces the plan price and is audited. A custom amount also forfeits any pending offer price lock.
    </p>
    <div class="md:col-span-2 xl:col-span-3">
      <BaseButton
        type="submit"
        radius="8px"
        :loading="billingOperationsStore.recordingManualPayment"
        :disabled="!canRecordManualPayment"
      >
        Record payment and activate
      </BaseButton>
    </div>
  </form>
</section>
</template>
