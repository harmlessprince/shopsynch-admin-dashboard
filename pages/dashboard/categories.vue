<script setup>
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-categories",
});

const store = useAdminCategoriesStore();
const toastStore = useToastStore();

const activeTab = ref("system");
const search = ref("");
const parentId = ref("");
const listable = ref("");
const editingId = ref("");
const promotingId = ref("");
const isPromotionDrawerOpen = ref(false);
const selectedReviewCategory = ref(null);

const form = ref(defaultForm());
const promotionForm = ref(defaultForm());
const promotionSourceCategoryId = ref("");

const parentOptions = computed(() =>
  store.categories
    .filter((category) => category.id !== editingId.value)
    .map((category) => ({ label: category.name, value: category.id }))
);

const filterParentOptions = computed(() =>
  store.categories.map((category) => ({ label: category.name, value: category.id }))
);

const listableOptions = [
  { label: "Listable", value: "true" },
  { label: "Not listable", value: "false" },
];

const promotionSourceCategoryOptions = computed(() =>
  store.categories.map((category) => ({ label: category.name, value: category.id }))
);

const promotionParentOptions = computed(() =>
  store.categories
    .filter((category) => category.id !== selectedReviewCategory.value?.id)
    .map((category) => ({ label: category.name, value: category.id }))
);

const systemParams = computed(() => ({
  search: search.value || undefined,
  parentId: parentId.value || undefined,
  listable: listable.value === "" ? undefined : listable.value === "true",
}));

function defaultForm() {
  return {
    name: "",
    parentId: "",
    listable: true,
    hasChildren: false,
    hasActiveChildren: false,
  };
}

function resetForm() {
  editingId.value = "";
  form.value = defaultForm();
}

function editCategory(category) {
  editingId.value = category.id;
  form.value = {
    name: category.name || "",
    parentId: category.parentId || "",
    listable: category.listable !== false,
    hasChildren: Boolean(category.hasChildren),
    hasActiveChildren: Boolean(category.hasActiveChildren),
  };
}

async function fetchAll() {
  try {
    await Promise.all([
      store.fetchCategories(systemParams.value),
      store.fetchCustomReview(),
    ]);
  } catch (err) {
    logger.error("Failed to load categories", err);
  }
}

async function saveCategory() {
  if (!form.value.name.trim()) {
    toastStore.error("Category name is required");
    return;
  }
  const payload = {
    ...form.value,
    name: form.value.name.trim(),
    parentId: form.value.parentId || null,
  };
  try {
    if (editingId.value) {
      await store.updateCategory(editingId.value, payload);
    } else {
      await store.createCategory(payload);
    }
    resetForm();
  } catch (err) {
    logger.error("Failed to save category", err);
    toastStore.error("Unable to save category");
  }
}

async function removeCategory(category) {
  try {
    await store.deleteCategory(category.id);
  } catch (err) {
    logger.error("Failed to delete category", err);
    toastStore.error("Unable to delete category");
  }
}

function openPromotionDrawer(category) {
  selectedReviewCategory.value = category;
  promotionSourceCategoryId.value = "";
  promotionForm.value = {
    name: category.name || "",
    parentId: category.parentId || "",
    listable: true,
    hasChildren: false,
    hasActiveChildren: false,
  };
  isPromotionDrawerOpen.value = true;
}

function closePromotionDrawer() {
  isPromotionDrawerOpen.value = false;
  selectedReviewCategory.value = null;
  promotionSourceCategoryId.value = "";
  promotionForm.value = defaultForm();
}

function handlePromotionDrawerOpenChange(open) {
  if (open) {
    isPromotionDrawerOpen.value = true;
    return;
  }
  closePromotionDrawer();
}

function applyPromotionSourceCategory() {
  const source = store.categories.find((category) => category.id === promotionSourceCategoryId.value);
  if (!source) return;
  promotionForm.value = {
    name: promotionForm.value.name || source.name || "",
    parentId: source.parentId || "",
    listable: source.listable !== false,
    hasChildren: Boolean(source.hasChildren),
    hasActiveChildren: Boolean(source.hasActiveChildren),
  };
}

