<template>

    <footer class="bg-primary text-white py-12  border-primary/30 mt-4">
    <div class="mx-auto px-6 py-12 container">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

        <!-- Logo -->
        <div class="flex flex-col gap-4">
          <a :href="'https://' + storeConfig.businessDomain + '.shopsynch.com'" class="flex items-center gap-3">
            <span class="text-white font-satoshi font-black text-lg">{{ storeConfig.businessName }}</span>
          </a>
          <!-- Social -->
          <div class="flex items-center gap-4 text-white">
            <a href="#" class=" hover:text-accent transition-colors duration-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            </a>
            <a href="#" class=" hover:text-accent transition-colors duration-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="#" class=" hover:text-accent transition-colors duration-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="#" class=" hover:text-accent transition-colors duration-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </a>
          </div>
        </div>

        <!-- Contact -->
        <div class="text-right text-white">
          <p class=" font-satoshi font-medium text-sm">{{ storeConfig.businessPhone }}</p>
          <p class="font-satoshi text-sm mt-1">{{ storeConfig.businessEmail }}</p>
        </div>
      </div>

      <div class="border-t border-white/20 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
        <p class=" font-satoshi text-xs">© 2025 {{ storeConfig.businessName }}. All rights reserved.</p>
        <p class="text-white font-satoshi text-xs flex items-center gap-1">
          Powered by <a href="https://shopsynch.com" target="_blank" class="text-accent hover:underline font-bold">ShopSynch</a>
        </p>
      </div>
    </div>
  </footer>
</template>
<script setup>
const storeConfig = ref({
    businessName: "ShopSynch",
    businessDomain: 'shopsynch',
    businessEmail: "example@gmail.com",
    businessPhone: "+234 813 345 678",
    businessAddress: "123 Main St, Lagos, Nigeria",
    businessLogo: "/logo.png",
    businessFavicon: "/favicon.ico",
    businessSocialLinks: {
        facebook: "https://facebook.com/shopsynch",
        twitter: "https://twitter.com/shopsynch",
        instagram: "https://instagram.com/shopsynch",
        linkedin: "https://linkedin.com/shopsynch",
    },
});
</script>