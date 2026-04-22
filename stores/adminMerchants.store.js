import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useAdminMerchantsStore = defineStore("adminMerchantsStore", () => {
    const { get, patch } = useApiService();
    const toastStore = useToastStore();

    const merchants = ref([]);
    const merchant = ref(null);
    const paymentSecrets = ref([]);
    const loading = ref(false);
    const detailLoading = ref(false);
    const total = ref(0);
    const error = ref("");

    async function fetchMerchants(params = {}) {
        loading.value = true;
        error.value = "";

        try {
            const response = await get(endpoints.admin.merchants.list, params, { forceMode: "live" });
            merchants.value = response?.data?.content || [];
            total.value = response?.data?.totalElements || merchants.value.length;
        } catch (err) {
            error.value = "Unable to load merchants.";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function fetchMerchantDetail(tenantId) {
        detailLoading.value = true;
        error.value = "";

        try {
            const detailUrl = endpoints.admin.merchants.detail.replace(":tenantId", tenantId);
            const secretsUrl = endpoints.admin.merchants.paymentSecrets.replace(":tenantId", tenantId);
            const [detailResponse, secretsResponse] = await Promise.all([
                get(detailUrl, {}, { forceMode: "live" }),
                get(secretsUrl, {}, { forceMode: "live" }),
            ]);

            merchant.value = detailResponse?.data || null;
            paymentSecrets.value = secretsResponse?.data || [];
        } catch (err) {
            error.value = "Unable to load merchant details.";
            throw err;
        } finally {
            detailLoading.value = false;
        }
    }

    async function updateMerchantStatus(tenantId, active) {
        const url = endpoints.admin.merchants.updateStatus.replace(":tenantId", tenantId);
        const response = await patch(url, { active }, { forceMode: "live" });

        if (response) {
            toastStore.success("Merchant status updated", "");
        }

        return response;
    }

    return {
        merchants,
        merchant,
        paymentSecrets,
        loading,
        detailLoading,
        total,
        error,
        fetchMerchants,
        fetchMerchantDetail,
        updateMerchantStatus,
    };
});
