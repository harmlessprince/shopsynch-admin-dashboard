import { defineStore } from "pinia";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";
import { ref } from "vue";

export const useCategoryStore = defineStore("categoryStore", () => {
    const { get, post, put, delete: deleteRequest } = useApiService();
    const categories = ref([]);
    const defaultCategories = ref([]);
    const isLoading = ref(false);

    async function getCategories(params = {}) {
        try {
            isLoading.value = true;
            const response = await get(endpoints.tenantCategories.list, params);
            if (response && response.data) {
                categories.value = response.data;
            }
            return response;
        } finally {
            isLoading.value = false;
        }
    }

    async function getDefaultCategories() {
        const response = await get(endpoints.defaultCategories, {});
        if (response && response.data) {
            defaultCategories.value = response.data;
        }
        return response;
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
        isLoading,
        getCategories,
        getDefaultCategories,
        createCategory,
        updateCategory,
        deleteCategory
    };
});
