import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";
import {
    capacityAddOnTypes,
    catalogueDraftSchema,
    catalogueDraftUpdateSchema,
    publishCatalogueVersionSchema,
    retireCatalogueVersionSchema,
} from "~/schemas/capacityAddOnAdmin.schema";
import { versionPolicySchema, versionPolicyApproveSchema } from "~/schemas/versionMove.schema";

const emptyByType = () => Object.fromEntries(capacityAddOnTypes.map((type) => [type, []]));

// 422 bodies name errors by field; a value may be a string or a list of strings.
function normalizeFieldErrors(errors) {
    const result = {};
    for (const [field, message] of Object.entries(errors || {})) {
        result[field] = Array.isArray(message) ? message.join(" ") : String(message);
    }
    return result;
}

export const useAdminCapacityAddOnsStore = defineStore("adminCapacityAddOnsStore", () => {
    const { get, post, put } = useApiService();
    const toastStore = useToastStore();

    const versionsByType = ref(emptyByType());
    const adoptionByType = ref(emptyByType());
    const policiesByType = ref(emptyByType());
    const loading = ref(false);
    const loadError = ref("");
    const saving = ref(false);
    // 422 field errors (or Zod issues) keyed by field name; 400 business refusals are plain text.
    const fieldErrors = ref({});
    const actionError = ref("");

    function clearErrors() {
        fieldErrors.value = {};
        actionError.value = "";
    }

    // First error for a field; a name also matches nested keys such as amountsByPeriodUnit.3.
    function fieldError(name) {
        const entries = Object.entries(fieldErrors.value);
        const exact = entries.find(([key]) => key === name);
        if (exact) return exact[1];
        const nested = entries.find(([key]) => key.startsWith(`${name}.`) || key.startsWith(`${name}[`));
        return nested ? nested[1] : "";
    }

    // Parse right before sending; the parsed value is what gets sent.
    function parse(schema, raw) {
        const result = schema.safeParse(raw);
        if (result.success) return result.data;
        const errors = {};
        for (const issue of result.error.issues) {
            const key = issue.path.join(".") || "form";
            if (!errors[key]) errors[key] = issue.message;
        }
        fieldErrors.value = errors;
        return null;
    }

    // Runs a write with the global toast silenced so refusals show inline next to the action.
    async function runWrite(task, successMessage) {
        saving.value = true;
        clearErrors();
        try {
            const response = await task();
            if (successMessage) toastStore.success(successMessage, "");
            return response?.data ?? null;
        } catch (err) {
            logger.error("Capacity add-on catalogue request failed", err);
            const status = err?.response?.status || err?.statusCode;
            const data = err?.data || err?.response?._data;
            if (status === 422 && data?.errors) {
                fieldErrors.value = normalizeFieldErrors(data.errors);
                actionError.value = Object.keys(fieldErrors.value).length ? "" : data?.message || "";
            } else {
                actionError.value = data?.message || "This could not be completed. Please try again.";
            }
            return null;
        } finally {
            saving.value = false;
        }
    }

    const opts = { forceMode: "live", silent: true };
    const withId = (url, versionId) => url.replace(":versionId", encodeURIComponent(versionId));

    async function fetchVersions(type) {
        const response = await get(endpoints.admin.billing.capacityAddOns.catalogue.list, { type }, opts);
        versionsByType.value[type] = response?.data || [];
        return versionsByType.value[type];
    }

    async function fetchAdoption(type) {
        const response = await get(
            endpoints.admin.billing.versionPolicies.adoption,
            { kind: "CAPACITY_ADDON", addOnType: type },
            opts,
        );
        adoptionByType.value[type] = response?.data || [];
    }

    async function fetchPolicies(type) {
        const response = await get(
            endpoints.admin.billing.versionPolicies.list,
            { kind: "CAPACITY_ADDON", addOnType: type },
            opts,
        );
        policiesByType.value[type] = response?.data || [];
    }

    // Loads the catalogue for every type. Adoption and policies feed the renewal-policy panels and may fail on their own.
    async function fetchAll() {
        loading.value = true;
        loadError.value = "";
        try {
            await Promise.all(capacityAddOnTypes.map((type) => fetchVersions(type)));
            await Promise.allSettled(
                capacityAddOnTypes.flatMap((type) => [fetchAdoption(type), fetchPolicies(type)]),
            );
        } catch (err) {
            logger.error("Failed to load the add-on catalogue", err);
            loadError.value = err?.data?.message || "The add-on catalogue could not be loaded.";
        } finally {
            loading.value = false;
        }
    }

    async function refreshType(type) {
        await Promise.allSettled([fetchVersions(type), fetchAdoption(type), fetchPolicies(type)]);
    }

    async function saveDraft(raw, versionId = null) {
        clearErrors();
        const payload = versionId ? parse(catalogueDraftUpdateSchema, raw) : parse(catalogueDraftSchema, raw);
        if (!payload) return null;
        const saved = await runWrite(
            () =>
                versionId
                    ? put(withId(endpoints.admin.billing.capacityAddOns.catalogue.update, versionId), payload, opts)
                    : post(endpoints.admin.billing.capacityAddOns.catalogue.create, payload, opts),
            versionId ? "Draft updated" : "Draft created",
        );
        if (saved) await fetchVersions(raw.type || saved.type);
        return saved;
    }

    async function fetchImpact(versionId) {
        clearErrors();
        return runWrite(() => get(withId(endpoints.admin.billing.capacityAddOns.catalogue.impact, versionId), {}, opts));
    }

    async function publishVersion(versionId, raw, type) {
        clearErrors();
        const payload = parse(publishCatalogueVersionSchema, raw);
        if (!payload) return null;
        const saved = await runWrite(
            () => post(withId(endpoints.admin.billing.capacityAddOns.catalogue.publish, versionId), payload, opts),
            payload.effectiveFrom ? "Version scheduled" : "Version published",
        );
        if (saved) await refreshType(type);
        return saved;
    }

    async function retireVersion(versionId, raw, type) {
        clearErrors();
        const payload = parse(retireCatalogueVersionSchema, raw);
        if (!payload) return null;
        const saved = await runWrite(
            () => post(withId(endpoints.admin.billing.capacityAddOns.catalogue.retire, versionId), payload, opts),
            "Version retired",
        );
        if (saved) await refreshType(type);
        return saved;
    }

    async function setRenewalPolicy(raw, type) {
        clearErrors();
        const payload = parse(versionPolicySchema, { kind: "CAPACITY_ADDON", addOnType: type, ...raw });
        if (!payload) return null;
        const saved = await runWrite(
            () => put(endpoints.admin.billing.versionPolicies.put, payload, opts),
            "Renewal policy saved",
        );
        if (saved) await refreshType(type);
        return saved;
    }

    async function approvePolicy(policyId, raw, type) {
        clearErrors();
        const payload = parse(versionPolicyApproveSchema, raw);
        if (!payload) return null;
        const url = endpoints.admin.billing.versionPolicies.approve.replace(":policyId", encodeURIComponent(policyId));
        const saved = await runWrite(() => post(url, payload, opts), "Renewal policy approved");
        if (saved) await refreshType(type);
        return saved;
    }

    return {
        versionsByType,
        adoptionByType,
        policiesByType,
        loading,
        loadError,
        saving,
        fieldErrors,
        actionError,
        clearErrors,
        fieldError,
        fetchAll,
        fetchVersions,
        saveDraft,
        fetchImpact,
        publishVersion,
        retireVersion,
        setRenewalPolicy,
        approvePolicy,
    };
});
