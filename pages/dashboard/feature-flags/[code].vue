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

const defaultStatuses = ["ACTIVE", "BETA", "COMING_SOON", "DISABLED"];
const overrideStatuses = ["ACTIVE", "BETA", "COMING_SOON", "DISABLED"];
const categories = ["INSIGHTS", "PAYMENTS", "LOGISTICS", "COMPLIANCE", "GENERAL"];

const statusBadgeClass = {
  ACTIVE: "bg-[#B5F9B4] text-[#3CA745]",
  BETA: "bg-[#D0E8FF] text-[#0066CC]",
  COMING_SOON: "bg-[#FFF9C5] text-[#E79640]",
  DISABLED: "bg-[#F3F4F6] text-[#6B7280]",
};

const overrideBadgeClass = {
  ACTIVE: "bg-[#B5F9B4] text-[#3CA745]",
  BETA: "bg-[#D0E8FF] text-[#0066CC]",
  COMING_SOON: "bg-[#FFF9C5] text-[#E79640]",
  DISABLED: "bg-[#F3F4F6] text-[#6B7280]",
};

const editForm = ref({});
const overrideForm = ref({
  tenantId: "",
  status: "ACTIVE",
  reason: "",
  expiresAt: "",
  adminNotes: "",
});

function populateEditForm(flag) {
  editForm.value = {
    name: flag.name || "",
    description: flag.description || "",
    defaultStatus: flag.defaultStatus || "ACTIVE",
    category: flag.category || "",
    displayOrder: flag.displayOrder ?? null,
    releaseNotes: flag.releaseNotes || "",
    targetReleaseDate: flag.targetReleaseDate ? flag.targetReleaseDate.substring(0, 10) : "",
    documentationUrl: flag.documentationUrl || "",
    ownerTeam: flag.ownerTeam || "",
    enabled: flag.enabled ?? true,
  };
}

async function load() {
  try {
    const flag = await featureFlagsStore.fetchFlag(code.value);
    if (flag) populateEditForm(flag);
  } catch (err) {
    logger.error("Failed to load feature flag", err);
  }
}

async function submitUpdate() {
  try {
    const payload = { ...editForm.value };
    if (!payload.displayOrder) delete payload.displayOrder;
    if (!payload.releaseNotes) delete payload.releaseNotes;
    if (!payload.targetReleaseDate) delete payload.targetReleaseDate;
    if (!payload.documentationUrl) delete payload.documentationUrl;
    if (!payload.ownerTeam) delete payload.ownerTeam;
    if (!payload.category) delete payload.category;

    const res = await featureFlagsStore.updateFlag(code.value, payload);
    if (res) {
      editMode.value = false;
      if (featureFlagsStore.selectedFlag) populateEditForm(featureFlagsStore.selectedFlag);
    }
  } catch (err) {
    logger.error("Failed to update feature flag", err);
  }
}

function resetOverrideForm() {
  overrideForm.value = { tenantId: "", status: "ACTIVE", reason: "", expiresAt: "", adminNotes: "" };
}

