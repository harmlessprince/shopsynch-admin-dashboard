import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { logger } from "~/utils/helpers.js";

// One store's API usage for a month, its effective policy and recent over-limit events. Read-only.
export const useAdminBillingApiUsageStore = defineStore("adminBillingApiUsageStore", () => {
    const { get } = useApiService();

    const usage = ref(null);
    const loading = ref(false);
    const error = ref("");

    // month is yyyy-MM and optional; the API defaults to the current UTC month.
    async function fetchUsage(tenantId, month = "") {
        loading.value = true;
        error.value = "";
        usage.value = null;
        try {
            const url = endpoints.admin.billing.apiUsage.tenant.replace(":tenantId", encodeURIComponent(tenantId));
            const response = await get(url, month ? { month } : {}, { forceMode: "live", silent: true });
            usage.value = response?.data || null;
        } catch (err) {
            logger.error("Failed to load the store's API usage", err);
            error.value = err?.data?.message || "This store's API usage could not be loaded.";
        } finally {
            loading.value = false;
        }
    }

    return { usage, loading, error, fetchUsage };
});
