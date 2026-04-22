<template>
  <div class="">
    <!-- Mobile Tab Title -->
    <div class="lg:hidden flex items-center gap-x-[1.2rem] mb-[2.4rem] px-[2rem]">
       <span class="material-symbols-outlined text-primary text-[2.4rem]">settings</span>
       <h1 class="text-[2.4rem] font-[700] text-primary">General Settings</h1>
    </div>

    <div class="flex flex-col lg:flex-row items-start lg:items-end gap-y-[1.2rem] lg:gap-x-[4rem] border-b-0 lg:border-b border-[#E0E0E0] mb-[2.4rem] w-full bg-white lg:h-[60px] lg:px-[40px] overflow-x-auto no-scrollbar">
      <template v-for="tab in tabs" :key="tab.name">
        <!-- Clickable Link -->
        <NuxtLink
            v-if="!tab.comingSoon || isDevelopment"
            :to="tab.link"
            class="group py-[1.6rem] lg:py-0 lg:h-full text-[1.8rem] lg:text-[1.6rem] font-[500] transition-all duration-200 relative w-full lg:w-auto px-[2rem] lg:px-[1.5rem] flex items-center gap-x-2 whitespace-nowrap"
            :class="[
              isActive(tab.link) 
                ? 'text-primary' 
                : 'text-[#616161] hover:text-[#000]'
            ]"
        >
          {{ tab.name }}
          <span v-if="tab.comingSoon" class=" px-2 py-0.5 bg-gray-100 text-[#64748B] text-[1rem] rounded-full font-bold uppercase tracking-wider">Soon</span>
          <div 
            v-if="isActive(tab.link)" 
            class="hidden lg:block absolute bottom-0 left-0 w-full h-[3px] bg-primary"
          ></div>

          <div 
            v-if="isActive(tab.link)" 
            class="lg:hidden absolute left-0 top-1/4 bottom-1/4 w-[4px] bg-primary rounded-r"
          ></div>
        </NuxtLink>

        <!-- Unclickable Span -->
        <div
            v-else
            class="py-[1.6rem] lg:py-0 lg:h-full text-[1.8rem] lg:text-[1.6rem] font-[400] relative w-full lg:w-auto px-[2rem] lg:px-[1.5rem] flex items-center gap-x-2 cursor-not-allowed opacity-50 whitespace-nowrap text-[#616161]"
        >
          {{ tab.name }}
          <span class=" px-2 py-0.5 bg-gray-100 text-[#64748B] text-[1rem] rounded-full font-bold uppercase tracking-wider">Soon</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const config = useRuntimeConfig()

const isDevelopment = computed(() => config.public.appEnv === 'development')

const tabs = [
  { name: 'Profile', link: '/dashboard/general-settings/profile' },
  { name: 'Compliance', link: '/dashboard/general-settings/compliance' },
  { name: 'API Keys', link: '/dashboard/general-settings/api-keys' },
  { name: 'Store settings', link: '/dashboard/general-settings/store-settings' },
  { name: 'Integration Settings', link: '/dashboard/general-settings/app-settings' },
  { name: 'Email settings', link: '/dashboard/general-settings/email/verification', comingSoon: true },
  { name: 'Team Members', link: '/dashboard/general-settings/team-members' },
  { name: 'Roles', link: '/dashboard/general-settings/roles' },
]

const isActive = (link) => {
  if (link === '/dashboard/general-settings/profile') {
    return route.path.includes('/dashboard/general-settings/profile') || 
           route.path.includes('/dashboard/general-settings/business_details') ||
           route.path.includes('/dashboard/general-settings/change_login_password') ||
           route.path.includes('/dashboard/general-settings/change_withdrawal_pin');
  }
  
  if (link.includes('/dashboard/general-settings/email')) {
    return route.path.includes('/dashboard/general-settings/email');
  }

  if (link === '/dashboard/general-settings/store-settings') {
    return route.path.includes('/dashboard/general-settings/store-settings');
  }

  if (link === '/dashboard/general-settings/app-settings') {
    return route.path.includes('/dashboard/general-settings/app-settings');
  }

  if (link === '/dashboard/general-settings/roles') {
    return route.path.includes('/dashboard/general-settings/roles');
  }

  return route.path === link;
}
</script>

<style scoped>
/* Custom primary colors based on your screenshot */
.text-primary {
  color: #003366;
}
.bg-primary {
  background-color: #003366;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
