import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";
import { useAuthStore } from "~/stores/auth.store.js";

export const usePaymentsStore = defineStore("paymentsStore", () => {
    const { get, patch } = useApiService();

    const payments = ref([]);
    const loading = ref(false);
    const stats = ref(null);
    const statsLoading = ref(false);
    const chartData = ref([]);
    const chartLoading = ref(false);

    // Cursor-based pagination
    const currentCursor = ref(null);
    const nextCursor = ref(null);
    const cursorStack = ref([]); // stack of previous cursors for back navigation
    const currentLimit = ref(10);

    const hasNext = computed(() => !!nextCursor.value);
    const hasPrev = computed(() => cursorStack.value.length > 0);

    function getTenantId() {
        const authStore = useAuthStore();
        return authStore.businessProfile?.user?.lastActiveTenantId ?? null;
    }

    async function getPayments(params = {}, resetCursor = true) {
        try {
            loading.value = true;
            if (resetCursor) {
                cursorStack.value = [];
                currentCursor.value = null;
            }
            const query = {
                limit: currentLimit.value,
                sortDirectionParam: 'DESC',
                ...params,
            };
            if (currentCursor.value) {
                query.cursor = currentCursor.value;
            }
            const response = await get(endpoints.payments.list, query);
            if (response?.data) {
                payments.value = response.data.payments ?? [];
                nextCursor.value = response.data.nextCursor ?? null;
            }
        } finally {
            loading.value = false;
        }
    }

    async function loadNext(params = {}) {
        if (!nextCursor.value) return;
        cursorStack.value.push(currentCursor.value);
        currentCursor.value = nextCursor.value;
        await getPayments(params, false);
    }

    async function loadPrev(params = {}) {
        if (cursorStack.value.length === 0) return;
        currentCursor.value = cursorStack.value.pop();
        await getPayments(params, false);
    }

    async function updatePaymentStatus(paymentId, payload) {
        const url = endpoints.payments.updateStatus.replace(':paymentId', paymentId);
        return await patch(url, payload);
    }

    async function getPaymentMetrics(params = {}) {
        try {
            statsLoading.value = true;
            const query = { tenantId: getTenantId(), ...params };
            const response = await get(endpoints.payments.metrics, query);
            if (response?.data) {
                stats.value = response.data;
            }
        } finally {
            statsLoading.value = false;
        }
    }

    async function getPaymentChart(status, chartType, params = {}) {
        try {
            chartLoading.value = true;
            const query = { tenantId: getTenantId(), status, chartType, ...params };
            const response = await get(endpoints.payments.chart, query);
            if (response?.data) {
                chartData.value = response.data;
            }
        } finally {
            chartLoading.value = false;
        }
    }

    return {
        payments,
        loading,
        stats,
        statsLoading,
        chartData,
        chartLoading,
        hasNext,
        hasPrev,
        currentLimit,
        getPayments,
        loadNext,
        loadPrev,
        updatePaymentStatus,
        getPaymentMetrics,
        getPaymentChart,
    };
});
