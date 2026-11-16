import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";
import { grantCapacityAddOnSchema, revokeCapacityAddOnSchema } from "~/schemas/capacityAddOnAdmin.schema";

const base = endpoints.admin.billing.capacityAddOns;
const live = { forceMode: "live", silent: true };

const fill = (url, params) => Object.entries(params).reduce((acc, [k, v]) => acc.replace(`:${k}`, encodeURIComponent(v)), url);

const flattenZod = (error) => {
    const out = {};
    for (const issue of error?.issues || []) {
        const key = issue.path?.[0] ?? "form";
        if (!out[key]) out[key] = issue.message;
    }
    return out;
};

// Silent requests skip the global toast, so 400 business refusals and 422 field errors are read here and shown inline.
const readFailure = (err) => {
    const status = err?.response?.status || err?.statusCode;
    const data = err?.data || err?.response?._data || {};
    const raw = data.errors || {};
    const fieldErrors = {};
    for (const [key, value] of Object.entries(raw)) fieldErrors[key] = Array.isArray(value) ? value.join(" ") : String(value);
    const message = data.description || data.message || "The request could not be completed.";
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
            const data = response?.data || {};
            featureEnabled.value = data.featureEnabled !== false;
            addOns.value = data.addOns || [];
        } catch (err) {
            logger.error("Failed to load merchant add-ons", err);
            addOns.value = [];
            error.value = readFailure(err).formError;
        } finally {
            loading.value = false;
        }
    }

    async function fetchExplanation(id) {
        explanationLoading.value = true;
        explanationError.value = "";
        try {
            const response = await get(fill(base.limitExplanation, { tenantId: id }), {}, live);
            explanation.value = response?.data || null;
        } catch (err) {
            logger.error("Failed to load limit explanation", err);
            explanation.value = null;
            explanationError.value = readFailure(err).formError;
        } finally {
            explanationLoading.value = false;
        }
    }

    async function fetchSignals(id) {
        signalsLoading.value = true;
        signalsError.value = "";
        try {
            const response = await get(fill(base.abuseSignals, { tenantId: id }), {}, live);
            signals.value = response?.data || null;
        } catch (err) {
            logger.error("Failed to load abuse signals", err);
            signals.value = null;
            signalsError.value = readFailure(err).formError;
        } finally {
            signalsLoading.value = false;
        }
    }

    async function fetchAll(id) {
        tenantId.value = id;
        await Promise.all([fetchAddOns(id), fetchExplanation(id), fetchSignals(id)]);
    }

    // Capacity and signals change with every grant or revoke, so all three are reloaded.
    const refetch = () => fetchAll(tenantId.value);

    async function grant(form) {
        clearFormErrors();
        const parsed = grantCapacityAddOnSchema.safeParse({ tenantId: tenantId.value, ...form });
        if (!parsed.success) {
            fieldErrors.value = flattenZod(parsed.error);
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
            fieldErrors.value = flattenZod(parsed.error);
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
