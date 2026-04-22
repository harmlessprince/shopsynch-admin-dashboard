<script setup>
const route = useRoute();
const authStore = useAuthStore();

onMounted(async () => {
    const token = route.query.token;
    const refreshToken = route.query.refreshToken;
    const expiresIn = route.query.expiresIn;
    if (token) {
        await authStore.loginWithGoogle(token, refreshToken, expiresIn);
    } else {
        // Handle error: no token provided or authentication failed
        navigateTo('/login');
    }
});
</script>

<template>
    <div class="flex items-center justify-center min-h-screen bg-[#FDFDFD]">
        <div class="text-center">
            <div class="relative w-16 h-16 mx-auto mb-6">
                <div class="absolute inset-0 border-4 border-[#0033661A] rounded-full"></div>
                <div class="absolute inset-0 border-4 border-[#003366] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p class="text-[1.8rem] font-[500] text-[#1B1B19] leading-[24px]">Finishing login</p>
            <p class="text-[1.4rem] text-[#616161] mt-2">Please wait while we sync your account...</p>
        </div>
    </div>
</template>

<style scoped>
</style>
