import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";

export const useAdminSettingsStore = defineStore("adminSettingsStore", () => {
    const { get } = useApiService();

    const settings = ref([]);
    const loading = ref(false);
    const error = ref("");

    async function fetchSettings(params = {}) {
        loading.value = true;
        error.value = "";

        try {
            const response = await get(endpoints.admin.settings.list, params, { forceMode: "live" });
            settings.value = response?.data || [];
        } catch (err) {
            error.value = "Unable to load global settings.";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        settings,
        loading,
        error,
        fetchSettings,
    };
});
