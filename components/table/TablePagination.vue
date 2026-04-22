<template>
  <!-- Cursor pagination -->
  <div v-if="type === 'cursor'" class="bg-primary p-8 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <p class="text-white font-medium text-xl">Page {{ currentPage }}</p>
      <select
        :value="currentLimit"
        class="rounded-lg border border-white/30 bg-white/10 text-white text-xl px-3 py-1 focus:outline-none cursor-pointer"
        @change="$emit('changeLimit', Number($event.target.value))"
      >
        <option v-for="opt in LIMIT_OPTIONS" :key="opt" :value="opt">{{ opt }} / page</option>
      </select>
    </div>
    <div class="flex items-center gap-5">
      <button
        :disabled="!hasPrev"
        class="text-white font-medium text-xl cursor-pointer border-none outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        @click="$emit('prev')"
      >
        Previous
      </button>
      <button
        :disabled="!hasNext"
        class="text-white font-medium text-xl cursor-pointer border-none outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        @click="$emit('next')"
      >
        Next
      </button>
    </div>
  </div>

  <!-- Offset pagination -->
  <div v-else class="bg-primary p-8 flex item-center justify-between">
    <div class="flex items-center gap-4">
      <p class="text-white font-medium text-xl">
        Showing {{ paginationProps.from }}-{{ paginationProps.to }} out of
        {{ paginationProps.totalPages }} pages
      </p>
      <select
        v-model="selectedLimit"
        class="rounded-lg border border-white/30 bg-white/10 text-white text-xl px-3 py-1 focus:outline-none cursor-pointer"
        @change="onLimitChange"
      >
        <option v-for="opt in LIMIT_OPTIONS" :key="opt" :value="opt">{{ opt }} / page</option>
      </select>
    </div>
    <div class="flex item-center gap-5">
      <button
        v-bind:key="1"
        :disabled="1 === props.paginationProps?.currentPage"
        :class="`${
          isPageActive(1) ? 'active' : ''
        } text-white font-medium text-xl cursor-pointer border-none outline-none`"
        @click="$emit('setPage', 1)"
      >
        First Page
      </button>
      <button
        v-for="page in pages"
        v-bind:key="page.name"
        :disabled="page.isDisabled"
        :class="`${
          isPageActive(page.name) ? 'active' : ''
        } text-white font-medium text-xl cursor-pointer border-none outline-none`"
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
        :class="`${
          isPageActive(props.paginationProps?.totalPages) ? 'active' : ''
        } text-white font-medium text-xl cursor-pointer border-none outline-none`"
        @click="$emit('setPage', props.paginationProps?.totalPages)"
      >
        Last Page
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

const LIMIT_OPTIONS = [5, 10, 15, 20];
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
