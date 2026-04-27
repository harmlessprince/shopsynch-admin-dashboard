
export default defineNuxtRouteMiddleware(() => {
    const token = useCookie('shopsynch_admin_auth_token');
    if (!token.value) {
        return navigateTo('/login');
    }
});
