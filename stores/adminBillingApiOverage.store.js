import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { logger } from "~/utils/helpers.js";

// Read-only views of API overage billing: invoices an admin has to look at, and the revenue split.
export const useAdminBillingApiOverageStore = defineStore("adminBillingApiOverageStore", () => {
    const { get } = useApiService();

    const attention = ref([]);
    const loadingAttention = ref(false);
    const attentionError = ref("");

    const invoices = ref([]);
    const invoicePage = ref(0);
    const invoiceSize = ref(20);
    const invoiceTotal = ref(0);
    const invoiceTotalPages = ref(0);
    const loadingInvoices = ref(false);
    const invoicesError = ref("");

    const revenueSplit = ref([]);
    const loadingRevenue = ref(false);
    const revenueError = ref("");

    async function fetchAttention() {
        loadingAttention.value = true;
        attentionError.value = "";
        try {
            const response = await get(endpoints.admin.billing.apiOverage.attention, {}, { forceMode: "live" });
            attention.value = response?.data || [];
        } catch (err) {
            logger.error("Failed to load overage invoices needing attention", err);
            attention.value = [];
            attentionError.value = "Overage invoices needing attention could not be loaded.";
        } finally {
            loadingAttention.value = false;
        }
    }

    // usageMonth (yyyy-MM) and status are optional filters; without a status the API returns issued, paid and cancelled.
    async function fetchInvoices({ page = 0, size = invoiceSize.value, usageMonth = "", status = "" } = {}) {
        loadingInvoices.value = true;
        invoicesError.value = "";
        try {
            const params = { page, size };
            if (usageMonth) params.usageMonth = usageMonth;
            if (status) params.status = status;
            const response = await get(endpoints.admin.billing.apiOverage.list, params, { forceMode: "live", silent: true });
            const body = response?.data || {};
            invoices.value = body.items || [];
            invoicePage.value = body.page ?? page;
            invoiceSize.value = body.size ?? size;
            invoiceTotal.value = body.totalElements ?? invoices.value.length;
            invoiceTotalPages.value = body.totalPages ?? 1;
        } catch (err) {
            logger.error("Failed to load API overage invoices", err);
            invoices.value = [];
            invoiceTotal.value = 0;
            invoiceTotalPages.value = 0;
            invoicesError.value = err?.data?.message || "API overage invoices could not be loaded.";
        } finally {
            loadingInvoices.value = false;
        }
    }

    // paidFrom and paidTo are ISO date-times, both optional; the period end is exclusive.
    async function fetchRevenueSplit(params = {}) {
        loadingRevenue.value = true;
        revenueError.value = "";
        try {
            const response = await get(endpoints.admin.billing.payments.revenueSplit, params, { forceMode: "live" });
            revenueSplit.value = response?.data || [];
        } catch (err) {
            logger.error("Failed to load the subscription revenue split", err);
            revenueSplit.value = [];
            revenueError.value = "The revenue split could not be loaded.";
        } finally {
            loadingRevenue.value = false;
        }
    }

    return {
        attention, loadingAttention, attentionError,
        invoices, invoicePage, invoiceSize, invoiceTotal, invoiceTotalPages, loadingInvoices, invoicesError,
        revenueSplit, loadingRevenue, revenueError,
        fetchAttention, fetchInvoices, fetchRevenueSplit,
    };
});
