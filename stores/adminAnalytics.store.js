import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";

function defaultFilters() {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
        from: from.toISOString(),
        to: to.toISOString(),
        tenantId: "",
        appName: "",
        eventName: "",
        featureCode: "",
        pagePath: "",
        limit: 10,
    };
}

function stripEmptyParams(params) {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
    );
}

export const useAdminAnalyticsStore = defineStore("adminAnalyticsStore", () => {
    const { get, post } = useApiService();

    const summary = ref(null);
    const loading = ref(false);
    const error = ref("");
    const filters = ref(defaultFilters());

    const rollupRunning = ref(false);
    const rollupResult = ref(null);
    const rollupError = ref("");
    const nextAllowedAt = ref(null);

    async function fetchSummary(overrides = {}) {
        loading.value = true;
        error.value = "";
        try {
            const params = stripEmptyParams({ ...filters.value, ...overrides });
            const response = await get(endpoints.admin.analytics.summary, params, { forceMode: "live" });
            summary.value = response?.data || null;
        } catch (err) {
            error.value = "Unable to load analytics right now.";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function runRollup(days = 30) {
        rollupRunning.value = true;
        rollupError.value = "";
        try {
            const route = `${endpoints.admin.analytics.runRollup}?days=${days}`;
            const response = await post(route, null, { forceMode: "live" });
            rollupResult.value = response?.data || null;
            nextAllowedAt.value = response?.data?.nextAllowedAt || null;
            return response;
        } catch (err) {
            const status = err?.response?.status || err?.statusCode;
            // Backend currently returns HTTP 500 (not 429) for a blocked retry — GlobalExceptionHandler's
            // catch-all Exception handler runs before CustomTooManyRequestsException's @ResponseStatus is applied.
            // Surface the backend's own message either way so the "please try again after ..." text still reaches the user.
            const backendMessage = err?.data?.detail || err?.data?.message;
            rollupError.value = backendMessage || "Unable to run the analytics rollup right now.";
            if (status === 429) {
                nextAllowedAt.value = err?.data?.nextAllowedAt || nextAllowedAt.value;
            }
            throw err;
        } finally {
            rollupRunning.value = false;
        }
    }

    function setFilters(nextFilters) {
        filters.value = { ...filters.value, ...nextFilters };
    }

    function resetFilters() {
        filters.value = defaultFilters();
    }

    return {
        summary,
        loading,
        error,
        filters,
        rollupRunning,
        rollupResult,
        rollupError,
        nextAllowedAt,
        fetchSummary,
        runRollup,
        setFilters,
        resetFilters,
    };
});
