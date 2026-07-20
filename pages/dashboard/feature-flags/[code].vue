<script setup>
import { logger, formatDate } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-feature-flags-detail",
});

const route = useRoute();
const featureFlagsStore = useAdminFeatureFlagsStore();

const code = computed(() => route.params.code);

const editMode = ref(false);
const showOverrideModal = ref(false);

const defaultStatuses = ["ENABLED", "BETA", "COMING_SOON", "HIDDEN", "DEPRECATED"];
const overrideStatuses = ["ENABLED", "BETA", "COMING_SOON", "HIDDEN", "DEPRECATED"];
const categories = ["INSIGHTS", "PAYMENTS", "LOGISTICS", "COMPLIANCE", "GENERAL"];

const statusBadgeClass = {
  ENABLED: "bg-[#B5F9B4] text-[#3CA745]",
  BETA: "bg-[#D0E8FF] text-[#0066CC]",
  COMING_SOON: "bg-[#FFF9C5] text-[#E79640]",
  HIDDEN: "bg-[#F3F4F6] text-[#6B7280]",
  DEPRECATED: "bg-[#FFE1C2] text-[#B45309]",
};

const overrideBadgeClass = {
  ENABLED: "bg-[#B5F9B4] text-[#3CA745]",
  BETA: "bg-[#D0E8FF] text-[#0066CC]",
  COMING_SOON: "bg-[#FFF9C5] text-[#E79640]",
  HIDDEN: "bg-[#F3F4F6] text-[#6B7280]",
  DEPRECATED: "bg-[#FFE1C2] text-[#B45309]",
};

const editForm = ref({});
const overrideForm = ref({
  tenantId: "",
  status: "ENABLED",
  reason: "",
  expiresAt: "",
  adminNotes: "",
});

function populateEditForm(flag) {
  editForm.value = {
    name: flag.name || "",
    description: flag.description || "",
    defaultStatus: flag.defaultStatus || flag.status || "ENABLED",
    category: flag.category || "",
    displayOrder: flag.displayOrder ?? null,
    releaseNotes: flag.releaseNotes || "",
    targetReleaseDate: flag.targetReleaseDate ? flag.targetReleaseDate.substring(0, 10) : "",
    documentation: flag.documentation || "",
    ownerTeam: flag.ownerTeam || "",
    enabled: flag.enabled ?? true,
  };
}

async function load() {
  try {
    await featureFlagsStore.fetchFlag(code.value);
  } catch (err) {
    logger.error("Failed to load feature flag", err);
  }
}

async function submitUpdate(payload) {
  try {
    const payload = { ...editForm.value };
    if (!payload.displayOrder) delete payload.displayOrder;
    if (!payload.releaseNotes) delete payload.releaseNotes;
    if (!payload.targetReleaseDate) delete payload.targetReleaseDate;
    if (!payload.documentation) delete payload.documentation;
    if (!payload.ownerTeam) delete payload.ownerTeam;
    if (!payload.category) delete payload.category;

    const res = await featureFlagsStore.updateFlag(code.value, payload);
    if (res) {
      editMode.value = false;
      await load();
    }
  } catch (err) {
    logger.error("Failed to update feature flag", err);
  }
}

function resetOverrideForm() {
  overrideForm.value = { tenantId: "", status: "ENABLED", reason: "", expiresAt: "", adminNotes: "" };
}

async function submitOverride() {
  if (!overrideForm.value.tenantId || !overrideForm.value.status) return;
  try {
    const res = await featureFlagsStore.addTenantOverride(code.value, payload);
    if (res) {
      showOverrideModal.value = false;
      await load();
    }
  } catch (err) {
    logger.error("Failed to apply tenant override", err);
  }
}

function isExpired(override) {
  if (!override.expiresAt) return false;
  return new Date(override.expiresAt) < new Date();
}

