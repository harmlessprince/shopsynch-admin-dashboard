import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { getPaginatedData } from "~/utils/helpers.js";

export const useAdminLogisticsStore = defineStore("adminLogisticsStore", () => {
    const { get, put } = useApiService();
    const toastStore = useToastStore();

    const loading = ref(false);
    const resolving = ref(false);
    const error = ref("");

    // Shipments
    const shipments = ref([]);
    const shipmentsTotal = ref(0);
    const shipmentsPaginatedData = ref(undefined);

    // Usage stats (not paginated)
    const usageStats = ref([]);

    // Waybill failures
    const waybillFailures = ref([]);
    const waybillFailuresTotal = ref(0);
    const waybillFailuresPaginatedData = ref(undefined);

    // Weight adjustments
    const adjustments = ref([]);
    const adjustmentsTotal = ref(0);
    const adjustmentsPaginatedData = ref(undefined);

    async function fetchShipments(params = {}) {
        loading.value = true;
        error.value = "";
        try {
            const response = await get(endpoints.admin.logistics.shipments, params, { forceMode: "live" });
            const data = response?.data;
            shipments.value = data?.items || data?.content || [];
            shipmentsTotal.value = data?.total ?? data?.totalElements ?? shipments.value.length;

            if (data?.total !== undefined) {
                const limit = Number(params.limit || params.size || shipments.value.length || 1);
                const currentPage = Number(data.currentPage ?? params.page ?? 0);
                shipmentsPaginatedData.value = getPaginatedData({
                    current_page: currentPage + 1,
                    per_page: limit,
                    total: data.total,
                    from: currentPage * limit + 1,
                    to: Math.min((currentPage + 1) * limit, data.total),
                });
            }
        } finally {
            loading.value = false;
        }
    }

    async function fetchUsageStats(params = {}) {
        loading.value = true;
        error.value = "";
        try {
            const response = await get(endpoints.admin.logistics.usage, params, { forceMode: "live" });
            usageStats.value = response?.data || [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchWaybillFailures(params = {}) {
        loading.value = true;
        error.value = "";
        try {
            const response = await get(endpoints.admin.logistics.waybillFailures, params, { forceMode: "live" });
            const data = response?.data;
            waybillFailures.value = data?.items || data?.content || [];
            waybillFailuresTotal.value = data?.total ?? data?.totalElements ?? waybillFailures.value.length;

            if (data?.total !== undefined) {
                const limit = Number(params.limit || params.size || waybillFailures.value.length || 1);
                const currentPage = Number(data.currentPage ?? params.page ?? 0);
                waybillFailuresPaginatedData.value = getPaginatedData({
                    current_page: currentPage + 1,
                    per_page: limit,
                    total: data.total,
                    from: currentPage * limit + 1,
                    to: Math.min((currentPage + 1) * limit, data.total),
                });
            }
        } finally {
            loading.value = false;
        }
    }

    async function fetchWeightAdjustments(params = {}) {
        loading.value = true;
        error.value = "";
        try {
            const response = await get(endpoints.admin.logistics.weightAdjustments, params, { forceMode: "live" });
            const data = response?.data;
            adjustments.value = data?.items || data?.content || [];
            adjustmentsTotal.value = data?.total ?? data?.totalElements ?? adjustments.value.length;

            if (data?.total !== undefined) {
                const limit = Number(params.limit || params.size || adjustments.value.length || 1);
                const currentPage = Number(data.currentPage ?? params.page ?? 0);
                adjustmentsPaginatedData.value = getPaginatedData({
                    current_page: currentPage + 1,
                    per_page: limit,
                    total: data.total,
                    from: currentPage * limit + 1,
                    to: Math.min((currentPage + 1) * limit, data.total),
                });
            }
        } finally {
            loading.value = false;
        }
    }

    // Provider capabilities
    const providerCapabilities = ref([]);
    const capabilitiesLoading = ref(false);
    const capabilitySaving = ref(false);

    async function fetchProviderCapabilities() {
        capabilitiesLoading.value = true;
        try {
            const response = await get(endpoints.admin.logistics.providerCapabilities, {}, { forceMode: "live" });
            providerCapabilities.value = response?.data || [];
        } finally {
            capabilitiesLoading.value = false;
        }
    }

    async function updateProviderCapability(provider, payload) {
        capabilitySaving.value = true;
        try {
            const url = endpoints.admin.logistics.providerCapability.replace(":provider", provider);
            const response = await put(url, payload, { forceMode: "live" });
            if (response) {
                toastStore.success("Provider capability updated", "");
                const updated = response?.data;
                if (updated) {
                    const idx = providerCapabilities.value.findIndex((c) => c.provider === provider);
                    if (idx !== -1) providerCapabilities.value[idx] = updated;
                }
            }
            return response;
        } finally {
            capabilitySaving.value = false;
        }
    }

    async function resolveWeightAdjustment(adjustmentId, payload) {
        resolving.value = true;
        try {
            const url = endpoints.admin.logistics.resolveAdjustment.replace(":adjustmentId", adjustmentId);
            const response = await put(url, payload, { forceMode: "live" });
            if (response) {
                toastStore.success("Adjustment resolved successfully", "");
            }
            return response;
        } finally {
            resolving.value = false;
        }
    }

    return {
        loading,
        resolving,
        error,
        shipments,
        shipmentsTotal,
        shipmentsPaginatedData,
        usageStats,
        waybillFailures,
        waybillFailuresTotal,
        waybillFailuresPaginatedData,
        adjustments,
        adjustmentsTotal,
        adjustmentsPaginatedData,
        fetchShipments,
        fetchUsageStats,
        fetchWaybillFailures,
        fetchWeightAdjustments,
        resolveWeightAdjustment,
        providerCapabilities,
        capabilitiesLoading,
        capabilitySaving,
        fetchProviderCapabilities,
        updateProviderCapability,
    };
});
