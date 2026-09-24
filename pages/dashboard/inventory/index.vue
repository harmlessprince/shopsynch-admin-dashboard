<script setup>
import { reactive, computed, onMounted, watch } from "vue";
import DataTable from "~/components/table/DataTable.vue";
import SearchableSelectInput from "~/components/SearchableSelectInput.vue";
import { useInventoryStore } from "~/stores/inventory.store.js";
import { useAdminMerchantsStore } from "~/stores/adminMerchants.store.js";
import { formatDate, logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-inventory-list",
});

useHead({
  title: "Inventory - ShopSynch Admin",
});

const inventoryStore = useInventoryStore();
const merchantsStore = useAdminMerchantsStore();

const filters = reactive({
  search: "",
  tenantId: "",
  status: "",
  page: 1,
  limit: 50,
});

const merchantMap = computed(() => {
  const map = {};
  for (const m of merchantsStore.merchants || []) {
    map[m.id] = m;
  }
  return map;
});

const merchantOptions = computed(() => [
  { label: "All Merchants", value: "" },
  ...(merchantsStore.merchants || []).map((m) => ({
    label: `${m.businessTradingName || m.name || "Untitled"} (${m.code || m.id.substring(0, 8)})`,
    value: m.id,
  })),
]);

const statusOptions = [
  { label: "All Statuses", value: "" },
  { label: "In Stock", value: "IN_STOCK" },
  { label: "Low Stock", value: "LOW_STOCK" },
  { label: "Out of Stock", value: "OUT_OF_STOCK" },
];

const tableHeaders = [
  { title: "Item / SKU", accessor: "productName" },
  { title: "Merchant", accessor: "tenantId" },
  { title: "Branch / Warehouse", accessor: "branchName" },
  { title: "Unit Mode", accessor: "unitTrackingMode" },
  { title: "On Hand", accessor: "onHandQty" },
  { title: "Reserved", accessor: "reservedQty" },
  { title: "Available", accessor: "availableQty" },
  { title: "Status", accessor: "status" },
  { title: "Updated", accessor: "updatedAt", type: "date" },
];

function getMerchantName(tenantId) {
  if (!tenantId) return "—";
  const m = merchantMap.value[tenantId];
  return m ? (m.businessTradingName || m.name || tenantId.substring(0, 8)) : tenantId.substring(0, 8);
}

function getQueryFromFilters() {
  const query = {};
  if (filters.search) query.search = filters.search.trim();
  if (filters.tenantId) query.tenantId = filters.tenantId;
  if (filters.status) query.status = filters.status;
  return query;
}

async function loadInventory() {
  try {
    await inventoryStore.getInventory(filters.page, filters.limit, getQueryFromFilters());
  } catch (err) {
    logger.error("Failed to load inventory:", err);
  }
}

const hasActiveFilters = computed(() =>
  Boolean(filters.search || filters.tenantId || filters.status)
);

function resetFilters() {
  Object.assign(filters, {
    search: "",
    tenantId: "",
    status: "",
    page: 1,
  });
  loadInventory();
}

function handleFetchPage(nextPage) {
  filters.page = Number(nextPage || 1);
  loadInventory();
}

function handleChangeLimit(nextLimit) {
  filters.limit = Number(nextLimit || 50);
  filters.page = 1;
  loadInventory();
}

watch(
  () => [filters.search, filters.tenantId, filters.status],
  () => {
    filters.page = 1;
    loadInventory();
  }
);

onMounted(async () => {
  if (merchantsStore.merchants.length === 0) {
    merchantsStore.fetchMerchants({ limit: 100 }).catch(() => {});
  }
  loadInventory();
});
</script>

