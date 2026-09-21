<template>
  <div class="rounded-lg border border-gray-200 shadow-md overflow-hidden">
    <div
      class="overflow-x-auto [-webkit-overflow-scrolling:touch] overflow-y-visible"
      @click.stop="close"
    >
      <table
        class="min-w-[720px] lg:min-w-full overflow-visible w-full border-collapse text-left text-sm rounded-[10px]"
        @click.stop="close"
      >
        <thead>
          <tr class="bg-[#F8FAFC] border-b border-[#E0E0E0] text-[1.2rem] font-[600] uppercase tracking-wider text-[#616161]">
            <th
              v-for="header in tableHeaderFormatted"
              v-bind:key="header.title"
              scope="col"
              class="px-6 py-4 whitespace-nowrap"
            >
              {{ header.title }}
            </th>
          </tr>
        </thead>
        <tbody
          v-if="loading"
          class="divide-y divide-gray-100 border-t border-gray-100"
        >
          <tr v-for="i in 5" :key="`skeleton-${i}`" class="animate-pulse">
            <td
              v-for="header in tableHeaderFormatted"
              :key="`cell-${header.title}`"
              class="px-6 py-6"
            >
              <div class="h-4 bg-slate-200 rounded w-3/4"></div>
            </td>
          </tr>
        </tbody>
        <tbody
          class="divide-y divide-gray-100 border-t border-gray-100"
          v-else-if="tableData.length > 0"
        >
          <tr v-for="(data, index) in tableData" v-bind:key="index">
            <td
              v-for="header in tableHeaderFormatted"
              v-bind:key="header.title"
              class="px-6 py-4 font-normal text-lg leading-5 text-primary whitespace-nowrap"
            >
              <slot
                :name="`cell(${header.accessor})`"
                :row="data"
                :data="data"
                :value="data[header.accessor]"
              >
                <div v-if="header.type === 'status'">
                  <span
                    :class="getStatusClass(data[header.accessor])"
                    class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium capitalize"
                  >
                    {{ data[header.accessor] }}
                  </span>
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
                <actions-menu
                  v-else-if="header.title === 'Action'"
                  @toggle="toggleOpen(index)"
                  @close="multiopen[index] = false"
                  :isOpen="multiopen[index]"
                >
                  <button
                    type="button"
                    v-if="hasShow"
                    role="menuitem"
                    class="dt-action-item"
                    @click="show(data.id)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                    <p>View</p>
                  </button>

                  <button
                    type="button"
                    v-if="hasEdit"
                    role="menuitem"
                    class="dt-action-item"
                    @click="edit(data.id)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                    <p>Edit</p>
                  </button>

                  <button
                    type="button"
                    v-if="hasDelete"
                    role="menuitem"
                    class="dt-action-item text-red-600"
                    @click="remove(data.id)"
                  >
                    <span class="material-symbols-outlined text-red-600" aria-hidden="true"
                      >delete</span
                    >
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
        <tbody
          class="divide-y divide-gray-100 border-t border-gray-100 text-black text-center"
          v-else-if="showEmptyState"
        >
          <tr>
            <td :colspan="tableHeaderFormatted.length" class="py-20 text-center">
              <empty-state
                :title="emptyStateTitle"
                :description="emptyStateDescription"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <table-pagination
      v-if="hasPagination && !loading && tableData.length > 0"
      :type="resolvedPaginationType"
      :pagination-props="pagination"
      :has-prev="cursorHasPrev"
      :has-next="cursorHasNext"
      :current-page="cursorCurrentPage"
      :current-limit="cursorCurrentLimit"
      @set-page="setPage"
      @prev="emit('prev')"
      @next="emit('next')"
      @change-limit="emit('changeLimit', $event)"
    />
  </div>
</template>

<script setup>
import ActionsMenu from "./ActionsMenu.vue";
import TablePagination from "./TablePagination.vue";
import { useVfm } from "vue-final-modal";
import { watch, ref, computed } from "vue";
import ConfirmModal from "../Modals/ConfirmModal.vue";
import EmptyState from "../EmptyState.vue";
import { formatToMoney, formatDate } from "~/utils/helpers.js";
const vfm = useVfm();

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
});

const statusConfig = {
  pending: "bg-[#FFF9C5] text-[#E79640]",
  open: "bg-[#B5F9B4] text-[#3CA745]",
  completed: "bg-[#B5F9B4] text-[#3CA745]",
  paid: "bg-[#B5F9B4] text-[#3CA745]",
  cancelled: "bg-[#FFBFBF] text-[#FF3131]",
};
const getStatusClass = (status) =>
  statusConfig[status] || "bg-gray-100 text-gray-600";

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
  "prev",
  "next",
]);
const multiopen = ref([]);
const page = ref(1);

function setPage(n) {
  page.value = n;
}

watch(page, (newPage) => {
  emit("fetchPage", newPage);
});

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
  vfm.open(
    {
      component: ConfirmModal,
      on: {
        confirm(close) {
          emit("delete", id);
          close();
        },
      },
    },
    { modalTitle: "Delete" },
  );
}

const formatBoolean = (val, labels = {}) => {
  const config = {
    true: labels?.true ?? "True",
    false: labels?.false ?? "False",
  };

  return val ? config.true : config.false;
};

const tableHeaderFormatted = computed(() =>
  props.hasAction
    ? [...props.tableHeader, { title: "Action", accessor: "action" }]
    : props.tableHeader
);
</script>
<style scoped></style>
