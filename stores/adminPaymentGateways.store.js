import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";

export const useAdminPaymentGatewaysStore = defineStore("adminPaymentGatewaysStore", () => {
    const { get, put, post } = useApiService();
    const toastStore = useToastStore();

    const loadingSettings = ref(false);
    const savingSettings = ref(false);
    const settingsList = ref([]);
    const selectedCountrySetting = ref(null);

    const loadingHealth = ref(false);
    const resettingCircuit = ref(false);
    const circuits = ref({});
    const metrics = ref({});

    const loadingAuditLogs = ref(false);
    const auditLogs = ref([]);

    async function fetchGatewaySettings() {
        loadingSettings.value = true;
        try {
            const response = await get(endpoints.admin.paymentGatewaySettings.list, {}, { forceMode: "live" });
            const data = response?.data || response || [];
            settingsList.value = Array.isArray(data) ? data : (data?.items || []);
            return settingsList.value;
        } catch (error) {
            logger.error("Failed to load payment gateway settings", error);
            return [];
        } finally {
            loadingSettings.value = false;
        }
    }

    async function updateCountryGatewaySetting(country, payload) {
        savingSettings.value = true;
        try {
            const url = endpoints.admin.paymentGatewaySettings.update.replace(":country", encodeURIComponent(country));
            const response = await put(url, payload, { forceMode: "live" });
            const data = response?.data || response;
            toastStore.success(`Gateway settings for ${country} updated`, "");
            await fetchGatewaySettings();
            await fetchAuditLogs(country);
            return data;
        } catch (error) {
            logger.error(`Failed to update gateway settings for ${country}`, error);
            throw error;
        } finally {
            savingSettings.value = false;
        }
    }

    async function fetchCircuits() {
        loadingHealth.value = true;
        try {
            const response = await get(endpoints.admin.paymentGatewayHealth.circuits, {}, { forceMode: "live" });
            circuits.value = response?.data || response || {};
            return circuits.value;
        } catch (error) {
            logger.error("Failed to load gateway circuit breakers", error);
            return {};
        } finally {
            loadingHealth.value = false;
        }
    }

    async function fetchMetrics() {
        try {
            const response = await get(endpoints.admin.paymentGatewayHealth.metrics, {}, { forceMode: "live" });
            metrics.value = response?.data || response || {};
            return metrics.value;
        } catch (error) {
            logger.error("Failed to load gateway metrics", error);
            return {};
        }
    }

    async function resetCircuit(gateway) {
        resettingCircuit.value = true;
        try {
            const url = endpoints.admin.paymentGatewayHealth.reset.replace(":gateway", encodeURIComponent(gateway));
            const response = await post(url, {}, { forceMode: "live" });
            toastStore.success(`Circuit breaker for ${gateway} has been reset`, "");
            await fetchCircuits();
            return response?.data || response;
        } catch (error) {
            logger.error(`Failed to reset circuit breaker for ${gateway}`, error);
            throw error;
        } finally {
            resettingCircuit.value = false;
        }
    }

    async function fetchAuditLogs(country = "NG") {
        loadingAuditLogs.value = true;
        try {
            const response = await get(
                endpoints.admin.auditLogs,
                { resource: "PAYMENT_GATEWAY_SETTING", resourceId: country, limit: 50 },
                { forceMode: "live" }
            );
            const data = response?.data || response || [];
            auditLogs.value = Array.isArray(data) ? data : (data?.items || data?.content || []);
            return auditLogs.value;
        } catch (error) {
            logger.error(`Failed to load audit logs for ${country}`, error);
            return [];
        } finally {
            loadingAuditLogs.value = false;
        }
    }

    return {
        loadingSettings,
        savingSettings,
        settingsList,
        selectedCountrySetting,
        loadingHealth,
        resettingCircuit,
        circuits,
        metrics,
        loadingAuditLogs,
        auditLogs,
        fetchGatewaySettings,
        updateCountryGatewaySetting,
        fetchCircuits,
        fetchMetrics,
        resetCircuit,
        fetchAuditLogs,
    };
});
