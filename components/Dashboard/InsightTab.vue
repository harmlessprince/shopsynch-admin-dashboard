<template>
    <div class="">
        <!-- Mobile Tab Title -->
        <div class="lg:hidden flex items-center gap-x-[1.2rem] mb-[2.4rem] px-[2rem]">
            <span class="material-symbols-outlined text-primary text-[2.4rem]">insights</span>
            <h1 class="text-[2.4rem] font-[700] text-primary">Insights</h1>
        </div>

        <div
            class="flex flex-col lg:flex-row items-start lg:items-end gap-y-[1.2rem] lg:gap-x-[4rem] border-b-0 lg:border-b border-[#E0E0E0] mb-[2.4rem] w-full bg-white lg:h-[60px] lg:px-[40px] overflow-x-auto no-scrollbar">
            <template v-for="tab in tabs" :key="tab.name">
                <!-- Clickable Link -->
                <NuxtLink v-if="!tab.comingSoon || isDevelopment" :to="tab.link"
                    class="group py-[1.6rem] lg:py-0 lg:h-full text-[1.8rem] lg:text-[1.6rem] font-[500] transition-all duration-200 relative w-full lg:w-auto px-[2rem] lg:px-[1.5rem] flex items-center gap-x-2 whitespace-nowrap"
                    :class="[
                        isActive(tab.link)
                            ? 'text-primary'
                            : 'text-[#616161] hover:text-[#000]'
                    ]">
                    {{ tab.name }}
                    <span v-if="tab.comingSoon"
                        class=" px-2 py-0.5 bg-gray-100 text-[#64748B] text-[1rem] rounded-full font-bold uppercase tracking-wider">Soon</span>
                    <div v-if="isActive(tab.link)"
                        class="hidden lg:block absolute bottom-0 left-0 w-full h-[3px] bg-primary"></div>

                    <div v-if="isActive(tab.link)"
                        class="lg:hidden absolute left-0 top-1/4 bottom-1/4 w-[4px] bg-primary rounded-r"></div>
                </NuxtLink>

                <!-- Unclickable Span -->
                <div v-else
                    class="py-[1.6rem] lg:py-0 lg:h-full text-[1.8rem] lg:text-[1.6rem] font-[400] relative w-full lg:w-auto px-[2rem] lg:px-[1.5rem] flex items-center gap-x-2 cursor-not-allowed opacity-50 whitespace-nowrap text-[#616161]">
                    {{ tab.name }}
                    <span
                        class=" px-2 py-0.5 bg-gray-100 text-[#64748B] text-[1rem] rounded-full font-bold uppercase tracking-wider">Soon</span>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
const route = useRoute()
const config = useRuntimeConfig()
const defaultTab = ref('customer')
const isDevelopment = computed(() => config.public.appEnv === 'development')

const tabs = [
    { name: 'Customer', link: '/dashboard/insights/customer' },
    { name: 'Product', link: '/dashboard/insights/product', comingSoon: true },
    { name: 'Inventory', link: '/dashboard/insights/inventory', comingSoon: true  },
    { name: 'Revenue', link: '/dashboard/insights/revenue', comingSoon: true  },
    { name: 'Orders', link: '/dashboard/insights/orders' },
    { name: 'Trending & Visuals', link: '/dashboard/insights/trending', comingSoon: true  },
]

const isActive = (link) => {
    if (link === defaultTab.value) {
        return route.path.includes('/dashboard/insights/customer') ||
            route.path.includes('/dashboard/insights/product') ||
            route.path.includes('/dashboard/insights/inventory') ||
            route.path.includes('/dashboard/insights/revenue') ||   
            route.path.includes('/dashboard/insights/orders') ||
            route.path.includes('/dashboard/insights/trending');
    }

    if (link.includes('/dashboard/insights/product')) {
        return route.path.includes('/dashboard/insights/product');
    }

    if (link === '/dashboard/insights/inventory') {
        return route.path.includes('/dashboard/insights/inventory');
    }

    if (link === '/dashboard/insights/orders') {
        return route.path.includes('/dashboard/insights/orders');
    }

    if (link === '/dashboard/insights/trending') {
        return route.path.includes('/dashboard/insights/trending');
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
    -ms-overflow-style: none;
    /* IE and Edge */
    scrollbar-width: none;
    /* Firefox */
}
</style>
