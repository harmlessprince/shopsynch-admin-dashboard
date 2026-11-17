<script setup>
import { formatAddOnMoney, periodLabel, sortedPeriodEntries } from "~/utils/addOnCatalogue.js";

defineProps({
  amounts: { type: Object, default: () => ({}) },
  currency: { type: String, default: "NGN" },
  // Shown when the map is empty.
  empty: { type: String, default: "No prices set" },
});
</script>

<template>
  <ul v-if="sortedPeriodEntries(amounts).length" class="space-y-[0.2rem]">
    <li v-for="[period, amount] in sortedPeriodEntries(amounts)" :key="period" class="flex justify-between gap-[1.6rem]">
      <span class="text-slate-500">{{ periodLabel(period) }}</span>
      <span class="font-[600] text-slate-900">{{ formatAddOnMoney(amount, currency) }}</span>
    </li>
  </ul>
  <span v-else class="text-slate-400">{{ empty }}</span>
</template>
