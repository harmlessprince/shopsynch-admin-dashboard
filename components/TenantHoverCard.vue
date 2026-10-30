<template>
  <div class="relative inline-block" @mouseleave="handleMouseLeave">
    <!-- Trigger -->
    <span
      class="inline-flex items-center gap-1 font-mono text-[1.3rem] text-primary hover:text-blue-700 underline decoration-dotted cursor-pointer"
      @mouseenter="handleMouseEnter"
    >
      {{ displayLabel }}
    </span>

    <!-- Hover Card Popover -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0 -translate-y-1"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 top-full mt-2 z-50 w-[300px] rounded-xl bg-white p-4 shadow-2xl border border-gray-200 text-left font-sans"
        @mouseenter="clearHideTimer"
        @mouseleave="handleMouseLeave"
      >
        <!-- Loading State -->
        <div v-if="loading && !profile" class="flex items-center gap-3 py-4 text-gray-500">
          <svg class="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span class="text-xs">Loading profile...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error && !profile" class="py-2 text-xs text-red-600">
          {{ error }}
        </div>

        <!-- Profile Card -->
        <div v-else-if="profile" class="space-y-3">
          <!-- Business Name & Status Badges -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-gray-900 truncate">
                {{ profile.name || "Unnamed store" }}
              </h4>
              <p v-if="profile.slug" class="text-xs text-gray-400 font-mono truncate">
                @{{ profile.slug }}
              </p>
            </div>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border"
              :class="modeBadgeClass"
            >
              {{ profile.currentMode || "test" }}
            </span>
          </div>

          <!-- Compliance & Account Status -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span
              class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border"
              :class="complianceBadgeClass"
            >
              {{ formatComplianceStatus(profile.complianceStatus) }}
            </span>
            <span
              v-if="profile.status !== undefined"
              class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium"
              :class="profile.status ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-700'"
            >
              {{ profile.status ? "Active" : "Inactive" }}
            </span>
          </div>

          <!-- Owner Information -->
          <div class="rounded-lg bg-gray-50 p-2.5 space-y-1 text-xs">
            <div class="flex items-center justify-between text-gray-600">
              <span class="text-gray-400 text-[11px]">Owner:</span>
              <span class="font-medium text-gray-800 truncate max-w-[170px]">
                {{ ownerFullName || "N/A" }}
              </span>
            </div>
            <div class="flex items-center justify-between text-gray-600">
              <span class="text-gray-400 text-[11px]">Email:</span>
              <span class="font-mono text-[11px] text-gray-700 truncate max-w-[170px]" :title="profile.email">
                {{ profile.email || "N/A" }}
              </span>
            </div>
          </div>

          <!-- Footer Link -->
          <div class="pt-1 border-t border-gray-100">
            <NuxtLink
              :to="merchantProfileUrl"
              class="inline-flex items-center justify-between w-full text-xs font-semibold text-primary hover:underline group"
            >
              <span>View profile</span>
              <span class="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";

// Global in-memory cache shared across all instances of TenantHoverCard
const tenantPreviewCache = new Map();

const props = defineProps({
  tenantId: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: "",
  },
});

const { get } = useApiService();

const isOpen = ref(false);
const loading = ref(false);
const error = ref(null);
const profile = ref(null);

let hideTimer = null;
let showTimer = null;

const displayLabel = computed(() => {
  return props.label || props.tenantId || "N/A";
});

const merchantProfileUrl = computed(() => {
  return `/dashboard/merchants/${props.tenantId}`;
});

const ownerFullName = computed(() => {
  if (!profile.value) return "";
  const parts = [profile.value.firstName, profile.value.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "";
});

const modeBadgeClass = computed(() => {
  const mode = profile.value?.currentMode?.toLowerCase();
  return mode === "live"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
});

const complianceBadgeClass = computed(() => {
  const status = profile.value?.complianceStatus;
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "UNDER_REVIEW":
    case "AWAITING_APPROVAL":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "NOT_SUBMITTED":
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
});

function formatComplianceStatus(status) {
  if (!status) return "Not submitted";
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchProfile() {
  if (!props.tenantId || props.tenantId === "N/A") return;

  // Check client-side Map cache first
  if (tenantPreviewCache.has(props.tenantId)) {
    profile.value = tenantPreviewCache.get(props.tenantId);
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const endpoint = endpoints.admin.merchants.preview.replace(":tenantId", props.tenantId);
    const res = await get(endpoint);
    if (res && res.data) {
      tenantPreviewCache.set(props.tenantId, res.data);
      profile.value = res.data;
    } else {
      error.value = "Failed to load preview";
    }
  } catch (err) {
    error.value = err?.response?.data?.message || err?.message || "Failed to load profile";
  } finally {
    loading.value = false;
  }
}

function handleMouseEnter() {
  clearHideTimer();
  showTimer = setTimeout(() => {
    isOpen.value = true;
    if (!profile.value) {
      fetchProfile();
    }
  }, 120);
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function handleMouseLeave() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  hideTimer = setTimeout(() => {
    isOpen.value = false;
  }, 220);
}
</script>
