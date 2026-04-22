<script setup>
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-users",
});

const adminUsersStore = useAdminUsersStore();
const search = ref("");
const status = ref("");

async function fetchUsers() {
  try {
    await adminUsersStore.fetchUsers({
      search: search.value || undefined,
      status: status.value || undefined,
      page: 0,
      size: 20,
      sort: "createdAt,desc",
    });
  } catch (err) {
    logger.error("Failed to load admin users", err);
  }
}

async function updateUserStatus(user, nextStatus) {
  try {
    await adminUsersStore.updateUserStatus(user.id, nextStatus);
    await fetchUsers();
  } catch (err) {
    logger.error("Failed to update user status", err);
  }
}

onMounted(fetchUsers);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Users</h1>
          <p class="mt-[0.4rem]">Platform-wide user accounts.</p>
        </div>
        <div class="flex flex-col gap-[1rem] sm:flex-row">
          <input
            v-model="search"
            type="search"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Search users"
            @keyup.enter="fetchUsers"
          />
          <select
            v-model="status"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="fetchUsers"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <button class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white" @click="fetchUsers">
            Filter
          </button>
        </div>
      </div>
    </section>

    <div v-if="adminUsersStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ adminUsersStore.error }}
    </div>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <table class="w-full min-w-[78rem] text-left">
        <thead class="bg-slate-50 text-[1.2rem] uppercase text-[#616161]">
          <tr>
            <th class="px-[1.6rem] py-[1.2rem]">User</th>
            <th class="px-[1.6rem] py-[1.2rem]">Status</th>
            <th class="px-[1.6rem] py-[1.2rem]">Email</th>
            <th class="px-[1.6rem] py-[1.2rem]">Stores</th>
            <th class="px-[1.6rem] py-[1.2rem]"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="adminUsersStore.loading">
            <td colspan="5" class="px-[1.6rem] py-[2rem]">Loading users...</td>
          </tr>
          <tr v-for="user in adminUsersStore.users" :key="user.id" class="border-t border-slate-100">
            <td class="px-[1.6rem] py-[1.4rem]">
              <p class="font-[700] text-[#000]">{{ user.fullName || "Unnamed user" }}</p>
              <p class="text-[1.2rem]">{{ user.phoneNumber || "-" }}</p>
            </td>
            <td class="px-[1.6rem] py-[1.4rem]">{{ user.status || "-" }}</td>
            <td class="px-[1.6rem] py-[1.4rem]">{{ user.email || "-" }}</td>
            <td class="px-[1.6rem] py-[1.4rem]">{{ user.tenantMemberships?.length || 0 }}</td>
            <td class="px-[1.6rem] py-[1.4rem]">
              <div class="flex justify-end gap-[0.8rem]">
                <button class="font-[700] text-primary" @click="updateUserStatus(user, 'active')">Activate</button>
                <button class="font-[700] text-red-700" @click="updateUserStatus(user, 'suspended')">Suspend</button>
              </div>
            </td>
          </tr>
          <tr v-if="!adminUsersStore.loading && adminUsersStore.users.length === 0">
            <td colspan="5" class="px-[1.6rem] py-[2rem]">No users found.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
