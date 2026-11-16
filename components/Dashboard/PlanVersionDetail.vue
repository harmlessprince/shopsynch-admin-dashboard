<script setup>
import { computed } from "vue";
import { formatDate } from "~/utils/helpers.js";
import { versionStatusMeta } from "~/utils/addOnCatalogue.js";

const props = defineProps({
  version: { type: Object, required: true },
  adoption: { type: Object, default: null },
});

defineEmits(["edit", "publish", "retire", "policy", "move"]);

const badge = computed(() => versionStatusMeta[props.version.status] || { label: props.version.status, tone: "neutral" });
const isDraft = computed(() => props.version.status === "DRAFT");
const canRetire = computed(() => ["DRAFT", "PUBLISHED", "SCHEDULED"].includes(props.version.status));
const hasPolicy = computed(() => props.version.status === "PUBLISHED" || props.version.status === "RETIRED");
const canMove = computed(() => props.version.status === "PUBLISHED");
</script>

<template>
  <div class="space-y-[2rem]">
    <div class="flex flex-wrap items-center gap-[1rem]">
      <h3 class="text-[1.6rem] font-[700] text-slate-900">Version {{ version.versionNumber }}</h3>
      <StatusBadge v-bind="badge" />
      <StatusBadge v-if="version.latestForNewPurchases" tone="info" label="Used for new purchases" />
    </div>

    <p v-if="!isDraft" class="rounded-[8px] bg-slate-50 p-[1.2rem] text-[1.3rem] text-slate-600">
      This version is locked. Only a draft can be edited; to change a price or limit, create a new draft and publish it.
    </p>
    <p v-if="isDraft || version.status === 'SCHEDULED'" class="text-[1.3rem] text-slate-500">
      The number is provisional until the version is published.
    </p>

    <dl class="grid grid-cols-1 gap-[1.4rem] sm:grid-cols-2">
      <div>
        <dt class="text-[1.2rem] text-slate-500">{{ version.status === "SCHEDULED" ? "Starts" : "Effective from" }}</dt>
        <dd class="font-[600]">{{ version.effectiveFrom ? formatDate(version.effectiveFrom) : "Not published yet" }}</dd>
      </div>
      <div>
        <dt class="text-[1.2rem] text-slate-500">Change note</dt>
        <dd class="font-[600]">{{ version.changeNote || "None" }}</dd>
      </div>
      <div>
        <dt class="text-[1.2rem] text-slate-500">Created</dt>
        <dd class="font-[600]">{{ version.createdAt ? formatDate(version.createdAt) : "Unknown" }}<span v-if="version.createdBy" class="font-[400] text-slate-500"> by {{ version.createdBy }}</span></dd>
      </div>
      <div>
        <dt class="text-[1.2rem] text-slate-500">Merchants on this version</dt>
        <dd class="font-[600]">{{ version.merchantCount }}</dd>
      </div>
    </dl>

    <section v-if="adoption" class="rounded-[8px] border border-slate-200 bg-slate-50 p-[1.4rem]">
      <h4 class="font-[700] text-slate-900">Adoption</h4>
      <p class="mt-[0.4rem] text-slate-600">
        {{ adoption.remainingCount }} still on this version, {{ adoption.switchedCount }} moved to a newer one.
        Renewal policy: <span class="font-[600]">{{ adoption.renewalPolicy || "Continue" }}</span>
        <template v-if="adoption.sunsetAt">, sunset {{ formatDate(adoption.sunsetAt) }}<template v-if="adoption.sunsetTargetVersionNumber"> to version {{ adoption.sunsetTargetVersionNumber }}</template></template>.
      </p>
    </section>

    <section>
      <h4 class="mb-[0.6rem] font-[700] text-slate-900">Price per billing period</h4>
      <DashboardPlanVersionPrices :prices="version.prices" />
    </section>

    <section>
      <h4 class="mb-[0.8rem] font-[700] text-slate-900">What it includes</h4>
      <DashboardPlanVersionLimits :limits="version.limits" />
    </section>

    <div class="flex flex-wrap justify-end gap-[1rem] border-t border-slate-100 pt-[1.6rem]">
      <BaseButton v-if="isDraft" radius="8px" variant="outline" @click="$emit('edit')">Edit draft</BaseButton>
      <BaseButton v-if="isDraft" radius="8px" bold @click="$emit('publish')">Publish or schedule</BaseButton>
      <BaseButton v-if="canMove" radius="8px" variant="outline" @click="$emit('move')">Move merchants here</BaseButton>
      <BaseButton v-if="hasPolicy" radius="8px" variant="outline" @click="$emit('policy')">Renewal policy</BaseButton>
      <BaseButton v-if="canRetire" radius="8px" variant="danger" @click="$emit('retire')">{{ isDraft ? "Discard" : "Retire" }}</BaseButton>
    </div>
  </div>
</template>
