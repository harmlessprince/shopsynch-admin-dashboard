import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useAuthStore } from "~/stores/auth.store.js";
import { useToastStore } from "~/stores/toast.store.js";

export const useTenantStore = defineStore("tenantStore", () => {
    const { get, post } = useApiService();
    const authStore = useAuthStore();
    const tenantStore = useTenantStore();
    const toastStore = useToastStore();
    
    const stores = ref([]);
    const isLoading = ref(false);
    
    const activeStore = computed(() => {
        return stores.value.find(s => s.active) || stores.value.find(s => s.tenantId === authStore.user?.tenantId) || null;
    });

    async function fetchStores() {
        isLoading.value = true;
        try {
            const response = await get(endpoints.userStores, {}, { forceMode: 'live' });
            if (response?.data) {
                stores.value = response.data;
            }
        } catch (error) {
            console.error("Failed to fetch stores:", error);
        } finally {
            isLoading.value = false;
        }
    }

    async function switchActiveStore(tenantId) {
        // console.log("Owner: ", tenantId === authStore.user?.tenantId)
        if (tenantId === tenantStore.activeStore?.tenantId) return;
        
        isLoading.value = true;
        try {
            const response = await post(endpoints.switchStore, { tenantId }, { forceMode: 'live' });
            if (response?.data?.token) {
                // Update JWT token
                useCookie('shopsynch_admin_auth_token').value = response.data.token;
                authStore.setAuthToken(response.data.token);
                
                toastStore.success('Switched store successfully!');
                
                // Re-fetch profiles to update the entire app state
                await authStore.fetchUserProfile();
                await authStore.fetchUserBusinessProfile();
                
                // Force a hard reload to dashboard to clear old state and state-dependent components
                window.location.href = '/dashboard';
            }
        } catch (error) {
            console.error("Failed to switch store:", error);
        } finally {
            isLoading.value = false;
        }
    }

    return {
        stores,
        isLoading,
        activeStore,
        fetchStores,
        switchActiveStore
    };
});
