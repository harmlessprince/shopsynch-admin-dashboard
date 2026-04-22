import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";

export const useCustomersStore = defineStore("customersStore", () => {
    const { get } = useApiService();

    // ── For SearchableSelectInput (payments filter) ───────────────────────────
    const customers = ref([]);
    const loading = ref(false);

    const customerOptions = computed(() =>
        customers.value.map(c => ({
            label: c.fullName || c.email || c.id,
            value: c.id,
        }))
    );

    async function getCustomers(params = {}) {
        try {
            loading.value = true;
            const response = await get(endpoints.customers.list, {
                limit: 20,
                page: 0,
                sortFieldParam: 'CREATED_AT',
                sortDirectionParam: 'DESC',
                ...params,
            });
            if (response?.data?.data) {
                customers.value = response.data.data;
            }
        } finally {
            loading.value = false;
        }
    }

    // ── Order-based customers (cursor pagination) ─────────────────────────────
    const orderBasedCustomers = ref([]);
    const orderBasedLoading = ref(false);
    const currentLimit = ref(10);
    const currentCursor = ref(null);
    const nextCursor = ref(null);
    const cursorStack = ref([]);

    const hasNext = computed(() => !!nextCursor.value);
    const hasPrev = computed(() => cursorStack.value.length > 0);

    async function getOrderBasedCustomers(params = {}, resetCursor = true) {
        try {
            orderBasedLoading.value = true;
            if (resetCursor) {
                cursorStack.value = [];
                currentCursor.value = null;
            }
            const query = {
                limit: currentLimit.value,
                sortFieldParam: 'LAST_ORDER_DATE',
                sortDirectionParam: 'DESC',
                ...params,
            };
            if (currentCursor.value) {
                query.cursor = currentCursor.value;
            }
            const response = await get(endpoints.customers.orderBased, query);
            if (response?.data) {
                orderBasedCustomers.value = response.data.data ?? [];
                nextCursor.value = response.data.nextCursor ?? null;
            }
        } finally {
            orderBasedLoading.value = false;
        }
    }

    async function loadNext(params = {}) {
        if (!nextCursor.value) return;
        cursorStack.value.push(currentCursor.value);
        currentCursor.value = nextCursor.value;
        await getOrderBasedCustomers(params, false);
    }

    async function loadPrev(params = {}) {
        if (cursorStack.value.length === 0) return;
        currentCursor.value = cursorStack.value.pop();
        await getOrderBasedCustomers(params, false);
    }

    return {
        // select input
        customers,
        customerOptions,
        loading,
        getCustomers,
        // order-based table
        orderBasedCustomers,
        orderBasedLoading,
        currentLimit,
        hasNext,
        hasPrev,
        getOrderBasedCustomers,
        loadNext,
        loadPrev,
    };
});
