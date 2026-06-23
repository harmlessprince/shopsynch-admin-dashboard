import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useAdminCategoriesStore = defineStore("adminCategoriesStore", () => {
    const { get, post, put, delete: deleteRequest } = useApiService();
    const toastStore = useToastStore();

    const loading = ref(false);
    const saving = ref(false);
    const reviewing = ref(false);
    const categories = ref([]);
    const customReview = ref([]);

    async function fetchCategories(params = {}) {
        loading.value = true;
        try {
            const response = await get(endpoints.admin.categories.list, params, { forceMode: "live" });
            categories.value = response?.data || [];
            return response;
        } finally {
            loading.value = false;
        }
    }

    async function createCategory(payload) {
        saving.value = true;
        try {
            const response = await post(endpoints.admin.categories.create, payload, { forceMode: "live" });
            if (response) toastStore.success("Category created", "");
            await fetchCategories();
            return response;
        } finally {
            saving.value = false;
        }
    }

    async function updateCategory(id, payload) {
        saving.value = true;
        try {
            const url = endpoints.admin.categories.update.replace(":id", id);
            const response = await put(url, payload, { forceMode: "live" });
            if (response) toastStore.success("Category updated", "");
            await fetchCategories();
            return response;
        } finally {
            saving.value = false;
        }
    }

    async function deleteCategory(id) {
        const url = endpoints.admin.categories.delete.replace(":id", id);
        const response = await deleteRequest(url, { forceMode: "live" });
        if (response) toastStore.success("Category deleted", "");
        await fetchCategories();
        return response;
    }

    async function fetchCustomReview() {
        reviewing.value = true;
        try {
            const response = await get(endpoints.admin.categories.review, {}, { forceMode: "live" });
            customReview.value = response?.data || [];
            return response;
        } finally {
            reviewing.value = false;
        }
    }

    async function promoteCustomCategory(id, payload) {
        saving.value = true;
        try {
            const url = endpoints.admin.categories.promote.replace(":id", id);
            const response = await post(url, payload, { forceMode: "live" });
            if (response) toastStore.success("Category promoted", "");
            await Promise.all([fetchCategories(), fetchCustomReview()]);
            return response;
        } finally {
            saving.value = false;
        }
    }

    return {
        loading,
        saving,
        reviewing,
        categories,
        customReview,
        fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        fetchCustomReview,
        promoteCustomCategory,
    };
});
