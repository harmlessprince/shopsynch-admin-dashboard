<script setup>
import { computed } from 'vue'
import { formatToMoney } from '~/utils/helpers.js'

const props = defineProps({
  profit: {
    type: [Number, String],
    default: null,
  },
  costingMethod: {
    type: String,
    default: 'WEIGHTED_AVERAGE',
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md' | 'lg'
  },
  showExplanation: {
    type: Boolean,
    default: true,
  },
})

const costingMethod = computed(() => {
  return props.costingMethod || 'WEIGHTED_AVERAGE'
})

const tooltipText = computed(() => {
  if (costingMethod.value === 'FIFO') {
    return "Current profit based on the oldest open inventory batch (FIFO lot)."
  }
  return "Current profit at today's stock-weighted average cost across all branches."
})

const numericProfit = computed(() => {
  if (props.profit === null || props.profit === undefined || props.profit === '') return null
  const num = Number(props.profit)
  return Number.isFinite(num) ? num : null
})

const isPositive = computed(() => (numericProfit.value ?? 0) > 0)
const isNegative = computed(() => (numericProfit.value ?? 0) < 0)
</script>

<template>
  <div v-if="numericProfit !== null" class="inline-flex items-center gap-1.5" :title="showExplanation ? tooltipText : undefined">
    <span
      class="inline-flex items-center gap-1 rounded-full font-bold tabular-nums transition-colors"
      :class="[
        size === 'sm' ? 'px-2 py-0.5 text-[1.1rem]' : 'px-3 py-1 text-xs',
        isPositive ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
        isNegative ? 'bg-rose-100 text-rose-900 border border-rose-300' :
        'bg-slate-100 text-slate-700 border border-slate-300'
      ]"
    >
      <span class="material-symbols-outlined" :class="size === 'sm' ? 'text-[1.2rem]' : 'text-[1.4rem]'">
        {{ isPositive ? 'trending_up' : isNegative ? 'trending_down' : 'remove' }}
      </span>
      <span>{{ isPositive ? '+' : '' }}{{ formatToMoney(numericProfit) }} profit</span>
    </span>

    <!-- Help icon indicator with tooltip -->
    <span
      v-if="showExplanation"
      class="material-symbols-outlined text-slate-400 hover:text-primary cursor-help text-[1.6rem] shrink-0"
      :title="tooltipText"
      aria-hidden="true"
    >
      info
    </span>
  </div>
  <span v-else class="text-slate-400 font-normal text-xs">—</span>
</template>
