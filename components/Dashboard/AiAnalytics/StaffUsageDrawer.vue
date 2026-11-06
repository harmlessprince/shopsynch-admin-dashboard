<script setup>
import { ref, watch, computed } from "vue";
import { formatToMoney, formatDate } from "~/utils/helpers.js";
import Drawer from "~/components/Drawer.vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  tenant: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:open"]);

const aiAnalyticsStore = useAdminAiAnalyticsStore();
const staffPage = ref(0);
const staffSize = ref(10);

const staffList = computed(() => aiAnalyticsStore.staffData?.items || aiAnalyticsStore.staff?.items || []);
const totalElements = computed(() => aiAnalyticsStore.staffData?.totalElements ?? aiAnalyticsStore.staff?.totalElements ?? 0);
const totalPages = computed(() => aiAnalyticsStore.staffData?.totalPages ?? aiAnalyticsStore.staff?.totalPages ?? 1);
const isLoadingStaff = computed(() => aiAnalyticsStore.staffData?.loading ?? aiAnalyticsStore.loadingStaff ?? false);

function closeDrawer() {
  emit("update:open", false);
}

function getChannelBadge(channel) {
  const norm = (channel || "").toUpperCase().trim();
  if (norm === "TELEGRAM") {
    return {
      label: "Telegram",
      class: "bg-sky-50 text-sky-700 border-sky-200",
      icon: "send",
    };
  }
  if (norm === "WHATSAPP") {
    return {
      label: "WhatsApp",
      class: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: "chat",
    };
  }
  if (norm === "MCP") {
    return {
      label: "MCP",
      class: "bg-purple-50 text-purple-700 border-purple-200",
      icon: "hub",
    };
  }
  if (norm === "DASHBOARD") {
    return {
      label: "Dashboard",
      class: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: "laptop_mac",
    };
  }
  return {
    label: norm && norm !== "UNKNOWN" ? norm : "Unspecified",
    class: "bg-slate-50 text-slate-700 border-slate-200",
    icon: "devices",
  };
}

