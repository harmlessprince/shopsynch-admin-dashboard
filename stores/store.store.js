import { defineStore } from "pinia";
import { ref } from "vue";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useStoreStore = defineStore("storeStore", () => {
    const { get, patch } = useApiService();
    const toastStore = useToastStore();
    const storeSettings = ref(null);
    const loading = ref(false);

    async function fetchStoreSettings() {
        loading.value = true;
        try {
            const response = await get(endpoints.config.getStoreSettings, {}, { forceMode: 'live' });
            if (response?.data) {
                storeSettings.value = response.data;
            }
            return response?.data;
        } finally {
            loading.value = false;
        }
    }

    async function updateStoreSettings(payload) {
        loading.value = true;
        try {
            const response = await patch(endpoints.config.updateStoreSettings, payload, { forceMode: 'live' });
            if (response?.data) {
                storeSettings.value = response.data;
                toastStore.success('Store settings updated successfully!');
            }
            return response?.data;
        } finally {
            loading.value = false;
        }
    }

    async function checkSlugAvailability(slug) {
        try {
            const response = await get(`/v1/store/check-slug/${slug}`, {}, { forceMode: 'live' });
            // response.data is false if available, true if taken
            return {
                available: response?.data === false,
                isAvailable: response?.data === false,
                isTaken: response?.data === true,
                response: response
            };
        } catch (error) {
            console.error('Error checking slug availability:', error);
            throw error;
        }
    }

    return {
        storeSettings,
        loading,
        fetchStoreSettings,
        updateStoreSettings,
        checkSlugAvailability,
    };
});
