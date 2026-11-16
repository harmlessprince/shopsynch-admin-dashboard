import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";
import { normalizeFieldErrors, zodFieldErrors } from "~/utils/billingAdminWrite.js";
import { grantCapacityAddOnSchema, revokeCapacityAddOnSchema } from "~/schemas/capacityAddOnAdmin.schema";

const base = endpoints.admin.billing.capacityAddOns;
const live = { forceMode: "live", silent: true };

const fill = (url, params) => Object.entries(params).reduce((acc, [k, v]) => acc.replace(`:${k}`, encodeURIComponent(v)), url);

// Silent requests skip the global toast, so 400 business refusals and 422 field errors are read here and shown inline.
// Same shape as the other billing stores: 422 field errors per field, otherwise the API message.
const readFailure = (err) => {
    const status = err?.response?.status || err?.statusCode;
    const data = err?.data || err?.response?._data || {};
    const fieldErrors = normalizeFieldErrors(data.errors);
    const message = data.message || data.description || "This could not be completed. Please try again.";
    return { status, fieldErrors, formError: status === 422 && Object.keys(fieldErrors).length ? "" : message };
};

export const useAdminMerchantAddOnsStore = defineStore("adminMerchantAddOnsStore", () => {
    const { get, post } = useApiService();
    const toastStore = useToastStore();

    const tenantId = ref("");
    const featureEnabled = ref(true);
    const addOns = ref([]);
    const explanation = ref(null);
    const signals = ref(null);

    const loading = ref(false);
    const explanationLoading = ref(false);
    const signalsLoading = ref(false);
    const error = ref("");
    const explanationError = ref("");
    const signalsError = ref("");

    const saving = ref(false);
    const fieldErrors = ref({});
    const formError = ref("");

    function clearFormErrors() {
        fieldErrors.value = {};
        formError.value = "";
    }

    async function fetchAddOns(id) {
        loading.value = true;
        error.value = "";
        try {
            const response = await get(fill(base.merchantList, { tenantId: id }), {}, live);
            if (tenantId.value !== id) return; // a newer merchant was selected meanwhile
            const data = response?.data || {};
            featureEnabled.value = data.featureEnabled !== false;
            addOns.value = data.addOns || [];
        } catch (err) {
            logger.error("Failed to load merchant add-ons", err);
            if (tenantId.value !== id) return;
            addOns.value = [];
            error.value = readFailure(err).formError;
        } finally {
            if (tenantId.value === id) loading.value = false;
        }
    }

    async function fetchExplanation(id) {
        explanationLoading.value = true;
        explanationError.value = "";
        try {
            const response = await get(fill(base.limitExplanation, { tenantId: id }), {}, live);
            if (tenantId.value !== id) return;
            explanation.value = response?.data || null;
        } catch (err) {
            logger.error("Failed to load limit explanation", err);
            if (tenantId.value !== id) return;
            explanation.value = null;
            explanationError.value = readFailure(err).formError;
        } finally {
            if (tenantId.value === id) explanationLoading.value = false;
        }
    }

    async function fetchSignals(id) {
        signalsLoading.value = true;
        signalsError.value = "";
        try {
            const response = await get(fill(base.abuseSignals, { tenantId: id }), {}, live);
            if (tenantId.value !== id) return;
            signals.value = response?.data || null;
        } catch (err) {
            logger.error("Failed to load abuse signals", err);
            if (tenantId.value !== id) return;
            signals.value = null;
            signalsError.value = readFailure(err).formError;
        } finally {
            if (tenantId.value === id) signalsLoading.value = false;
        }
    }

    async function fetchAll(id) {
        if (tenantId.value !== id) {
            // Drop the previous merchant's data at once; late responses for it are ignored by the id checks above.
            addOns.value = [];
            explanation.value = null;
            signals.value = null;
        }
        tenantId.value = id;
        await Promise.all([fetchAddOns(id), fetchExplanation(id), fetchSignals(id)]);
    }

    // Capacity and signals change with every grant or revoke, so all three are reloaded.
    const refetch = () => fetchAll(tenantId.value);

    async function grant(form) {
        clearFormErrors();
        const parsed = grantCapacityAddOnSchema.safeParse({ tenantId: tenantId.value, ...form });
        if (!parsed.success) {
            fieldErrors.value = zodFieldErrors(parsed.error);
            return false;
        }
        saving.value = true;
        try {
            await post(base.grant, parsed.data, live);
            toastStore.success("Add-on granted. Recorded in the audit log with your reason.", "Granted");
            await refetch(); // the grant response is a raw entity, not the admin view
            return true;
        } catch (err) {
            logger.error("Failed to grant add-on", err);
            ({ fieldErrors: fieldErrors.value, formError: formError.value } = readFailure(err));
            return false;
        } finally {
            saving.value = false;
        }
    }

    async function revoke(addOnId, form) {
        clearFormErrors();
        const parsed = revokeCapacityAddOnSchema.safeParse(form);
        if (!parsed.success) {
            fieldErrors.value = zodFieldErrors(parsed.error);
            return false;
        }
        saving.value = true;
        try {
            const url = fill(base.revoke, { tenantId: tenantId.value, addOnId });
            await post(url, parsed.data, live);
            toastStore.success("Add-on revoked. Capacity ended now, no refund. Recorded in the audit log.", "Revoked");
            await refetch();
            return true;
        } catch (err) {
            logger.error("Failed to revoke add-on", err);
            ({ fieldErrors: fieldErrors.value, formError: formError.value } = readFailure(err));
            return false;
        } finally {
            saving.value = false;
        }
    }

    return {
        tenantId, featureEnabled, addOns, explanation, signals,
        loading, explanationLoading, signalsLoading, error, explanationError, signalsError,
        saving, fieldErrors, formError,
        fetchAll, refetch, grant, revoke, clearFormErrors,
    };
});
