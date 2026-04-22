<template>
  <div
    class="overflow-x-auto rounded-lg border border-gray-200 shadow-md"
    @click.stop="close"
  >
    <table
      class="overflow-visible w-full border-collapse text-left text-sm rounded-[10px]"
      @click.stop="close"
    >
      <thead class="text-[1.6rem] leading-[22.5px] font-[400] rounded-[10px]">
        <tr>
          <th
            v-for="header in tableHeaderFormatted"
            v-bind:key="header.title"
            scope="col"
            class="px-6 py-4 font-semi-bold text-xl leading-6 bg-[#EDEFF2] text-[#616161]"
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
            class="px-6 py-4 font-normal text-lg leading-5 text-primary"
          >
            <slot
              :name="`cell(${header.accessor})`"
              :row="data"
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
                :isOpen="multiopen[index]"
              >
                <div
                  v-if="hasShow"
                  class="dt-action-item"
                  @click="show(data.id)"
                >
                  <span class="material-symbols-outlined">visibility</span>
                  <p>View</p>
                </div>

                <div
                  v-if="hasEdit"
                  class="dt-action-item"
                  @click="edit(data.id)"
                >
                  <span class="material-symbols-outlined">edit</span>
                  <p>Edit</p>
                </div>

                <div
                  v-if="hasDelete"
                  class="dt-action-item text-red-600"
                  @click="remove(data.id)"
                >
                  <span class="material-symbols-outlined text-red-600"
                    >delete</span
                  >
                  <p>Delete</p>
                </div>
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
            <empty-state></empty-state>
          </td>
        </tr>
      </tbody>
    </table>
    <table-pagination
      v-if="hasPagination && !loading && tableData.length > 0"
      :pagination-props="pagination"
      @set-page="setPage"
      @change-limit="emit('changeLimit', $event)"
    />
  </div>
</template>

<script setup>
import ActionsMenu from "./ActionsMenu.vue";
import TablePagination from "./TablePagination.vue";
import { useVfm } from "vue-final-modal";
import { watch, ref } from "vue";
import ConfirmModal from "../Modals/ConfirmModal.vue";
import EmptyState from "../EmptyState.vue";
import { formatToMoney, formatDate } from "~/utils/helpers.js";
const vfm = useVfm();
// import { useSingleToggleForMulti } from "../utilities/helpers";
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
  loading: {
    type: Boolean,
    default: true,
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
const emit = defineEmits([
  "edit",
  "delete",
  "show",
  "fetchPage",
  "changeLimit",
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
  multiopen.value = multiopen.value.map((v, index) => {
    if (index === i) {
      return (multiopen.value[i] = !multiopen.value[i]);
    } else {
      return false;
    }
  });
};

const close = (i) => {
  multiopen.value = multiopen.value.map((_v, _index) => {
    return (multiopen.value[i] = false);
  });
};

// const [openArray, toggle] = useSingleToggleForMultiItem([1, 2, 3]);
watch(
  () => props.tableData,
  (k) => {
    multiopen.value = k.map(() => false);
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
  // Default values if no labels are provided
  const config = {
    true: labels?.true ?? "True",
    false: labels?.false ?? "False",
  };

  return val ? config.true : config.false;
};

const tableHeaderFormatted = ref([]);
//add action column to table header if there is action
tableHeaderFormatted.value = props.hasAction
  ? [...props.tableHeader, { title: "Action" }]
  : props.tableHeader;
</script>
<style scoped></style>
