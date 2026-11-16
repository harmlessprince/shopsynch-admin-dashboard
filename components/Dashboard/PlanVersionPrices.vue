<script setup>
import { formatMoney, unitsLabel } from "~/utils/planVersions.js";

defineProps({
  prices: { type: Array, default: () => [] },
});
</script>

<template>
  <ul v-if="prices.length" class="space-y-[0.2rem]">
    <li v-for="price in prices" :key="price.periodUnitCount" class="flex items-center justify-between gap-[1.6rem]">
      <span class="text-slate-500">
        {{ unitsLabel(price.periodUnitCount) }}
        <span v-if="!price.active" class="ml-[0.4rem] text-[1.1rem] text-slate-400">(inactive)</span>
        <span v-else-if="price.adminOnly" class="ml-[0.4rem] text-[1.1rem] text-slate-400">(admin only)</span>
      </span>
      <span class="font-[600] text-slate-900">
        <span v-if="price.baselineAmount && price.baselineAmount !== price.amount" class="mr-[0.6rem] font-[400] text-slate-400 line-through">{{ formatMoney(price.baselineAmount, price.currency) }}</span>
        {{ formatMoney(price.amount, price.currency) }}
      </span>
    </li>
  </ul>
  <span v-else class="text-slate-400">No prices set</span>
</template>
