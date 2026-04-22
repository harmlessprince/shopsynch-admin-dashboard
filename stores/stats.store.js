import { defineStore } from "pinia";
import { ref } from "vue";
import { useApiService } from "~/services/apiService.js";
import { endpoints } from "~/utils/endpoints.js";
import { logger } from "~/utils/helpers.js";

export const useStatsStore = defineStore("statsStore", () => {
    const { get } = useApiService();

    // --- State Refs ---
    const orderOverview = ref(null);
    const orderVolumeChartData = ref([]);
    const revenueOverview = ref(null);
    const revenueChartData = ref([]);
    const customerInsights = ref(null);
    const productInsights = ref(null);
    const inventoryInsights = ref(null);
    const monthlySalesChartData = ref([]);

    // --- Loading States ---
    const isLoadingOrders = ref(false);
    const isLoadingOrderChart = ref(false);
    const isLoadingRevenue = ref(false);
    const isLoadingRevenueChart = ref(false);
    const isLoadingCustomers = ref(false);
    const isLoadingProducts = ref(false);
    const isLoadingInventory = ref(false);
    const isLoadingMonthlySales = ref(false);

    // --- Actions ---

    /**
     * Get Order Overview
     * @param {Object} params - { tenantId, startDate, endDate }
     */
    async function getOrderOverview(params = {}) {
        isLoadingOrders.value = true;
        try {
            const response = await get(endpoints.dashboard.orderOverview, params);
            if (response && response.status) {
                orderOverview.value = response.data;
            }
            return response;
        } catch (error) {
            logger.error("Failed to fetch order overview", error);
        } finally {
            isLoadingOrders.value = false;
        }
    }

    /**
     * Get Order Volume Chart
     * @param {Object} params - { tenantId, startDate, endDate }
     */
    async function getOrderVolumeChart(params = {}) {
        isLoadingOrderChart.value = true;
        try {
            const response = await get(endpoints.dashboard.orderVolumeChart, params);
            if (response && response.status) {
                orderVolumeChartData.value = response.data?.chartData || [];
            }
            return response;
        } catch (error) {
            logger.error("Failed to fetch order volume chart", error);
        } finally {
            isLoadingOrderChart.value = false;
        }
    }

    /**
     * Get Revenue Overview
     * @param {Object} params - { tenantId, startDate, endDate }
     */
    async function getRevenueOverview(params = {}) {
        isLoadingRevenue.value = true;
        try {
            const response = await get(endpoints.dashboard.revenue, params);
            if (response && response.status) {
                revenueOverview.value = response.data;
            }
            return response;
        } catch (error) {
            logger.error("Failed to fetch revenue overview", error);
        } finally {
            isLoadingRevenue.value = false;
        }
    }

    /**
     * Get Revenue Chart
     * @param {Object} params - { tenantId, startDate, endDate }
     */
    async function getRevenueChart(params = {}) {
        isLoadingRevenueChart.value = true;
        try {
            const response = await get(endpoints.dashboard.revenueChart, params);
            if (response && response.status) {
                revenueChartData.value = response.data?.chartData || [];
            }
            return response;
        } catch (error) {
            logger.error("Failed to fetch revenue chart", error);
        } finally {
            isLoadingRevenueChart.value = false;
        }
    }

    /**
     * Get Customer Insights
     * @param {Object} params - { tenantId, startDate, endDate }
     */
    async function getCustomerInsights(params = {}) {
        isLoadingCustomers.value = true;
        try {
            const response = await get(endpoints.dashboard.customerInsights, params);
            if (response && response.status) {
                customerInsights.value = response.data;
            }
            return response;
        } catch (error) {
            logger.error("Failed to fetch customer insights", error);
        } finally {
            isLoadingCustomers.value = false;
        }
    }

    /**
     * Get Product Insights
     * @param {Object} params - { tenantId, startDate, endDate }
     */
    async function getProductInsights(params = {}) {
        isLoadingProducts.value = true;
        try {
            const response = await get(endpoints.dashboard.products, params);
            if (response && response.status) {
                productInsights.value = response.data;
            }
            return response;
        } catch (error) {
            logger.error("Failed to fetch product insights", error);
        } finally {
            isLoadingProducts.value = false;
        }
    }

    /**
     * Get Inventory Insights
     * @param {Object} params - { tenantId, startDate, endDate }
     */
    async function getInventoryInsights(params = {}) {
        isLoadingInventory.value = true;
        try {
            const response = await get(endpoints.dashboard.inventory, params);
            if (response && response.status) {
                inventoryInsights.value = response.data;
            }
            return response;
        } catch (error) {
            logger.error("Failed to fetch inventory insights", error);
        } finally {
            isLoadingInventory.value = false;
        }
    }

    /**
     * Get Inventory Insights
     * @param {Object} params - { tenantId, startDate, endDate }
     */
    async function getInventoryPerformance(params = {}) {
        isLoadingInventory.value = true;
        try {
            const response = await get(endpoints.dashboard.inventoryPerformance, params);
            if (response && response.status) {
                inventoryInsights.value = response.data;
            }
            return response;
        } catch (error) {
            logger.error("Failed to fetch inventory insights", error);
        } finally {
            isLoadingInventory.value = false;
        }
    }

    /**
     * Get Monthly Sales Chart
     * @param {Object} params - { year, tenantId }
     */
    async function getMonthlySalesChart(params = {}) {
        isLoadingMonthlySales.value = true;
        try {
            const response = await get(endpoints.dashboard.monthlySalesChart, params);
            if (response && response.status) {
                monthlySalesChartData.value = response.data?.chartData || [];
            }
            return response;
        } catch (error) {
            logger.error("Failed to fetch monthly sales chart", error);
        } finally {
            isLoadingMonthlySales.value = false;
        }
    }

    return {
        // State
        orderOverview,
        orderVolumeChartData,
        revenueOverview,
        revenueChartData,
        customerInsights,
        productInsights,
        inventoryInsights,
        monthlySalesChartData,

        // Loading
        isLoadingOrders,
        isLoadingOrderChart,
        isLoadingRevenue,
        isLoadingRevenueChart,
        isLoadingCustomers,
        isLoadingProducts,
        isLoadingInventory,
        isLoadingMonthlySales,

        // Actions
        getOrderOverview,
        getOrderVolumeChart,
        getRevenueOverview,
        getRevenueChart,
        getCustomerInsights,
        getProductInsights,
        getInventoryInsights,
        getMonthlySalesChart,
        getInventoryPerformance,
    };
});
