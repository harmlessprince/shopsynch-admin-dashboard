<script setup>
import { reactive, computed, onMounted, watch } from "vue";
import DataTable from "~/components/table/DataTable.vue";
import SearchableSelectInput from "~/components/SearchableSelectInput.vue";
import { useProductStore } from "~/stores/products.store.js";
import { useAdminMerchantsStore } from "~/stores/adminMerchants.store.js";
import { useAdminCategoriesStore } from "~/stores/adminCategories.store.js";
import { useToastStore } from "~/stores/toast.store.js";
import { formatToMoney, formatDate, logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-products-list",
});

useHead({
  title: "Products - ShopSynch Admin",
});

const productStore = useProductStore();
const merchantsStore = useAdminMerchantsStore();
const categoriesStore = useAdminCategoriesStore();
const toastStore = useToastStore();

const filters = reactive({
  search: "",
  tag: "",
  tenantId: "",
  category: "",
  status: "",
  availability: "",
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

const categoryOptions = computed(() => [
  { label: "All Categories", value: "" },
  ...(categoriesStore.categories || []).map((c) => ({
    label: c.name,
    value: c.id,
  })),
]);

const statusOptions = [
  { label: "All Statuses", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Archived", value: "ARCHIVED" },
];

const availabilityOptions = [
  { label: "All Stock Levels", value: "" },
  { label: "In Stock", value: "true" },
  { label: "Out of Stock", value: "false" },
];

const tableHeaders = [
  { title: "Product", accessor: "name" },
  { title: "Merchant", accessor: "tenantId" },
  { title: "Category", accessor: "category" },
  { title: "Type", accessor: "productType" },
  { title: "Price", accessor: "price" },
  { title: "Cost", accessor: "costPrice" },
  { title: "Tags", accessor: "tags" },
  { title: "Stock", accessor: "availableQty" },
  { title: "Status", accessor: "status" },
  { title: "Created", accessor: "createdAt", type: "date" },
];

function getProductImage(product) {
  return (
    product?.thumbnail ||
    product?.image ||
    product?.images?.[0] ||
    product?.imageList?.[0] ||
    ""
  );
}

function getMerchantName(tenantId) {
  if (!tenantId) return "—";
  const m = merchantMap.value[tenantId];
  return m ? (m.businessTradingName || m.name || tenantId.substring(0, 8)) : tenantId.substring(0, 8);
}

function getMerchantMode(tenantId) {
  const m = merchantMap.value[tenantId];
  return m?.currentMode || "";
}

function getQueryFromFilters() {
  const query = {
    page: Math.max(Number(filters.page || 1) - 1, 0),
    limit: Number(filters.limit || 50),
    sortFieldParam: "CREATED_AT",
    sortDirectionParam: "DESC",
  };
  if (filters.search) query.search = filters.search.trim();
  if (filters.tag) query.tag = filters.tag.trim();
  if (filters.tenantId) query.tenantId = filters.tenantId;
  if (filters.category) query.category = filters.category;
  if (filters.status) {
    if (filters.status === "ARCHIVED") {
      query.archived = true;
    } else {
      query.status = filters.status;
    }
  }
  if (filters.availability !== "") {
    query.availability = filters.availability === "true";
  }
  return query;
}

async function loadProducts() {
  try {
    const query = getQueryFromFilters();
    await productStore.getProducts(query);
  } catch (err) {
    logger.error("Failed to load products:", err);
  }
}

const hasActiveFilters = computed(() =>
  Boolean(
    filters.search ||
    filters.tag ||
    filters.tenantId ||
    filters.category ||
    filters.status ||
    filters.availability !== ""
  )
);

function resetFilters() {
  Object.assign(filters, {
    search: "",
    tag: "",
    tenantId: "",
    category: "",
    status: "",
    availability: "",
    page: 1,
  });
  loadProducts();
}

function handleFetchPage(nextPage) {
  filters.page = Number(nextPage || 1);
  loadProducts();
}

function handleChangeLimit(nextLimit) {
  filters.limit = Number(nextLimit || 50);
  filters.page = 1;
  loadProducts();
}

async function handleDeleteProduct(id) {
  try {
    await productStore.deleteProduct(id);
    toastStore.success("Product deleted", "");
  } catch (err) {
    logger.error("Failed to delete product:", err);
    toastStore.error("Unable to delete product");
  }
}

watch(
  () => [filters.search, filters.tag, filters.tenantId, filters.category, filters.status, filters.availability],
  () => {
    filters.page = 1;
    loadProducts();
  }
);

onMounted(async () => {
  if (merchantsStore.merchants.length === 0) {
    merchantsStore.fetchMerchants({ limit: 100 }).catch(() => {});
  }
  if (categoriesStore.categories.length === 0) {
    categoriesStore.fetchCategories().catch(() => {});
  }
  loadProducts();
});
</script>

<template>
  <div class="space-y-[2rem] text-[1.4rem] text-dashboard_text_color">
    <!-- Header -->
    <section class="rounded-[10px] bg-white p-[2.4rem] shadow-sm border border-slate-100">
      <div class="flex flex-col gap-[1.6rem] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-[2.2rem] font-[700] text-slate-900">Products</h1>
            <span
              v-if="productStore.total !== undefined"
              class="rounded-full bg-slate-100 px-3 py-0.5 text-[1.2rem] font-semibold text-slate-600"
            >
              {{ productStore.total }} items
            </span>
          </div>
          <p class="mt-1 text-[1.4rem] text-slate-500">
            Platform-wide product catalog imported or created across all merchant stores.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/dashboard/product/import"
            class="flex items-center gap-2 rounded-[8px] bg-primary px-[1.6rem] py-[1rem] font-[700] text-white hover:bg-primary/90 transition-colors"
          >
            <span class="material-symbols-outlined text-[2rem]">upload_file</span>
            <span>Import Products</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Filter Bar -->
    <section class="rounded-[10px] bg-white p-[2rem] shadow-sm border border-slate-100 space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <!-- Search -->
        <div>
          <label class="block text-[1.2rem] font-semibold text-slate-600 mb-1">Search</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[2rem]">search</span>
            <input
              v-model="filters.search"
              type="search"
              placeholder="Name, SKU, code..."
              class="w-full rounded-[8px] border border-slate-200 pl-10 pr-3 py-2 text-[1.3rem] text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
          </div>
        </div>

        <!-- Tag Filter -->
        <div>
          <label class="block text-[1.2rem] font-semibold text-slate-600 mb-1">Tag</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[2rem]">label</span>
            <input
              v-model="filters.tag"
              type="search"
              placeholder="Filter by tag..."
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

        <!-- Category Filter -->
        <div>
          <label class="block text-[1.2rem] font-semibold text-slate-600 mb-1">Category</label>
          <SearchableSelectInput
            v-model="filters.category"
            :options="categoryOptions"
            placeholder="All Categories"
            search-placeholder="Search categories..."
          />
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-[1.2rem] font-semibold text-slate-600 mb-1">Status</label>
          <select
            v-model="filters.status"
            class="w-full h-[4.2rem] rounded-[8px] border border-slate-200 px-3 text-[1.3rem] text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Availability Filter -->
        <div>
          <label class="block text-[1.2rem] font-semibold text-slate-600 mb-1">Stock Level</label>
          <select
            v-model="filters.availability"
            class="w-full h-[4.2rem] rounded-[8px] border border-slate-200 px-3 text-[1.3rem] text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white"
          >
            <option v-for="opt in availabilityOptions" :key="opt.value" :value="opt.value">
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
        :table-data="productStore.products"
        :loading="productStore.isLoading"
        :pagination="productStore.paginatedData"
        empty-state-title="No products found"
        empty-state-description="No imported or merchant products match the selected criteria."
        has-action
        has-delete
        @fetch-page="handleFetchPage"
        @change-limit="handleChangeLimit"
        @delete="handleDeleteProduct"
      >
        <!-- Product Name & Thumbnail -->
        <template #cell(name)="{ row }">
          <div class="flex items-center gap-3 py-1">
            <img
              v-if="getProductImage(row)"
              :src="getProductImage(row)"
              class="w-[4.4rem] h-[4.4rem] rounded-xl object-cover border border-slate-100 flex-shrink-0 bg-slate-50"
              alt=""
            >
            <div
              v-else
              class="w-[4.4rem] h-[4.4rem] rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-100 text-slate-400"
            >
              <span class="material-symbols-outlined text-[2rem]">image_not_supported</span>
            </div>

            <div class="min-w-0 flex-1">
              <p class="font-semibold text-slate-900 truncate max-w-[28rem]">{{ row.name }}</p>
              <div class="flex items-center gap-2 flex-wrap text-[1.1rem] mt-0.5">
                <span v-if="row.sku" class="text-slate-500">
                  SKU: <strong class="text-slate-700 font-mono">{{ row.sku }}</strong>
                </span>
                <span v-if="row.sku && row.productCode" class="text-slate-300">•</span>
                <span
                  v-if="row.productCode"
                  class="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[1rem]"
                >
                  {{ row.productCode }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- Merchant / Tenant ID -->
        <template #cell(tenantId)="{ value }">
          <div class="flex flex-col">
            <NuxtLink
              v-if="value"
              :to="`/dashboard/merchants/${value}`"
              class="font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-[1.4rem]">storefront</span>
              <span class="truncate max-w-[18rem]">{{ getMerchantName(value) }}</span>
            </NuxtLink>
            <span v-else class="text-slate-400">—</span>
            <span v-if="getMerchantMode(value)" class="text-[1.1rem] text-slate-400 uppercase tracking-wider">
              {{ getMerchantMode(value) }}
            </span>
          </div>
        </template>

        <!-- Category -->
        <template #cell(category)="{ value }">
          <span class="rounded bg-slate-100 px-2 py-0.5 text-[1.2rem] font-medium text-slate-700">
            {{ value || "General" }}
          </span>
        </template>

        <!-- Product Type -->
        <template #cell(productType)="{ value }">
          <span
            class="rounded px-2 py-0.5 text-[1.1rem] font-bold uppercase tracking-wider"
            :class="value === 'VARIABLE' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700'"
          >
            {{ value || "SIMPLE" }}
          </span>
        </template>

        <!-- Price -->
        <template #cell(price)="{ row }">
          <div class="font-mono font-semibold text-slate-900">
            {{ formatToMoney(row.newPrice || row.price || 0) }}
            <span
              v-if="row.newPrice && row.price && row.newPrice !== row.price"
              class="text-[1.1rem] text-slate-400 line-through ml-1"
            >
              {{ formatToMoney(row.price) }}
            </span>
          </div>
        </template>

        <!-- Cost Price -->
        <template #cell(costPrice)="{ value }">
          <span v-if="value !== null && value !== undefined" class="font-mono text-[1.3rem] text-slate-600">
            {{ formatToMoney(value) }}
          </span>
          <span v-else class="text-slate-400 text-[1.2rem]">—</span>
        </template>

        <!-- Tags -->
        <template #cell(tags)="{ value }">
          <div v-if="value && value.length > 0" class="flex flex-wrap items-center gap-1 max-w-[18rem]">
            <span
              v-for="(t, idx) in value.slice(0, 2)"
              :key="idx"
              class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[1.1rem] font-medium text-slate-700"
            >
              {{ t }}
            </span>
            <span
              v-if="value.length > 2"
              class="inline-flex items-center rounded-full bg-slate-200 px-1.5 py-0.5 text-[1rem] font-bold text-slate-600"
              :title="value.slice(2).join(', ')"
            >
              +{{ value.length - 2 }}
            </span>
          </div>
          <span v-else class="text-slate-400 text-[1.2rem]">—</span>
        </template>

        <!-- Stock / availableQty -->
        <template #cell(availableQty)="{ row, value }">
          <div class="flex items-center gap-1.5">
            <span
              class="h-2 w-2 rounded-full"
              :class="(Number(value ?? row.quantityInStock ?? 0) > 0) ? 'bg-emerald-500' : 'bg-rose-500'"
            />
            <span class="font-mono text-slate-800 text-[1.3rem]">
              {{ value ?? row.quantityInStock ?? 0 }}
            </span>
          </div>
        </template>

        <!-- Status -->
        <template #cell(status)="{ row, value }">
          <span
            v-if="row.isArchived || row.archived"
            class="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[1.1rem] font-bold text-slate-600"
          >
            Archived
          </span>
          <span
            v-else-if="value === 'ACTIVE'"
            class="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[1.1rem] font-bold text-emerald-700"
          >
            Active
          </span>
          <span
            v-else-if="value === 'DRAFT'"
            class="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[1.1rem] font-bold text-amber-700"
          >
            Draft
          </span>
          <span
            v-else
            class="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-[1.1rem] font-bold text-rose-700"
          >
            {{ value || "Inactive" }}
          </span>
        </template>

        <!-- Created At -->
        <template #cell(createdAt)="{ value }">
          <span class="text-slate-500 text-[1.2rem]">
            {{ formatDate(value) }}
          </span>
        </template>
      </DataTable>
    </section>
  </div>
</template>
