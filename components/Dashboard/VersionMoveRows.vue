<script setup>
import { formatDateTime } from "~/utils/helpers.js";
import { directionMeta, rowStatusMeta, formatPlanMoney } from "~/utils/planVersions.js";

defineProps({
  rows: { type: Array, default: () => [] },
  // Preview rows have no applied state yet, so the status badge is hidden there.
  showStatus: { type: Boolean, default: true },
});

const when = (value) => (value ? formatDateTime(value) : "");
</script>

<template>
  <p v-if="!rows.length" class="py-[2rem] text-center italic text-slate-400">No merchants match this move.</p>
  <ul v-else class="space-y-[1rem]">
    <li v-for="(row, index) in rows" :key="`${row.tenantId}-${row.subscriptionId || row.addOnId || index}`" class="rounded-[8px] border border-slate-200 p-[1.2rem]" :class="row.status === 'SKIPPED' ? 'bg-slate-50' : ''">
      <div class="flex flex-wrap items-center justify-between gap-[0.8rem]">
        <span class="font-[700] text-slate-900">{{ row.subjectLabel || row.tenantId }}</span>
        <div class="flex items-center gap-[0.6rem]">
          <StatusBadge v-if="row.direction && row.status !== 'SKIPPED'" v-bind="directionMeta[row.direction] || { label: row.direction }" />
          <StatusBadge v-if="showStatus || row.status === 'SKIPPED'" v-bind="rowStatusMeta[row.status] || { label: row.status }" />
        </div>
      </div>
      <div v-if="row.tenantId" class="mt-[0.4rem] text-[1.2rem] text-slate-500">
        Merchant <TenantHoverCard :tenant-id="row.tenantId" />
      </div>
      <p v-if="row.status === 'SKIPPED'" class="mt-[0.6rem] text-[1.3rem] font-[600] text-[#9A4A00]">
        Skipped: {{ row.skipReason || "no reason given" }}
      </p>
      <p v-else class="mt-[0.6rem] text-slate-700">
        {{ formatPlanMoney(row.currentAmount, row.currency) }} now, {{ formatPlanMoney(row.newAmount, row.currency) }} after the move
      </p>
      <dl v-if="row.status !== 'SKIPPED' && (row.noticeEndsAt || row.firstRenewalAt || row.applyAt)" class="mt-[0.8rem] grid grid-cols-1 gap-[0.6rem] text-[1.2rem] sm:grid-cols-3">
        <div v-if="row.noticeEndsAt"><dt class="text-slate-500">Notice ends</dt><dd class="font-[600]">{{ when(row.noticeEndsAt) }}</dd></div>
        <div v-if="row.firstRenewalAt"><dt class="text-slate-500">First renewal</dt><dd class="font-[600]">{{ when(row.firstRenewalAt) }}</dd></div>
        <div v-if="row.applyAt"><dt class="text-slate-500">Applies on</dt><dd class="font-[600]">{{ when(row.applyAt) }}</dd></div>
      </dl>
      <p v-if="row.noticeRequired && row.noticeSentAt" class="mt-[0.4rem] text-[1.2rem] text-slate-500">Notice sent {{ when(row.noticeSentAt) }}</p>
    </li>
  </ul>
</template>
