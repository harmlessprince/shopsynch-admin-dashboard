import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { getPaginatedData } from "~/utils/helpers.js";

export const useAdminUsersStore = defineStore("adminUsersStore", () => {
    const { get, patch } = useApiService();
    const toastStore = useToastStore();

    const users = ref([]);
    const total = ref(0);
    const paginatedData = ref(undefined);
    const loading = ref(false);
    const error = ref("");

    async function fetchUsers(params = {}) {
        loading.value = true;
        error.value = "";

        try {
            const response = await get(endpoints.admin.users.list, params, { forceMode: "live" });
            const data = response?.data;

            users.value = data?.items || data?.content || [];
            total.value = data?.total ?? data?.totalElements ?? users.value.length;

            if (data?.total !== undefined) {
                const limit = Number(params.limit || params.size || users.value.length || 1);
                const currentPage = Number(data.currentPage ?? params.page ?? 0);

                paginatedData.value = getPaginatedData({
                    current_page: currentPage + 1,
                    per_page: limit,
                    total: data.total,
                    from: currentPage * limit + 1,
                    to: Math.min((currentPage + 1) * limit, data.total),
                });
            }
        } catch (err) {
            error.value = "Unable to load users.";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updateUserStatus(userId, status) {
        const url = endpoints.admin.users.updateStatus.replace(":userId", userId);
        const response = await patch(url, { status }, { forceMode: "live" });

        if (response) {
            toastStore.success("User status updated", "");
        }

        return response;
    }

    return {
        users,
        total,
        paginatedData,
        loading,
        error,
        fetchUsers,
        updateUserStatus,
    };
});
