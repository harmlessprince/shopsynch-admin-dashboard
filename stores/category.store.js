import { defineStore } from "pinia";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";
import { ref } from "vue";

export const useCategoryStore = defineStore("categoryStore", () => {
    const { get, post, put, delete: deleteRequest } = useApiService();
    const categories = ref([]);
    const defaultCategories = ref([]);
    const merchantCategories = ref([]);
    const isLoading = ref(false);

    async function getCategories(params = {}) {
        try {
            isLoading.value = true;
            const url = endpoints.tenantCategories?.list || endpoints.admin?.categories?.list || "/v1/admin/categories";
            const response = await get(url, params);
            if (response && response.data) {
                categories.value = response.data;
            }
            return response;
        } finally {
            isLoading.value = false;
        }
    }

    async function getDefaultCategories() {
        const url = endpoints.defaultCategories || endpoints.admin?.categories?.list || "/v1/admin/categories";
        const response = await get(url, {});
        if (response && response.data) {
            defaultCategories.value = response.data;
        }
        return response;
    }

    async function getMerchantCategories(tenantId) {
        if (!tenantId) return [];
        const url = (endpoints.tenantCategories?.listByMerchant || "/v1/admin/categories/merchants/:tenantId")
            .replace(":tenantId", tenantId);
        const response = await get(url, {});
        if (response && response.data) {
            merchantCategories.value = Array.isArray(response.data) ? response.data : [];
        }
        return merchantCategories.value;
    }

    async function createCategory(payload) {
        const response = await post(endpoints.tenantCategories.create, payload);
        if (response && response.status) {
            await getCategories();
        }
        return response;
    }

    async function updateCategory(id, payload) {
        const response = await put(
            endpoints.tenantCategories.update.replace(":id", id),
            payload
        );
        if (response && response.status) {
            await getCategories();
        }
        return response;
    }

    async function deleteCategory(id) {
        const response = await deleteRequest(
            endpoints.tenantCategories.delete.replace(":id", id)
        );
        if (response && response.status) {
            await getCategories();
        }
        return response;
    }

    return {
        categories,
        defaultCategories,
        merchantCategories,
        isLoading,
        getCategories,
        getDefaultCategories,
        getMerchantCategories,
        createCategory,
        updateCategory,
        deleteCategory
    };
});
