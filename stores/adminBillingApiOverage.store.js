import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { logger } from "~/utils/helpers.js";

// Read-only views of API overage billing: invoices an admin has to look at, and the revenue split.
export const useAdminBillingApiOverageStore = defineStore("adminBillingApiOverageStore", () => {
    const { get } = useApiService();

    const attention = ref([]);
    const loadingAttention = ref(false);
    const attentionError = ref("");

    const revenueSplit = ref([]);
    const loadingRevenue = ref(false);
    const revenueError = ref("");

    async function fetchAttention() {
        loadingAttention.value = true;
        attentionError.value = "";
        try {
            const response = await get(endpoints.admin.billing.apiOverage.attention, {}, { forceMode: "live" });
            attention.value = response?.data || [];
        } catch (err) {
            logger.error("Failed to load overage invoices needing attention", err);
            attention.value = [];
            attentionError.value = "Overage invoices needing attention could not be loaded.";
        } finally {
            loadingAttention.value = false;
        }
    }

    // paidFrom and paidTo are ISO date-times, both optional; the period end is exclusive.
    async function fetchRevenueSplit(params = {}) {
        loadingRevenue.value = true;
        revenueError.value = "";
        try {
            const response = await get(endpoints.admin.billing.payments.revenueSplit, params, { forceMode: "live" });
            revenueSplit.value = response?.data || [];
        } catch (err) {
            logger.error("Failed to load the subscription revenue split", err);
            revenueSplit.value = [];
            revenueError.value = "The revenue split could not be loaded.";
        } finally {
            loadingRevenue.value = false;
        }
    }

    return { attention, loadingAttention, attentionError, revenueSplit, loadingRevenue, revenueError, fetchAttention, fetchRevenueSplit };
});
