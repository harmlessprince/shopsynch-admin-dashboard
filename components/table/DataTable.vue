<template>
  <div class="bg-surface border border-hairline rounded-card overflow-hidden">
    <div
      v-if="title || $slots['toolbar-actions']"
      class="flex flex-wrap items-center justify-between gap-[12px] px-[24px] py-[16px] border-b border-hairline"
    >
      <div class="min-w-0">
        <h3 v-if="title" class="text-[16px] font-bold leading-[1.4] text-ink">{{ title }}</h3>
        <p v-if="subtitle" class="text-[13px] leading-[1.5] text-ink-muted">{{ subtitle }}</p>
      </div>
      <div v-if="$slots['toolbar-actions']" class="flex items-center gap-[8px]">
        <slot name="toolbar-actions" />
      </div>
    </div>
    <div v-if="$slots.subheader" class="px-[24px]">
      <slot name="subheader" />
    </div>
    <div
      class="overflow-x-auto [-webkit-overflow-scrolling:touch] overflow-y-visible"
      @click.stop="close"
    >
      <table
        class="w-full border-collapse text-left text-[14px] text-ink"
        :style="{ minWidth }"
        @click.stop="close"
      >
        <thead>
          <tr>
            <th
              v-for="(header, hIndex) in tableHeaderFormatted"
              :key="header.title"
              scope="col"
              class="bg-canvas py-[12px] text-[12px] font-medium leading-[1.5] text-ink-muted border-b border-hairline whitespace-nowrap"
              :class="[
                hIndex === 0 ? 'px-[24px]' : 'px-[16px]',
                isAction(header) ? 'w-[56px]' : '',
                alignClass(header),
              ]"
            >
              <slot :name="`header(${header.accessor})`" :header="header">
                <span :class="isAction(header) ? 'sr-only' : ''">{{ header.title }}</span>
              </slot>
            </th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr
            v-for="i in 5"
            :key="`skeleton-${i}`"
            class="animate-pulse border-b border-hairline"
            :class="rowHeightClass"
          >
            <td
              v-for="(header, hIndex) in tableHeaderFormatted"
              :key="`cell-${header.title}`"
              :class="hIndex === 0 ? 'px-[24px]' : 'px-[16px]'"
            >
              <div
                class="h-[12px] rounded-[4px] bg-[#F2F2F2]"
                :class="alignClass(header) === 'text-right' ? 'ml-auto w-1/2' : 'w-3/4'"
              />
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="tableData.length > 0">
          <tr
            v-for="(data, index) in tableData"
            :key="index"
            class="border-b border-hairline last:border-b-0 hover:bg-canvas transition-colors"
            :class="[rowHeightClass, clickableRows ? 'cursor-pointer' : '']"
            :tabindex="clickableRows ? 0 : undefined"
            :role="clickableRows ? 'link' : undefined"
            @click="onRowClick(data, $event)"
            @keydown.enter.prevent="clickableRows && emit('rowClick', data)"
            @keydown.space.prevent="clickableRows && emit('rowClick', data)"
          >
            <td
              v-for="(header, hIndex) in tableHeaderFormatted"
              :key="header.title"
              class="whitespace-nowrap text-[14px] leading-[1.5] text-ink"
              :class="[
                hIndex === 0 ? 'px-[24px]' : 'px-[16px]',
                alignClass(header),
                isNumeric(header) ? 'tabular-nums font-medium' : '',
                header.type === 'date' ? 'text-ink-muted tabular-nums' : '',
              ]"
            >
              <slot
                :name="`cell(${header.accessor})`"
                :row="data"
                :data="data"
                :value="data[header.accessor]"
              >
                <div v-if="header.type === 'status'">
                  <StatusBadge :status="String(data[header.accessor] ?? '')" />
                </div>

                <span v-else-if="header.type === 'money'">
                  {{ formatToMoney(data[header.accessor]) }}
                </span>

                <span v-else-if="header.type === 'date'">
                  {{ formatDate(data[header.accessor]) }}
                </span>
                <span v-else-if="header.type === 'boolean'">
                  {{ formatBoolean(data[header.accessor], header.booleanLabels) }}
                </span>
                <span
                  v-else-if="header.type === 'thumbnail'"
                  class="block h-[40px] w-[40px] overflow-hidden rounded-thumb bg-[#F2F2F2]"
                >
                  <img
                    v-if="data[header.accessor]"
                    :src="data[header.accessor]"
                    alt=""
                    class="h-full w-full object-cover"
                  >
                </span>
                <span v-else-if="header.type === 'link'" class="font-medium text-primary hover:underline">
                  {{ data[header.accessor] ?? "N/A" }}
                </span>
                <actions-menu
                  v-else-if="isAction(header)"
                  :is-open="multiopen[index]"
                  @toggle="toggleOpen(index)"
                  @close="multiopen[index] = false"
                >
                  <button
                    v-if="hasShow"
                    type="button"
                    role="menuitem"
                    class="dt-action-item"
                    @click="show(data.id)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                    <p>View</p>
                  </button>

                  <button
                    v-if="hasEdit"
                    type="button"
                    role="menuitem"
                    class="dt-action-item"
                    @click="edit(data.id)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                    <p>Edit</p>
                  </button>

                  <button
                    v-if="hasDelete"
                    type="button"
                    role="menuitem"
                    class="dt-action-item dt-action-item--danger"
                    @click="remove(data.id)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                    <p>Delete</p>
                  </button>
                  <slot :id="data.id" name="more-actions" :data="data" />
                </actions-menu>

                <span v-else>
                  {{ data[header.accessor] ?? "N/A" }}
                </span>
              </slot>
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="showEmptyState">
          <tr>
            <td :colspan="tableHeaderFormatted.length" class="text-center">
              <div
                v-if="filtered"
                class="flex flex-col items-center gap-[8px] px-[24px] py-[48px] text-center"
              >
                <span
                  class="material-symbols-outlined text-[28px] text-ink-muted"
                  aria-hidden="true"
                >search_off</span>
                <p class="text-[14px] font-medium leading-[1.5] text-ink">{{ emptyStateTitle }}</p>
                <button
                  v-if="clearFiltersLabel"
                  type="button"
                  class="cursor-pointer border-none bg-transparent text-[14px] font-medium text-primary hover:underline"
                  @click="emit('clearFilters')"
                >
                  {{ clearFiltersLabel }}
                </button>
              </div>
              <empty-state
                v-else
                :icon="emptyStateIcon"
                :title="emptyStateTitle"
                :description="emptyStateDescription"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <template v-if="!loading && tableData.length > 0">
      <slot name="pagination">
        <table-pagination
          v-if="hasPagination"
          :type="resolvedPaginationType"
          :has-prev="cursorHasPrev"
          :has-next="cursorHasNext"
          :current-page="cursorCurrentPage"
          :current-limit="cursorCurrentLimit"
          :pagination-props="pagination"
          @set-page="setPage"
          @change-limit="emit('changeLimit', $event)"
          @prev="emit('prev')"
          @next="emit('next')"
        />
      </slot>
    </template>
    <div v-if="$slots.footer" class="border-t border-hairline">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import ActionsMenu from "./ActionsMenu.vue";
