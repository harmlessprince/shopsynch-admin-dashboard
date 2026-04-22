import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useAdminUsersStore = defineStore("adminUsersStore", () => {
    const { get, patch } = useApiService();
    const toastStore = useToastStore();

    const users = ref([]);
    const loading = ref(false);
    const error = ref("");

    async function fetchUsers(params = {}) {
        loading.value = true;
        error.value = "";

        try {
            const response = await get(endpoints.admin.users.list, params, { forceMode: "live" });
            users.value = response?.data?.content || [];
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
        loading,
        error,
        fetchUsers,
        updateUserStatus,
    };
});
