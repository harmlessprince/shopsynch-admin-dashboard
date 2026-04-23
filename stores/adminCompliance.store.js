import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useAdminComplianceStore = defineStore("adminComplianceStore", () => {
    const { get, patch, post, delete: del } = useApiService();
    const toastStore = useToastStore();

    const queue = ref([]);
    const detail = ref(null);
    const rejectionTemplates = ref([]);
    const loading = ref(false);
    const detailLoading = ref(false);
    const rejectionTemplatesLoading = ref(false);
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

    async function fetchTenantDetail(tenantId) {
        detailLoading.value = true;
        error.value = "";

        try {
            const url = endpoints.admin.compliance.tenantDetail.replace(":tenantId", tenantId);
            const response = await get(url, {}, { forceMode: "live" });
            detail.value = response?.data || null;
        } catch (err) {
            error.value = "Unable to load compliance details.";
            throw err;
        } finally {
            detailLoading.value = false;
        }
    }

    async function fetchRejectionTemplates() {
        rejectionTemplatesLoading.value = true;
        error.value = "";

        try {
            const response = await get(endpoints.admin.compliance.rejectionTemplates, {}, { forceMode: "live" });
            rejectionTemplates.value = response?.data || [];
        } catch (err) {
            error.value = "Unable to load rejection templates.";
            throw err;
        } finally {
            rejectionTemplatesLoading.value = false;
        }
    }

    async function reviewCompliance(tenantId, payload, { silent = false } = {}) {
        const url = endpoints.admin.compliance.review.replace(":tenantId", tenantId);
        const response = await patch(url, payload, { forceMode: "live" });

        if (response && !silent) {
            toastStore.success("Compliance status updated", "");
        }

        return response;
    }

    async function grantOverride(tenantId, payload) {
        const url = endpoints.admin.compliance.override.replace(":tenantId", tenantId);
        return await post(url, payload, { forceMode: "live" });
    }

    async function revokeOverride(tenantId) {
        const url = endpoints.admin.compliance.override.replace(":tenantId", tenantId);
        return await del(url, { forceMode: "live" });
    }

    return {
        queue,
        detail,
        rejectionTemplates,
        loading,
        detailLoading,
        rejectionTemplatesLoading,
        error,
        fetchComplianceQueue,
        fetchTenantDetail,
        fetchRejectionTemplates,
        reviewCompliance,
        grantOverride,
        revokeOverride,
    };
});
