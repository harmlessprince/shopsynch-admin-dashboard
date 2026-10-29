import { defineStore } from "pinia";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";
import { ref } from "vue";
import { getPaginatedData } from "~/utils/helpers.js";
export const useProductStore = defineStore("productsStore", () => {
  const { get, post, patch, delete: deleteRequest } = useApiService();
  const products = ref([]);
  const currentProductMode = ref("live");
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

  function setMode(newMode) {
    currentProductMode.value = newMode === "test" ? "test" : "live";
  }

  async function getProducts(params = {}, mode = null) {
    const resolvedMode = mode || params?.mode || currentProductMode.value || "live";
    currentProductMode.value = resolvedMode;
    const apiParams = { ...params };
    delete apiParams.mode;
    try {
      isLoading.value = true;
      const response = await get(endpoints.admin.products.list, apiParams, { forceMode: resolvedMode });
      if (response && response.data) {
        products.value = response.data?.products || [];
        total.value = response.data?.total || 0;
        const limit = Number(apiParams.limit || 50);
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

  async function getProductStats(mode = null) {
    if (!endpoints.productStats) return;
    const resolvedMode = mode || currentProductMode.value || "live";
    isLoadingStats.value = true;
    try {
      const response = await get(endpoints.productStats, {}, { forceMode: resolvedMode });
      if (response && response.data) {
        stats.value = response.data;
      }
    } finally {
      isLoadingStats.value = false;
    }
  }

  async function createProduct(payload, tenantId = null, mode = null) {
    const resolvedMode = mode || currentProductMode.value || "live";
    const targetTenantId = tenantId || payload?.tenantId;
    const url = targetTenantId
      ? endpoints.admin.products.createForTenant.replace(":tenantId", targetTenantId)
      : endpoints.createProduct;
    const response = await post(url, payload, { forceMode: resolvedMode });
    if (response && response.status) {
      try {
        await getProducts({}, resolvedMode);
        await getProductStats(resolvedMode);
      } catch (e) {
        console.warn("Background refresh after createProduct failed:", e);
      }
    }
    return response;
  }

  async function updateProduct(id, payload, mode = null) {
    const resolvedMode = mode || currentProductMode.value || "live";
    const response = await patch(
      endpoints.updateProduct.replace(":id", id),
      payload,
      { forceMode: resolvedMode }
    );
    if (response && response.status) {
      try {
        await getProducts({}, resolvedMode);
        await getProductStats(resolvedMode);
      } catch (e) {
        console.warn("Background refresh after updateProduct failed:", e);
      }
    }
    return response;
  }

  async function getProductById(id, mode = null) {
    const resolvedMode = mode || currentProductMode.value || "live";
    const response = await get(
      endpoints.admin.products.detail.replace(":id", id),
      {},
      { forceMode: resolvedMode }
    );
    return response;
  }

  async function deleteProduct(id, mode = null) {
    const resolvedMode = mode || currentProductMode.value || "live";
    const response = await deleteRequest(
      endpoints.deleteProduct.replace(":id", id),
      { forceMode: resolvedMode }
    );
    if (response && response.status) {
      try {
        await getProducts({}, resolvedMode);
        await getProductStats(resolvedMode);
      } catch (e) {
        console.warn("Background refresh after deleteProduct failed:", e);
      }
    }
    return response;
  }

  async function archiveProduct(id, mode = null) {
    const resolvedMode = mode || currentProductMode.value || "live";
    const response = await patch(
      endpoints.archiveProduct.replace(":id", id),
      {},
      { forceMode: resolvedMode }
    );
    if (response && response.status) {
      await getProducts({}, resolvedMode);
    }
    return response;
  }

  async function unarchiveProduct(id, mode = null) {
    const resolvedMode = mode || currentProductMode.value || "live";
    const response = await patch(
      endpoints.unarchiveProduct.replace(":id", id),
      {},
      { forceMode: resolvedMode }
    );
    if (response && response.status) {
      await getProducts({}, resolvedMode);
    }
    return response;
  }

  async function getProductWithInventory(id, mode = null) {
    const resolvedMode = mode || currentProductMode.value || "live";
    const response = await get(
      endpoints.admin.products.detail.replace(":id", id),
      {},
      { forceMode: resolvedMode }
    );
    if (response && response.data) {
      try {
        const { useInventoryStore } =
          await import("~/stores/inventory.store.js");
        const inventoryStore = useInventoryStore();
        const inventory = await inventoryStore.getProductInventory(id, resolvedMode);
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

  async function getProductInventory(productId, mode = null) {
    try {
      const { useInventoryStore } = await import("~/stores/inventory.store.js");
      const inventoryStore = useInventoryStore();
      return await inventoryStore.getProductInventory(productId, mode || currentProductMode.value || "live");
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      return [];
    }
  }

  async function getUnitSuggestions(category, mode = null) {
    const response = await get(
      endpoints.unitSuggestions,
      category ? { category } : {},
      { forceMode: mode || currentProductMode.value || "live" }
    );
    return response;
  }

  async function getUnitScaffolds(category, tenantId, mode = null) {
    const resolvedMode = mode || currentProductMode.value || "live";
    if (!tenantId) {
      return getUnitSuggestions(category, resolvedMode);
    }
    const url = endpoints.unitScaffolds.replace(":tenantId", tenantId);
    const response = await get(
      url,
      category ? { category } : {},
      { forceMode: resolvedMode }
    );
    return response;
  }

  async function generateSku(tenantId, payload, mode = null) {
    const url = endpoints.admin.products.generateSku.replace(":tenantId", tenantId);
    return await post(url, payload, { forceMode: mode || currentProductMode.value || "live" });
  }

  async function validateSku(tenantId, params, mode = null) {
    const url = endpoints.admin.products.validateSku.replace(":tenantId", tenantId);
    return await get(url, params, { forceMode: mode || currentProductMode.value || "live" });
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
    currentProductMode,
    setMode,
    isLoading,
    isLoadingStats,
  };
});
