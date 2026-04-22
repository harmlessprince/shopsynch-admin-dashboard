<script setup>
definePageMeta({
  layout: 'authentication',
  title: 'Access Denied',
  description: 'It seems you do not have the required permissions to view this content.'
})

const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
}

const goBack = () => {
  navigateTo('/dashboard')
}
</script>

<template>
  <div class="flex flex-col items-center text-center">
    <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-8">
      <span class="material-symbols-outlined text-red-500 text-5xl">lock_person</span>
    </div>

    <h2 class="text-3xl font-bold text-gray-900 mb-4">Unauthorized Access</h2>
    
    <p class="text-gray-600 mb-10 leading-relaxed">
      You don't have the necessary permissions to access this page. 
      If you believe this is an error, please contact your store administrator 
      or try switching to a different account.
    </p>

    <div class="w-full space-y-4">
      <BaseButton 
        class="w-full py-4 text-lg font-semibold"
        @click="goBack"
      >
        Back to Dashboard
      </BaseButton>

      <button 
        class="w-full text-gray-500 hover:text-gray-700 font-medium py-2 transition-colors duration-200"
        @click="handleLogout"
      >
        Sign out and change account
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed beyond Tailwind */
</style>
