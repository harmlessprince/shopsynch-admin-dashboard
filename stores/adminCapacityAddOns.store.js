import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useBillingWriteState } from "~/utils/billingAdminWrite.js";
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

export const useAdminCapacityAddOnsStore = defineStore("adminCapacityAddOnsStore", () => {
    const { get, post, put } = useApiService();
    const { saving, fieldErrors, actionError, clearErrors, fieldError, parse, runWrite } = useBillingWriteState("Capacity add-on catalogue");

    const versionsByType = ref(emptyByType());
    const adoptionByType = ref(emptyByType());
    const policiesByType = ref(emptyByType());
    const loading = ref(false);
    const loadError = ref("");

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
        // The save succeeded; a failed refresh must not turn it into an error.
        if (saved) await fetchVersions(raw.type || saved.type).catch((err) => logger.error("Failed to refresh add-on versions", err));
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
