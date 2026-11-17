import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useBillingWriteState } from "~/utils/billingAdminWrite.js";
import { logger } from "~/utils/helpers.js";
import {
    planVersionDraftSchema,
    planVersionDraftUpdateSchema,
    publishPlanVersionSchema,
    retirePlanVersionSchema,
} from "~/schemas/planVersion.schema";
import { versionPolicySchema, versionPolicyApproveSchema } from "~/schemas/versionMove.schema";

export const useAdminPlanVersionsStore = defineStore("adminPlanVersionsStore", () => {
    const { get, post, put } = useApiService();
    const { saving, fieldErrors, actionError, clearErrors, fieldError, parse, runWrite } = useBillingWriteState("Plan version");

    const versionsByPlan = ref({});
    const adoptionByPlan = ref({});
    const policiesByPlan = ref({});
    const loading = ref(false);
    const loadError = ref("");

    const opts = { forceMode: "live", silent: true };
    const withId = (url, versionId) => url.replace(":versionId", encodeURIComponent(versionId));

    async function fetchVersions(planId) {
        const response = await get(endpoints.admin.billing.planVersions.list, { planId }, opts);
        versionsByPlan.value[planId] = response?.data || [];
        return versionsByPlan.value[planId];
    }

    async function fetchAdoption(planId) {
        const response = await get(endpoints.admin.billing.versionPolicies.adoption, { kind: "PLAN", planId }, opts);
        adoptionByPlan.value[planId] = response?.data || [];
    }

    async function fetchPolicies(planId) {
        const response = await get(endpoints.admin.billing.versionPolicies.list, { kind: "PLAN", planId }, opts);
        policiesByPlan.value[planId] = response?.data || [];
    }

    // Versions are required; adoption and policies feed secondary panels and may fail on their own.
    async function fetchPlan(planId) {
        loading.value = true;
        loadError.value = "";
        try {
            await fetchVersions(planId);
            await Promise.allSettled([fetchAdoption(planId), fetchPolicies(planId)]);
        } catch (err) {
            logger.error("Failed to load plan versions", err);
            loadError.value = err?.data?.message || "The plan versions could not be loaded.";
        } finally {
            loading.value = false;
        }
    }

    async function refreshPlan(planId) {
        await Promise.allSettled([fetchVersions(planId), fetchAdoption(planId), fetchPolicies(planId)]);
    }

    async function saveDraft(raw, versionId = null) {
        clearErrors();
        const payload = versionId ? parse(planVersionDraftUpdateSchema, raw) : parse(planVersionDraftSchema, raw);
        if (!payload) return null;
        const saved = await runWrite(
            () =>
                versionId
                    ? put(withId(endpoints.admin.billing.planVersions.update, versionId), payload, opts)
                    : post(endpoints.admin.billing.planVersions.create, payload, opts),
            versionId ? "Draft updated" : "Draft created",
        );
        // The save succeeded; a failed refresh must not turn it into an error.
        if (saved) await fetchVersions(raw.planId || saved.planId).catch((err) => logger.error("Failed to refresh plan versions", err));
        return saved;
    }

    async function fetchImpact(versionId) {
        clearErrors();
        return runWrite(() => get(withId(endpoints.admin.billing.planVersions.impact, versionId), {}, opts));
    }

    async function publishVersion(versionId, raw, planId) {
        clearErrors();
        const payload = parse(publishPlanVersionSchema, raw);
        if (!payload) return null;
        const saved = await runWrite(
            () => post(withId(endpoints.admin.billing.planVersions.publish, versionId), payload, opts),
            payload.effectiveFrom ? "Version scheduled" : "Version published",
        );
        if (saved) await refreshPlan(planId);
        return saved;
    }

    async function retireVersion(versionId, raw, planId) {
        clearErrors();
        const payload = parse(retirePlanVersionSchema, raw);
        if (!payload) return null;
        const saved = await runWrite(
            () => post(withId(endpoints.admin.billing.planVersions.retire, versionId), payload, opts),
            "Version retired",
        );
        if (saved) await refreshPlan(planId);
        return saved;
    }

    async function setRenewalPolicy(raw, planId) {
        clearErrors();
        const payload = parse(versionPolicySchema, { kind: "PLAN", planId, ...raw });
        if (!payload) return null;
        const saved = await runWrite(
            () => put(endpoints.admin.billing.versionPolicies.put, payload, opts),
            "Renewal policy saved",
        );
        if (saved) await refreshPlan(planId);
        return saved;
    }

    async function approvePolicy(policyId, raw, planId) {
        clearErrors();
        const payload = parse(versionPolicyApproveSchema, raw);
        if (!payload) return null;
        const url = endpoints.admin.billing.versionPolicies.approve.replace(":policyId", encodeURIComponent(policyId));
        const saved = await runWrite(() => post(url, payload, opts), "Renewal policy approved");
        if (saved) await refreshPlan(planId);
        return saved;
    }

    return {
        versionsByPlan,
        adoptionByPlan,
        policiesByPlan,
        loading,
        loadError,
        saving,
        fieldErrors,
        actionError,
        clearErrors,
        fieldError,
        fetchPlan,
        fetchVersions,
        refreshPlan,
        saveDraft,
        fetchImpact,
        publishVersion,
        retireVersion,
        setRenewalPolicy,
        approvePolicy,
    };
});
