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
  const currentItem = ref(null);
  const currentItemLogs = ref([]);
  const currentItemBatches = ref([]);
  const paginatedData = ref(undefined);
  const loading = ref(false);
  const error = ref(null);

  const stockMovementActions = new Set([
    "RECEIVED",
    "SOLD",
    "DAMAGED",
    "RETURNED",
    "TRANSFERRED_IN",
    "TRANSFERRED_OUT",
  ]);

  function normalizeStockMovementPayload(payload) {
    const action = payload?.action;
    const qty = Math.abs(Number(payload?.qty));

    if (action === "ADJUSTED") {
      throw new Error("Please choose a specific stock movement action");
    }

    if (!stockMovementActions.has(action)) {
      throw new Error("Please choose a valid stock movement action");
    }

    if (!Number.isFinite(qty) || qty < 1) {
      throw new Error("Stock movement quantity must be at least 1");
    }

    const normalized = {
      ...payload,
      qty,
    };

    if (action === "RECEIVED" && payload?.unitCost !== undefined && payload?.unitCost !== null && payload?.unitCost !== '') {
      const parsedUnitCost = Number(payload.unitCost);
      if (Number.isFinite(parsedUnitCost) && parsedUnitCost >= 0) {
        normalized.unitCost = parsedUnitCost;
      }
    }

    return normalized;
  }

  function findInventoryRecord(inventoryId) {
    return (
      inventory.value.find((inv) => inv.id === inventoryId) ||
      (currentItem.value?.id === inventoryId ? currentItem.value : null) ||
      lowStockItems.value.find((inv) => inv.id === inventoryId)
    );
  }

  function withInventoryVersion(inventoryId, payload) {
    const inventoryRecord = findInventoryRecord(inventoryId);
    const version = payload?.version ?? inventoryRecord?.version;

    if (version === undefined || version === null) {
      throw new Error("Inventory version is required to update stock");
    }

    return {
      ...payload,
      version,
    };
  }

  async function getInventory(page = 1, limit = 50, filters = {}) {
    try {
      loading.value = true;
      error.value = null;
      const params = {
        page: page - 1,
        limit,
        ...filters,
      };
      const response = await get(endpoints.admin.inventory.list, params);
      if (response && response.data) {
        const data = response.data;
        if (Array.isArray(data)) {
          inventory.value = data;
        } else {
          inventory.value = data.items || data.content || [];
          if (data.total !== undefined || data.totalElements !== undefined) {
            const totalCount = data.total ?? data.totalElements ?? inventory.value.length;
            const currentPage = data.currentPage ?? page;
            paginatedData.value = getPaginatedData({
              current_page: currentPage,
              per_page: limit,
              total: totalCount,
              from: (currentPage - 1) * limit + 1,
              to: Math.min(currentPage * limit, totalCount),
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
        if (Array.isArray(response.data)) {
          return response.data;
        }
        return response.data.items || response.data.content || [];
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
      const movementPayload = withInventoryVersion(
        inventoryId,
        normalizeStockMovementPayload(payload)
      );
      const response = await patch(
        endpoints.inventory.adjust.replace(":id", inventoryId),
        movementPayload
      );
      if (response && response.data) {
        const index = inventory.value.findIndex((inv) => inv.id === inventoryId);
        if (index !== -1) {
          inventory.value[index] = response.data;
        }
        if (currentItem.value?.id === inventoryId) {
          currentItem.value = response.data;
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

  async function fetchInventoryById(id) {
    try {
      loading.value = true;
      error.value = null;
      const response = await get(
        endpoints.inventory.detail.replace(":id", id),
        {}
      );
      if (response && response.data) {
        currentItem.value = response.data;
      }
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchInventoryLogsById(id, page = 0, limit = 50) {
    try {
      loading.value = true;
      error.value = null;
      const response = await get(
        endpoints.inventory.logs.replace(":id", id),
        { page, limit }
      );
      if (response && response.data) {
        currentItemLogs.value = Array.isArray(response.data)
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

  async function fetchInventoryBatches(id) {
    try {
      loading.value = true;
      error.value = null;
      const response = await get(
        endpoints.inventory.batches.replace(":id", id),
        {}
      );
      if (response && response.data) {
        currentItemBatches.value = Array.isArray(response.data)
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

  function resetStore() {
    inventory.value = [];
    lowStockItems.value = [];
    inventoryLogs.value = [];
    currentItem.value = null;
    currentItemLogs.value = [];
    currentItemBatches.value = [];
    paginatedData.value = undefined;
    loading.value = false;
    error.value = null;
  }

  return {
    // State
    inventory,
    lowStockItems,
    inventoryLogs,
    currentItem,
    currentItemLogs,
    currentItemBatches,
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
    fetchInventoryById,
    fetchInventoryLogsById,
    fetchInventoryBatches,
    resetStore,
  };
});
