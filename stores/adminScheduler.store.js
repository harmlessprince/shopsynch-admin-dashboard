import { defineStore } from "pinia";
import { ref } from "vue";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";

export const useAdminSchedulerStore = defineStore("adminSchedulerStore", () => {
    const { get } = useApiService();

    // Overview & Health
    const overview = ref({
        totalMonitored: 0,
        healthyCount: 0,
        warningCount: 0,
        criticalCount: 0,
        activeAlertsCount: 0,
        last24HoursRunsCount: 0,
        last24HoursSuccessCount: 0,
        last24HoursFailureCount: 0,
        schedulers: [],
        alerts: [],
    });
    const loadingOverview = ref(false);

    // Alerts
    const alerts = ref([]);
    const loadingAlerts = ref(false);

    // Run History
    const runs = ref([]);
    const runPagination = ref({ page: 0, limit: 20, totalPages: 0, totalElements: 0 });
    const loadingRuns = ref(false);
    const selectedRun = ref(null);
    const loadingDetail = ref(false);

    const fetchOverview = async () => {
        loadingOverview.value = true;
        try {
            const response = await get(endpoints.admin.schedulers.overview, {}, { forceMode: 'live' });
            if (response?.status && response.data) {
                overview.value = response.data;
                alerts.value = response.data.alerts || [];
            }
            return response;
        } finally {
            loadingOverview.value = false;
        }
    };

    const fetchAlerts = async () => {
        loadingAlerts.value = true;
        try {
            const response = await get(endpoints.admin.schedulers.alerts, {}, { forceMode: 'live' });
            if (response?.status && response.data) {
                alerts.value = response.data || [];
            }
            return response;
        } finally {
            loadingAlerts.value = false;
        }
    };

    const fetchRuns = async (params = {}) => {
        loadingRuns.value = true;
        try {
            const response = await get(endpoints.admin.schedulers.runs, params, { forceMode: 'live' });
            if (response?.status && response.data) {
                runs.value = response.data.items || [];
                runPagination.value = {
                    page: response.data.currentPage || 1,
                    limit: response.data.limit || 20,
                    totalPages: response.data.totalPages || 0,
                    totalElements: response.data.total || 0,
                };
            }
            return response;
        } finally {
            loadingRuns.value = false;
        }
    };

    const fetchRunDetail = async (id) => {
        loadingDetail.value = true;
        try {
            const url = endpoints.admin.schedulers.runDetail.replace(':id', id);
            const response = await get(url, {}, { forceMode: 'live' });
            if (response?.status && response.data) {
                selectedRun.value = response.data;
            }
            return response;
        } finally {
            loadingDetail.value = false;
        }
    };

    return {
        overview,
        loadingOverview,
        alerts,
        loadingAlerts,
        runs,
        runPagination,
        loadingRuns,
        selectedRun,
        loadingDetail,
        fetchOverview,
        fetchAlerts,
        fetchRuns,
        fetchRunDetail,
    };
});
