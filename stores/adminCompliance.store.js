import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useAdminComplianceStore = defineStore("adminComplianceStore", () => {
    const { get, patch } = useApiService();
    const toastStore = useToastStore();

    const queue = ref([]);
    const loading = ref(false);
    const error = ref("");

    async function fetchComplianceQueue(params = {}) {
        loading.value = true;
        error.value = "";

        try {
            const response = await get(endpoints.admin.merchants.complianceQueue, params, { forceMode: "live" });
            queue.value = response?.data?.content || [];
        } catch (err) {
            error.value = "Unable to load compliance queue.";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function reviewCompliance(tenantId, payload) {
        const url = endpoints.admin.compliance.review.replace(":tenantId", tenantId);
        const response = await patch(url, payload, { forceMode: "live" });

        if (response) {
            toastStore.success("Compliance status updated", "");
        }

        return response;
    }

    return {
        queue,
        loading,
        error,
        fetchComplianceQueue,
        reviewCompliance,
    };
});