async function submitOverride() {
  if (!overrideForm.value.tenantId || !overrideForm.value.status) return;
  try {
    const payload = { ...overrideForm.value };
    if (!payload.expiresAt) delete payload.expiresAt;
    if (!payload.adminNotes) delete payload.adminNotes;
    if (!payload.reason) delete payload.reason;

    const res = await featureFlagsStore.addTenantOverride(code.value, payload);
    if (res) {
      showOverrideModal.value = false;
      resetOverrideForm();
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
          class="flex items-center gap-[0.4rem] text-[1.2rem] text-gray-500 hover:text-primary"
        >
          <span class="material-symbols-outlined text-[1.6rem]">arrow_back</span>
          Feature Flags
        </NuxtLink>
      </div>

      <div v-if="featureFlagsStore.loading" class="h-[60px] animate-pulse rounded-[8px] bg-gray-100" />

      <div v-else-if="featureFlagsStore.selectedFlag" class="flex items-start justify-between gap-[1.6rem]">
        <div>
          <div class="flex items-center gap-[1.2rem]">
            <h1 class="text-[2rem] font-[700] text-[#000]">{{ featureFlagsStore.selectedFlag.name }}</h1>
            <span class="font-mono text-[1.4rem] text-gray-400">{{ featureFlagsStore.selectedFlag.code }}</span>
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
          </div>
          <p v-if="featureFlagsStore.selectedFlag.description" class="mt-[0.4rem] text-gray-500">
            {{ featureFlagsStore.selectedFlag.description }}
          </p>
        </div>
        <div class="flex shrink-0 gap-[1rem]">
          <button
            class="rounded-[8px] border border-slate-200 px-[1.4rem] py-[0.9rem]"
            @click="editMode = !editMode; if (!editMode && featureFlagsStore.selectedFlag) populateEditForm(featureFlagsStore.selectedFlag)"
          >
            {{ editMode ? "Cancel" : "Edit" }}
          </button>
          <button
            class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white"
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
          <h2 class="mb-[1.6rem] text-[1.6rem] font-[700] text-[#000]">Edit Flag</h2>
          <form class="space-y-[1.4rem]" @submit.prevent="submitUpdate">
            <div class="grid grid-cols-2 gap-[1.2rem]">
              <div>
                <label class="mb-[0.4rem] block font-[600]">Name <span class="text-red-500">*</span></label>
                <input
                  v-model="editForm.name"
                  type="text"
                  class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                  required
                />
              </div>
              <div>
                <label class="mb-[0.4rem] block font-[600]">Owner Team</label>
                <input
                  v-model="editForm.ownerTeam"
                  type="text"
                  class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                  placeholder="e.g. Platform"
                />
              </div>
            </div>

            <div>
              <label class="mb-[0.4rem] block font-[600]">Description</label>
              <textarea
                v-model="editForm.description"
                rows="2"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              />
            </div>

            <div class="grid grid-cols-2 gap-[1.2rem]">
              <div>
                <label class="mb-[0.4rem] block font-[600]">Default Status</label>
                <select
                  v-model="editForm.defaultStatus"
                  class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                >
                  <option v-for="s in defaultStatuses" :key="s" :value="s">{{ s.replace(/_/g, " ") }}</option>
                </select>
              </div>
              <div>
                <label class="mb-[0.4rem] block font-[600]">Category</label>
                <select
                  v-model="editForm.category"
                  class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                >
                  <option value="">— None —</option>
                  <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-[1.2rem]">
              <div>
                <label class="mb-[0.4rem] block font-[600]">Target Release Date</label>
                <input
                  v-model="editForm.targetReleaseDate"
                  type="date"
                  class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                />
              </div>
              <div>
                <label class="mb-[0.4rem] block font-[600]">Display Order</label>
                <input
                  v-model.number="editForm.displayOrder"
                  type="number"
                  class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                />
              </div>
            </div>

            <div>
              <label class="mb-[0.4rem] block font-[600]">Documentation URL</label>
              <input
                v-model="editForm.documentationUrl"
                type="url"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                placeholder="https://..."
              />
            </div>

            <div>
              <label class="mb-[0.4rem] block font-[600]">Release Notes</label>
              <textarea
                v-model="editForm.releaseNotes"
                rows="3"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              />
            </div>

            <div class="flex items-center gap-[1rem]">
              <label class="font-[600]">Enabled</label>
              <button
                type="button"
                :class="editForm.enabled ? 'bg-primary' : 'bg-gray-300'"
                class="relative inline-flex h-[24px] w-[44px] items-center rounded-full transition-colors"
                @click="editForm.enabled = !editForm.enabled"
              >
                <span
                  :class="editForm.enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'"
                  class="inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition-transform"
                />
              </button>
            </div>

            <div class="flex justify-end gap-[1.2rem] pt-[0.4rem]">
              <button
                type="button"
                class="rounded-[8px] border border-slate-200 px-[1.6rem] py-[0.9rem]"
                @click="editMode = false; populateEditForm(featureFlagsStore.selectedFlag)"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="featureFlagsStore.saving"
                class="rounded-[8px] bg-primary px-[1.6rem] py-[0.9rem] font-[700] text-white disabled:opacity-50"
              >
                {{ featureFlagsStore.saving ? "Saving..." : "Save Changes" }}
              </button>
            </div>
          </form>
        </section>

        <!-- Metadata -->
        <section v-else class="rounded-[8px] bg-white p-[2rem] shadow-sm">
          <h2 class="mb-[1.6rem] text-[1.6rem] font-[700] text-[#000]">Release Metadata</h2>
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
              <dt class="text-[1.2rem] text-gray-500">Target Release Date</dt>
              <dd class="font-[600]">
                {{ featureFlagsStore.selectedFlag.targetReleaseDate ? formatDate(featureFlagsStore.selectedFlag.targetReleaseDate) : "—" }}
              </dd>
            </div>
            <div v-if="featureFlagsStore.selectedFlag.documentationUrl" class="col-span-2">
              <dt class="text-[1.2rem] text-gray-500">Documentation</dt>
              <dd>
                <a
                  :href="featureFlagsStore.selectedFlag.documentationUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary underline"
                >
                  {{ featureFlagsStore.selectedFlag.documentationUrl }}
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
          </div>
        </section>
      </div>

      <!-- Sidebar: Tenant Overrides -->
      <div class="space-y-[1.6rem]">
        <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
          <div class="mb-[1.2rem] flex items-center justify-between">
            <h2 class="text-[1.6rem] font-[700] text-[#000]">Tenant Overrides</h2>
            <span class="text-[1.2rem] text-gray-400">
              {{ (featureFlagsStore.selectedFlag.tenantOverrides || []).length }} total
            </span>
          </div>

          <div
            v-if="!(featureFlagsStore.selectedFlag.tenantOverrides || []).length"
            class="py-[2rem] text-center text-gray-400"
          >
            No overrides yet
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
              <div v-if="override.reason" class="mt-[0.6rem] text-[1.2rem] text-gray-500">
                {{ override.reason }}
              </div>
              <div v-if="override.expiresAt" class="mt-[0.4rem] text-[1.2rem] text-gray-400">
                Expires: {{ formatDate(override.expiresAt) }}
              </div>
              <div v-if="override.adminNotes" class="mt-[0.4rem] text-[1.2rem] italic text-gray-400">
                {{ override.adminNotes }}
              </div>
            </div>
          </div>
        </section>

        <!-- Admin Notes -->
        <section
          v-if="featureFlagsStore.selectedFlag.adminNotes"
          class="rounded-[8px] bg-white p-[2rem] shadow-sm"
        >
          <h2 class="mb-[0.8rem] text-[1.6rem] font-[700] text-[#000]">Admin Notes</h2>
          <p class="whitespace-pre-line text-gray-600">{{ featureFlagsStore.selectedFlag.adminNotes }}</p>
        </section>
      </div>
    </div>

    <!-- Tenant Override Modal -->
    <div
      v-if="showOverrideModal"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-[1.6rem]"
      @click.self="showOverrideModal = false"
    >
      <div class="w-full max-w-[480px] rounded-[12px] bg-white p-[2.4rem] shadow-xl">
        <div class="mb-[2rem] flex items-center justify-between">
          <h2 class="text-[1.8rem] font-[700] text-[#000]">Add Tenant Override</h2>
          <button class="text-gray-400 hover:text-gray-600" @click="showOverrideModal = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form class="space-y-[1.4rem]" @submit.prevent="submitOverride">
          <div>
            <label class="mb-[0.4rem] block font-[600]">Tenant ID <span class="text-red-500">*</span></label>
            <input
              v-model="overrideForm.tenantId"
              type="text"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] font-mono"
              placeholder="Tenant UUID or ID"
              required
            />
          </div>

          <div>
            <label class="mb-[0.4rem] block font-[600]">Override Status <span class="text-red-500">*</span></label>
            <select
              v-model="overrideForm.status"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              required
            >
              <option v-for="s in overrideStatuses" :key="s" :value="s">{{ s.replace(/_/g, " ") }}</option>
            </select>
          </div>

          <div>
            <label class="mb-[0.4rem] block font-[600]">Reason</label>
            <input
              v-model="overrideForm.reason"
              type="text"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              placeholder="Why this override is being applied"
            />
          </div>

          <div>
            <label class="mb-[0.4rem] block font-[600]">Expires At</label>
            <input
              v-model="overrideForm.expiresAt"
              type="datetime-local"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            />
          </div>

          <div>
            <label class="mb-[0.4rem] block font-[600]">Admin Notes</label>
            <textarea
              v-model="overrideForm.adminNotes"
              rows="2"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              placeholder="Internal notes for other admins"
            />
          </div>

          <div class="flex justify-end gap-[1.2rem] pt-[0.4rem]">
            <button
              type="button"
              class="rounded-[8px] border border-slate-200 px-[1.6rem] py-[0.9rem]"
              @click="showOverrideModal = false; resetOverrideForm()"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="featureFlagsStore.overriding || !overrideForm.tenantId"
              class="rounded-[8px] bg-primary px-[1.6rem] py-[0.9rem] font-[700] text-white disabled:opacity-50"
            >
              {{ featureFlagsStore.overriding ? "Applying..." : "Apply Override" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
