import { defineStore } from "pinia";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";
import { ref } from "vue";
import { getPaginatedData } from "~/utils/helpers.js";
export const useProductStore = defineStore("productsStore", () => {
  const { get, post, patch, delete: deleteRequest } = useApiService();
  const products = ref([]);
  const stats = ref({
    totalProducts: 0,
    totalInStockProducts: 0,
    totalOutOfStockProducts: 0,
    totalProductsValue: 0,
  });
  const isLoadingStats = ref(false);
  const isLoading = ref(false);
  const total = ref(0);
  const paginatedData = ref(undefined);

  async function getProducts(params = {}) {
    try {
      isLoading.value = true;
      const response = await get(endpoints.admin.products.list, params);
      if (response && response.data) {
        products.value = response.data?.products || [];
        total.value = response.data?.total || 0;
        const limit = Number(params.limit || 50);
        const currentPage = Number(response.data?.currentPage || 1);
        paginatedData.value = getPaginatedData({
          current_page: currentPage,
          per_page: limit,
          total: total.value,
          from: (currentPage - 1) * limit + 1,
          to: Math.min(currentPage * limit, total.value),
        });
      }
      return response;
    } finally {
      isLoading.value = false;
    }
  }

  async function getProductStats() {
    isLoadingStats.value = true;
    const response = await get(endpoints.productStats, {});
    if (response && response.data) {
      stats.value = response.data;
    }
    isLoadingStats.value = false;
  }

  async function createProduct(payload) {
    const response = await post(endpoints.createProduct, payload);
    if (response && response.status) {
      await getProducts();
      await getProductStats();
    }
    return response;
  }

  async function updateProduct(id, payload) {
    const response = await patch(
      endpoints.updateProduct.replace(":id", id),
      payload,
    );
    if (response && response.status) {
      await getProducts();
      await getProductStats();
    }
    return response;
  }

  async function getProductById(id) {
    const response = await get(endpoints.admin.products.detail.replace(":id", id), {});
    return response;
  }

  async function deleteProduct(id) {
    const response = await deleteRequest(
      endpoints.deleteProduct.replace(":id", id),
    );
    if (response && response.status) {
      await getProducts();
      await getProductStats();
    }
    return response;
  }

  async function archiveProduct(id) {
    const response = await patch(
      endpoints.archiveProduct.replace(":id", id),
      {},
    );
    if (response && response.status) {
      await getProducts();
    }
    return response;
  }

  async function unarchiveProduct(id) {
    const response = await patch(
      endpoints.unarchiveProduct.replace(":id", id),
      {},
    );
    if (response && response.status) {
      await getProducts();
    }
    return response;
  }

  async function getProductWithInventory(id) {
    const response = await get(endpoints.admin.products.detail.replace(":id", id), {});
    if (response && response.data) {
      try {
        const { useInventoryStore } =
          await import("~/stores/inventory.store.js");
        const inventoryStore = useInventoryStore();
        const inventory = await inventoryStore.getProductInventory(id);
        return {
          ...response,
          data: {
            ...response.data,
            inventory: inventory || [],
          },
        };
      } catch (err) {
        console.error("Failed to fetch inventory for product:", err);
        return response;
      }
    }
    return response;
  }

  async function getProductInventory(productId) {
    try {
      const { useInventoryStore } = await import("~/stores/inventory.store.js");
      const inventoryStore = useInventoryStore();
      return await inventoryStore.getProductInventory(productId);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      return [];
    }
  }

  return {
    products,
    total,
    paginatedData,
    getProducts,
    stats,
    getProductStats,
    createProduct,
    updateProduct,
    getProductById,
    deleteProduct,
    archiveProduct,
    unarchiveProduct,
    getProductWithInventory,
    getProductInventory,
    isLoading,
    isLoadingStats,
  };
});
