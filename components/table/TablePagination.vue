<template>
  <div
    class="flex flex-wrap items-center justify-between gap-[16px] border-t border-hairline bg-surface px-[24px] py-[12px] text-[14px] text-ink-muted"
  >
    <div class="flex flex-wrap items-center gap-[16px]">
      <!-- Cursor mode: no row count, just the page -->
      <p v-if="type === 'cursor'">Page <span class="font-medium tabular-nums text-ink">{{ currentPage }}</span></p>
      <p v-else-if="total > 0">
        Showing
        <span class="font-medium tabular-nums text-ink">{{ paginationProps.from }}–{{ paginationProps.to }}</span>
        of
        <span class="font-medium tabular-nums text-ink">{{ total }}</span>
      </p>
      <div class="relative">
        <select
          :value="type === 'cursor' ? currentLimit : selectedLimit"
          aria-label="Rows per page"
          class="h-[32px] cursor-pointer appearance-none rounded-input border border-hairline bg-surface pl-[10px] pr-[28px] text-[14px] text-ink"
          @change="onLimitChange($event)"
        >
          <option v-for="opt in LIMIT_OPTIONS" :key="opt" :value="opt">{{ opt }} / page</option>
        </select>
        <span
          class="material-symbols-outlined pointer-events-none absolute right-[6px] top-1/2 -translate-y-1/2 text-[18px] text-ink-muted"
          aria-hidden="true"
        >expand_more</span>
      </div>
    </div>

    <!-- Cursor pagination -->
    <div v-if="type === 'cursor'" class="flex items-center gap-[8px]">
      <BaseButton variant="outline" size="sm" :disabled="!hasPrev" aria-label="Go to previous page" @click="$emit('prev')">
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span>
        Previous
      </BaseButton>
      <BaseButton variant="outline" size="sm" :disabled="!hasNext" aria-label="Go to next page" @click="$emit('next')">
        Next
        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
      </BaseButton>
    </div>

    <!-- Offset pagination -->
    <div v-else-if="totalPages > 1" class="flex items-center gap-[4px]">
      <button
        type="button"
        class="ds-page-arrow"
        :disabled="!hasPreviousPage"
        aria-label="Go to previous page"
        @click="$emit('setPage', currentOffsetPage - 1)"
      >
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
      </button>
      <template v-for="(item, i) in pageItems" :key="`${item}-${i}`">
        <span v-if="item === '…'" class="min-w-[32px] text-center" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          class="h-[32px] min-w-[32px] cursor-pointer rounded-[8px] border-none px-[6px] text-[14px] tabular-nums transition-colors"
          :class="item === currentOffsetPage
            ? 'cursor-default bg-primary font-medium text-white'
            : 'bg-transparent text-ink-muted hover:bg-canvas'"
          :aria-label="`Go to page ${item}`"
          :aria-current="item === currentOffsetPage ? 'page' : undefined"
          @click="item !== currentOffsetPage && $emit('setPage', item)"
        >
          {{ item }}
        </button>
      </template>
      <button
        type="button"
        class="ds-page-arrow"
        :disabled="!hasNextPage"
        aria-label="Go to next page"
        @click="$emit('setPage', currentOffsetPage + 1)"
      >
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import BaseButton from "../BaseButton.vue";

const props = defineProps({
  type: {
    type: String,
    default: 'offset', // 'offset' | 'cursor'
  },
  // Cursor pagination props
  hasPrev: {
    type: Boolean,
    default: false,
  },
  hasNext: {
    type: Boolean,
    default: false,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  currentLimit: {
    type: Number,
    default: 10,
  },
  // Offset pagination props
  paginationProps: {
    type: Object,
    default: () => ({
      hasPrevious: false,
      hasNext: false,
      from: 1,
      to: 1,
      total: 0,
      pageSize: 10,
      totalPages: 1,
      maxVisibleButtons: 10,
      currentPage: 1,
    }),
  },
});

const emit = defineEmits(["setPage", "fetchPage", "changeLimit", "prev", "next"]);

const LIMIT_OPTIONS = [5, 10, 15, 20, 50];
const selectedLimit = ref(props.paginationProps?.pageSize ?? 10);

watch(() => props.paginationProps?.pageSize, (val) => {
  if (val) selectedLimit.value = val;
});

function onLimitChange(event) {
  const value = Number(event.target.value);
  selectedLimit.value = value;
  emit("changeLimit", value);
}

const total = computed(() => props.paginationProps?.total ?? 0);
const totalPages = computed(() => props.paginationProps?.totalPages ?? 1);
const currentOffsetPage = computed(() => props.paginationProps?.currentPage ?? 1);
const hasPreviousPage = computed(() => currentOffsetPage.value > 1);
const hasNextPage = computed(() => currentOffsetPage.value < totalPages.value);

// First, current ±1 and last, with "…" marking gaps
const pageItems = computed(() => {
  const last = totalPages.value;
  const current = currentOffsetPage.value;
  const wanted = [...new Set([1, current - 1, current, current + 1, last])]
    .filter((n) => n >= 1 && n <= last)
    .sort((a, b) => a - b);
  const items = [];
  wanted.forEach((n, i) => {
    if (i > 0 && n - wanted[i - 1] === 2) items.push(n - 1);
    else if (i > 0 && n - wanted[i - 1] > 2) items.push('…');
    items.push(n);
  });
  return items;
});
</script>
