import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";

function defaultStatsFilters() {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
        from: from.toISOString(),
        to: to.toISOString(),
        tenantId: "",
        category: "",
        notificationType: "",
        notifiableType: "",
    };
}

function stripEmptyParams(params) {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
    );
}

export const useAdminNotificationMonitoringStore = defineStore("adminNotificationMonitoringStore", () => {
    const { get, post } = useApiService();

    const overview = ref(null);
    const loadingOverview = ref(false);
    const overviewError = ref("");

    const stats = ref(null);
    const loadingStats = ref(false);
    const statsError = ref("");
    const statsFilters = ref(defaultStatsFilters());

    const rollupRunning = ref(false);
    const rollupResult = ref(null);
    const rollupError = ref("");
    const nextAllowedAt = ref(null);

    async function fetchOverview(tenantId = "") {
        loadingOverview.value = true;
        overviewError.value = "";
        try {
            const params = stripEmptyParams({ tenantId });
            const response = await get(endpoints.admin.notificationMonitoring.overview, params, { forceMode: "live" });
            overview.value = response?.data || null;
        } catch (err) {
            overviewError.value = "Unable to load notification monitoring overview right now.";
            throw err;
        } finally {
            loadingOverview.value = false;
        }
    }

    async function fetchStats(overrides = {}) {
        loadingStats.value = true;
        statsError.value = "";
        try {
            const params = stripEmptyParams({ ...statsFilters.value, ...overrides });
            const response = await get(endpoints.admin.notificationMonitoring.stats, params, { forceMode: "live" });
            stats.value = response?.data || null;
        } catch (err) {
            statsError.value = "Unable to load notification delivery statistics right now.";
            throw err;
        } finally {
            loadingStats.value = false;
        }
    }

    async function runRollup(days = 1) {
        rollupRunning.value = true;
        rollupError.value = "";
        try {
            const route = `${endpoints.admin.notificationMonitoring.runRollup}?days=${days}`;
            const response = await post(route, null, { forceMode: "live" });
            rollupResult.value = response?.data || null;
            nextAllowedAt.value = response?.data?.nextAllowedAt || null;
            return response;
        } catch (err) {
            const status = err?.response?.status || err?.statusCode;
            // Mirrors adminAnalytics.store.js: the backend's blocked-retry response has been observed
            // coming back as HTTP 500 rather than 429 for the equivalent analytics rollup trigger, so
            // read the backend's own message regardless of status instead of branching on 429 alone.
            const backendMessage = err?.data?.detail || err?.data?.message;
            rollupError.value = backendMessage || "Unable to run the notification rollup right now.";
            if (status === 429) {
                nextAllowedAt.value = err?.data?.nextAllowedAt || nextAllowedAt.value;
            }
            throw err;
        } finally {
            rollupRunning.value = false;
        }
    }

    function setStatsFilters(nextFilters) {
        statsFilters.value = { ...statsFilters.value, ...nextFilters };
    }

    function resetStatsFilters() {
        statsFilters.value = defaultStatsFilters();
    }

    return {
        overview,
        loadingOverview,
        overviewError,
        fetchOverview,

        stats,
        loadingStats,
        statsError,
        statsFilters,
        fetchStats,
        setStatsFilters,
        resetStatsFilters,

        rollupRunning,
        rollupResult,
        rollupError,
        nextAllowedAt,
        runRollup,
    };
});