import TablePagination from "./TablePagination.vue";
import StatusBadge from "../StatusBadge.vue";
import { useModal } from "vue-final-modal";
import { watch, ref, computed } from "vue";
import ConfirmModal from "../Modals/ConfirmModal.vue";
import EmptyState from "../EmptyState.vue";
import { formatToMoney, formatDate } from "~/utils/helpers.js";

const props = defineProps({
  tableHeader: {
    type: Array,
    default: () => [],
  },
  tableData: {
    type: Array,
    default: () => [],
  },
  hasAction: {
    type: Boolean,
    default: () => false,
  },
  hasPagination: {
    type: Boolean,
    default: () => true,
  },
  minWidth: {
    type: String,
    default: "720px",
  },
  rowHeight: {
    type: String,
    default: "",
  },
  clickableRows: {
    type: Boolean,
    default: false,
  },
  hasDelete: {
    type: Boolean,
    default: () => false,
  },
  hasEdit: {
    type: Boolean,
    default: () => false,
  },
  hasShow: {
    type: Boolean,
    default: () => false,
  },
  pagination: {
    type: Object,
    default: () => ({}),
  },
  paginationType: {
    type: String,
    default: "offset", // 'offset' | 'cursor'
  },
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
  loading: {
    type: Boolean,
    default: true,
  },
  emptyStateTitle: {
    type: String,
    default: "No records found",
  },
  emptyStateDescription: {
    type: String,
    default: "There are no items to display at the moment.",
  },
  emptyStateIcon: {
    type: String,
    default: "inbox",
  },
  filtered: {
    type: Boolean,
    default: false,
  },
  clearFiltersLabel: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    default: "",
  },
  subtitle: {
    type: String,
    default: "",
  },
});

