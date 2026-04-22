<script setup>
const authStore = useAuthStore();
const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/auth/google-callback';
    authStore.initiateGoogleLogin(redirectUrl);
}
</script>
<template>
    <button 
    type="button"
    @click="handleGoogleLogin"
    class="cursor-pointer flex items-center justify-center gap-x-[2.4rem] w-full rounded-[10px] border border-[#003366] h-[47px] text-[1.6rem] text-[#1B1B19] font-[400] leading-[22.5px]">
    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-[18px] h-[18px]" />
    <span>Sign up with Google</span>
</button>
 </template>
 
 <style scoped>
 
 </style>