function updateParentFilter(value) {
  parentId.value = value;
  fetchAll();
}

function updateListableFilter(value) {
  listable.value = value;
  fetchAll();
}

function updatePromotionSourceCategory(value) {
  promotionSourceCategoryId.value = value;
  applyPromotionSourceCategory();
}

async function promoteCategory() {
  if (!selectedReviewCategory.value?.id) return;
  if (!promotionForm.value.name.trim()) {
    toastStore.error("Category name is required");
    return;
  }

  promotingId.value = selectedReviewCategory.value.id;
  try {
    await store.promoteCustomCategory(selectedReviewCategory.value.id, {
      ...promotionForm.value,
      name: promotionForm.value.name.trim(),
      parentId: promotionForm.value.parentId || null,
    });
    closePromotionDrawer();
  } catch (err) {
    logger.error("Failed to promote category", err);
    toastStore.error("Unable to promote category");
  } finally {
    promotingId.value = "";
  }
}

function parentName(id) {
  return store.categories.find((category) => category.id === id)?.name || "-";
}

onMounted(fetchAll);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Categories</h1>
          <p class="mt-[0.4rem]">System category bank and tenant category review.</p>
        </div>
        <div class="flex flex-wrap gap-[0.8rem]">
          <button
            class="rounded-[8px] px-[1.4rem] py-[0.9rem] font-[700]"
            :class="activeTab === 'system' ? 'bg-primary text-white' : 'border border-slate-200 bg-white'"
            @click="activeTab = 'system'"
          >
            System categories
          </button>
          <button
            class="rounded-[8px] px-[1.4rem] py-[0.9rem] font-[700]"
            :class="activeTab === 'review' ? 'bg-primary text-white' : 'border border-slate-200 bg-white'"
            @click="activeTab = 'review'"
          >
            Review queue
          </button>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'system'" class="grid grid-cols-1 gap-[1.6rem] xl:grid-cols-[360px_1fr]">
      <form class="rounded-[8px] bg-white p-[2rem] shadow-sm" @submit.prevent="saveCategory">
        <div class="mb-[1.6rem] flex items-center justify-between gap-[1rem]">
          <h2 class="text-[1.6rem] font-[700] text-[#000]">{{ editingId ? "Edit category" : "New category" }}</h2>
          <button v-if="editingId" type="button" class="font-[700] text-primary" @click="resetForm">Clear</button>
        </div>
        <div class="space-y-[1.2rem]">
          <input v-model="form.name" class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]" placeholder="Category name" />
          <SearchableSelectInput
            v-model="form.parentId"
            :options="parentOptions"
            placeholder="No parent"
            search-placeholder="Search parent categories"
            input-class="!h-auto !rounded-[8px] !px-[1.2rem] !py-[0.9rem] !text-[1.4rem]"
          />
          <label class="flex items-center justify-between rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]">
            <span>Listable</span>
            <input v-model="form.listable" type="checkbox" />
          </label>
          <label class="flex items-center justify-between rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]">
            <span>Has children</span>
            <input v-model="form.hasChildren" type="checkbox" />
          </label>
          <label class="flex items-center justify-between rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]">
            <span>Has active children</span>
            <input v-model="form.hasActiveChildren" type="checkbox" />
          </label>
          <button class="w-full rounded-[8px] bg-primary px-[1.4rem] py-[1rem] font-[700] text-white" :disabled="store.saving">
            {{ store.saving ? "Saving..." : "Save category" }}
          </button>
        </div>
      </form>

      <div class="space-y-[1.6rem]">
        <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
          <div class="grid grid-cols-1 gap-[1rem] md:grid-cols-4">
            <input v-model="search" class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]" placeholder="Search categories" @keyup.enter="fetchAll" />
            <SearchableSelectInput
              :model-value="parentId"
              :options="filterParentOptions"
              placeholder="All parents"
              search-placeholder="Search parent categories"
              input-class="!h-auto !rounded-[8px] !px-[1.2rem] !py-[0.9rem] !text-[1.4rem]"
              @update:model-value="updateParentFilter"
            />
            <SearchableSelectInput
              :model-value="listable"
              :options="listableOptions"
              placeholder="Any listability"
              search-placeholder="Search listability"
              input-class="!h-auto !rounded-[8px] !px-[1.2rem] !py-[0.9rem] !text-[1.4rem]"
              @update:model-value="updateListableFilter"
            />
            <button class="rounded-[8px] border border-slate-200 px-[1.4rem] py-[0.9rem] font-[700]" @click="fetchAll">Refresh</button>
          </div>
        </section>

        <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
          <div v-if="store.loading" class="p-[2rem]">Loading categories...</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[820px] text-left">
              <thead class="bg-slate-50 text-[1.2rem] uppercase text-slate-500">
                <tr>
                  <th class="px-[1.6rem] py-[1.2rem]">Name</th>
                  <th class="px-[1.6rem] py-[1.2rem]">Parent</th>
                  <th class="px-[1.6rem] py-[1.2rem]">Listable</th>
                  <th class="px-[1.6rem] py-[1.2rem]">Children</th>
                  <th class="px-[1.6rem] py-[1.2rem]">Updated by</th>
                  <th class="px-[1.6rem] py-[1.2rem]"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="category in store.categories" :key="category.id" class="border-t border-slate-100">
                  <td class="px-[1.6rem] py-[1.2rem] font-[700] text-[#000]">{{ category.name }}</td>
                  <td class="px-[1.6rem] py-[1.2rem]">{{ parentName(category.parentId) }}</td>
                  <td class="px-[1.6rem] py-[1.2rem]">{{ category.listable === false ? "No" : "Yes" }}</td>
                  <td class="px-[1.6rem] py-[1.2rem]">{{ category.hasActiveChildren ? "Active" : category.hasChildren ? "Yes" : "No" }}</td>
                  <td class="px-[1.6rem] py-[1.2rem]">{{ category.updatedBy?.email || "-" }}</td>
                  <td class="px-[1.6rem] py-[1.2rem]">
                    <div class="flex justify-end gap-[1rem]">
                      <button class="font-[700] text-primary" @click="editCategory(category)">Edit</button>
                      <button class="font-[700] text-red-600" @click="removeCategory(category)">Delete</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="store.categories.length === 0">
                  <td colspan="6" class="px-[1.6rem] py-[2rem]">No categories found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>

    <section v-else class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <div class="flex items-center justify-between gap-[1rem] p-[2rem]">
        <h2 class="text-[1.6rem] font-[700] text-[#000]">Tenant-created categories</h2>
        <button class="rounded-[8px] border border-slate-200 px-[1.4rem] py-[0.9rem] font-[700]" @click="store.fetchCustomReview">Refresh</button>
      </div>
      <div v-if="store.reviewing" class="p-[2rem]">Loading review queue...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left">
          <thead class="bg-slate-50 text-[1.2rem] uppercase text-slate-500">
            <tr>
              <th class="px-[1.6rem] py-[1.2rem]">Name</th>
              <th class="px-[1.6rem] py-[1.2rem]">Tenant</th>
              <th class="px-[1.6rem] py-[1.2rem]">Usage</th>
              <th class="px-[1.6rem] py-[1.2rem]">Parent</th>
              <th class="px-[1.6rem] py-[1.2rem]"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="category in store.customReview" :key="category.id" class="border-t border-slate-100">
              <td class="px-[1.6rem] py-[1.2rem] font-[700] text-[#000]">{{ category.name }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ category.tenantId }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ category.productUsageCount }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ category.parentId || "-" }}</td>
              <td class="px-[1.6rem] py-[1.2rem] text-right">
                <button class="font-[700] text-primary" :disabled="promotingId === category.id" @click="openPromotionDrawer(category)">
                  Promote
                </button>
              </td>
            </tr>
            <tr v-if="store.customReview.length === 0">
              <td colspan="5" class="px-[1.6rem] py-[2rem]">No custom categories awaiting review.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Drawer :open="isPromotionDrawerOpen" side="right" content-class="p-0" @update:open="handlePromotionDrawerOpenChange">
      <form class="flex h-full flex-col bg-white" @submit.prevent="promoteCategory">
        <header class="flex items-center justify-between border-b border-slate-100 p-[2rem]">
          <div>
            <h2 class="text-[1.8rem] font-[700] text-[#000]">Promote category</h2>
            <p class="mt-[0.4rem] text-[1.2rem] text-slate-500">
              {{ selectedReviewCategory?.name || "Tenant category" }}
            </p>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-700" @click="closePromotionDrawer">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="flex-1 space-y-[1.6rem] overflow-y-auto p-[2rem]">
          <section class="rounded-[8px] border border-slate-200 p-[1.4rem]">
            <label class="mb-[0.8rem] block text-[1.3rem] font-[700] text-[#000]">
              Copy attributes from system category
            </label>
            <SearchableSelectInput
              :model-value="promotionSourceCategoryId"
              :options="promotionSourceCategoryOptions"
              placeholder="Select a category to copy from"
              search-placeholder="Search system categories"
              input-class="!h-auto !rounded-[8px] !px-[1.2rem] !py-[0.9rem] !text-[1.4rem]"
              @update:model-value="updatePromotionSourceCategory"
            />
          </section>

          <div>
            <label class="mb-[0.8rem] block text-[1.3rem] font-[700] text-[#000]">Category name</label>
            <input
              v-model="promotionForm.name"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              placeholder="Category name"
            />
          </div>

          <div>
            <label class="mb-[0.8rem] block text-[1.3rem] font-[700] text-[#000]">Parent category</label>
            <SearchableSelectInput
              v-model="promotionForm.parentId"
              :options="promotionParentOptions"
              placeholder="No parent"
              search-placeholder="Search parent categories"
              input-class="!h-auto !rounded-[8px] !px-[1.2rem] !py-[0.9rem] !text-[1.4rem]"
            />
          </div>

          <label class="flex items-center justify-between rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]">
            <span>
              <span class="block font-[700] text-[#000]">Listable</span>
              <span class="text-[1.2rem] text-slate-500">Allow merchants to list products in this category.</span>
            </span>
            <input v-model="promotionForm.listable" type="checkbox" />
          </label>

          <label class="flex items-center justify-between rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]">
            <span>
              <span class="block font-[700] text-[#000]">Has children</span>
              <span class="text-[1.2rem] text-slate-500">Use this when the category can contain subcategories.</span>
            </span>
            <input v-model="promotionForm.hasChildren" type="checkbox" />
          </label>

          <label class="flex items-center justify-between rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]">
            <span>
              <span class="block font-[700] text-[#000]">Has active children</span>
              <span class="text-[1.2rem] text-slate-500">Show navigation into active child categories.</span>
            </span>
            <input v-model="promotionForm.hasActiveChildren" type="checkbox" />
          </label>
        </div>

        <footer class="flex justify-end gap-[1rem] border-t border-slate-100 bg-slate-50 p-[2rem]">
          <button type="button" class="rounded-[8px] border border-slate-200 px-[1.4rem] py-[0.9rem] font-[700]" @click="closePromotionDrawer">
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white disabled:opacity-60"
            :disabled="store.saving || promotingId === selectedReviewCategory?.id"
          >
            {{ promotingId === selectedReviewCategory?.id ? "Promoting..." : "Promote category" }}
          </button>
        </footer>
      </form>
    </Drawer>
  </div>
</template>
