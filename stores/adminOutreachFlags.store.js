import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { getPaginatedData } from "~/utils/helpers.js";
import { updateOutreachFlagPayloadSchema } from "~/schemas/outreachFlagSchema";

export const useAdminOutreachFlagsStore = defineStore("adminOutreachFlagsStore", () => {
    const { get, patch } = useApiService();
    const toastStore = useToastStore();

    const flags = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const total = ref(0);
    const paginatedData = ref(undefined);
    const error = ref("");

    // params.page is zero based, like the endpoint. The list comes back as { items, total, totalPages, currentPage }.
    async function fetchFlags(params = {}) {
        loading.value = true;
        error.value = "";

        try {
            const response = await get(endpoints.admin.merchants.outreachFlags, params, { forceMode: "live" });
            const data = response?.data;

            flags.value = data?.items || [];
            total.value = data?.total ?? flags.value.length;

            const page = Number(params.page ?? 0);
            const limit = Number(params.limit || flags.value.length || 1);
            paginatedData.value = getPaginatedData({
                current_page: page + 1,
                per_page: limit,
                total: total.value,
                from: total.value ? page * limit + 1 : 0,
                to: Math.min((page + 1) * limit, total.value),
            });
        } catch (err) {
            error.value = "Unable to load the outreach queue.";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // Sends only the fields that changed. The payload is parsed first, and the parsed value is what goes out.
    async function updateFlag(flagId, payload) {
        const parsedPayload = updateOutreachFlagPayloadSchema.parse(payload);
        const url = endpoints.admin.merchants.outreachFlag.replace(":id", flagId);

        saving.value = true;
        try {
            const response = await patch(url, parsedPayload, { forceMode: "live" });
            if (response) {
                toastStore.success(response.message || "Outreach flag updated", "");
            }
            return response?.data;
        } finally {
            saving.value = false;
        }
    }

    return {
        flags,
        loading,
        saving,
        total,
        paginatedData,
        error,
        fetchFlags,
        updateFlag,
    };
});
