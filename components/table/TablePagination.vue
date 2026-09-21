<template>
  <!-- Cursor pagination -->
  <div v-if="type === 'cursor'" class="bg-primary p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
    <div class="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
      <p class="text-white font-medium text-sm sm:text-base md:text-xl">Page {{ currentPage }}</p>
      <select
        :value="currentLimit"
        aria-label="Results per page"
        class="rounded-lg border border-white/30 bg-white/10 text-white text-sm sm:text-base md:text-xl px-3 py-1.5 focus:outline-none cursor-pointer min-h-[44px] touch-manipulation"
        @change="$emit('changeLimit', Number($event.target.value))"
      >
        <option v-for="opt in LIMIT_OPTIONS" :key="opt" :value="opt">{{ opt }} / page</option>
      </select>
    </div>
    <div class="flex items-center gap-3 sm:gap-5 w-full sm:w-auto justify-end">
      <button
        :disabled="!hasPrev"
        class="text-white/80 hover:text-white hover:bg-white/10 font-medium text-sm sm:text-base md:text-xl px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer border-none outline-none disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] touch-manipulation flex items-center justify-center"
        aria-label="Go to previous page"
        @click="$emit('prev')"
      >
        Previous
      </button>
      <button
        :disabled="!hasNext"
        class="text-white/80 hover:text-white hover:bg-white/10 font-medium text-sm sm:text-base md:text-xl px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer border-none outline-none disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] touch-manipulation flex items-center justify-center"
        aria-label="Go to next page"
        @click="$emit('next')"
      >
        Next
      </button>
    </div>
  </div>

  <!-- Offset pagination -->
  <div v-else class="bg-primary p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
    <div class="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start" v-if="props.paginationProps?.totalPages > 1">
      <p class="text-white font-medium text-sm sm:text-base md:text-xl">
        Showing {{ paginationProps.from }}-{{ paginationProps.to }} out of
        {{ paginationProps.totalPages }} pages
      </p>
      <select
        v-model="selectedLimit"
        aria-label="Results per page"
        class="rounded-lg border border-white/30 bg-white/10 text-white text-sm sm:text-base md:text-xl px-3 py-1.5 focus:outline-none cursor-pointer min-h-[44px] touch-manipulation"
        @change="onLimitChange"
      >
        <option v-for="opt in LIMIT_OPTIONS" :key="opt" :value="opt">{{ opt }} / page</option>
      </select>
    </div>
    <div class="flex items-center gap-2 sm:gap-3 md:gap-5 text-xs sm:text-sm md:text-base w-full sm:w-auto overflow-x-auto [-webkit-overflow-scrolling:touch] py-1 max-w-full" v-if="props.paginationProps?.totalPages > 1">
      <button
        v-bind:key="1"
        :disabled="1 === props.paginationProps?.currentPage"
        :class="isPageActive(1)
          ? 'bg-[#DCEBFB] text-primary font-bold shadow-sm cursor-default'
          : 'text-white/80 hover:text-white hover:bg-white/10 font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'"
        class="px-3 py-1.5 rounded-lg transition-all duration-150 border-none outline-none shrink-0 min-h-[44px] touch-manipulation flex items-center justify-center"
        aria-label="Go to first page"
        :aria-current="isPageActive(1) ? 'page' : undefined"
        @click="$emit('setPage', 1)"
      >
        <span class="hidden sm:inline">Go to First Page</span>
        <span class="sm:hidden">First</span>
      </button>
      <button
        v-for="page in pages"
        v-bind:key="page.name"
        :disabled="page.isDisabled"
        :class="isPageActive(page.name)
          ? 'bg-[#DCEBFB] text-primary font-bold shadow-sm cursor-default'
          : 'text-white/80 hover:text-white hover:bg-white/10 font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'"
        class="px-3 py-1.5 rounded-lg transition-all duration-150 border-none outline-none shrink-0 min-h-[44px] touch-manipulation flex items-center justify-center"
        :aria-label="`Go to page ${page.name}`"
        :aria-current="isPageActive(page.name) ? 'page' : undefined"
        @click="$emit('setPage', page.name)"
      >
        {{ page.name }}
      </button>

      <button
        v-bind:key="props.paginationProps?.totalPages"
        :disabled="
          props.paginationProps?.totalPages ===
          props.paginationProps?.currentPage
        "
        :class="isPageActive(props.paginationProps?.totalPages)
          ? 'bg-[#DCEBFB] text-primary font-bold shadow-sm cursor-default'
          : 'text-white/80 hover:text-white hover:bg-white/10 font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'"
        class="px-3 py-1.5 rounded-lg transition-all duration-150 border-none outline-none shrink-0 min-h-[44px] touch-manipulation flex items-center justify-center"
        aria-label="Go to last page"
        :aria-current="isPageActive(props.paginationProps?.totalPages) ? 'page' : undefined"
        @click="$emit('setPage', props.paginationProps?.totalPages)"
      >
        <span class="hidden sm:inline">Go to Last Page</span>
        <span class="sm:hidden">Last</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";

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

function onLimitChange() {
  emit("changeLimit", selectedLimit.value);
}

const startPage = computed(() => {
  if (props.paginationProps?.currentPage === 1) return 1;
  if (props.paginationProps?.currentPage === props.paginationProps?.totalPages)
    return Math.max(
      1,
      props.paginationProps?.totalPages -
      props.paginationProps?.maxVisibleButtons +
      1
    );

  return props.paginationProps?.currentPage - 1;
});

const endPage = computed(() => {
  return Math.min(
    startPage.value + props.paginationProps?.maxVisibleButtons - 1,
    props.paginationProps?.totalPages
  );
});

const pages = computed(() => {
  const range = [];

  for (let i = startPage.value; i <= endPage.value; i += 1) {
    if (i != 1 && i != props.paginationProps?.totalPages) {
      range.push({
        name: i,
        isDisabled: i === props.paginationProps?.currentPage,
      });
    }
  }

  return range;
});

function isPageActive(page) {
  return props.paginationProps?.currentPage === page;
}
</script>
