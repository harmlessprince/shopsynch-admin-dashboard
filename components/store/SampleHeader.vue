<template>
    <header class="sticky top-0 z-40 bg-white shadow-sm">
      <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2" >
          <span class="text-2xl font-bold text-primary" v-if="isMounted">{{ headerConfig.authUser.businessName }}</span>
        </NuxtLink>

        <div class="flex items-center gap-6">
          <!-- Account Dropdown -->
          <div v-if="authStore.isLoggedIn && isMounted" class="relative group" ref="dropdownContainer">
            <button class="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors py-2" @click="toggleProfile">
              <span class="material-symbols-outlined">person</span>
              <span class="hidden sm:inline font-medium max-w-[150px] truncate" v-if="isMounted">
                Hello, {{ headerConfig.authUser.name }}
              </span>
              <span class="material-symbols-outlined text-sm">expand_more</span>
            </button>

            <!-- Dropdown Menu -->
            <div 
              class="absolute right-0 top-full pt-2 z-50 transition-all duration-200" 
              v-if="showProfile && isMounted"
            >
              <div class="w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-3">
                <div class="px-4 py-3 border-b border-gray-50 mb-2">
                  <p class="text-xs text-gray-400 font-medium uppercase tracking-wider">Account</p>
                  <p class="text-sm font-bold text-gray-800 truncate">{{ headerConfig.authUser.name }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ headerConfig.authUser.email }}</p>
                </div>
                
                <NuxtLink 
                  to="#" 
                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  @click="showProfile = false"
                >
                  <span class="material-symbols-outlined text-sm">shopping_bag</span>
                  My Orders
                </NuxtLink>

                <NuxtLink 
                  to="#" 
                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  @click="showProfile = false"
                >
                  <span class="material-symbols-outlined text-sm">settings</span>
                  Settings
                </NuxtLink>
                
                <button @click="headerConfig.authUser.logout" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                  <span class="material-symbols-outlined text-sm">logout</span>
                  Logout
                </button>
              </div>
            </div>
          </div>

          <button v-else @click="headerConfig.authUser.openLogin" class="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors">
            <span class="material-symbols-outlined">person</span>
            <span class="hidden sm:inline">Account</span>
          </button>
          <NuxtLink to="#" class="flex items-center gap-1 text-gray-600 hover:text-primary relative" >
            <span class="material-symbols-outlined">shopping_cart</span>
            <span class="hidden sm:inline">Cart</span>
        
              <span v-if="headerConfig.cart.totalItems > 0 && isMounted"
                class="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {{ headerConfig.cart.totalItems }}
              </span>
          </NuxtLink>
        </div>
      </div>
    </header>


</template>
<script setup>

import { onMounted, ref } from 'vue';  


const headerConfig = ref({
    authUser: {
        name: "John Doe",
        email: "[EMAIL_ADDRESS]",
        avatar: "https://ui-avatars.com/api/?name=John+Doe",
        businessName: "ShopSynch",
        openLogin: false,
        logout: false,
    },
    cart: {
        totalItems: 0,
    },
    
});
const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true
  window.addEventListener('click', handleClickOutside);
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside);
})
const toggleProfile = () => {
  showProfile.value = !showProfile.value;
};

const handleClickOutside = (event) => {
  if (dropdownContainer.value && !dropdownContainer.value.contains(event.target)) {
    showProfile.value = false;
  }
};
</script>