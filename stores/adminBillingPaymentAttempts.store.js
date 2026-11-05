import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger, cleanObject } from "~/utils/helpers.js";

export const useAdminBillingPaymentAttemptsStore = defineStore("adminBillingPaymentAttemptsStore", () => {
    const { get, post } = useApiService();
    const toastStore = useToastStore();

    const attempts = ref([]);
    const loading = ref(false);
    const error = ref("");
    const page = ref(0);
    const size = ref(20);
    const totalElements = ref(0);
    const totalPages = ref(0);

    const filters = reactive({
        tenantId: "",
        subscriptionId: "",
        status: "",
        provider: "",
        priceSource: "",
        offerCode: "",
        providerReference: "",
        initiatedFrom: "",
        initiatedTo: "",
    });

    const verifyingId = ref("");
    const abandoningId = ref("");
    const selectedAttempt = ref(null);
    const loadingDetail = ref(false);
    const actionError = ref("");
    const formErrors = ref({});

    function normalizeData(response) {
        return response?.data || response || null;
    }

    function toIsoDateTime(value) {
        if (!value) return undefined;
        try {
            return new Date(value).toISOString();
        } catch {
            return value;
        }
    }

    async function fetchPaymentAttempts(params = {}) {
        loading.value = true;
        error.value = "";
        actionError.value = "";
        try {
            const pageNum = params.page !== undefined ? params.page : page.value;
            const sizeNum = params.size !== undefined ? params.size : size.value;

            const query = cleanObject({
                tenantId: filters.tenantId?.trim() || undefined,
                subscriptionId: filters.subscriptionId?.trim() || undefined,
                status: filters.status || undefined,
                provider: filters.provider || undefined,
                priceSource: filters.priceSource || undefined,
                offerCode: filters.offerCode?.trim() || undefined,
                providerReference: filters.providerReference?.trim() || undefined,
                initiatedFrom: filters.initiatedFrom ? toIsoDateTime(filters.initiatedFrom) : undefined,
                initiatedTo: filters.initiatedTo ? toIsoDateTime(filters.initiatedTo) : undefined,
                page: pageNum,
                size: sizeNum,
                ...params,
            });

            // Convert dates in params if passed
            if (query.initiatedFrom && !query.initiatedFrom.endsWith("Z")) {
                query.initiatedFrom = toIsoDateTime(query.initiatedFrom);
            }
            if (query.initiatedTo && !query.initiatedTo.endsWith("Z")) {
                query.initiatedTo = toIsoDateTime(query.initiatedTo);
            }

            const response = await get(endpoints.admin.billing.paymentAttempts.list, query, { forceMode: "live" });
            const data = normalizeData(response);

            attempts.value = data?.items || [];
            page.value = data?.page ?? pageNum;
            size.value = data?.size ?? sizeNum;
            totalElements.value = data?.totalElements ?? attempts.value.length;
            totalPages.value = data?.totalPages ?? (attempts.value.length ? 1 : 0);
            return attempts.value;
        } catch (err) {
            logger.error("Failed to fetch billing payment attempts", err);
            attempts.value = [];
            error.value = err?.data?.message || err?.message || "Failed to load payment attempts.";
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchPaymentAttemptDetail(attemptId) {
        if (!attemptId) return null;
        loadingDetail.value = true;
        actionError.value = "";
        try {
            const url = endpoints.admin.billing.paymentAttempts.detail.replace(":attemptId", attemptId);
            const response = await get(url, {}, { forceMode: "live" });
            selectedAttempt.value = normalizeData(response);
            return selectedAttempt.value;
        } catch (err) {
            logger.error("Failed to load payment attempt detail", err);
            actionError.value = err?.data?.message || err?.message || "Failed to load payment attempt details.";
            return null;
        } finally {
            loadingDetail.value = false;
        }
    }

    async function verifyPaymentAttempt(attemptId) {
        if (!attemptId) return null;
        verifyingId.value = attemptId;
        actionError.value = "";
        try {
            const url = endpoints.admin.billing.paymentAttempts.verify.replace(":attemptId", attemptId);
            const response = await post(url, {}, { forceMode: "live" });
            const data = normalizeData(response);
            
            // data contains { attemptId, verification, attemptStatus }
            const status = data?.attemptStatus;
            const verification = data?.verification;
            
            // Update row in table if present
            const foundIndex = attempts.value.findIndex((item) => item.id === attemptId);
            if (foundIndex !== -1 && status) {
                attempts.value[foundIndex] = {
                    ...attempts.value[foundIndex],
                    status,
                };
            }
            if (selectedAttempt.value?.id === attemptId && status) {
                selectedAttempt.value = {
                    ...selectedAttempt.value,
                    status,
                };
            }

            toastStore.success(
                response?.message || `Checked provider: ${verification}. Attempt status: ${status}`,
                ""
            );
            return data;
        } catch (err) {
            logger.error("Failed to verify payment attempt with provider", err);
            actionError.value = err?.data?.message || err?.message || "Failed to verify attempt with provider.";
            return null;
        } finally {
            verifyingId.value = "";
        }
    }

    async function abandonPaymentAttempt(attemptId, reason) {
        if (!attemptId) return null;
        abandoningId.value = attemptId;
        actionError.value = "";
        formErrors.value = {};
        try {
            const url = endpoints.admin.billing.paymentAttempts.abandon.replace(":attemptId", attemptId);
            const response = await post(url, { reason }, { forceMode: "live" });
            const updated = normalizeData(response);

            // Update row in table if present
            const foundIndex = attempts.value.findIndex((item) => item.id === attemptId);
            if (foundIndex !== -1 && updated) {
                attempts.value[foundIndex] = updated;
            }
            if (selectedAttempt.value?.id === attemptId && updated) {
                selectedAttempt.value = updated;
            }

            toastStore.success(response?.message || "Payment attempt abandoned successfully", "");
            return updated;
        } catch (err) {
            logger.error("Failed to abandon payment attempt", err);
            if (err?.status === 422 || err?.statusCode === 422) {
                formErrors.value = err?.data?.errors || {};
            }
            actionError.value = err?.data?.message || err?.message || "Failed to abandon payment attempt.";
            return null;
        } finally {
            abandoningId.value = "";
        }
    }

    function resetFilters() {
        filters.tenantId = "";
        filters.subscriptionId = "";
        filters.status = "";
        filters.provider = "";
        filters.priceSource = "";
        filters.offerCode = "";
        filters.providerReference = "";
        filters.initiatedFrom = "";
        filters.initiatedTo = "";
        page.value = 0;
    }

    return {
        attempts,
        loading,
        error,
        page,
        size,
        totalElements,
        totalPages,
        filters,
        verifyingId,
        abandoningId,
        selectedAttempt,
        loadingDetail,
        actionError,
        formErrors,
        fetchPaymentAttempts,
        fetchPaymentAttemptDetail,
        verifyPaymentAttempt,
        abandonPaymentAttempt,
        resetFilters,
    };
});
