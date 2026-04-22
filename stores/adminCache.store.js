import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useAdminCacheStore = defineStore("adminCacheStore", () => {
    const { get, delete: del } = useApiService();
    const toastStore = useToastStore();

    const caches = ref([]);
    const loading = ref(false);
    const error = ref("");

    async function fetchCaches() {
        loading.value = true;
        error.value = "";

        try {
            const response = await get(endpoints.admin.cache.list, {}, { forceMode: "live" });
            caches.value = Array.isArray(response?.data) ? response.data : [];
        } catch (err) {
            error.value = "Unable to load caches.";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function clearCache(cacheName) {
        const url = endpoints.admin.cache.clearByName.replace(":cacheName", cacheName);
        const response = await del(url, { forceMode: "live" });

        if (response) {
            toastStore.success("Cache cleared", "");
        }

        return response;
    }

    async function clearAllCaches() {
        const response = await del(endpoints.admin.cache.clearAll, { forceMode: "live" });

        if (response) {
            toastStore.success("All caches cleared", "");
        }

        return response;
    }

    return {
        caches,
        loading,
        error,
        fetchCaches,
        clearCache,
        clearAllCaches,
    };
});