// Only show empty state if NOT loading and there is NO data
const showEmptyState = computed(
  () => !props.loading && props.tableData.length === 0,
);

const resolvedPaginationType = computed(() => {
  if (props.paginationType === "cursor" || props.pagination?.type === "cursor") {
    return "cursor";
  }
  return "offset";
});

const cursorHasPrev = computed(() => props.hasPrev || props.pagination?.hasPrev || false);
const cursorHasNext = computed(() => props.hasNext || props.pagination?.hasNext || false);
const cursorCurrentPage = computed(() => props.currentPage || props.pagination?.currentPage || 1);
const cursorCurrentLimit = computed(() => props.currentLimit || props.pagination?.currentLimit || props.pagination?.pageSize || 10);

const emit = defineEmits([
  "edit",
  "delete",
  "show",
  "fetchPage",
  "changeLimit",
  "clearFilters",
  "rowClick",
  "prev",
  "next",
]);
const multiopen = ref([]);

function setPage(n) {
  if (n !== props.pagination?.currentPage) {
    emit("fetchPage", n);
  }
}

function onRowClick(data, event) {
  if (!props.clickableRows) return;
  if (event.target.closest("a, button, input, select, textarea, label")) return;
  emit("rowClick", data);
}

const toggleOpen = (i) => {
  multiopen.value = (props.tableData || []).map((_, index) => {
    return index === i ? !multiopen.value[i] : false;
  });
};

const close = () => {
  multiopen.value = (props.tableData || []).map(() => false);
};

watch(
  () => props.tableData,
  (k) => {
    multiopen.value = (k || []).map(() => false);
  },
);

function edit(id) {
  emit("edit", id);
}

function show(id) {
  emit("show", id);
}

function remove(id) {
  const confirmModal = useModal({
    component: ConfirmModal,
    attrs: {
      modalTitle: "Delete this item?",
      prompt: "This item will be permanently removed. This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm() {
        confirmModal.close();
        emit("delete", id);
      },
    },
  });
  confirmModal.open();
}

const formatBoolean = (val, labels = {}) => {
  const config = {
    true: labels?.true ?? "True",
    false: labels?.false ?? "False",
  };

  return val ? config.true : config.false;
};

const isAction = (header) => header.accessor === "action" || header.title === "Action";
const isNumeric = (header) => header.type === "money" || header.type === "number";
const alignClass = (header) =>
  header.align === "right" || (!header.align && isNumeric(header)) ? "text-right" : "";
const rowHeightClass = computed(() =>
  props.rowHeight ||
  (props.tableHeader.some((h) => h.type === "thumbnail") ? "h-[64px]" : "h-[56px]"),
);

const tableHeaderFormatted = computed(() =>
  props.hasAction
    ? [...props.tableHeader, { title: "Action", accessor: "action" }]
    : props.tableHeader
);
</script>
<style scoped></style>
