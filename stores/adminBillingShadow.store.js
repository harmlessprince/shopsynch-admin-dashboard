import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { logger } from "~/utils/helpers.js";

export const useAdminBillingShadowStore = defineStore("adminBillingShadowStore", () => {
    const { get } = useApiService();

    const summary = ref({});
    const entries = ref([]);
    const loadingSummary = ref(false);
    const loadingEntries = ref(false);
    const error = ref("");
    const type = ref("WOULD_BE_DUPLICATE");
    const page = ref(0);
    const limit = ref(50);

    // The entries endpoint returns a bare array with no total, so a full page means there may be more.
    const hasPrevious = computed(() => page.value > 0);
    const hasNext = computed(() => entries.value.length === limit.value);

    async function fetchSummary() {
        loadingSummary.value = true;
        try {
            const response = await get(endpoints.admin.billing.shadow.summary, {}, { forceMode: "live" });
            summary.value = response?.data || {};
        } catch (err) {
            logger.error("Failed to load shadow mode summary", err);
            summary.value = {};
            error.value = "Shadow mode observations could not be loaded.";
        } finally {
            loadingSummary.value = false;
        }
    }

    async function fetchEntries(params = {}) {
        type.value = params.type ?? type.value;
        page.value = params.page ?? page.value;
        limit.value = params.limit ?? limit.value;
        loadingEntries.value = true;
        error.value = "";
        try {
            const response = await get(
                endpoints.admin.billing.shadow.entries,
                { type: type.value, page: page.value, limit: limit.value },
                { forceMode: "live" },
            );
            entries.value = response?.data || [];
        } catch (err) {
            logger.error("Failed to load shadow mode entries", err);
            entries.value = [];
            error.value = "Shadow mode observations could not be loaded.";
        } finally {
            loadingEntries.value = false;
        }
    }

    return {
        summary,
        entries,
        loadingSummary,
        loadingEntries,
        error,
        type,
        page,
        limit,
        hasPrevious,
        hasNext,
        fetchSummary,
        fetchEntries,
    };
});
