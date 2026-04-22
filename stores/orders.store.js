import {defineStore} from "pinia";
import {ref} from "vue";
import {useApiService} from "~/services/apiService.js";
import {endpoints} from "~/utils/endpoints.js";
import {getPaginatedData} from "~/utils/helpers.js";

export const useOrderStore = defineStore("orderStore", () => {
    const {get, patch} = useApiService();
    const orders = ref([]);
    const filter = ref({})
    const loading = ref(false);
    const paginatedData = ref(undefined);
    const stats = ref({
        totalOrders: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        inTransitOrders: 0
    });

    async function getOrders(params = {}) {
        try {
            loading.value = true;
            const response = await get(endpoints.allOrders, params);
            if (response && response.data) {
                orders.value = response.data?.orders;
                if (response.data.total !== undefined) {
                    const page = params.page ?? 1;
                    const limit = params.limit ?? 10;
                    paginatedData.value = getPaginatedData({
                        current_page: page,
                        per_page: limit,
                        total: response.data.total,
                        from: (page - 1) * limit + 1,
                        to: Math.min(page * limit, response.data.total),
                    });
                }
            }
        } finally {
            loading.value = false;
        }
    }

    async function getOrderStats() {
        const response = await get(endpoints.orderStats, {});
        if (response && response.data) {
            stats.value = response.data;
        }
    }

    const statuses = ref([]);

    async function getOrderStatuses() {
        const response = await get(endpoints.orderStatuses, {});
        if (response && response.data) {
            statuses.value = response.data;
        }
    }

    async function updateOrderStatus(orderId, payload) {
        const url = endpoints.updateOrderStatus.replace(':orderId', orderId);
        return await patch(url, payload);
    }

    async function forceUpdateOrderStatus(orderId, payload) {
        const url = endpoints.forceUpdateOrderStatus.replace(':orderId', orderId);
        return await patch(url, payload);
    }

    return {
        orders, getOrders, getOrderStats, getOrderStatuses, updateOrderStatus, forceUpdateOrderStatus,
        stats, statuses, loading, paginatedData,
    };
});
