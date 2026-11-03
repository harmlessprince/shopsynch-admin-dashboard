import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";

export const useAdminAffiliatesStore = defineStore("adminAffiliatesStore", () => {
    const { get, post, put } = useApiService();
    const toastStore = useToastStore();

    // Affiliates state
    const affiliates = ref([]);
    const affiliatesLoading = ref(false);
    const affiliatesError = ref("");
    const affiliateStatusFilter = ref("");
    const affiliatesPage = ref(0);
    const affiliatesSize = ref(20);
    const affiliatesTotalPages = ref(0);
    const affiliatesTotalElements = ref(0);
    const actingAffiliateId = ref("");
    const actionErrors = ref({});

    // Commissions state
    const commissions = ref([]);
    const commissionsLoading = ref(false);
    const commissionsError = ref("");
    const commissionStatusFilter = ref("");
    const commissionAffiliateIdFilter = ref("");
    const commissionsPage = ref(0);
    const commissionsSize = ref(20);
    const commissionsTotalPages = ref(0);
    const commissionsTotalElements = ref(0);
    const payingEntryId = ref("");

    // Settings state
    const settings = ref(null);
    const settingsLoading = ref(false);
    const settingsSaving = ref(false);
    const settingsErrors = ref({});

    const hasPrevAffiliates = computed(() => affiliatesPage.value > 0);
    const hasNextAffiliates = computed(() => affiliatesPage.value + 1 < affiliatesTotalPages.value);

    const hasPrevCommissions = computed(() => commissionsPage.value > 0);
    const hasNextCommissions = computed(() => commissionsPage.value + 1 < commissionsTotalPages.value);

    async function fetchAffiliates(params = {}) {
        affiliatesPage.value = params.page ?? affiliatesPage.value;
        affiliatesSize.value = params.size ?? affiliatesSize.value;
        if (params.status !== undefined) {
            affiliateStatusFilter.value = params.status;
        }
        affiliatesLoading.value = true;
        affiliatesError.value = "";
        try {
            const query = {
                page: affiliatesPage.value,
                size: affiliatesSize.value,
            };
            if (affiliateStatusFilter.value) {
                query.status = affiliateStatusFilter.value;
            }
            const response = await get(endpoints.admin.affiliates.list, query, { forceMode: "live" });
            const pageData = response?.data || {};
            affiliates.value = pageData.content || [];
            affiliatesTotalPages.value = pageData.totalPages || 0;
            affiliatesTotalElements.value = pageData.totalElements || 0;
        } catch (err) {
            logger.error("Failed to load affiliates", err);
            affiliates.value = [];
            affiliatesError.value = "Affiliate applications could not be loaded.";
        } finally {
            affiliatesLoading.value = false;
        }
    }

    function replaceAffiliate(updated) {
        const index = affiliates.value.findIndex((item) => item.id === updated.id);
        if (index !== -1) {
            affiliates.value[index] = updated;
        }
    }

    async function approveAffiliate(affiliateId, payload = {}) {
        actingAffiliateId.value = affiliateId;
        actionErrors.value = {};
        try {
            const url = endpoints.admin.affiliates.approve.replace(":affiliateId", encodeURIComponent(affiliateId));
            const response = await post(url, payload, { forceMode: "live" });
            const updated = response?.data;
            if (updated) {
                replaceAffiliate(updated);
            }
            toastStore.success(response?.message || "Affiliate approved", "");
            await fetchSettings();
            return updated || null;
        } catch (err) {
            logger.error("Failed to approve affiliate", err);
            actionErrors.value = err?.data?.errors || {};
            return null;
        } finally {
            actingAffiliateId.value = "";
        }
    }

    async function rejectAffiliate(affiliateId, reason) {
        actingAffiliateId.value = affiliateId;
        actionErrors.value = {};
        try {
            const url = endpoints.admin.affiliates.reject.replace(":affiliateId", encodeURIComponent(affiliateId));
            const response = await post(url, { reason }, { forceMode: "live" });
            const updated = response?.data;
            if (updated) {
                replaceAffiliate(updated);
            }
            toastStore.success(response?.message || "Affiliate rejected", "");
            return updated || null;
        } catch (err) {
            logger.error("Failed to reject affiliate", err);
            actionErrors.value = err?.data?.errors || {};
            return null;
        } finally {
            actingAffiliateId.value = "";
        }
    }

    async function fetchCommissions(params = {}) {
        commissionsPage.value = params.page ?? commissionsPage.value;
        commissionsSize.value = params.size ?? commissionsSize.value;
        if (params.status !== undefined) {
            commissionStatusFilter.value = params.status;
        }
        if (params.affiliateId !== undefined) {
            commissionAffiliateIdFilter.value = params.affiliateId;
        }
        commissionsLoading.value = true;
        commissionsError.value = "";
        try {
            const query = {
                page: commissionsPage.value,
                size: commissionsSize.value,
            };
            if (commissionStatusFilter.value) {
                query.status = commissionStatusFilter.value;
            }
            if (commissionAffiliateIdFilter.value) {
                query.affiliateId = commissionAffiliateIdFilter.value;
            }
            const response = await get(endpoints.admin.affiliates.commissions, query, { forceMode: "live" });
            const pageData = response?.data || {};
            commissions.value = pageData.content || [];
            commissionsTotalPages.value = pageData.totalPages || 0;
            commissionsTotalElements.value = pageData.totalElements || 0;
        } catch (err) {
            logger.error("Failed to load affiliate commissions", err);
            commissions.value = [];
            commissionsError.value = "Affiliate commissions could not be loaded.";
        } finally {
            commissionsLoading.value = false;
        }
    }

    async function markCommissionPaid(entryId, payload = {}) {
        payingEntryId.value = entryId;
        actionErrors.value = {};
        try {
            const url = endpoints.admin.affiliates.markCommissionPaid.replace(":entryId", encodeURIComponent(entryId));
            const response = await post(url, payload, { forceMode: "live" });
            const updated = response?.data;
            if (updated) {
                const index = commissions.value.findIndex((entry) => entry.id === entryId);
                if (index !== -1) {
                    commissions.value[index] = updated;
                }
            }
            toastStore.success(response?.message || "Commission marked as paid", "");
            return updated || null;
        } catch (err) {
            logger.error("Failed to mark commission as paid", err);
            actionErrors.value = err?.data?.errors || {};
            return null;
        } finally {
            payingEntryId.value = "";
        }
    }

    async function fetchSettings() {
        settingsLoading.value = true;
        try {
            const response = await get(endpoints.admin.affiliates.settings, {}, { forceMode: "live" });
            settings.value = response?.data || null;
            return settings.value;
        } catch (err) {
            logger.error("Failed to load affiliate programme settings", err);
            return null;
        } finally {
            settingsLoading.value = false;
        }
    }

    async function updateSettings(payload) {
        settingsSaving.value = true;
        settingsErrors.value = {};
        try {
            const response = await put(endpoints.admin.affiliates.settings, payload, { forceMode: "live" });
            settings.value = response?.data || settings.value;
            toastStore.success(response?.message || "Affiliate programme settings updated", "");
            return settings.value;
        } catch (err) {
            logger.error("Failed to update affiliate programme settings", err);
            settingsErrors.value = err?.data?.errors || {};
            return null;
        } finally {
            settingsSaving.value = false;
        }
    }

    return {
        affiliates,
        affiliatesLoading,
        affiliatesError,
        affiliateStatusFilter,
        affiliatesPage,
        affiliatesSize,
        affiliatesTotalPages,
        affiliatesTotalElements,
        actingAffiliateId,
        actionErrors,
        hasPrevAffiliates,
        hasNextAffiliates,
        commissions,
        commissionsLoading,
        commissionsError,
        commissionStatusFilter,
        commissionAffiliateIdFilter,
        commissionsPage,
        commissionsSize,
        commissionsTotalPages,
        commissionsTotalElements,
        payingEntryId,
        hasPrevCommissions,
        hasNextCommissions,
        settings,
        settingsLoading,
        settingsSaving,
        settingsErrors,
        fetchAffiliates,
        approveAffiliate,
        rejectAffiliate,
        fetchCommissions,
        markCommissionPaid,
        fetchSettings,
        updateSettings,
    };
});
