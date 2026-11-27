import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { getPaginatedData } from "~/utils/helpers.js";

export const useAdminLifecycleStore = defineStore("adminLifecycleStore", () => {
    const { get } = useApiService();

    const overview = ref(null);
    const overviewLoading = ref(false);
    const overviewError = ref("");

    const stores = ref([]);
    const storesLoading = ref(false);
    const storesError = ref("");
    const total = ref(0);
    const paginatedData = ref(undefined);

    // The overview scans every active store, so it can take a few seconds on a large platform.
    // params.classification (REAL, INTERNAL or TEST) limits the stage counts to that kind of store.
    async function fetchOverview(params = {}) {
        overviewLoading.value = true;
        overviewError.value = "";

        try {
            const response = await get(endpoints.admin.merchants.lifecycleOverview, params, { forceMode: "live" });
            overview.value = response?.data || null;
        } catch (err) {
            overviewError.value = "Unable to load the lifecycle overview.";
            throw err;
        } finally {
            overviewLoading.value = false;
        }
    }

    // params.page is zero based, like the endpoint. The list comes back as { items, total, totalPages, currentPage }.
    async function fetchStores(params = {}) {
        storesLoading.value = true;
        storesError.value = "";

        try {
            const response = await get(endpoints.admin.merchants.lifecycleStores, params, { forceMode: "live" });
            const data = response?.data;

            // DataTable passes row.id to its actions, and these rows are identified by tenantId.
            stores.value = (data?.items || []).map((item) => ({ ...item, id: item.tenantId }));
            total.value = data?.total ?? stores.value.length;

            const page = Number(params.page ?? 0);
            const limit = Number(params.limit || stores.value.length || 1);
            paginatedData.value = getPaginatedData({
                current_page: page + 1,
                per_page: limit,
                total: total.value,
                from: total.value ? page * limit + 1 : 0,
                to: Math.min((page + 1) * limit, total.value),
            });
        } catch (err) {
            storesError.value = "Unable to load the store list.";
            throw err;
        } finally {
            storesLoading.value = false;
        }
    }

    return {
        overview,
        overviewLoading,
        overviewError,
        stores,
        storesLoading,
        storesError,
        total,
        paginatedData,
        fetchOverview,
        fetchStores,
    };
});
