export default defineNuxtRouteMiddleware((to) => {
    // Only apply to dashboard routes
    const token = useCookie('auth_token');
    const isDashboardRoute = to.path.startsWith('/dashboard');
    const isPublicRoute = ['/login', '/register', '/forgot-password', '/reset-password'].includes(to.path);
    // 1. Block access to dashboard if not logged in
    if (isDashboardRoute && !token.value) {
        return navigateTo('/login');
    }

    // 2. Block access to public routes if already logged in
    if (isPublicRoute && token.value) {
        return navigateTo('/dashboard');
    }
});
