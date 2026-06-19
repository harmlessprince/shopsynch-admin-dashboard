import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";

export const useAdminBillingOperationsStore = defineStore("adminBillingOperationsStore", () => {
    const { get, post, patch } = useApiService();
    const toastStore = useToastStore();

    const loadingSnapshot = ref(false);
    const applyingOverride = ref(false);
    const revokingOverride = ref(false);
    const generatingCode = ref(false);
    const applyingCode = ref(false);
    const extendingSubscription = ref(false);
    const loadingInvoices = ref(false);
    const confirmingInvoice = ref(false);
    const snapshotError = ref("");
    const actionError = ref("");
    const invoicesError = ref("");
    const tenantSnapshot = ref(null);
    const tenantInvoices = ref([]);
    const generatedCode = ref(null);
    const updatedSubscription = ref(null);

    function normalizeData(response) {
        return response?.data || response || null;
    }

    async function fetchTenantSnapshot(tenantId) {
        if (!tenantId) return null;
        loadingSnapshot.value = true;
        snapshotError.value = "";
        try {
            const url = endpoints.admin.billing.subscriptions.tenantSnapshot.replace(":tenantId", tenantId);
            const response = await get(url, { recentEventLimit: 20 }, { forceMode: "live" });
            tenantSnapshot.value = normalizeData(response);
            await fetchTenantInvoices(tenantId);
            return tenantSnapshot.value;
        } catch (error) {
            logger.error("Failed to load tenant billing snapshot", error);
            tenantSnapshot.value = null;
            snapshotError.value = "Tenant billing snapshot could not be loaded.";
            return null;
        } finally {
            loadingSnapshot.value = false;
        }
    }

    async function fetchTenantInvoices(tenantId, status = "") {
        if (!tenantId) return [];
        loadingInvoices.value = true;
        invoicesError.value = "";
        try {
            const url = endpoints.admin.billing.invoices.tenant.replace(":tenantId", tenantId);
            const params = status ? { status } : {};
            const response = await get(url, params, { forceMode: "live" });
            const data = normalizeData(response);
            tenantInvoices.value = data?.items || data?.content || data || [];
            return tenantInvoices.value;
        } catch (error) {
            logger.error("Failed to load tenant subscription invoices", error);
            tenantInvoices.value = [];
            invoicesError.value = "Tenant subscription invoices could not be loaded.";
            return [];
        } finally {
            loadingInvoices.value = false;
        }
    }

    async function applyOverride(payload) {
        applyingOverride.value = true;
        actionError.value = "";
        try {
            const response = await post(endpoints.admin.billing.overrides.apply, payload, { forceMode: "live" });
            toastStore.success("Billing override applied", "");
            await fetchTenantSnapshot(payload.tenantId);
            return normalizeData(response);
        } catch (error) {
            logger.error("Failed to apply billing override", error);
            actionError.value = error?.data?.message || error?.message || "Billing override could not be applied.";
            return null;
        } finally {
            applyingOverride.value = false;
        }
    }

    async function revokeOverride(overrideId, reason, tenantId) {
        if (!overrideId) return null;
        revokingOverride.value = true;
        actionError.value = "";
        try {
            const url = endpoints.admin.billing.overrides.revoke.replace(":overrideId", overrideId);
            const response = await patch(url, { reason }, { forceMode: "live" });
            toastStore.success("Billing override revoked", "");
            if (tenantId) await fetchTenantSnapshot(tenantId);
            return normalizeData(response);
        } catch (error) {
            logger.error("Failed to revoke billing override", error);
            actionError.value = error?.data?.message || error?.message || "Billing override could not be revoked.";
            return null;
        } finally {
            revokingOverride.value = false;
        }
    }

    async function generateExtensionCode(payload) {
        generatingCode.value = true;
        actionError.value = "";
        try {
            const response = await post(endpoints.admin.billing.extensionCodes.generate, payload, { forceMode: "live" });
            generatedCode.value = normalizeData(response);
            toastStore.success("Extension code generated", "");
            return generatedCode.value;
        } catch (error) {
            logger.error("Failed to generate extension code", error);
            actionError.value = error?.data?.message || error?.message || "Extension code could not be generated.";
            return null;
        } finally {
            generatingCode.value = false;
        }
    }

    async function applyExtensionCode(payload) {
        applyingCode.value = true;
        actionError.value = "";
        try {
            const response = await post(endpoints.admin.billing.extensionCodes.apply, payload, { forceMode: "live" });
            updatedSubscription.value = normalizeData(response);
            toastStore.success("Extension code applied", "");
            await fetchTenantSnapshot(payload.tenantId);
            return updatedSubscription.value;
        } catch (error) {
            logger.error("Failed to apply extension code", error);
            actionError.value = error?.data?.message || error?.message || "Extension code could not be applied.";
            return null;
        } finally {
            applyingCode.value = false;
        }
    }

    async function extendSubscriptionDirectly(payload) {
        extendingSubscription.value = true;
        actionError.value = "";
        try {
            const response = await post(endpoints.admin.billing.extensions.direct, payload, { forceMode: "live" });
            updatedSubscription.value = normalizeData(response);
            toastStore.success("Subscription extended", "");
            await fetchTenantSnapshot(payload.tenantId);
            return updatedSubscription.value;
        } catch (error) {
            logger.error("Failed to extend subscription", error);
            actionError.value = error?.data?.message || error?.message || "Subscription could not be extended.";
            return null;
        } finally {
            extendingSubscription.value = false;
        }
    }

    async function confirmInvoicePayment(invoiceId, payload, tenantId) {
        if (!invoiceId) return null;
        confirmingInvoice.value = true;
        actionError.value = "";
        try {
            const url = endpoints.admin.billing.invoices.confirm.replace(":invoiceId", invoiceId);
            const response = await post(url, payload, { forceMode: "live" });
            toastStore.success("Manual invoice payment confirmed", "");
            if (tenantId) {
                await fetchTenantSnapshot(tenantId);
            }
            return normalizeData(response);
        } catch (error) {
            logger.error("Failed to confirm subscription invoice payment", error);
            actionError.value = error?.data?.message || error?.message || "Subscription invoice payment could not be confirmed.";
            return null;
        } finally {
            confirmingInvoice.value = false;
        }
    }

    function resetActionState() {
        actionError.value = "";
        invoicesError.value = "";
        generatedCode.value = null;
        updatedSubscription.value = null;
    }

    return {
        loadingSnapshot,
        applyingOverride,
        revokingOverride,
        generatingCode,
        applyingCode,
        extendingSubscription,
        loadingInvoices,
        confirmingInvoice,
        snapshotError,
        actionError,
        invoicesError,
        tenantSnapshot,
        tenantInvoices,
        generatedCode,
        updatedSubscription,
        fetchTenantSnapshot,
        fetchTenantInvoices,
        applyOverride,
        revokeOverride,
        generateExtensionCode,
        applyExtensionCode,
        extendSubscriptionDirectly,
        confirmInvoicePayment,
        resetActionState,
    };
});
