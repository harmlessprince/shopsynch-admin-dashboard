import { defineStore } from "pinia";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";
import { getPaginatedData } from "~/utils/helpers.js";
import { ref } from "vue";

export const useInventoryStore = defineStore("inventoryStore", () => {
  const { get, post, patch } = useApiService();
  const inventory = ref([]);
  const lowStockItems = ref([]);
  const inventoryLogs = ref([]);
  const paginatedData = ref(undefined);
  const loading = ref(false);
  const error = ref(null);

  async function getInventory(page = 1, limit = 10) {
    try {
      loading.value = true;
      error.value = null;
      const response = await get(endpoints.inventory.list, {
        page: page - 1,
        limit,
      });
      if (response && response.data) {
        const data = response.data;
        if (Array.isArray(data)) {
          inventory.value = data;
        } else {
          inventory.value = data.items || data;
          if (data.total !== undefined) {
            paginatedData.value = getPaginatedData({
              current_page: data.currentPage ?? page,
              per_page: limit,
              total: data.total,
              from: (data.currentPage - 1) * limit + 1,
              to: Math.min(data.currentPage * limit, data.total),
            });
          }
        }
      }
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getProductInventory(productId) {
    try {
      loading.value = true;
      error.value = null;
      const response = await get(
        endpoints.inventory.byProduct.replace(":productId", productId),
        {}
      );
      if (response && response.data) {
        return Array.isArray(response.data) ? response.data.items : response.data;
      }
      return [];
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getSkuInventory(productId, skuId) {
    try {
      loading.value = true;
      error.value = null;
      const response = await get(
        endpoints.inventory.bySku
          .replace(":productId", productId)
          .replace(":skuId", skuId),
        {}
      );
      if (response && response.data) {
        return Array.isArray(response.data) ? response.data : response.data;
      }
      return [];
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getLowStockItems() {
    try {
      loading.value = true;
      error.value = null;
      const response = await get(endpoints.inventory.lowStock, {});
      if (response && response.data) {
        lowStockItems.value = Array.isArray(response.data)
          ? response.data
          : response.data.items || response.data;
      }
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getInventoryLogs(page = 0, limit = 50) {
    try {
      loading.value = true;
      error.value = null;
      const response = await get(endpoints.inventory.logs, {
        page,
        limit,
      });
      if (response && response.data) {
        inventoryLogs.value = Array.isArray(response.data)
          ? response.data
          : response.data.logs || response.data.items || response.data;
      }
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createInventory(payload) {
    try {
      loading.value = true;
      error.value = null;
      const response = await post(endpoints.inventory.create, payload);
      if (response && response.data) {
        inventory.value.push(response.data);
      }
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function adjustStock(inventoryId, payload) {
    try {
      loading.value = true;
      error.value = null;
      const response = await patch(
        endpoints.inventory.adjust.replace(":id", inventoryId),
        payload
      );
      if (response && response.data) {
        const index = inventory.value.findIndex((inv) => inv.id === inventoryId);
        if (index !== -1) {
          inventory.value[index] = response.data;
        }
      }
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function reserveStock(inventoryId, quantity) {
    try {
      loading.value = true;
      error.value = null;
      const response = await patch(
        endpoints.inventory.reserve.replace(":id", inventoryId),
        { quantity }
      );
      if (response && response.data) {
        const index = inventory.value.findIndex((inv) => inv.id === inventoryId);
        if (index !== -1) {
          inventory.value[index] = response.data;
        }
      }
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function releaseStock(inventoryId, payload) {
    try {
      loading.value = true;
      error.value = null;
      const response = await patch(
        endpoints.inventory.release.replace(":id", inventoryId),
        payload
      );
      if (response && response.data) {
        const index = inventory.value.findIndex((inv) => inv.id === inventoryId);
        if (index !== -1) {
          inventory.value[index] = response.data;
        }
      }
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function getInventoryById(id) {
    return inventory.value.find((inv) => inv.id === id);
  }

  function resetStore() {
    inventory.value = [];
    lowStockItems.value = [];
    inventoryLogs.value = [];
    paginatedData.value = undefined;
    loading.value = false;
    error.value = null;
  }

  return {
    // State
    inventory,
    lowStockItems,
    inventoryLogs,
    paginatedData,
    loading,
    error,
    // Actions
    getInventory,
    getProductInventory,
    getSkuInventory,
    getLowStockItems,
    getInventoryLogs,
    createInventory,
    adjustStock,
    reserveStock,
    releaseStock,
    getInventoryById,
    resetStore,
  };
});
