<script setup>
import { computed, onMounted, ref } from "vue";
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-product-templates",
});

useHead({
  title: "Product Templates - ShopSynch Admin",
});

const route = useRoute();
const router = useRouter();
const categoryStore = useAdminCategoriesStore();
const productTemplateStore = useProductTemplateStore();
const toastStore = useToastStore();

const isDrawerOpen = ref(false);
const selectedTemplate = ref(null);
const selectedCategoryId = ref("");
const deletingTemplateId = ref("");
const search = ref("");
const statusFilter = ref("");

const templates = computed(() => productTemplateStore.templates || []);
const activeTemplates = computed(() => templates.value.filter((template) => template.status !== "DRAFT" && template.status !== "DISABLED"));
const templatedCategoryIds = computed(() => new Set(activeTemplates.value.map((template) => template.categoryId).filter(Boolean)));

const stats = computed(() => {
  const totalCategories = categoryStore.categories.length;
  const withTemplate = categoryStore.categories.filter((category) => templatedCategoryIds.value.has(category.id)).length;
  const draftTemplates = templates.value.filter((template) => template.status === "DRAFT").length;
  const disabledTemplates = templates.value.filter((template) => template.status === "DISABLED").length;

  return [
    { label: "System categories", value: totalCategories },
    { label: "With active template", value: withTemplate },
    { label: "Without active template", value: Math.max(totalCategories - withTemplate, 0) },
    { label: "Draft / disabled", value: `${draftTemplates} / ${disabledTemplates}` },
  ];
});

const templateRows = computed(() =>
  templates.value
    .map((template) => ({
      ...template,
      status: template.status || "ACTIVE",
      categoryName: getCategoryName(template.categoryId),
      attributeCount: template.attributeDefinitions?.length || 0,
      variantCount: (template.attributeDefinitions || []).filter(isVariantAttribute).length,
    }))
    .filter((template) => {
      const term = search.value.trim().toLowerCase();
      const matchesSearch = !term
        || template.name?.toLowerCase().includes(term)
        || template.categoryName?.toLowerCase().includes(term);
      const matchesStatus = !statusFilter.value || template.status === statusFilter.value;
      return matchesSearch && matchesStatus;
    })
);

const categoriesWithoutTemplates = computed(() =>
  categoryStore.categories
    .filter((category) => !templatedCategoryIds.value.has(category.id))
    .map((category) => category.name)
);

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Disabled", value: "DISABLED" },
];

function isVariantAttribute(attribute) {
  return attribute?.variantDimension === true || attribute?.isVariantDimension === true;
}

function getCategoryName(categoryId) {
  return categoryStore.categories.find((category) => category.id === categoryId)?.name || "Unknown category";
}

function statusClass(status) {
  if (status === "DRAFT") return "bg-amber-50 text-amber-700";
  if (status === "DISABLED") return "bg-rose-50 text-rose-700";
  return "bg-emerald-50 text-emerald-700";
}

function openCreateDrawer(categoryId = "") {
  selectedTemplate.value = null;
  selectedCategoryId.value = categoryId;
  isDrawerOpen.value = true;
}

function openEditDrawer(template) {
  selectedTemplate.value = template;
  selectedCategoryId.value = template.categoryId;
  isDrawerOpen.value = true;
}

async function deleteTemplate(template) {
  if (!window.confirm(`Delete ${template.name}? Categories using it will have no active template until another one is published.`)) return;

  deletingTemplateId.value = template.id;
  try {
    const response = await productTemplateStore.deleteTemplate(template.id);
    if (response?.status) {
      productTemplateStore.clearCategoryCache(template.categoryId);
      toastStore.success("Template deleted successfully");
      await loadTemplates();
    }
  } catch (error) {
    logger.error("Failed to delete template", error);
  } finally {
    deletingTemplateId.value = "";
  }
}

async function handleCategoryQuery() {
  const categoryId = route.query.categoryId;
  if (!categoryId || typeof categoryId !== "string") return;

  const existingTemplate = templates.value.find((template) => template.categoryId === categoryId);
  if (existingTemplate) {
    openEditDrawer(existingTemplate);
  } else {
    openCreateDrawer(categoryId);
  }
  await router.replace({ path: "/dashboard/product-templates" });
}

async function loadTemplates() {
  await Promise.all([
    categoryStore.fetchCategories(),
    productTemplateStore.getTemplates({ systemOnly: true }),
  ]);
}

async function reloadAndClose() {
  await loadTemplates();
}

