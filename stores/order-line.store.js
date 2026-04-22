import { defineStore } from "pinia";
import { ref } from "vue";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";

export const useOrderLineStore = defineStore("orderLineStore", () => {
    const { get } = useApiService();
    const lineItems = ref([]);
    const loading = ref(false);

    async function getOrderLineItems(orderId) {
        try {
            loading.value = true;
            lineItems.value = [];
            const url = endpoints.orderLineItems.replace(':orderId', orderId);
            const response = await get(url, {});
            if (response && response.data) {
                lineItems.value = response.data;
            }
        } finally {
            loading.value = false;
        }
    }

    return { lineItems, loading, getOrderLineItems };
});
