import {useAuthStore} from "~/stores/auth.store";
import {logger} from "~/utils/helpers";

export default defineNuxtPlugin(async (nuxtApp) => {
    const authStore = useAuthStore()
    const authToken = useCookie('auth_token');

    if (authToken.value) {
        authStore.setAuthToken(authToken.value)
        try {
            await authStore.fetchUserProfile()
            nuxtApp.payload.user = authStore.user;
        } catch (err) {
            logger.error('Failed to fetch profile:', err)
            authStore.clearAuthToken()
        }
    }
})
