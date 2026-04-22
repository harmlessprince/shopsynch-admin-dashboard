import { defineStore } from "pinia";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";
import { ref } from "vue";

export const useWarehouseStore = defineStore("warehouseStore", () => {
  const { get, post, patch } = useApiService();
  const warehouses = ref([]);
  const defaultWarehouse = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function getWarehouses() {
    try {
      loading.value = true;
      error.value = null;
      const response = await get(endpoints.warehouse.list, {});
      if (response && response.data) {
        warehouses.value = response.data;
        // Find and set default warehouse
        const found = response.data.find((wh) => wh.default);
        defaultWarehouse.value = found || response.data[0] || null;
      }
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createWarehouse(payload) {
    try {
      loading.value = true;
      error.value = null;
      const response = await post(endpoints.warehouse.create, payload);
      if (response && response.data) {
        warehouses.value.push(response.data);
        // If it's the first warehouse or marked as default, set as default
        if (response.data.default || warehouses.value.length === 1) {
          defaultWarehouse.value = response.data;
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

  async function updateWarehouse(id, payload) {
    try {
      loading.value = true;
      error.value = null;
      const response = await patch(
        endpoints.warehouse.update.replace(":id", id),
        payload
      );
      if (response && response.data) {
        const index = warehouses.value.findIndex((wh) => wh.id === id);
        if (index !== -1) {
          warehouses.value[index] = response.data;
          // Update default warehouse if this one is now default
          if (response.data.default) {
            defaultWarehouse.value = response.data;
          } else if (defaultWarehouse.value?.id === id && !response.data.default) {
            // If updated warehouse is no longer default, find new default
            const newDefault = warehouses.value.find((wh) => wh.default);
            defaultWarehouse.value = newDefault || warehouses.value[0] || null;
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

  function getWarehouseById(id) {
    return warehouses.value.find((wh) => wh.id === id);
  }

  function resetStore() {
    warehouses.value = [];
    defaultWarehouse.value = null;
    loading.value = false;
    error.value = null;
  }

  return {
    // State
    warehouses,
    defaultWarehouse,
    loading,
    error,
    // Actions
    getWarehouses,
    createWarehouse,
    updateWarehouse,
    getWarehouseById,
    resetStore,
  };
});
