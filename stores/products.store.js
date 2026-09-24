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
    if (!endpoints.productStats) return
    isLoadingStats.value = true
    try {
      const response = await get(endpoints.productStats, {})
      if (response && response.data) {
        stats.value = response.data
      }
    } finally {
      isLoadingStats.value = false
    }
  }

  async function createProduct(payload, tenantId = null) {
    const targetTenantId = tenantId || payload?.tenantId;
    const url = targetTenantId
      ? endpoints.admin.products.createForTenant.replace(":tenantId", targetTenantId)
      : endpoints.createProduct;
    const response = await post(url, payload);
    if (response && response.status) {
      try {
        await getProducts();
        await getProductStats();
      } catch (e) {
        console.warn("Background refresh after createProduct failed:", e);
      }
    }
    return response;
  }

  async function updateProduct(id, payload) {
    const response = await patch(
      endpoints.updateProduct.replace(":id", id),
      payload,
    );
    if (response && response.status) {
      try {
        await getProducts();
        await getProductStats();
      } catch (e) {
        console.warn("Background refresh after updateProduct failed:", e);
      }
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
      try {
        await getProducts();
        await getProductStats();
      } catch (e) {
        console.warn("Background refresh after deleteProduct failed:", e);
      }
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

  async function getUnitSuggestions(category) {
    const response = await get(
      endpoints.unitSuggestions,
      category ? { category } : {},
    );
    return response;
  }

  async function getUnitScaffolds(category, tenantId) {
    if (!tenantId) {
      return getUnitSuggestions(category);
    }
    const url = endpoints.unitScaffolds.replace(":tenantId", tenantId);
    const response = await get(url, category ? { category } : {});
    return response;
  }

  async function generateSku(tenantId, payload) {
    const url = endpoints.admin.products.generateSku.replace(":tenantId", tenantId);
    return await post(url, payload);
  }

  async function validateSku(tenantId, params) {
    const url = endpoints.admin.products.validateSku.replace(":tenantId", tenantId);
    return await get(url, params);
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
    getUnitSuggestions,
    getUnitScaffolds,
    generateSku,
    validateSku,
    isLoading,
    isLoadingStats,
  };
});