function getRoleBadgeClass(role) {
  const r = (role || "").toUpperCase();
  if (r.includes("OWNER") || r.includes("ADMIN")) {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  if (r.includes("MANAGER")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (r.includes("SUPPORT") || r.includes("SALES")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.tenant?.tenantId) {
      staffPage.value = 0;
      aiAnalyticsStore.fetchTenantStaff(props.tenant.tenantId, {
        page: staffPage.value,
        size: staffSize.value,
      });
    }
  },
);

function changePage(newPage) {
  staffPage.value = newPage;
  if (props.tenant?.tenantId) {
    aiAnalyticsStore.fetchTenantStaff(props.tenant.tenantId, {
      page: staffPage.value,
      size: staffSize.value,
    });
  }
}
</script>

<template>
  <Drawer :open="open" side="right" width-class="w-full sm:max-w-2xl" @update:open="emit('update:open', $event)">
    <div v-if="open" class="flex flex-col h-full bg-[#FAFBFD] text-slate-800 text-[1.4rem]">
      <!-- Drawer Header -->
      <header class="p-[2rem] bg-white border-b border-slate-200 flex items-start justify-between gap-[1.6rem]">
        <div class="flex items-center gap-[1.2rem]">
          <div class="w-[4.4rem] h-[4.4rem] rounded-xl bg-primary/10 text-primary flex items-center justify-center font-[700] text-[2rem]">
            <span class="material-symbols-outlined text-[2.4rem]">groups</span>
          </div>
          <div>
            <div class="flex items-center gap-[0.8rem] flex-wrap">
              <h2 class="text-[2rem] font-[700] text-slate-900">
                {{ tenant?.storeName || "Store" }}
              </h2>
              <span
                v-if="tenant?.planCode"
                class="px-[1rem] py-[0.3rem] rounded-full text-[1.2rem] font-[600] uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200"
              >
                {{ tenant.planCode }}
              </span>
            </div>
            <p class="text-[1.2rem] text-slate-500 font-mono mt-[0.2rem]">
              Tenant ID: {{ tenant?.tenantId }}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="p-[0.8rem] rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          @click="closeDrawer"
        >
          <span class="material-symbols-outlined text-[2.4rem]">close</span>
        </button>
      </header>

      <!-- Store Summary KPI Chips -->
      <div v-if="tenant" class="p-[2rem] bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-[1.2rem] sm:grid-cols-4">
        <div class="bg-white p-[1.4rem] rounded-xl border border-slate-200 shadow-2xs">
          <span class="text-[1.2rem] font-[600] text-slate-500 uppercase tracking-wider">Monthly Allowance</span>
          <div class="mt-[0.4rem] flex items-baseline gap-[0.4rem]">
            <span class="text-[1.8rem] font-[700] text-slate-900">{{ tenant.questionCount || 0 }}</span>
            <span class="text-[1.3rem] text-slate-500">/ {{ tenant.monthlyLimit || "∞" }} cap</span>
          </div>
        </div>

        <div class="bg-white p-[1.4rem] rounded-xl border border-slate-200 shadow-2xs">
          <span class="text-[1.2rem] font-[600] text-slate-500 uppercase tracking-wider">Usage Status</span>
          <p
            class="mt-[0.4rem] text-[1.8rem] font-[700]"
            :class="
              (tenant.allowanceUsedPercentage || 0) > 90
                ? 'text-rose-600'
                : (tenant.allowanceUsedPercentage || 0) > 70
                ? 'text-amber-600'
                : 'text-emerald-600'
            "
          >
            {{ tenant.allowanceUsedPercentage?.toFixed(0) || 0 }}%
          </p>
          <span class="text-[1.2rem] text-slate-500">of monthly quota</span>
        </div>

        <div class="bg-white p-[1.4rem] rounded-xl border border-slate-200 shadow-2xs">
          <span class="text-[1.2rem] font-[600] text-slate-500 uppercase tracking-wider">Total Tokens</span>
          <p class="mt-[0.4rem] text-[1.8rem] font-[700] text-slate-900">
            {{ tenant.totalTokens?.toLocaleString() || 0 }}
          </p>
          <span class="text-[1.2rem] text-slate-500">{{ tenant.callCount || 0 }} total calls</span>
        </div>

        <div class="bg-white p-[1.4rem] rounded-xl border border-slate-200 shadow-2xs">
          <span class="text-[1.2rem] font-[600] text-slate-500 uppercase tracking-wider">Est. Store Cost</span>
          <p class="mt-[0.4rem] text-[1.8rem] font-[700] text-slate-900">
            ${{ tenant.totalCostUsd?.toFixed(2) || "0.00" }}
          </p>
          <span class="text-[1.2rem] text-slate-500">{{ formatToMoney(tenant.totalCostNgn || 0) }}</span>
        </div>
      </div>

      <!-- Staff List Container -->
      <div class="flex-1 overflow-y-auto p-[2rem] space-y-[1.6rem]">
        <div class="flex items-center justify-between">
          <h3 class="text-[1.5rem] font-[700] uppercase tracking-wider text-slate-700">
            Staff Members Activity ({{ totalElements }})
          </h3>
          <span class="text-[1.3rem] text-slate-500">Sorted by questions asked</span>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingStaff" class="space-y-[1.2rem]">
          <div
            v-for="i in 4"
            :key="i"
            class="bg-white rounded-xl border border-slate-200 p-[1.6rem] animate-pulse flex items-center justify-between"
          >
            <div class="flex items-center gap-[1.2rem]">
              <div class="w-[4rem] h-[4rem] rounded-full bg-slate-200" />
              <div class="space-y-[0.6rem]">
                <div class="h-[1.4rem] bg-slate-200 rounded w-[12rem]" />
                <div class="h-[1rem] bg-slate-200 rounded w-[16rem]" />
              </div>
            </div>
            <div class="h-[1.8rem] bg-slate-200 rounded w-[8rem]" />
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!staffList || staffList.length === 0"
          class="bg-white rounded-xl border border-slate-200 p-[3rem] text-center text-slate-500"
        >
          <span class="material-symbols-outlined text-[4rem] text-slate-300 mb-[0.8rem]">person_off</span>
          <p class="font-[600] text-slate-700 text-[1.6rem]">No staff activity recorded</p>
          <p class="text-[1.3rem] text-slate-500 mt-[0.4rem]">This store's staff have not invoked the store assistant yet during this period.</p>
        </div>

        <!-- Staff Cards List -->
        <div v-else class="space-y-[1.2rem]">
          <div
            v-for="staff in staffList"
            :key="staff.userId"
            class="bg-white rounded-xl border border-slate-200 p-[1.6rem] shadow-2xs hover:border-slate-300 transition-all"
          >
            <!-- Staff Identity & Role -->
            <div class="flex items-center justify-between gap-[1.2rem] border-b border-slate-100 pb-[1.2rem]">
              <div class="flex items-center gap-[1.2rem]">
                <div class="w-[4.2rem] h-[4.2rem] rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-[700] text-slate-700 text-[1.5rem]">
                  {{ (staff.name || "U").charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="flex items-center gap-[0.8rem]">
                    <span class="font-[700] text-slate-900 text-[1.5rem]">{{ staff.name || "Unknown Staff" }}</span>
                    <span
                      class="px-[1rem] py-[0.2rem] rounded-full text-[1.2rem] font-[600] border"
                      :class="getRoleBadgeClass(staff.role)"
                    >
                      {{ staff.role }}
                    </span>
                  </div>
                  <p class="text-[1.3rem] text-slate-500 mt-[0.2rem]">{{ staff.email || "No email" }}</p>
                </div>
              </div>

              <!-- Channel -->
              <div class="flex items-center gap-[0.6rem]">
                <span class="text-[1.2rem] text-slate-400">Channel:</span>
                <span
                  class="inline-flex items-center gap-[0.6rem] px-[1rem] py-[0.4rem] rounded-full text-[1.2rem] font-[600] border"
                  :class="getChannelBadge(staff.preferredChannel).class"
                >
                  <span class="material-symbols-outlined text-[1.4rem]">
                    {{ getChannelBadge(staff.preferredChannel).icon }}
                  </span>
                  {{ getChannelBadge(staff.preferredChannel).label }}
                </span>
              </div>
            </div>

            <!-- Staff Usage Metrics Grid -->
            <div class="grid grid-cols-2 gap-[1.2rem] pt-[1.2rem] sm:grid-cols-4">
              <div>
                <span class="text-slate-500 text-[1.2rem]">Questions Asked</span>
                <p class="font-[700] text-slate-900 text-[1.5rem] mt-[0.2rem]">
                  {{ staff.questionCount || 0 }}
                </p>
              </div>

              <div>
                <span class="text-slate-500 text-[1.2rem]">Total Tokens</span>
                <p class="font-[700] text-slate-900 text-[1.5rem] mt-[0.2rem]">
                  {{ staff.totalTokens?.toLocaleString() || 0 }}
                </p>
              </div>

              <div>
                <span class="text-slate-500 text-[1.2rem]">Est. Cost (USD)</span>
                <p class="font-[700] text-slate-900 text-[1.5rem] mt-[0.2rem]">
                  ${{ staff.estimatedCostUsd?.toFixed(4) || "0.0000" }}
                </p>
              </div>

              <div>
                <span class="text-slate-500 text-[1.2rem]">Last Active</span>
                <p class="font-[600] text-slate-800 text-[1.3rem] mt-[0.2rem]">
                  {{ staff.lastActiveAt ? formatDate(staff.lastActiveAt) : "Recently" }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Drawer Footer / Pagination -->
      <footer class="p-[1.6rem] bg-white border-t border-slate-200 flex items-center justify-between text-[1.3rem]">
        <div class="text-slate-500">
          Page {{ staffPage + 1 }} of {{ totalPages }}
        </div>

        <div class="flex items-center gap-[0.8rem]">
          <button
            type="button"
            class="px-[1.4rem] py-[0.8rem] text-[1.3rem] font-[600] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            :disabled="staffPage <= 0"
            @click="changePage(staffPage - 1)"
          >
            Previous
          </button>
          <button
            type="button"
            class="px-[1.4rem] py-[0.8rem] text-[1.3rem] font-[600] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            :disabled="staffPage + 1 >= totalPages"
            @click="changePage(staffPage + 1)"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  </Drawer>
</template>
