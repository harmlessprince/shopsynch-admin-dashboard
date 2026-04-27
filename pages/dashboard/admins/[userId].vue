<script setup>
import { useApiService } from "~/services/apiService.js";
import { logger, formatDate } from "~/utils/helpers.js";
import { endpoints } from "~/utils/endpoints.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-admin-user-detail",
});

useHead({
  title: "Admin User Detail - ShopSynch",
});

const route = useRoute();
const router = useRouter();
const { get } = useApiService();

const user = ref(null);
const loading = ref(false);

const statusConfig = {
  active: { label: "Active", class: "bg-green-100 text-green-700" },
  inactive: { label: "Inactive", class: "bg-slate-100 text-slate-600" },
  suspended: { label: "Suspended", class: "bg-red-100 text-red-700" },
};

function statusBadge(status) {
  return statusConfig[status?.toLowerCase()] || { label: status || "Unknown", class: "bg-slate-100 text-slate-600" };
}

onMounted(async () => {
  loading.value = true;
  try {
    const url = endpoints.admin.users.detail.replace(":userId", route.params.userId);
    const res = await get(url, {}, { forceMode: "live" });
    user.value = res.data;
  } catch (err) {
    logger.error("Failed to load admin user detail", err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color pb-[4rem]">
    <!-- Back button -->
    <button class="inline-flex items-center gap-[0.6rem] font-[700] text-primary" @click="router.back()">
      <span class="material-symbols-outlined text-[1.8rem]">arrow_back</span>
      Back
    </button>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-[6rem] text-[#616161]">
      <span class="animate-spin material-symbols-outlined mr-[1rem] text-[2.4rem] text-primary">progress_activity</span>
      Loading user...
    </div>

    <template v-else-if="user">
      <!-- Header -->
      <div class="rounded-[8px] bg-white p-[2rem] shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-[1.6rem]">
          <div class="flex items-center gap-[1.6rem]">
            <div class="flex h-[5.6rem] w-[5.6rem] items-center justify-center rounded-full bg-primary/10">
              <span class="material-symbols-outlined text-[3rem] text-primary">person</span>
            </div>
            <div>
              <h1 class="text-[2.2rem] font-[700] text-[#000]">{{ user.fullName || "Unnamed User" }}</h1>
              <p class="mt-[0.2rem] text-[1.2rem] text-[#616161]">{{ user.email }}</p>
            </div>
          </div>
          <span
            :class="['inline-flex items-center rounded-full px-[1.2rem] py-[0.5rem] text-[1.3rem] font-[700]', statusBadge(user.status).class]"
          >
            {{ statusBadge(user.status).label }}
          </span>
        </div>
      </div>

      <!-- Profile Details -->
      <div class="rounded-[8px] bg-white shadow-sm">
        <div class="flex items-center gap-[1rem] border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <span class="material-symbols-outlined text-primary">badge</span>
          <h2 class="text-[1.6rem] font-[700] text-[#000]">Profile</h2>
        </div>
        <div class="grid grid-cols-1 gap-[1.2rem] p-[1.6rem] sm:grid-cols-2">
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Full Name</p>
            <p class="font-[500] text-[#000]">{{ user.fullName || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Email</p>
            <p class="font-[500] text-[#000]">{{ user.email || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Phone Number</p>
            <p class="font-[500] text-[#000]">{{ user.phoneNumber || "—" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Joined</p>
            <p class="font-[500] text-[#000]">{{ formatDate(user.createdAt) }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Email Verified</p>
            <p :class="['font-[700]', user.emailVerified ? 'text-green-600' : 'text-red-500']">
              {{ user.emailVerified ? "Yes" : "No" }}
            </p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">2FA Enabled</p>
            <p :class="['font-[700]', user.twoFactorEnabled ? 'text-green-600' : 'text-slate-400']">
              {{ user.twoFactorEnabled ? "Yes" : "No" }}
            </p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
            <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Notifications</p>
            <p :class="['font-[700]', user.notificationsEnabled ? 'text-green-600' : 'text-slate-400']">
              {{ user.notificationsEnabled ? "Enabled" : "Disabled" }}
            </p>
          </div>
        </div>
      </div>

      <!-- Tenant Memberships -->
      <div class="rounded-[8px] bg-white shadow-sm">
        <div class="flex items-center gap-[1rem] border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
          <span class="material-symbols-outlined text-primary">storefront</span>
          <h2 class="text-[1.6rem] font-[700] text-[#000]">Store Memberships</h2>
        </div>
        <div class="p-[1.6rem]">
          <div v-if="user.tenantMemberships?.length" class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="border-b border-slate-100 text-left">
                  <th class="pb-[1rem] pr-[2rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Store</th>
                  <th class="pb-[1rem] pr-[2rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Owner</th>
                  <th class="pb-[1rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">Roles</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="membership in user.tenantMemberships"
                  :key="membership.tenantId"
                  class="border-b border-slate-50 last:border-0"
                >
                  <td class="py-[1.2rem] pr-[2rem] font-[500] text-[#000]">{{ membership.tenantName || membership.tenantId }}</td>
                  <td class="py-[1.2rem] pr-[2rem]">
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[700]',
                        membership.owner ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600',
                      ]"
                    >
                      {{ membership.owner ? "Yes" : "No" }}
                    </span>
                  </td>
                  <td class="py-[1.2rem] font-[500] text-[#000]">
                    {{ membership.roleIds?.length ? membership.roleIds.join(", ") : "—" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="italic text-slate-400">No store memberships found.</p>
        </div>
      </div>
    </template>

    <p v-else class="italic text-slate-400">User not found.</p>
  </div>
</template>
