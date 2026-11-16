<script setup>
import { computed } from "vue";
import { formatDateTime } from "~/utils/helpers.js";
import { addOnTypeMeta } from "~/utils/addOnCatalogue.js";

const props = defineProps({
  type: { type: String, required: true },
  versions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});

defineEmits(["manage"]);

const meta = computed(() => addOnTypeMeta[props.type] || { label: props.type, description: "", icon: "add_circle" });
// The version new purchases use right now, as flagged by the API.
const live = computed(() => props.versions.find((version) => version.latestForNewPurchases) || null);
const count = (status) => props.versions.filter((version) => version.status === status).length;
const merchants = computed(() => props.versions.reduce((sum, version) => sum + Number(version.merchantCount || 0), 0));
const units = computed(() => props.versions.reduce((sum, version) => sum + Number(version.unitsHeld || 0), 0));
</script>

<template>
  <div class="flex flex-col rounded-[10px] border border-slate-200 bg-white p-[2rem] shadow-sm">
    <div class="flex items-start justify-between gap-[1.2rem]">
      <div class="flex items-center gap-[1rem]">
        <span class="material-symbols-outlined text-primary text-[2.4rem]">{{ meta.icon }}</span>
        <div>
          <h2 class="text-[1.7rem] font-[700] text-slate-900">{{ meta.label }}</h2>
          <p class="text-[1.2rem] text-slate-500">{{ meta.description }}</p>
        </div>
      </div>
      <StatusBadge v-if="live && !live.onSale" tone="warning" label="Paused" />
    </div>

    <div class="mt-[1.6rem] flex-1">
      <template v-if="loading && !versions.length">
        <p class="italic text-slate-400">Loading...</p>
      </template>
      <template v-else-if="live">
        <p class="text-[1.2rem] text-slate-500">
          New purchases use version {{ live.versionNumber }}
          <span v-if="live.effectiveFrom">since {{ formatDateTime(live.effectiveFrom) }}</span>
        </p>
        <div class="mt-[0.8rem]"><DashboardAddOnVersionPrices :amounts="live.amountsByPeriodUnit" :currency="live.currency" /></div>
      </template>
      <p v-else class="italic text-slate-400">No version is on sale yet.</p>
    </div>

    <dl class="mt-[1.6rem] grid grid-cols-2 gap-[1.2rem] border-t border-slate-100 pt-[1.4rem]">
      <div>
        <dt class="text-[1.2rem] text-slate-500">Merchants holding</dt>
        <dd class="text-[1.6rem] font-[700] text-slate-900">{{ merchants.toLocaleString() }}</dd>
      </div>
      <div>
        <dt class="text-[1.2rem] text-slate-500">Units held</dt>
        <dd class="text-[1.6rem] font-[700] text-slate-900">{{ units.toLocaleString() }}</dd>
      </div>
    </dl>

    <div class="mt-[1.4rem] flex flex-wrap items-center justify-between gap-[1rem]">
      <p class="text-[1.2rem] text-slate-500">
        {{ versions.length }} version{{ versions.length === 1 ? "" : "s" }}
        <template v-if="count('DRAFT')"> · {{ count("DRAFT") }} draft</template>
        <template v-if="count('SCHEDULED')"> · {{ count("SCHEDULED") }} scheduled</template>
      </p>
      <BaseButton size="sm" radius="8px" variant="outline" @click="$emit('manage', type)">Manage versions</BaseButton>
    </div>
  </div>
</template>
