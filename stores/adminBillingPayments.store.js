import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { logger, cleanObject } from "~/utils/helpers.js";

export const useAdminBillingPaymentsStore = defineStore("adminBillingPaymentsStore", () => {
    const { get } = useApiService();

    const payments = ref([]);
    const loading = ref(false);
    const error = ref("");
    const page = ref(0);
    const size = ref(20);
    const totalElements = ref(0);
    const totalPages = ref(0);

    const filters = reactive({
        tenantId: "",
        subscriptionId: "",
        planId: "",
        provider: "",
        priceSource: "",
        offerCode: "",
        providerReference: "",
        paidFrom: "",
        paidTo: "",
    });

    const selectedPayment = ref(null);
    const loadingDetail = ref(false);
    const detailError = ref("");

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

    async function fetchPayments(params = {}) {
        loading.value = true;
        error.value = "";
        try {
            const pageNum = params.page !== undefined ? params.page : page.value;
            const sizeNum = params.size !== undefined ? params.size : size.value;

            const query = cleanObject({
                tenantId: filters.tenantId?.trim() || undefined,
                subscriptionId: filters.subscriptionId?.trim() || undefined,
                planId: filters.planId?.trim() || undefined,
                provider: filters.provider || undefined,
                priceSource: filters.priceSource || undefined,
                offerCode: filters.offerCode?.trim() || undefined,
                providerReference: filters.providerReference?.trim() || undefined,
                paidFrom: filters.paidFrom ? toIsoDateTime(filters.paidFrom) : undefined,
                paidTo: filters.paidTo ? toIsoDateTime(filters.paidTo) : undefined,
                page: pageNum,
                size: sizeNum,
                ...params,
            });

            if (query.paidFrom && !query.paidFrom.endsWith("Z")) {
                query.paidFrom = toIsoDateTime(query.paidFrom);
            }
            if (query.paidTo && !query.paidTo.endsWith("Z")) {
                query.paidTo = toIsoDateTime(query.paidTo);
            }

            const response = await get(endpoints.admin.billing.payments.list, query, { forceMode: "live" });
            const data = normalizeData(response);

            payments.value = data?.items || [];
            page.value = data?.page ?? pageNum;
            size.value = data?.size ?? sizeNum;
            totalElements.value = data?.totalElements ?? payments.value.length;
            totalPages.value = data?.totalPages ?? (payments.value.length ? 1 : 0);
            return payments.value;
        } catch (err) {
            logger.error("Failed to fetch billing payments", err);
            payments.value = [];
            error.value = err?.data?.message || err?.message || "Failed to load subscription payments.";
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchPaymentDetail(paymentId) {
        if (!paymentId) return null;
        loadingDetail.value = true;
        detailError.value = "";
        try {
            const url = endpoints.admin.billing.payments.detail.replace(":paymentId", paymentId);
            const response = await get(url, {}, { forceMode: "live" });
            selectedPayment.value = normalizeData(response);
            return selectedPayment.value;
        } catch (err) {
            logger.error("Failed to load payment detail", err);
            detailError.value = err?.data?.message || err?.message || "Failed to load payment details.";
            return null;
        } finally {
            loadingDetail.value = false;
        }
    }

    function resetFilters() {
        filters.tenantId = "";
        filters.subscriptionId = "";
        filters.planId = "";
        filters.provider = "";
        filters.priceSource = "";
        filters.offerCode = "";
        filters.providerReference = "";
        filters.paidFrom = "";
        filters.paidTo = "";
        page.value = 0;
    }

    return {
        payments,
        loading,
        error,
        page,
        size,
        totalElements,
        totalPages,
        filters,
        selectedPayment,
        loadingDetail,
        detailError,
        fetchPayments,
        fetchPaymentDetail,
        resetFilters,
    };
});
