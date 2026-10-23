import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { logger } from "~/utils/helpers.js";

export const useAdminIncomingWebhooksStore = defineStore("adminIncomingWebhooksStore", () => {
    const { get } = useApiService();

    const summary = ref({});
    const webhooks = ref([]);
    const loadingSummary = ref(false);
    const loading = ref(false);
    const error = ref("");
    const status = ref("");
    const reference = ref("");
    const page = ref(0);
    const limit = ref(50);

    // The list endpoint returns a bare array with no total, so a full page means there may be more.
    const hasPrevious = computed(() => page.value > 0);
    const hasNext = computed(() => webhooks.value.length === limit.value);

    async function fetchSummary() {
        loadingSummary.value = true;
        try {
            const response = await get(endpoints.admin.incomingWebhooks.summary, {}, { forceMode: "live" });
            summary.value = response?.data || {};
        } catch (err) {
            logger.error("Failed to load incoming webhook summary", err);
            summary.value = {};
        } finally {
            loadingSummary.value = false;
        }
    }

    // A reference takes priority over a status on the backend, so only one of the two is sent.
    async function fetchWebhooks(params = {}) {
        status.value = params.status ?? status.value;
        reference.value = params.reference ?? reference.value;
        page.value = params.page ?? page.value;
        limit.value = params.limit ?? limit.value;
        loading.value = true;
        error.value = "";
        try {
            const query = { page: page.value, limit: limit.value };
            if (reference.value) query.reference = reference.value;
            else if (status.value) query.status = status.value;
            const response = await get(endpoints.admin.incomingWebhooks.list, query, { forceMode: "live" });
            webhooks.value = response?.data || [];
        } catch (err) {
            logger.error("Failed to load incoming webhooks", err);
            webhooks.value = [];
            error.value = "Incoming webhooks could not be loaded.";
        } finally {
            loading.value = false;
        }
    }

    return {
        summary,
        webhooks,
        loadingSummary,
        loading,
        error,
        status,
        reference,
        page,
        limit,
        hasPrevious,
        hasNext,
        fetchSummary,
        fetchWebhooks,
    };
});
