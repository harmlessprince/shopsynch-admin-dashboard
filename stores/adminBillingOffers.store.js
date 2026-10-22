import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";

export const useAdminBillingOffersStore = defineStore("adminBillingOffersStore", () => {
    const { get, post, patch } = useApiService();
    const toastStore = useToastStore();

    const offers = ref([]);
    const redemptions = ref([]);
    const selectedCode = ref("");
    const loading = ref(false);
    const loadingRedemptions = ref(false);
    const actingCode = ref("");
    const savingTenantId = ref("");
    const error = ref("");

    const selectedOffer = computed(() => offers.value.find((offer) => offer.code === selectedCode.value) || null);

    async function fetchOffers() {
        loading.value = true;
        error.value = "";
        try {
            const response = await get(endpoints.admin.billing.offers.list, {}, { forceMode: "live" });
            offers.value = response?.data || [];
        } catch (err) {
            logger.error("Failed to load pricing offers", err);
            offers.value = [];
            error.value = "Pricing offers could not be loaded.";
        } finally {
            loading.value = false;
        }
    }

    async function fetchRedemptions(offerCode) {
        loadingRedemptions.value = true;
        try {
            const url = endpoints.admin.billing.offers.redemptions.replace(":offerCode", encodeURIComponent(offerCode));
            const response = await get(url, {}, { forceMode: "live" });
            redemptions.value = response?.data || [];
        } catch (err) {
            logger.error("Failed to load offer redemptions", err);
            redemptions.value = [];
        } finally {
            loadingRedemptions.value = false;
        }
    }

    async function selectOffer(offerCode) {
        selectedCode.value = offerCode;
        redemptions.value = [];
        await fetchRedemptions(offerCode);
    }

    function replaceOffer(updated) {
        const index = offers.value.findIndex((offer) => offer.code === updated.code);
        if (index !== -1) offers.value[index] = updated;
    }

    // Pause, resume and end share one shape: POST to the lifecycle endpoint, then swap in the returned offer.
    async function changeStatus(action, offerCode) {
        actingCode.value = offerCode;
        try {
            const url = endpoints.admin.billing.offers[action].replace(":offerCode", encodeURIComponent(offerCode));
            const response = await post(url, {}, { forceMode: "live" });
            if (response?.data) replaceOffer(response.data);
            toastStore.success(response?.message || "Offer updated", "");
            return response?.data || null;
        } catch (err) {
            logger.error(`Failed to ${action} pricing offer`, err);
            return null;
        } finally {
            actingCode.value = "";
        }
    }

    const pauseOffer = (offerCode) => changeStatus("pause", offerCode);
    const resumeOffer = (offerCode) => changeStatus("resume", offerCode);
    const endOffer = (offerCode) => changeStatus("end", offerCode);

    // Unset fields are left unchanged by the backend, so only the changed flag or note is sent.
    async function updateCommitments(offerCode, tenantId, payload) {
        savingTenantId.value = tenantId;
        try {
            const url = endpoints.admin.billing.offers.commitments
                .replace(":offerCode", encodeURIComponent(offerCode))
                .replace(":tenantId", encodeURIComponent(tenantId));
            const response = await patch(url, payload, { forceMode: "live" });
            const updated = response?.data;
            if (updated) {
                const index = redemptions.value.findIndex((redemption) => redemption.tenantId === tenantId);
                if (index !== -1) redemptions.value[index] = updated;
            }
            return updated || null;
        } catch (err) {
            logger.error("Failed to update offer commitments", err);
            return null;
        } finally {
            savingTenantId.value = "";
        }
    }

    return {
        offers,
        redemptions,
        selectedCode,
        selectedOffer,
        loading,
        loadingRedemptions,
        actingCode,
        savingTenantId,
        error,
        fetchOffers,
        selectOffer,
        pauseOffer,
        resumeOffer,
        endOffer,
        updateCommitments,
    };
});
