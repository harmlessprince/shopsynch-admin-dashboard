import { defineStore } from "pinia";
import { ref } from "vue";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useAdminNotificationOperationsStore = defineStore("adminNotificationOperationsStore", () => {
    const { get, post, patch, delete: del } = useApiService();
    const toast = useToastStore();

    // Preferences state
    const preferences = ref([]);
    const preferencePagination = ref({ page: 0, limit: 50, totalPages: 0, totalElements: 0 });
    const loadingPreferences = ref(false);

    // Deliveries state
    const deliveries = ref([]);
    const deliveryPagination = ref({ page: 0, limit: 50, totalPages: 0, totalElements: 0 });
    const loadingDeliveries = ref(false);

    // Suppressions state
    const suppressions = ref([]);
    const suppressionPagination = ref({ page: 0, limit: 50, totalPages: 0, totalElements: 0 });
    const loadingSuppressions = ref(false);

    // Scheduler runs state
    const schedulerRuns = ref([]);
    const schedulerRunPagination = ref({ page: 0, limit: 50, totalPages: 0, totalElements: 0 });
    const loadingSchedulerRuns = ref(false);
    const selectedSchedulerRun = ref(null);

    // Actions
    const fetchPreferences = async (params = {}) => {
        loadingPreferences.value = true;
        try {
            const response = await get(endpoints.admin.notifications.preferences, params, { forceMode: 'live' });
            if (response?.status && response.data) {
                preferences.value = response.data.content || [];
                preferencePagination.value = {
                    page: response.data.page || 0,
                    limit: response.data.limit || 50,
                    totalPages: response.data.totalPages || 0,
                    totalElements: response.data.totalElements || 0,
                };
            }
            return response;
        } finally {
            loadingPreferences.value = false;
        }
    };

    const updatePreference = async (id, { enabled, consentSource, reason }) => {
        const url = endpoints.admin.notifications.updatePreference.replace(':id', id);
        const response = await patch(url, { enabled, consentSource, reason }, { forceMode: 'live' });
        if (response?.status) {
            toast.success("Notification preference updated successfully.");
            await fetchPreferences();
        }
        return response;
    };

    const fetchDeliveries = async (params = {}) => {
        loadingDeliveries.value = true;
        try {
            const response = await get(endpoints.admin.notifications.deliveries, params, { forceMode: 'live' });
            if (response?.status && response.data) {
                deliveries.value = response.data.content || [];
                deliveryPagination.value = {
                    page: response.data.page || 0,
                    limit: response.data.limit || 50,
                    totalPages: response.data.totalPages || 0,
                    totalElements: response.data.totalElements || 0,
                };
            }
            return response;
        } finally {
            loadingDeliveries.value = false;
        }
    };

    const fetchSuppressions = async (params = {}) => {
        loadingSuppressions.value = true;
        try {
            const response = await get(endpoints.admin.notifications.suppressions, params, { forceMode: 'live' });
            if (response?.status && response.data) {
                suppressions.value = response.data.content || [];
                suppressionPagination.value = {
                    page: response.data.page || 0,
                    limit: response.data.limit || 50,
                    totalPages: response.data.totalPages || 0,
                    totalElements: response.data.totalElements || 0,
                };
            }
            return response;
        } finally {
            loadingSuppressions.value = false;
        }
    };

    const addSuppression = async ({ email, reason }) => {
        const response = await post(endpoints.admin.notifications.addSuppression, { email, reason }, { forceMode: 'live' });
        if (response?.status) {
            toast.success("Email manually suppressed.");
            await fetchSuppressions();
        }
        return response;
    };

    const removeSuppression = async (email) => {
        const url = endpoints.admin.notifications.removeSuppression.replace(':email', encodeURIComponent(email));
        const response = await del(url, { forceMode: 'live' });
        if (response?.status) {
            toast.success("Suppression entry removed.");
            await fetchSuppressions();
        }
        return response;
    };

    const fetchSchedulerRuns = async (params = {}) => {
        loadingSchedulerRuns.value = true;
        try {
            const response = await get(endpoints.admin.notifications.schedulerRuns, params, { forceMode: 'live' });
            if (response?.status && response.data) {
                schedulerRuns.value = response.data.content || [];
                schedulerRunPagination.value = {
                    page: response.data.page || 0,
                    limit: response.data.limit || 50,
                    totalPages: response.data.totalPages || 0,
                    totalElements: response.data.totalElements || 0,
                };
            }
            return response;
        } finally {
            loadingSchedulerRuns.value = false;
        }
    };

    const fetchSchedulerRunDetail = async (id) => {
        const url = endpoints.admin.notifications.schedulerRunDetail.replace(':id', id);
        const response = await get(url, {}, { forceMode: 'live' });
        if (response?.status && response.data) {
            selectedSchedulerRun.value = response.data;
        }
        return response;
    };

    return {
        preferences,
        preferencePagination,
        loadingPreferences,
        fetchPreferences,
        updatePreference,

        deliveries,
        deliveryPagination,
        loadingDeliveries,
        fetchDeliveries,

        suppressions,
        suppressionPagination,
        loadingSuppressions,
        fetchSuppressions,
        addSuppression,
        removeSuppression,

        schedulerRuns,
        schedulerRunPagination,
        loadingSchedulerRuns,
        selectedSchedulerRun,
        fetchSchedulerRuns,
        fetchSchedulerRunDetail,
    };
});
