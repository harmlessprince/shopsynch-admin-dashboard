import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";

export const useAdminBillingRefundsStore = defineStore("adminBillingRefundsStore", () => {
    const { get, post } = useApiService();
    const toastStore = useToastStore();

    const refunds = ref([]);
    const loading = ref(false);
    const error = ref("");
    const refreshingId = ref("");
    const requesting = ref(false);
    const requestErrors = ref({});
    const page = ref(0);
    const limit = ref(50);

    // The list endpoint returns a bare array with no total, so a full page means there may be more.
    const hasPrevious = computed(() => page.value > 0);
    const hasNext = computed(() => refunds.value.length === limit.value);

    async function fetchRefunds(params = {}) {
        page.value = params.page ?? page.value;
        limit.value = params.limit ?? limit.value;
        loading.value = true;
        error.value = "";
        try {
            const response = await get(
                endpoints.admin.billing.refunds.list,
                { page: page.value, limit: limit.value },
                { forceMode: "live" },
            );
            refunds.value = response?.data || [];
        } catch (err) {
            logger.error("Failed to load subscription refunds", err);
            refunds.value = [];
            error.value = "Subscription refunds could not be loaded.";
        } finally {
            loading.value = false;
        }
    }

    async function refreshRefund(refundId) {
        refreshingId.value = refundId;
        try {
            const url = endpoints.admin.billing.refunds.refresh.replace(":refundId", refundId);
            const response = await post(url, {}, { forceMode: "live" });
            const updated = response?.data;
            if (updated) {
                const index = refunds.value.findIndex((refund) => refund.id === refundId);
                if (index !== -1) refunds.value[index] = updated;
            }
            toastStore.success("Refund checked with the provider", "");
            return updated;
        } catch (err) {
            logger.error("Failed to refresh subscription refund", err);
            return null;
        } finally {
            refreshingId.value = "";
        }
    }

    // The global interceptor toasts the 400 and 422 messages; 422 field errors are kept in requestErrors.
    async function requestRefund(payload) {
        requesting.value = true;
        requestErrors.value = {};
        try {
            const response = await post(endpoints.admin.billing.refunds.create, payload, { forceMode: "live" });
            return response?.data || null;
        } catch (err) {
            logger.error("Failed to start subscription refund", err);
            requestErrors.value = err?.data?.errors || {};
            return null;
        } finally {
            requesting.value = false;
        }
    }

    return {
        refunds,
        loading,
        error,
        refreshingId,
        requesting,
        requestErrors,
        page,
        limit,
        hasPrevious,
        hasNext,
        fetchRefunds,
        refreshRefund,
        requestRefund,
    };
});