onMounted(load);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <!-- Back + Header -->
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="mb-[0.8rem]">
        <NuxtLink
          to="/dashboard/feature-flags"
          class="flex items-center gap-[0.4rem] text-[1.2rem] text-gray-500 hover:text-primary font-[500]"
        >
          <span class="material-symbols-outlined text-[1.6rem]">arrow_back</span>
          Feature Flags
        </NuxtLink>
      </div>

      <div v-if="featureFlagsStore.loading" class="h-[60px] animate-pulse rounded-[8px] bg-gray-100" />

      <div v-else-if="featureFlagsStore.selectedFlag" class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-[1.2rem]">
            <h1 class="text-[2rem] font-[700] text-[#000]">{{ featureFlagsStore.selectedFlag.name }}</h1>
            <span class="font-mono text-[1.4rem] text-gray-400 font-[600]">{{ featureFlagsStore.selectedFlag.code }}</span>
            <span
              :class="statusBadgeClass[featureFlagsStore.selectedFlag.defaultStatus] || 'bg-gray-100 text-gray-600'"
              class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[500]"
            >
              {{ featureFlagsStore.selectedFlag.defaultStatus?.replace(/_/g, " ") }}
            </span>
            <span
              :class="featureFlagsStore.selectedFlag.enabled ? 'bg-[#B5F9B4] text-[#3CA745]' : 'bg-[#F3F4F6] text-[#6B7280]'"
              class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[500]"
            >
              {{ featureFlagsStore.selectedFlag.enabled ? "Enabled" : "Disabled" }}
            </span>
            <span
              v-if="featureFlagsStore.selectedFlag.isExperimental"
              class="inline-flex items-center rounded-full bg-purple-100 text-purple-700 px-[1rem] py-[0.3rem] text-[1.2rem] font-[500]"
            >
              Experimental
            </span>
          </div>
          <p v-if="featureFlagsStore.selectedFlag.description" class="mt-[0.4rem] text-gray-500">
            {{ featureFlagsStore.selectedFlag.description }}
          </p>
        </div>
        <div class="flex shrink-0 gap-[1rem]">
          <button
            class="rounded-[8px] border border-slate-200 px-[1.4rem] py-[0.9rem] font-[600] text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
            @click="editMode = !editMode"
          >
            {{ editMode ? "Cancel" : "Edit Flag" }}
          </button>
          <button
            class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white hover:opacity-90 cursor-pointer"
            @click="showOverrideModal = true"
          >
            + Tenant Override
          </button>
        </div>
      </div>
    </section>

    <div v-if="featureFlagsStore.selectedFlag" class="grid gap-[1.6rem] lg:grid-cols-[1fr_360px]">
      <!-- Edit form / Details -->
      <div class="space-y-[1.6rem]">
        <!-- Edit form -->
        <section v-if="editMode" class="rounded-[8px] bg-white p-[2rem] shadow-sm">
          <h2 class="mb-[1.6rem] text-[1.6rem] font-[700] text-[#000] border-b border-slate-100 pb-[0.8rem]">Edit Flag</h2>
          <DashboardFeatureFlagsFeatureFlagForm
            :is-edit="true"
            :initial-data="featureFlagsStore.selectedFlag"
            :loading="featureFlagsStore.saving"
            @submit="submitUpdate"
            @cancel="editMode = false"
          />
        </section>

        <!-- Metadata view -->
        <div v-else class="space-y-[1.6rem]">
          <!-- Metadata Panels -->
          <section class="rounded-[8px] bg-white p-[2rem] shadow-sm space-y-[2rem]">
            <!-- General Info -->
            <div>
              <h3 class="mb-[1.2rem] text-[1.5rem] font-[700] text-[#000] border-b border-slate-100 pb-[0.4rem]">General Metadata</h3>
              <dl class="grid grid-cols-2 gap-x-[2rem] gap-y-[1.2rem]">
                <div>
                  <dt class="text-[1.2rem] text-gray-500">Category</dt>
                  <dd class="font-[600]">{{ featureFlagsStore.selectedFlag.category || "—" }}</dd>
                </div>
                <div>
                  <dt class="text-[1.2rem] text-gray-500">Owner Team</dt>
                  <dd class="font-[600]">{{ featureFlagsStore.selectedFlag.ownerTeam || "—" }}</dd>
                </div>
                <div>
                  <dt class="text-[1.2rem] text-gray-500">Display Order</dt>
                  <dd class="font-[600]">{{ featureFlagsStore.selectedFlag.displayOrder ?? "—" }}</dd>
                </div>
                <div>
                  <dt class="text-[1.2rem] text-gray-500">Experimental Feature</dt>
                  <dd class="font-[600]">{{ featureFlagsStore.selectedFlag.isExperimental ? "Yes" : "No" }}</dd>
                </div>
                <div v-if="featureFlagsStore.selectedFlag.documentation" class="col-span-2">
                  <dt class="text-[1.2rem] text-gray-500">Documentation</dt>
                  <dd class="mt-[0.2rem]">
                    <a
                      :href="featureFlagsStore.selectedFlag.documentation"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary underline font-[500] break-all inline-flex items-center gap-[0.4rem]"
                    >
                      <span>{{ featureFlagsStore.selectedFlag.documentation }}</span>
                      <span class="material-symbols-outlined text-[1.4rem]">open_in_new</span>
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Access Control rules -->
            <div>
              <label class="mb-[0.4rem] block font-[600]">Documentation URL</label>
              <input
                v-model="editForm.documentation"
                type="url"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                placeholder="https://..."
              />
            </div>

            <!-- Lifecycle Dates -->
            <div>
              <h3 class="mb-[1.2rem] text-[1.5rem] font-[700] text-[#000] border-b border-slate-100 pb-[0.4rem]">Lifecycle Timeline</h3>
              <dl class="grid grid-cols-2 gap-x-[2rem] gap-y-[1.2rem]">
                <div>
                  <dt class="text-[1.2rem] text-gray-500">Created At</dt>
                  <dd class="font-[600]">{{ featureFlagsStore.selectedFlag.createdAt ? formatDate(featureFlagsStore.selectedFlag.createdAt) : "—" }}</dd>
                </div>
                <div>
                  <dt class="text-[1.2rem] text-gray-500">Updated At</dt>
                  <dd class="font-[600]">{{ featureFlagsStore.selectedFlag.updatedAt ? formatDate(featureFlagsStore.selectedFlag.updatedAt) : "—" }}</dd>
                </div>
                <div>
                  <dt class="text-[1.2rem] text-gray-500">Released At</dt>
                  <dd class="font-[600]">{{ featureFlagsStore.selectedFlag.releasedAt ? formatDate(featureFlagsStore.selectedFlag.releasedAt) : "—" }}</dd>
                </div>
                <div>
                  <dt class="text-[1.2rem] text-gray-500">Deprecated At</dt>
                  <dd class="font-[600]">{{ featureFlagsStore.selectedFlag.deprecatedAt ? formatDate(featureFlagsStore.selectedFlag.deprecatedAt) : "—" }}</dd>
                </div>
                <div v-if="featureFlagsStore.selectedFlag.targetReleaseDate">
                  <dt class="text-[1.2rem] text-gray-500">Target Release Date</dt>
                  <dd class="font-[600]">{{ formatDate(featureFlagsStore.selectedFlag.targetReleaseDate) }}</dd>
                </div>
              </dl>
            </div>

            <!-- Release Notes -->
            <div v-if="featureFlagsStore.selectedFlag.releaseNotes">
              <h3 class="mb-[1rem] text-[1.5rem] font-[700] text-[#000] border-b border-slate-100 pb-[0.4rem]">Release Notes</h3>
              <p class="whitespace-pre-line text-gray-600 bg-slate-50 p-[1.2rem] rounded-[8px] leading-[1.6]">
                {{ featureFlagsStore.selectedFlag.releaseNotes }}
              </p>
            </div>
            <div>
              <dt class="text-[1.2rem] text-gray-500">Owner Team</dt>
              <dd class="font-[600]">{{ featureFlagsStore.selectedFlag.ownerTeam || "—" }}</dd>
            </div>
            <div>
              <dt class="text-[1.2rem] text-gray-500">Display Order</dt>
              <dd class="font-[600]">{{ featureFlagsStore.selectedFlag.displayOrder ?? "—" }}</dd>
            </div>
            <div>
              <dt class="text-[1.2rem] text-gray-500">Target Release Date</dt>
              <dd class="font-[600]">
                {{ featureFlagsStore.selectedFlag.targetReleaseDate ? formatDate(featureFlagsStore.selectedFlag.targetReleaseDate) : "—" }}
              </dd>
            </div>
            <div v-if="featureFlagsStore.selectedFlag.documentation" class="col-span-2">
              <dt class="text-[1.2rem] text-gray-500">Documentation</dt>
              <dd>
                <a
                  :href="featureFlagsStore.selectedFlag.documentation"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary underline"
                >
                  {{ featureFlagsStore.selectedFlag.documentation }}
                </a>
              </dd>
            </div>
            <div v-if="featureFlagsStore.selectedFlag.releaseNotes" class="col-span-2">
              <dt class="text-[1.2rem] text-gray-500">Release Notes</dt>
              <dd class="whitespace-pre-line">{{ featureFlagsStore.selectedFlag.releaseNotes }}</dd>
            </div>
          </dl>
        </section>

        <!-- Adoption Metrics -->
        <section
          v-if="featureFlagsStore.selectedFlag.adoptionMetrics"
          class="rounded-[8px] bg-white p-[2rem] shadow-sm"
        >
          <h2 class="mb-[1.6rem] text-[1.6rem] font-[700] text-[#000]">Adoption Metrics</h2>
          <div class="grid grid-cols-2 gap-[1.6rem] sm:grid-cols-3">
            <div
              v-for="(value, key) in featureFlagsStore.selectedFlag.adoptionMetrics"
              :key="key"
              class="rounded-[8px] border border-slate-100 p-[1.2rem]"
            >
              <p class="text-[1.2rem] text-gray-500">{{ key }}</p>
              <p class="text-[1.8rem] font-[700] text-[#000]">{{ value }}</p>
            </div>
          </section>
        </div>
      </div>

      <!-- Sidebar: Tenant Overrides -->
      <div class="space-y-[1.6rem]">
        <!-- Tenant Overrides Sidebar List -->
        <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
          <div class="mb-[1.2rem] flex items-center justify-between border-b border-slate-100 pb-[0.8rem]">
            <h2 class="text-[1.6rem] font-[700] text-[#000]">Tenant Overrides</h2>
            <span class="text-[1.2rem] font-[600] text-gray-400">
              {{ (featureFlagsStore.selectedFlag.tenantOverrides || []).length }} total
            </span>
          </div>

          <!-- Current Tenant Status Context from details response (if applicable) -->
          <div v-if="featureFlagsStore.selectedFlag.tenantOverrideStatus" class="mb-[1.6rem] p-[1.2rem] rounded-[8px] bg-primary/5 border border-primary/10">
            <h4 class="text-[1.2rem] font-[700] text-primary uppercase tracking-wide">Active Override Context</h4>
            <div class="mt-[0.6rem] flex items-center justify-between">
              <span class="text-[1.2rem] text-gray-500 font-[500]">Status:</span>
              <span :class="overrideBadgeClass[featureFlagsStore.selectedFlag.tenantOverrideStatus]" class="px-[0.8rem] py-[0.2rem] rounded-full text-[1.1rem] font-[600]">
                {{ featureFlagsStore.selectedFlag.tenantOverrideStatus }}
              </span>
            </div>
            <div v-if="featureFlagsStore.selectedFlag.overrideGrantedAt" class="mt-[0.4rem] flex items-center justify-between text-[1.1rem]">
              <span class="text-gray-400">Granted:</span>
              <span class="font-[600] text-gray-600">{{ formatDate(featureFlagsStore.selectedFlag.overrideGrantedAt) }}</span>
            </div>
            <div v-if="featureFlagsStore.selectedFlag.overrideExpiresAt" class="mt-[0.4rem] flex items-center justify-between text-[1.1rem]">
              <span class="text-gray-400">Expires:</span>
              <span class="font-[600] text-gray-600">{{ formatDate(featureFlagsStore.selectedFlag.overrideExpiresAt) }}</span>
            </div>
          </div>

          <div
            v-if="!(featureFlagsStore.selectedFlag.tenantOverrides || []).length"
            class="py-[2rem] text-center text-gray-400 font-[500]"
          >
            No overrides configured
          </div>

          <div v-else class="space-y-[1rem]">
            <div
              v-for="(override, idx) in featureFlagsStore.selectedFlag.tenantOverrides"
              :key="idx"
              class="rounded-[8px] border border-slate-100 p-[1.2rem]"
              :class="{ 'opacity-50': isExpired(override) }"
            >
              <div class="flex items-center justify-between gap-[0.8rem]">
                <span class="font-mono text-[1.2rem] font-[600]">{{ override.tenantId }}</span>
                <div class="flex items-center gap-[0.6rem]">
                  <span
                    v-if="isExpired(override)"
                    class="rounded-full bg-[#FFBFBF] px-[0.8rem] py-[0.2rem] text-[1.1rem] font-[500] text-[#FF3131]"
                  >
                    Expired
                  </span>
                  <span
                    :class="overrideBadgeClass[override.status] || 'bg-gray-100 text-gray-600'"
                    class="inline-flex items-center rounded-full px-[0.8rem] py-[0.2rem] text-[1.1rem] font-[500]"
                  >
                    {{ override.status?.replace(/_/g, " ") }}
                  </span>
                </div>
              </div>
              <div v-if="override.reason" class="mt-[0.6rem] text-[1.2rem] text-gray-500 font-[500]">
                {{ override.reason }}
              </div>
              <div v-if="override.expiresAt" class="mt-[0.4rem] text-[1.2rem] text-gray-400 font-[500]">
                Expires: {{ formatDate(override.expiresAt) }}
              </div>
              <div v-if="override.adminNotes" class="mt-[0.4rem] text-[1.2rem] italic text-gray-400 font-[500]">
                Note: {{ override.adminNotes }}
              </div>
            </div>
          </div>
        </section>

        <!-- Admin Notes -->
        <section
          v-if="featureFlagsStore.selectedFlag.adminNotes"
          class="rounded-[8px] bg-white p-[2rem] shadow-sm"
        >
          <h2 class="mb-[0.8rem] text-[1.6rem] font-[700] text-[#000] border-b border-slate-100 pb-[0.4rem]">Admin Notes</h2>
          <p class="whitespace-pre-line text-gray-600 leading-[1.6] italic">{{ featureFlagsStore.selectedFlag.adminNotes }}</p>
        </section>
      </div>
    </div>

    <!-- Tenant Override Modal -->
    <DashboardFeatureFlagsTenantOverrideModal
      v-model:open="showOverrideModal"
      :loading="featureFlagsStore.overriding"
      @submit="submitOverride"
    />
  </div>
</template>
