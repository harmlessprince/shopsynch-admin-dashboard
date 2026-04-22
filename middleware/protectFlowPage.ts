export default defineNuxtRouteMiddleware((to, from) => {
    const authStore = useAuthStore();
    if (to.name === 'verify-email-ongoing-verification' && (!to.query.email || !to.query.token)) {
        return navigateTo('/login');
    }
    if (to.name === 'reset-password' &&  (!to.query.token && !authStore.forgotPasswordToken)) {
        return navigateTo('/login');
    }

    if (to.name === 'verify-reset-password-token' &&  !authStore.forgotPasswordTokenEmail && (!to.query.email || !to.query.token)) {
        return navigateTo('/login');
    }

    if (to.name === 'verify-email' && (!authStore.emailVerificationTokenSent || !authStore.emailToVerify)) {
        return navigateTo('/login');
    }
});
