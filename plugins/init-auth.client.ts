import {useAuthStore} from "~/stores/auth.store";
import {logger} from "~/utils/helpers";

export default defineNuxtPlugin(async (nuxtApp) => {
    const authStore = useAuthStore()
    const authToken = useCookie('shopsynch_admin_auth_token');
    const refreshToken = useCookie('shopsynch_admin_refresh_token');

    if (refreshToken.value) {
        authStore.setRefreshToken(refreshToken.value)
    }

    if (!authToken.value && refreshToken.value) {
        await authStore.refreshAuthToken()
    }

    if (authToken.value || authStore.getAuthToken()) {
        authStore.setAuthToken(authToken.value || authStore.getAuthToken())
        try {
            await authStore.fetchUserProfile()
            nuxtApp.payload.user = authStore.user;
        } catch (err) {
            logger.error('Failed to fetch profile:', err)
            authStore.clearAuthToken()
        }
    }
})
