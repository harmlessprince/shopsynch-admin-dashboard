<script setup>
import { formatDate } from "~/utils/helpers.js";
import { addOnTypeLabel, addOnStatusMeta, originLabel, money, lockedRateText } from "./addOnMeta.js";

// Status first; everything else on demand.
const props = defineProps({
  addOn: { type: Object, required: true },
});
defineEmits(["revoke"]);

const open = ref(false);
const status = computed(() => addOnStatusMeta[props.addOn.status] || { label: props.addOn.status, badge: "bg-gray-100 text-gray-600" });
const revocable = computed(() => ["ACTIVE", "PENDING_PAYMENT", "SCHEDULED_FOR_REMOVAL"].includes(props.addOn.status));
const scheduled = computed(() => {
  const s = props.addOn.scheduledChange;
  if (!s) return "";
  return s.kind === "REMOVAL"
    ? `Removal on ${formatDate(s.effectiveAt)}`
    : `Reduction to ${s.quantity} on ${formatDate(s.effectiveAt)}`;
});
</script>

<template>
  <li class="rounded-[10px] border border-slate-200">
    <div class="flex flex-wrap items-center gap-[1.2rem] px-[1.6rem] py-[1.2rem]">
      <div class="min-w-[14rem] flex-1">
        <span class="text-[1.4rem] font-[700] text-slate-900">{{ addOn.quantity }} x {{ addOnTypeLabel(addOn.type) }}</span>
        <span class="ml-[0.8rem] text-[1.2rem] text-slate-500">{{ originLabel(addOn.origin) }}</span>
      </div>
      <span :class="status.badge" class="rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]">{{ status.label }}</span>
      <span v-if="scheduled" class="text-[1.2rem] font-[600] text-[#9A4A00]">{{ scheduled }}</span>
      <button type="button" class="cursor-pointer text-[1.2rem] font-[600] text-primary hover:underline" @click="open = !open">
        {{ open ? "Hide details" : "Details" }}
      </button>
      <BaseButton v-if="revocable" size="sm" radius="8px" variant="outline" @click="$emit('revoke', addOn)">Revoke</BaseButton>
    </div>
    <dl v-if="open" class="grid gap-x-[2rem] gap-y-[0.8rem] border-t border-slate-100 px-[1.6rem] py-[1.2rem] text-[1.3rem] sm:grid-cols-2">
      <div>
        <dt class="text-slate-500">Locked rate</dt>
        <dd>{{ lockedRateText(addOn.lockedAmountsByPeriodUnit, addOn.currency) }}, version {{ addOn.versionNumber ?? "n/a" }}<template v-if="addOn.versionStatus"> ({{ addOn.versionStatus.toLowerCase() }})</template></dd>
      </div>
      <div><dt class="text-slate-500">Started</dt><dd>{{ formatDate(addOn.startDate) }}</dd></div>
      <div><dt class="text-slate-500">Ends</dt><dd>{{ addOn.endDate ? formatDate(addOn.endDate) : "No end date" }}</dd></div>
      <div v-if="addOn.cancelledAt"><dt class="text-slate-500">Cancelled</dt><dd>{{ formatDate(addOn.cancelledAt) }}</dd></div>
      <div>
        <dt class="text-slate-500">Payment</dt>
        <dd v-if="addOn.payment">
          {{ money(addOn.payment.amountPaid, addOn.payment.currency) }} paid {{ formatDate(addOn.payment.paidAt) }}
          <span class="block text-[1.2rem] text-slate-500">Ref {{ addOn.payment.providerReference }}<template v-if="addOn.payment.refundId">, refunded</template></span>
        </dd>
        <dd v-else>No payment</dd>
      </div>
      <div v-if="addOn.origin === 'GRANT'">
        <dt class="text-slate-500">Grant</dt>
        <dd>By {{ addOn.grantedBy || "unknown" }}: {{ addOn.grantReason || "no reason recorded" }}</dd>
      </div>
    </dl>
  </li>
</template>
