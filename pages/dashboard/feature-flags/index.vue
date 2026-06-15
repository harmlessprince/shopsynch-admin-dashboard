<script setup>
import { logger } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-feature-flags",
});

const featureFlagsStore = useAdminFeatureFlagsStore();
const router = useRouter();

const search = ref("");
const category = ref("");
const defaultStatus = ref("");
const page = ref(1);
const limit = ref(50);

const showCreateModal = ref(false);
const creating = ref(false);

const defaultStatuses = ["ACTIVE", "BETA", "COMING_SOON", "DISABLED"];
const categories = ["INSIGHTS", "PAYMENTS", "LOGISTICS", "COMPLIANCE", "GENERAL"];

const newFlag = ref({
  code: "",
  name: "",
  description: "",
  defaultStatus: "ACTIVE",
  category: "",
  displayOrder: null,
  releaseNotes: "",
  targetReleaseDate: "",
  documentationUrl: "",
  ownerTeam: "",
  enabled: true,
});

const statusBadgeClass = {
  ACTIVE: "bg-[#B5F9B4] text-[#3CA745]",
  BETA: "bg-[#D0E8FF] text-[#0066CC]",
  COMING_SOON: "bg-[#FFF9C5] text-[#E79640]",
  DISABLED: "bg-[#F3F4F6] text-[#6B7280]",
};

const tableHeader = [
  { title: "Code", accessor: "code" },
  { title: "Name", accessor: "name" },
  { title: "Category", accessor: "category" },
  { title: "Default Status", accessor: "defaultStatus" },
  { title: "Owner Team", accessor: "ownerTeam" },
  { title: "Target Release", accessor: "targetReleaseDate", type: "date" },
  { title: "Enabled", accessor: "enabled" },
];

const params = computed(() => ({
  search: search.value || undefined,
  category: category.value || undefined,
  defaultStatus: defaultStatus.value || undefined,
  page: page.value - 1,
  limit: limit.value,
}));

async function fetchFlags(nextPage = page.value) {
  try {
    page.value = nextPage;
    await featureFlagsStore.fetchFlags(params.value);
  } catch (err) {
    logger.error("Failed to load feature flags", err);
  }
}

function applyFilters() {
  fetchFlags(1);
}

function changeLimit(nextLimit) {
  limit.value = nextLimit;
  fetchFlags(1);
}

function openDetail(row) {
  router.push(`/dashboard/feature-flags/${row.code}`);
}

function resetNewFlag() {
  newFlag.value = {
    code: "",
    name: "",
    description: "",
    defaultStatus: "ACTIVE",
    category: "",
    displayOrder: null,
    releaseNotes: "",
    targetReleaseDate: "",
    documentationUrl: "",
    ownerTeam: "",
    enabled: true,
  };
}

async function submitCreate() {
  if (!newFlag.value.code || !newFlag.value.name) return;
  creating.value = true;
  try {
    const payload = { ...newFlag.value };
    if (!payload.displayOrder) delete payload.displayOrder;
    if (!payload.releaseNotes) delete payload.releaseNotes;
    if (!payload.targetReleaseDate) delete payload.targetReleaseDate;
    if (!payload.documentationUrl) delete payload.documentationUrl;
    if (!payload.ownerTeam) delete payload.ownerTeam;
    if (!payload.category) delete payload.category;

    const res = await featureFlagsStore.createFlag(payload);
    if (res) {
      showCreateModal.value = false;
      resetNewFlag();
      await fetchFlags(1);
    }
  } catch (err) {
    logger.error("Failed to create feature flag", err);
  } finally {
    creating.value = false;
  }
}

