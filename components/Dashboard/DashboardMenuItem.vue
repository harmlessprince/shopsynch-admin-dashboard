<script setup>
import {ref} from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  activeIcon: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: false,
    default: '#',
  },
  pathName: {
    type: String,
    required: false,
    default: null,
  },
  comingSoon: {
    type: Boolean,
    default: false,
  },
})

const route = useRoute()

const hoveringLink = ref(false)

// Determine the target for NuxtLink based on whether pathName or link is provided
const destination = computed(() => {
  return props.pathName ? { name: props.pathName } : props.link
})
const isMaterialIcon = (iconStr) => {
  return !iconStr.includes('/') && !iconStr.includes('.');
}

const isActive = computed(() => {

  if (props.pathName && route.name === props.pathName) {
    return true
  }

  if (props.pathName === 'dashboard-products' && route.path.startsWith('/dashboard/product')) {
    return true
  }

 if (props.link) {
    // Base dashboard match (Exact)
    if (props.link === '/dashboard') {
      return route.path === props.link
    }
    // Specific partial matches
    if (props.link.includes('general-settings') || props.link.includes('product')) {
      return route.path.includes(props.link.split('/').pop()) // cleaner check
    }
    // Fallback
    return route.path.startsWith(props.link)
  }

  // Fallback to startsWith for other routes
  return false
})

const config = useRuntimeConfig();
const isProduction = computed(() => config.public.appEnv === 'production')
const showComingSoon = computed(() => props.comingSoon && isProduction.value)
// Determine which icon to show based on state
const currentIcon = computed(() => {
  return (isActive.value || hoveringLink.value) ? props.activeIcon : props.icon
})
</script>

<template>
  <div>
    <!-- Normal clickable link (dev, staging, or prod & not comingSoon) -->
    <NuxtLink
        v-if="!showComingSoon"
        :to="destination"
        class="linkContainer hover:bg-[#fff] hover:font-[700] hover:text-[#003366] font-[400] text-[#fff] flex flex-row gap-x-[12px] px-[16px] py-[12px] rounded-[10px] box-border justify-start"
        :class="[isActive ? 'bg-[#fff] text-[#003366] font-[700]' : '']"
        @mouseover="hoveringLink = true"
        @mouseout="hoveringLink = false"
    >
      <template v-if="isMaterialIcon(currentIcon)">
        <span 
          class="material-symbols-outlined w-[24px] h-[24px] flex items-center justify-center text-[24px] transition-all"
          :class="[
              isActive ? 'text-[#003366]' : 'text-white'
          ]"
        >
          {{ currentIcon }}
        </span>
      </template>
      <template v-else>
        <img v-if="isActive" :src="activeIcon" alt="ShopSynch link icons" class="w-[24px] h-[24px] linkChild">
        <img v-else :src="hoveringLink ? activeIcon : icon" alt="ShopSynch link icons"
            class="w-[24px] h-[24px] linkChild">
      </template>

      <span
          :class="['text-[16px] leading-[22px] linkChild', isActive ? 'text-[#003366]' : '']"
      >
      {{ props.name }}
    </span>
    </NuxtLink>
    <!-- Coming Soon (only in production & comingSoon=true) -->
    <div
        v-else
        class="linkContainer opacity-50 cursor-not-allowed font-[400] text-[#fff] flex flex-row gap-x-[12px] px-[16px] py-[12px] rounded-[10px] box-border justify-start"
    >
      <span v-if="isMaterialIcon(props.icon)" class="material-symbols-outlined text-[24px]">
        {{ props.icon }}
      </span>
      <img v-else :src="icon" alt="Coming Soon icon" class="w-[24px] h-[24px] linkChild"/>
      <span class="text-[16px] leading-[22px] linkChild">
        {{ props.name }}
      </span>
      <span
          class="bg-yellow-400 text-[#000] text-[10px] font-bold px-[6px] py-[2px] rounded-full flex items-center"
      >
        Soon
      </span>
    </div>
  </div>

</template>

<style scoped>
.linkContainer:hover .linkChild {
  color: "#003366"
}
.filled-icon {
  font-variation-settings: 'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24;
}
.material-symbols-outlined {

  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>

 
