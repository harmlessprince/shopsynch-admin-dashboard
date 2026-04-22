import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";

export const useAdminDashboardStore = defineStore("adminDashboardStore", () => {
    const { get } = useApiService();

    const overview = ref(null);
    const merchantTrend = ref([]);
    const complianceSummary = ref(null);
    const loading = ref(false);
    const error = ref("");

    async function fetchOverview() {
        loading.value = true;
        error.value = "";

        try {
            const [overviewResponse, trendResponse, complianceResponse] = await Promise.all([
                get(endpoints.admin.dashboard.overview, {}, { forceMode: "live" }),
                get(endpoints.admin.dashboard.merchantTrend, {}, { forceMode: "live" }),
                get(endpoints.admin.dashboard.complianceSummary, {}, { forceMode: "live" }),
            ]);

            overview.value = overviewResponse?.data || {};
            merchantTrend.value = trendResponse?.data?.monthlySignups || [];
            complianceSummary.value = complianceResponse?.data || {};
        } catch (err) {
            error.value = "Unable to load the admin overview right now.";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        overview,
        merchantTrend,
        complianceSummary,
        loading,
        error,
        fetchOverview,
    };
});
