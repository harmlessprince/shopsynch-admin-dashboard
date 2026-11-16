import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";
import {
    planVersionDraftSchema,
    planVersionDraftUpdateSchema,
    publishPlanVersionSchema,
    retirePlanVersionSchema,
} from "~/schemas/planVersion.schema";
import { versionPolicySchema, versionPolicyApproveSchema } from "~/schemas/versionMove.schema";

// 422 bodies name errors by field; a value may be a string or a list of strings.
function normalizeFieldErrors(errors) {
    const result = {};
    for (const [field, message] of Object.entries(errors || {})) {
        result[field] = Array.isArray(message) ? message.join(" ") : String(message);
    }
    return result;
}

export const useAdminPlanVersionsStore = defineStore("adminPlanVersionsStore", () => {
    const { get, post, put } = useApiService();
    const toastStore = useToastStore();

    const versionsByPlan = ref({});
    const adoptionByPlan = ref({});
    const policiesByPlan = ref({});
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

    // First error for a field; a name also matches nested keys such as prices.0.amount.
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
            logger.error("Plan version request failed", err);
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
        if (saved) await fetchVersions(raw.planId || saved.planId);
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
