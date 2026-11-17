<script setup>
import { addOnTypeLabel, addOnStatusMeta, originLabel } from "./addOnMeta.js";

// One card per capacity: the backend `summary` and each contribution `note` are shown as given.
defineProps({
  explanation: { type: Object, required: true },
});

const open = ref({});
const toggle = (key) => (open.value[key] = !open.value[key]);
</script>

<template>
  <div>
    <p v-if="explanation.enforcementApplies === false" class="mb-[1.2rem] rounded-[8px] bg-slate-100 p-[1.2rem] text-[1.3rem] text-slate-600">
      Limits are not enforced for this merchant right now. Figures below are for information.
    </p>
    <div class="grid gap-[1.2rem] md:grid-cols-3">
      <div v-for="limit in explanation.limits" :key="limit.type" class="rounded-[10px] border border-slate-200 p-[1.6rem]">
        <div class="flex items-baseline justify-between">
          <h3 class="text-[1.4rem] font-[700] text-slate-900">{{ addOnTypeLabel(limit.type) }}</h3>
          <span class="text-[1.2rem] text-slate-500">
            {{ limit.usage }} used of {{ limit.uncapped ? "unlimited" : limit.effectiveLimit }}
          </span>
        </div>
        <p class="mt-[0.8rem] text-[1.3rem] leading-relaxed text-slate-700">{{ limit.summary }}</p>
        <button
          v-if="limit.contributions?.length"
          type="button"
          class="mt-[1rem] cursor-pointer text-[1.2rem] font-[600] text-primary hover:underline"
          @click="toggle(limit.type)"
        >
          {{ open[limit.type] ? "Hide" : "Show" }} breakdown ({{ limit.contributions.length }})
        </button>
        <div v-if="open[limit.type]" class="mt-[1rem] space-y-[0.8rem] border-t border-slate-100 pt-[1rem]">
          <p class="text-[1.2rem] text-slate-500">
            Plan {{ limit.uncapped ? "unlimited" : limit.planLimit }} + add-ons {{ limit.addOnBonus }}
            <template v-if="limit.lapsedQuantity"> ({{ limit.lapsedQuantity }} lapsed)</template>
          </p>
          <div v-for="c in limit.contributions" :key="c.addOnId" class="text-[1.2rem]">
            <div class="flex flex-wrap items-center gap-[0.6rem]">
              <strong>{{ c.quantity }}</strong>
              <span class="text-slate-600">{{ originLabel(c.origin) }}, v{{ c.versionNumber }}</span>
              <span :class="addOnStatusMeta[c.status]?.badge" class="rounded-full px-[0.8rem] py-[0.1rem] font-[600]">
                {{ addOnStatusMeta[c.status]?.label || c.status }}
              </span>
              <span v-if="!c.counted" class="font-[600] text-[#9A4A00]">Not counted</span>
            </div>
            <p class="text-slate-500">{{ c.note }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
