import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { getPaginatedData } from "~/utils/helpers.js";

export const useAdminFeatureFlagsStore = defineStore("adminFeatureFlagsStore", () => {
    const { get, post, patch } = useApiService();
    const toastStore = useToastStore();

    const loading = ref(false);
    const saving = ref(false);
    const overriding = ref(false);

    const flags = ref([]);
    const flagsTotal = ref(0);
    const flagsPaginatedData = ref(undefined);

    const selectedFlag = ref(null);

    async function fetchFlags(params = {}) {
        loading.value = true;
        try {
            const response = await get(endpoints.admin.featureFlags.list, params, { forceMode: "live" });
            const data = response?.data;
            flags.value = data?.items || data?.content || data || [];
            flagsTotal.value = data?.total ?? data?.totalElements ?? flags.value.length;

            if (data?.total !== undefined) {
                const limit = Number(params.limit || params.size || flags.value.length || 1);
                const currentPage = Number(data.currentPage ?? params.page ?? 0);
                flagsPaginatedData.value = getPaginatedData({
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

    async function fetchFlag(code) {
        loading.value = true;
        try {
            const url = endpoints.admin.featureFlags.detail.replace(":code", code);
            const response = await get(url, {}, { forceMode: "live" });
            selectedFlag.value = response?.data || null;
            return selectedFlag.value;
        } finally {
            loading.value = false;
        }
    }

    async function createFlag(payload) {
        saving.value = true;
        try {
            const response = await post(endpoints.admin.featureFlags.create, payload, { forceMode: "live" });
            if (response) {
                toastStore.success("Feature flag created", "");
            }
            return response;
        } finally {
            saving.value = false;
        }
    }

    async function updateFlag(code, payload) {
        saving.value = true;
        try {
            const url = endpoints.admin.featureFlags.update.replace(":code", code);
            const response = await patch(url, payload, { forceMode: "live" });
            if (response) {
                toastStore.success("Feature flag updated", "");
                selectedFlag.value = response?.data || selectedFlag.value;
            }
            return response;
        } finally {
            saving.value = false;
        }
    }

    async function addTenantOverride(code, payload) {
        overriding.value = true;
        try {
            const url = endpoints.admin.featureFlags.tenantOverride.replace(":code", code);
            const response = await post(url, payload, { forceMode: "live" });
            if (response) {
                toastStore.success("Tenant override applied", "");
                if (selectedFlag.value) {
                    await fetchFlag(code);
                }
            }
            return response;
        } finally {
            overriding.value = false;
        }
    }

    return {
        loading,
        saving,
        overriding,
        flags,
        flagsTotal,
        flagsPaginatedData,
        selectedFlag,
        fetchFlags,
        fetchFlag,
        createFlag,
        updateFlag,
        addTenantOverride,
    };
});
