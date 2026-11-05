import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";

export const useAdminBillingOperationsStore = defineStore("adminBillingOperationsStore", () => {
    const { get, post, patch, put } = useApiService();
    const toastStore = useToastStore();

    const loadingSnapshot = ref(false);
    const applyingOverride = ref(false);
    const revokingOverride = ref(false);
    const generatingCode = ref(false);
    const applyingCode = ref(false);
    const extendingSubscription = ref(false);
    const loadingInvoices = ref(false);
    const confirmingInvoice = ref(false);
    const loadingAuditLogs = ref(false);
    const auditLogs = ref([]);
    const resyncingToTest = ref(false);
    const snapshotError = ref("");
    const actionError = ref("");
    const invoicesError = ref("");
    const tenantSnapshot = ref(null);
    const tenantInvoices = ref([]);
    const generatedCode = ref(null);
    const updatedSubscription = ref(null);

    // Price lock & subscription status state
    const priceLock = ref(null);
    const loadingPriceLock = ref(false);
    const priceLockError = ref("");
    const grantingPriceLock = ref(false);
    const restoringPriceLock = ref(false);
    const revokingPriceLock = ref(false);
    const priceLockActionError = ref("");
    const priceLockValidationErrors = ref({});
    const changingStatus = ref(false);
    const statusActionError = ref("");
    const statusValidationErrors = ref({});

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
            await Promise.allSettled([
                fetchTenantInvoices(tenantId),
                fetchPriceLock(tenantId),
            ]);
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

    async function fetchPriceLock(tenantId) {
        if (!tenantId) {
            priceLock.value = null;
            return null;
        }
        loadingPriceLock.value = true;
        priceLockError.value = "";
        try {
            const url = endpoints.admin.billing.subscriptions.priceLock.replace(":tenantId", tenantId);
            const response = await get(url, {}, { forceMode: "live" });
            priceLock.value = normalizeData(response);
            return priceLock.value;
        } catch (error) {
            logger.error("Failed to load tenant price lock", error);
            priceLock.value = null;
            priceLockError.value = error?.data?.message || error?.message || "Tenant price lock could not be loaded.";
            return null;
        } finally {
            loadingPriceLock.value = false;
        }
    }

    async function grantPriceLock(tenantId, payload) {
        if (!tenantId) return null;
        grantingPriceLock.value = true;
        priceLockActionError.value = "";
        priceLockValidationErrors.value = {};
        try {
            const url = endpoints.admin.billing.subscriptions.priceLock.replace(":tenantId", tenantId);
            const response = await put(url, payload, { forceMode: "live" });
            const data = normalizeData(response);
            priceLock.value = data;
            toastStore.success(response?.message || "Price lock granted successfully", "");
            await fetchTenantSnapshot(tenantId);
            return data;
        } catch (error) {
            logger.error("Failed to grant price lock", error);
            if (error?.status === 422 || error?.statusCode === 422 || error?.data?.errorCode === "VALIDATION_ERROR") {
                priceLockValidationErrors.value = error?.data?.errors || {};
            }
            priceLockActionError.value = error?.data?.message || error?.message || "Failed to grant price lock.";
            return null;
        } finally {
            grantingPriceLock.value = false;
        }
    }

    async function restorePriceLock(tenantId, reason) {
        if (!tenantId) return null;
        restoringPriceLock.value = true;
        priceLockActionError.value = "";
        priceLockValidationErrors.value = {};
        try {
            const url = endpoints.admin.billing.subscriptions.priceLockRestore.replace(":tenantId", tenantId);
            const response = await post(url, { reason }, { forceMode: "live" });
            const data = normalizeData(response);
            priceLock.value = data;
            toastStore.success(response?.message || "Price lock restored successfully", "");
            await fetchTenantSnapshot(tenantId);
            return data;
        } catch (error) {
            logger.error("Failed to restore price lock", error);
            if (error?.status === 422 || error?.statusCode === 422) {
                priceLockValidationErrors.value = error?.data?.errors || {};
            }
            priceLockActionError.value = error?.data?.message || error?.message || "Failed to restore price lock.";
            return null;
        } finally {
            restoringPriceLock.value = false;
        }
    }

    async function revokePriceLock(tenantId, reason) {
        if (!tenantId) return null;
        revokingPriceLock.value = true;
        priceLockActionError.value = "";
        priceLockValidationErrors.value = {};
        try {
            const url = endpoints.admin.billing.subscriptions.priceLockRevoke.replace(":tenantId", tenantId);
            const response = await post(url, { reason }, { forceMode: "live" });
            const data = normalizeData(response);
            priceLock.value = data;
            toastStore.success(response?.message || "Price lock revoked successfully", "");
            await fetchTenantSnapshot(tenantId);
            return data;
        } catch (error) {
            logger.error("Failed to revoke price lock", error);
            if (error?.status === 422 || error?.statusCode === 422) {
                priceLockValidationErrors.value = error?.data?.errors || {};
            }
            priceLockActionError.value = error?.data?.message || error?.message || "Failed to revoke price lock.";
            return null;
        } finally {
            revokingPriceLock.value = false;
        }
    }

    async function changeSubscriptionStatus(tenantId, status, reason) {
        if (!tenantId) return null;
        changingStatus.value = true;
        statusActionError.value = "";
        statusValidationErrors.value = {};
        try {
            const url = endpoints.admin.billing.subscriptions.status.replace(":tenantId", tenantId);
            const response = await patch(url, { status, reason }, { forceMode: "live" });
            const data = normalizeData(response);
            updatedSubscription.value = data;
            toastStore.success(response?.message || `Subscription status updated to ${status}`, "");
            await fetchTenantSnapshot(tenantId);
            return data;
        } catch (error) {
            logger.error("Failed to change subscription status", error);
            if (error?.status === 422 || error?.statusCode === 422) {
                statusValidationErrors.value = error?.data?.errors || {};
            }
            statusActionError.value = error?.data?.message || error?.message || "Failed to change subscription status.";
            return null;
        } finally {
            changingStatus.value = false;
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

    async function fetchAuditLogs(params = {}) {
        loadingAuditLogs.value = true;
        try {
            const response = await get(endpoints.admin.billing.subscriptions.auditLogs, params, { forceMode: "live" });
            const data = normalizeData(response);
            auditLogs.value = Array.isArray(data) ? data : (data?.items || data?.content || []);
            return auditLogs.value;
        } catch (error) {
            logger.error("Failed to load subscription audit logs", error);
            auditLogs.value = [];
            return [];
        } finally {
            loadingAuditLogs.value = false;
        }
    }

    async function resyncSubscriptionsToTest() {
        resyncingToTest.value = true;
        try {
            const response = await post(endpoints.admin.billing.subscriptions.resyncToTest, {}, { forceMode: "live" });
            const data = response?.data ?? response;
            const count = typeof data === "object" && data !== null ? (data.replicatedCount ?? data.count ?? 0) : (data ?? 0);
            toastStore.success(`Resynced ${count} subscription(s) to test mode`, "");
            return count;
        } catch (error) {
            logger.error("Failed to resync subscriptions to test mode", error);
            const msg = error?.data?.message || error?.message || "Failed to resync subscriptions to test mode.";
            toastStore.error(msg, "");
            throw error;
        } finally {
            resyncingToTest.value = false;
        }
    }

    function resetActionState() {
        actionError.value = "";
        invoicesError.value = "";
        priceLockActionError.value = "";
        statusActionError.value = "";
        priceLockValidationErrors.value = {};
        statusValidationErrors.value = {};
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
        loadingAuditLogs,
        auditLogs,
        resyncingToTest,
        snapshotError,
        actionError,
        invoicesError,
        tenantSnapshot,
        tenantInvoices,
        generatedCode,
        updatedSubscription,
        priceLock,
        loadingPriceLock,
        priceLockError,
        grantingPriceLock,
        restoringPriceLock,
        revokingPriceLock,
        priceLockActionError,
        priceLockValidationErrors,
        changingStatus,
        statusActionError,
        statusValidationErrors,
        fetchTenantSnapshot,
        fetchTenantInvoices,
        fetchPriceLock,
        grantPriceLock,
        restorePriceLock,
        revokePriceLock,
        changeSubscriptionStatus,
        applyOverride,
        revokeOverride,
        generateExtensionCode,
        applyExtensionCode,
        extendSubscriptionDirectly,
        confirmInvoicePayment,
        fetchAuditLogs,
        resyncSubscriptionsToTest,
        resetActionState,
    };
});