onMounted(fetchFlags);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <!-- Header -->
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Feature Flags</h1>
          <p class="mt-[0.4rem]">Total: {{ featureFlagsStore.flagsTotal }}</p>
        </div>
        <div class="flex flex-col gap-[1rem] sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <input
            v-model="search"
            type="text"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Search code or name"
            @keyup.enter="applyFilters"
          />
          <select
            v-model="category"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="applyFilters"
          >
            <option value="">All categories</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
          <select
            v-model="defaultStatus"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="applyFilters"
          >
            <option value="">All statuses</option>
            <option v-for="s in defaultStatuses" :key="s" :value="s">{{ s.replace(/_/g, " ") }}</option>
          </select>
          <button
            class="rounded-[8px] border border-slate-200 px-[1.4rem] py-[0.9rem]"
            @click="applyFilters"
          >
            Filter
          </button>
          <button
            class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white"
            @click="showCreateModal = true"
          >
            + New Flag
          </button>
        </div>
      </div>
    </section>

    <!-- Table -->
    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <DataTable
        :table-header="tableHeader"
        :table-data="featureFlagsStore.flags"
        :pagination="featureFlagsStore.flagsPaginatedData"
        :loading="featureFlagsStore.loading"
        @fetch-page="fetchFlags"
        @change-limit="changeLimit"
        @row-click="openDetail"
      >
        <template #cell(code)="{ row }">
          <span class="font-mono text-[1.2rem] font-[600]">{{ row.code }}</span>
        </template>
        <template #cell(defaultStatus)="{ row }">
          <span
            :class="statusBadgeClass[row.defaultStatus] || 'bg-gray-100 text-gray-600'"
            class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[500]"
          >
            {{ row.defaultStatus?.replace(/_/g, " ") }}
          </span>
        </template>
        <template #cell(enabled)="{ row }">
          <span
            :class="row.enabled ? 'bg-[#B5F9B4] text-[#3CA745]' : 'bg-[#F3F4F6] text-[#6B7280]'"
            class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[500]"
          >
            {{ row.enabled ? "Yes" : "No" }}
          </span>
        </template>
        <template #cell(ownerTeam)="{ row }">
          {{ row.ownerTeam || "—" }}
        </template>
      </DataTable>
    </section>

    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-[1.6rem]"
      @click.self="showCreateModal = false"
    >
      <div class="w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-[12px] bg-white p-[2.4rem] shadow-xl">
        <div class="mb-[2rem] flex items-center justify-between">
          <h2 class="text-[1.8rem] font-[700] text-[#000]">Create Feature Flag</h2>
          <button class="text-gray-400 hover:text-gray-600" @click="showCreateModal = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form class="space-y-[1.4rem]" @submit.prevent="submitCreate">
          <div class="grid grid-cols-2 gap-[1.2rem]">
            <div>
              <label class="mb-[0.4rem] block font-[600]">Code <span class="text-red-500">*</span></label>
              <input
                v-model="newFlag.code"
                type="text"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] font-mono uppercase"
                placeholder="e.g. INSIGHTS_V2"
                required
              />
            </div>
            <div>
              <label class="mb-[0.4rem] block font-[600]">Name <span class="text-red-500">*</span></label>
              <input
                v-model="newFlag.name"
                type="text"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                placeholder="Human-readable name"
                required
              />
            </div>
          </div>

          <div>
            <label class="mb-[0.4rem] block font-[600]">Description</label>
            <textarea
              v-model="newFlag.description"
              rows="2"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              placeholder="What this flag controls"
            />
          </div>

          <div class="grid grid-cols-2 gap-[1.2rem]">
            <div>
              <label class="mb-[0.4rem] block font-[600]">Default Status</label>
              <select
                v-model="newFlag.defaultStatus"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              >
                <option v-for="s in defaultStatuses" :key="s" :value="s">{{ s.replace(/_/g, " ") }}</option>
              </select>
            </div>
            <div>
              <label class="mb-[0.4rem] block font-[600]">Category</label>
              <select
                v-model="newFlag.category"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              >
                <option value="">— None —</option>
                <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-[1.2rem]">
            <div>
              <label class="mb-[0.4rem] block font-[600]">Owner Team</label>
              <input
                v-model="newFlag.ownerTeam"
                type="text"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                placeholder="e.g. Platform"
              />
            </div>
            <div>
              <label class="mb-[0.4rem] block font-[600]">Display Order</label>
              <input
                v-model.number="newFlag.displayOrder"
                type="number"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                placeholder="e.g. 10"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-[1.2rem]">
            <div>
              <label class="mb-[0.4rem] block font-[600]">Target Release Date</label>
              <input
                v-model="newFlag.targetReleaseDate"
                type="date"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              />
            </div>
            <div>
              <label class="mb-[0.4rem] block font-[600]">Documentation URL</label>
              <input
                v-model="newFlag.documentationUrl"
                type="url"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label class="mb-[0.4rem] block font-[600]">Release Notes</label>
            <textarea
              v-model="newFlag.releaseNotes"
              rows="2"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              placeholder="Optional release notes"
            />
          </div>

          <div class="flex items-center gap-[1rem]">
            <label class="font-[600]">Enabled</label>
            <button
              type="button"
              :class="newFlag.enabled ? 'bg-primary' : 'bg-gray-300'"
              class="relative inline-flex h-[24px] w-[44px] items-center rounded-full transition-colors"
              @click="newFlag.enabled = !newFlag.enabled"
            >
              <span
                :class="newFlag.enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'"
                class="inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition-transform"
              />
            </button>
          </div>

          <div class="flex justify-end gap-[1.2rem] pt-[0.8rem]">
            <button
              type="button"
              class="rounded-[8px] border border-slate-200 px-[1.6rem] py-[0.9rem]"
              @click="showCreateModal = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="creating || !newFlag.code || !newFlag.name"
              class="rounded-[8px] bg-primary px-[1.6rem] py-[0.9rem] font-[700] text-white disabled:opacity-50"
            >
              {{ creating ? "Creating..." : "Create" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
