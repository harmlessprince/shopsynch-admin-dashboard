<script setup>
import { logger } from "~/utils/helpers.js";
import { useVfm } from "vue-final-modal";
import DataTable from "~/components/table/DataTable.vue";
import UserStatusModal from "~/components/Modals/UserStatusModal.vue";
definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-users",
});

const adminUsersStore = useAdminUsersStore();
const router = useRouter();
const vfm = useVfm();
const search = ref("");
const status = ref("");
const role = ref("");
const page = ref(1);
const limit = ref(50);

const selectedUser = ref(null);
const pendingStatus = ref("active");

const tableHeader = [
  { title: "User", accessor: "fullName" },
  { title: "Status", accessor: "status", type: "status" },
  { title: "Email", accessor: "email" },
  { title: "Stores", accessor: "tenantMemberships" },
  { title: "Email verified", accessor: "emailVerified", type: "boolean", booleanLabels: { true: "Yes", false: "No" } },
  { title: "Created", accessor: "createdAt", type: "date" },
];

const params = computed(() => ({
  search: search.value || undefined,
  status: status.value || undefined,
  role: role.value || undefined,
  page: page.value - 1,
  limit: limit.value,
  sortFieldParam: "CREATED_AT",
  sortDirectionParam: "DESC",
}));

async function fetchUsers(nextPage = page.value) {
  try {
    page.value = nextPage;
    await adminUsersStore.fetchUsers(params.value);
  } catch (err) {
    logger.error("Failed to load admin users", err);
  }
}

function applyFilters() {
  fetchUsers(1);
}

function changeLimit(nextLimit) {
  limit.value = nextLimit;
  fetchUsers(1);
}

function openStatusConfirm(user, nextStatus) {
  selectedUser.value = user;
  pendingStatus.value = nextStatus;
  vfm.open("userStatusModal");
}

async function onStatusDone() {
  await fetchUsers();
}

function formatMemberships(memberships = []) {
  if (!memberships?.length) return "0";

  return memberships
    .map((membership) => membership.tenantName)
    .filter(Boolean)
    .join(", ") || String(memberships.length);
}

onMounted(fetchUsers);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Users</h1>
          <p class="mt-[0.4rem]">Platform-wide user accounts: {{ adminUsersStore.total }}</p>
        </div>
        <div class="flex flex-col gap-[1rem] sm:flex-row sm:flex-wrap sm:justify-end">
          <input
            v-model="search"
            type="search"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Search users"
            @keyup.enter="applyFilters"
          />
          <select
            v-model="status"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="applyFilters"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <input
            v-model="role"
            type="search"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Role slug"
            @keyup.enter="applyFilters"
          />
          <button class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white" @click="applyFilters">
            Filter
          </button>
        </div>
      </div>
    </section>

    <div v-if="adminUsersStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ adminUsersStore.error }}
    </div>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <DataTable
        :table-header="tableHeader"
        :table-data="adminUsersStore.users"
        :pagination="adminUsersStore.paginatedData"
        :loading="adminUsersStore.loading"
        has-action
        @fetch-page="fetchUsers"
        @change-limit="changeLimit"
      >
        <template #cell(fullName)="{ row }">
          <div>
            <p class="font-[700] text-[#000]">{{ row.fullName || "Unnamed user" }}</p>
            <p class="text-[1.2rem] text-dashboard_text_color">{{ row.phoneNumber || "N/A" }}</p>
          </div>
        </template>

        <template #cell(tenantMemberships)="{ row }">
          {{ formatMemberships(row.tenantMemberships) }}
        </template>

        <template #more-actions="{ data }">
           <div class="dt-action-item text-green-600" @click="router.push({ name: 'dashboard-admin-user-detail', params: { userId: data.id } })">
            <span class="material-symbols-outlined text-green-600">visibility</span>
            <p>View</p>
          </div>
          <div class="dt-action-item" @click="openStatusConfirm(data, 'active')">
            <span class="material-symbols-outlined">check_circle</span>
            <p>Activate</p>
          </div>
          <div class="dt-action-item text-red-600" @click="openStatusConfirm(data, 'suspended')">
            <span class="material-symbols-outlined text-red-600">block</span>
            <p>Suspend</p>
          </div>
        </template>
      </DataTable>
    </section>

    <UserStatusModal
      :user="selectedUser"
      :next-status="pendingStatus"
      @done="onStatusDone"
    />
  </div>
</template>
