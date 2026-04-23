import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useAdminSettingsStore = defineStore("adminSettingsStore", () => {
    const { get, post, patch, delete: del } = useApiService();
    const toastStore = useToastStore();

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

    async function upsertSetting(payload) {
        const response = await post(endpoints.admin.settings.upsert, payload, { forceMode: "live" });

        if (response?.data) {
            const index = settings.value.findIndex((setting) => setting.key === response.data.key);

            if (index === -1) {
                settings.value.unshift(response.data);
            } else {
                settings.value[index] = response.data;
            }
        }

        toastStore.success("Setting saved", "");
        return response;
    }

    async function updateSettingValue(key, value) {
        const url = endpoints.admin.settings.updateValue.replace(":key", encodeURIComponent(key));
        const response = await patch(url, { value }, { forceMode: "live" });

        if (response?.data) {
            const index = settings.value.findIndex((setting) => setting.key === key);

            if (index !== -1) {
                settings.value[index] = response.data;
            }
        }

        toastStore.success("Setting value updated", "");
        return response;
    }

    async function deleteSetting(key) {
        const url = endpoints.admin.settings.delete.replace(":key", encodeURIComponent(key));
        const response = await del(url, { forceMode: "live" });

        settings.value = settings.value.filter((setting) => setting.key !== key);
        toastStore.success("Setting deleted", "");
        return response;
    }

    return {
        settings,
        loading,
        error,
        fetchSettings,
        upsertSetting,
        updateSettingValue,
        deleteSetting,
    };
});
