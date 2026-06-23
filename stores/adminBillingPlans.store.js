import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useAdminBillingPlansStore = defineStore("adminBillingPlansStore", () => {
    const { get, post, put, patch } = useApiService();
    const toastStore = useToastStore();

    const loading = ref(false);
    const saving = ref(false);
    const archiving = ref(false);
    const pricesLoading = ref(false);
    const priceSaving = ref(false);

    const plans = ref([]);
    const selectedPlan = ref(null);
    const prices = ref([]);

    async function fetchPlans(params = {}) {
        loading.value = true;
        try {
            const response = await get(endpoints.admin.billing.plans.list, params, { forceMode: "live" });
            const data = response?.data;
            plans.value = data?.items || data?.content || data || [];
            return plans.value;
        } finally {
            loading.value = false;
        }
    }

    async function createPlan(payload) {
        saving.value = true;
        try {
            const response = await post(endpoints.admin.billing.plans.create, payload, { forceMode: "live" });
            if (response) {
                toastStore.success("Billing plan created", "");
            }
            return response;
        } finally {
            saving.value = false;
        }
    }

    async function updatePlan(planId, payload) {
        saving.value = true;
        try {
            const url = endpoints.admin.billing.plans.update.replace(":id", planId);
            const response = await put(url, payload, { forceMode: "live" });
            if (response) {
                toastStore.success("Billing plan updated", "");
                selectedPlan.value = response?.data || selectedPlan.value;
            }
            return response;
        } finally {
            saving.value = false;
        }
    }

    async function archivePlan(planId) {
        archiving.value = true;
        try {
            const url = endpoints.admin.billing.plans.archive.replace(":id", planId);
            const response = await patch(url, {}, { forceMode: "live" });
            if (response) {
                toastStore.success("Billing plan archived", "");
                selectedPlan.value = response?.data || selectedPlan.value;
            }
            return response;
        } finally {
            archiving.value = false;
        }
    }

    async function fetchPrices(planId) {
        if (!planId) return [];
        pricesLoading.value = true;
        try {
            const url = endpoints.admin.billing.plans.prices.replace(":id", planId);
            const response = await get(url, {}, { forceMode: "live" });
            const data = response?.data;
            prices.value = data?.items || data?.content || data || [];
            return prices.value;
        } finally {
            pricesLoading.value = false;
        }
    }

    async function createPrice(planId, payload) {
        priceSaving.value = true;
        try {
            const url = endpoints.admin.billing.plans.prices.replace(":id", planId);
            const response = await post(url, payload, { forceMode: "live" });
            if (response) {
                toastStore.success("Plan price saved", "");
            }
            return response;
        } finally {
            priceSaving.value = false;
        }
    }

    async function updatePrice(priceId, payload) {
        priceSaving.value = true;
        try {
            const url = endpoints.admin.billing.plans.updatePrice.replace(":priceId", priceId);
            const response = await put(url, payload, { forceMode: "live" });
            if (response) {
                toastStore.success("Plan price updated", "");
            }
            return response;
        } finally {
            priceSaving.value = false;
        }
    }

    function selectPlan(plan) {
        selectedPlan.value = plan;
    }

    return {
        loading,
        saving,
        archiving,
        pricesLoading,
        priceSaving,
        plans,
        selectedPlan,
        prices,
        fetchPlans,
        createPlan,
        updatePlan,
        archivePlan,
        fetchPrices,
        createPrice,
        updatePrice,
        selectPlan,
    };
});