onMounted(async () => {
  await loadTemplates();
  await handleCategoryQuery();
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Product Templates</h1>
          <p class="mt-[0.4rem] max-w-[72rem] text-slate-500">
            Manage platform category schemas used by merchant product forms and storefront product detail pages.
          </p>
        </div>
        <button class="inline-flex items-center gap-[0.6rem] rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white" @click="openCreateDrawer()">
          <span class="material-symbols-outlined text-[1.8rem]">add</span>
          Add template
        </button>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-[1.2rem] md:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="rounded-[8px] bg-white p-[1.6rem] shadow-sm">
        <p class="text-[1.2rem] font-[700] uppercase text-slate-400">{{ stat.label }}</p>
        <p class="mt-[0.8rem] text-[2rem] font-[800] text-[#000]">{{ stat.value }}</p>
      </div>
    </section>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="grid grid-cols-1 gap-[1rem] md:grid-cols-[1fr_220px_auto]">
        <input v-model="search" class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]" placeholder="Search templates or categories" />
        <select v-model="statusFilter" class="rounded-[8px] border border-slate-200 bg-white px-[1.2rem] py-[0.9rem]">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <button class="rounded-[8px] border border-slate-200 px-[1.4rem] py-[0.9rem] font-[700]" @click="loadTemplates">Refresh</button>
      </div>
    </section>

    <section v-if="categoriesWithoutTemplates.length" class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1rem] lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 class="text-[1.6rem] font-[700] text-[#000]">Categories without active templates</h2>
          <p class="mt-[0.4rem] text-slate-500">Draft and disabled templates are counted as not active.</p>
        </div>
        <div class="flex max-w-[72rem] flex-wrap gap-[0.8rem]">
          <span v-for="name in categoriesWithoutTemplates" :key="name" class="rounded-full bg-slate-100 px-[1rem] py-[0.5rem] text-[1.2rem] font-[700] text-slate-600">
            {{ name }}
          </span>
        </div>
      </div>
    </section>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <div v-if="productTemplateStore.isLoading || categoryStore.loading" class="p-[2rem]">Loading templates...</div>
      <div v-else-if="templateRows.length === 0" class="p-[4rem] text-center">
        <span class="material-symbols-outlined text-[4rem] text-slate-300">dashboard_customize</span>
        <p class="mt-[1rem] text-[1.6rem] font-[700] text-[#000]">No templates found</p>
        <p class="mt-[0.4rem] text-slate-500">Create a template to attach product attributes to a system category.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[920px] text-left">
          <thead class="bg-slate-50 text-[1.2rem] uppercase text-slate-500">
            <tr>
              <th class="px-[1.6rem] py-[1.2rem]">Name</th>
              <th class="px-[1.6rem] py-[1.2rem]">Category</th>
              <th class="px-[1.6rem] py-[1.2rem]">Status</th>
              <th class="px-[1.6rem] py-[1.2rem]">Product types</th>
              <th class="px-[1.6rem] py-[1.2rem]">Attributes</th>
              <th class="px-[1.6rem] py-[1.2rem]"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="template in templateRows" :key="template.id" class="border-t border-slate-100">
              <td class="px-[1.6rem] py-[1.2rem]">
                <div class="font-[700] text-[#000]">{{ template.name }}</div>
                <div class="mt-[0.3rem] text-[1.2rem] text-slate-400">{{ template.id }}</div>
              </td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ template.categoryName }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">
                <span class="rounded-full px-[1rem] py-[0.5rem] text-[1.2rem] font-[800]" :class="statusClass(template.status)">
                  {{ template.status }}
                </span>
              </td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ template.productTypes?.length ? template.productTypes.join(", ") : "All types" }}</td>
              <td class="px-[1.6rem] py-[1.2rem]">{{ template.attributeCount }} total, {{ template.variantCount }} variant</td>
              <td class="px-[1.6rem] py-[1.2rem]">
                <div class="flex justify-end gap-[0.8rem]">
                  <button class="inline-flex h-[4rem] w-[4rem] items-center justify-center rounded-[8px] border border-slate-200 text-slate-600 hover:border-primary hover:text-primary" title="Edit template" @click="openEditDrawer(template)">
                    <span class="material-symbols-outlined text-[2rem]">edit</span>
                  </button>
                  <button
                    class="inline-flex h-[4rem] w-[4rem] items-center justify-center rounded-[8px] border border-rose-100 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                    title="Delete template"
                    :disabled="deletingTemplateId === template.id"
                    @click="deleteTemplate(template)"
                  >
                    <span class="material-symbols-outlined text-[2rem]">{{ deletingTemplateId === template.id ? "progress_activity" : "delete" }}</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <DashboardProductTemplateDrawer
      v-model:open="isDrawerOpen"
      :template="selectedTemplate"
      :category-id="selectedCategoryId"
      @success="reloadAndClose"
    />
  </div>
</template>
