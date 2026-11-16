<script setup>
import { computed } from "vue";
import { formatDateTime } from "~/utils/helpers.js";
import { versionStatusMeta, sortedPlanEntries } from "~/utils/addOnCatalogue.js";

const props = defineProps({
  version: { type: Object, required: true },
});

defineEmits(["edit", "publish", "retire", "policy"]);

const badge = computed(() => versionStatusMeta[props.version.status] || { label: props.version.status, tone: "neutral" });
const isDraft = computed(() => props.version.status === "DRAFT");
const canRetire = computed(() => props.version.status === "PUBLISHED" || props.version.status === "SCHEDULED");
const hasPolicy = computed(() => props.version.status === "PUBLISHED" || props.version.status === "RETIRED");
</script>

<template>
  <div class="space-y-[2rem]">
    <div class="flex flex-wrap items-center gap-[1rem]">
      <h3 class="text-[1.6rem] font-[700] text-slate-900">Version {{ version.versionNumber }}</h3>
      <StatusBadge v-bind="badge" />
      <StatusBadge v-if="version.latestForNewPurchases" tone="info" label="Used for new purchases" />
      <StatusBadge v-if="!version.onSale && version.status !== 'DRAFT'" tone="warning" label="Paused" />
    </div>

    <p v-if="!isDraft" class="rounded-[8px] bg-slate-50 p-[1.2rem] text-[1.3rem] text-slate-600">
      This version is locked. Only a draft can be edited; to change a price, create a new draft and publish it.
    </p>

    <dl class="grid grid-cols-1 gap-[1.4rem] sm:grid-cols-2">
      <div>
        <dt class="text-[1.2rem] text-slate-500">Starts</dt>
        <dd class="font-[600]">{{ version.effectiveFrom ? formatDateTime(version.effectiveFrom) : "Not published yet" }}</dd>
      </div>
      <div>
        <dt class="text-[1.2rem] text-slate-500">Change note</dt>
        <dd class="font-[600]">{{ version.changeNote || "None" }}</dd>
      </div>
    </dl>

    <section>
      <h4 class="mb-[0.6rem] font-[700] text-slate-900">Price of one unit</h4>
      <DashboardAddOnVersionPrices :amounts="version.amountsByPeriodUnit" :currency="version.currency" />
    </section>

    <section>
      <h4 class="mb-[0.6rem] font-[700] text-slate-900">Most units per plan</h4>
      <ul v-if="sortedPlanEntries(version.maxQuantityByPlanCode).length" class="space-y-[0.2rem]">
        <li v-for="[code, max] in sortedPlanEntries(version.maxQuantityByPlanCode)" :key="code" class="flex justify-between gap-[1.6rem]">
          <span class="text-slate-500">{{ code }}</span>
          <span class="font-[600] text-slate-900">{{ max }}</span>
        </li>
      </ul>
      <p v-else class="text-slate-400">No plan can buy this add-on.</p>
    </section>

    <section v-if="!isDraft">
      <h4 class="mb-[0.6rem] font-[700] text-slate-900">Merchants on this version</h4>
      <p class="text-slate-600">
        {{ version.merchantCount }} merchant{{ version.merchantCount === 1 ? "" : "s" }} holding
        {{ version.unitsHeld }} unit{{ version.unitsHeld === 1 ? "" : "s" }}. What they pay each period:
      </p>
      <div class="mt-[0.6rem]">
        <DashboardAddOnVersionPrices :amounts="version.recurringValueByPeriodUnit" :currency="version.currency" empty="Nothing is billed on this version" />
      </div>
    </section>

    <div class="flex flex-wrap justify-end gap-[1rem] border-t border-slate-100 pt-[1.6rem]">
      <BaseButton v-if="isDraft" radius="8px" variant="outline" @click="$emit('edit')">Edit draft</BaseButton>
      <BaseButton v-if="isDraft" radius="8px" bold @click="$emit('publish')">Publish or schedule</BaseButton>
      <BaseButton v-if="hasPolicy" radius="8px" variant="outline" @click="$emit('policy')">Renewal policy</BaseButton>
      <BaseButton v-if="canRetire" radius="8px" variant="danger" @click="$emit('retire')">Retire</BaseButton>
    </div>
  </div>
</template>