<template>
  <div class="space-y-[2rem] text-[1.4rem] text-dashboard_text_color">
    <!-- Header -->
    <section class="rounded-[10px] bg-white p-[2.4rem] shadow-sm border border-slate-100">
      <div class="flex flex-col gap-[1.6rem] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-[2.2rem] font-[700] text-slate-900">Inventory</h1>
            <span
              v-if="inventoryStore.paginatedData?.total !== undefined"
              class="rounded-full bg-slate-100 px-3 py-0.5 text-[1.2rem] font-semibold text-slate-600"
            >
              {{ inventoryStore.paginatedData.total }} records
            </span>
          </div>
          <p class="mt-1 text-[1.4rem] text-slate-500">
            Platform-wide inventory levels, warehouse stock, and SKU quantities across merchants.
          </p>
        </div>
      </div>
    </section>

    <!-- Filter Bar -->
    <section class="rounded-[10px] bg-white p-[2rem] shadow-sm border border-slate-100 space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <!-- Search -->
        <div>
          <label class="block text-[1.2rem] font-semibold text-slate-600 mb-1">Search</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[2rem]">search</span>
            <input
              v-model="filters.search"
              type="search"
              placeholder="Product, SKU, branch, code..."
              class="w-full rounded-[8px] border border-slate-200 pl-10 pr-3 py-2 text-[1.3rem] text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
          </div>
        </div>

        <!-- Merchant Filter -->
        <div>
          <label class="block text-[1.2rem] font-semibold text-slate-600 mb-1">Merchant</label>
          <SearchableSelectInput
            v-model="filters.tenantId"
            :options="merchantOptions"
            placeholder="All Merchants"
            search-placeholder="Search merchants..."
          />
        </div>

        <!-- Stock Status Filter -->
        <div>
          <label class="block text-[1.2rem] font-semibold text-slate-600 mb-1">Stock Status</label>
          <select
            v-model="filters.status"
            class="w-full h-[4.2rem] rounded-[8px] border border-slate-200 px-3 text-[1.3rem] text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Active Filters Reset -->
      <div v-if="hasActiveFilters" class="flex items-center justify-end pt-2">
        <button
          type="button"
          class="text-[1.3rem] font-semibold text-primary hover:underline flex items-center gap-1"
          @click="resetFilters"
        >
          <span class="material-symbols-outlined text-[1.6rem]">close</span>
          Clear all filters
        </button>
      </div>
    </section>

    <!-- Table -->
    <section class="rounded-[10px] bg-white p-[2rem] shadow-sm border border-slate-100">
      <DataTable
        :table-header="tableHeaders"
        :table-data="inventoryStore.inventory"
        :loading="inventoryStore.loading"
        :pagination="inventoryStore.paginatedData"
        empty-state-title="No inventory records found"
        empty-state-description="No stock records match the selected merchant or filter criteria."
        has-action
        has-show
        @fetch-page="handleFetchPage"
        @change-limit="handleChangeLimit"
        @show="(id) => $router.push('/dashboard/inventory/' + id)"
      >
        <!-- Product & SKU -->
        <template #cell(productName)="{ row }">
          <div class="py-1">
            <NuxtLink
              :to="'/dashboard/inventory/' + row.id"
              class="font-semibold text-slate-900 truncate max-w-[26rem] hover:text-primary hover:underline transition-colors block"
            >
              {{ row.productName || row.name || `Product: ${row.productId?.substring(0, 10)}...` }}
            </NuxtLink>
            <div class="flex items-center gap-2 flex-wrap text-[1.1rem] mt-0.5">
              <span v-if="row.skuId || row.sku" class="text-slate-500 font-mono">
                SKU: <strong class="text-slate-700">{{ row.skuId || row.sku }}</strong>
              </span>
              <span v-if="row.inventoryCode" class="text-slate-300">•</span>
              <span
                v-if="row.inventoryCode"
                class="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[1rem]"
              >
                {{ row.inventoryCode }}
              </span>
            </div>
          </div>
        </template>

        <!-- Merchant -->
        <template #cell(tenantId)="{ value }">
          <NuxtLink
            v-if="value"
            :to="`/dashboard/merchants/${value}`"
            class="font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span class="material-symbols-outlined text-[1.4rem]">storefront</span>
            <span class="truncate max-w-[18rem]">{{ getMerchantName(value) }}</span>
          </NuxtLink>
          <span v-else class="text-slate-400">—</span>
        </template>

        <!-- Branch / Warehouse -->
        <template #cell(branchName)="{ value }">
          <span class="text-slate-700 font-medium">
            {{ value || "Default Branch" }}
          </span>
        </template>

        <!-- Unit Mode -->
        <template #cell(unitTrackingMode)="{ row, value }">
          <div class="flex flex-col">
            <span class="text-[1.1rem] font-bold uppercase tracking-wider text-slate-700">
              {{ value || "SINGLE_UNIT" }}
            </span>
            <span v-if="row.unitCategory" class="text-[1rem] text-slate-400 uppercase">
              {{ row.unitCategory }}
            </span>
          </div>
        </template>

        <!-- On Hand -->
        <template #cell(onHandQty)="{ value }">
          <span class="font-mono font-semibold text-slate-900">
            {{ value ?? 0 }}
          </span>
        </template>

        <!-- Reserved -->
        <template #cell(reservedQty)="{ value }">
          <span class="font-mono text-amber-700">
            {{ value ?? 0 }}
          </span>
        </template>

        <!-- Available -->
        <template #cell(availableQty)="{ value }">
          <span
            class="font-mono font-bold"
            :class="(Number(value ?? 0) > 0) ? 'text-emerald-700' : 'text-rose-700'"
          >
            {{ value ?? 0 }}
          </span>
        </template>

        <!-- Status -->
        <template #cell(status)="{ value }">
          <span
            v-if="value === 'IN_STOCK'"
            class="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[1.1rem] font-bold text-emerald-700"
          >
            In Stock
          </span>
          <span
            v-else-if="value === 'LOW_STOCK'"
            class="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[1.1rem] font-bold text-amber-700"
          >
            Low Stock
          </span>
          <span
            v-else-if="value === 'OUT_OF_STOCK'"
            class="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-[1.1rem] font-bold text-rose-700"
          >
            Out of Stock
          </span>
          <span
            v-else
            class="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[1.1rem] font-bold text-slate-700"
          >
            {{ value || "—" }}
          </span>
        </template>

        <!-- Updated At -->
        <template #cell(updatedAt)="{ row, value }">
          <span class="text-slate-500 text-[1.2rem]">
            {{ formatDate(value || row.createdAt) }}
          </span>
        </template>
      </DataTable>
    </section>
  </div>
</template>
