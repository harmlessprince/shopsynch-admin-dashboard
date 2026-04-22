<script setup>
import { ref, watch } from "vue";
import { ModalsContainer } from "vue-final-modal";

const authStore = useAuthStore();
const openLogoutModal = ref(false);
const openDropdown = ref(false);
const dropdownRef = ref(null);
const route = useRoute();
const currentPageTitle = ref("");
const isSidebarOpen = ref(false);

useClickOutside(dropdownRef, () => {
  openDropdown.value = false;
});

watch(
  () => route.fullPath,
  (newPath, _oldPath) => {
    isSidebarOpen.value = false; // Close sidebar on route change
    if (newPath == "/dashboard") {
      currentPageTitle.value = "Dashboard";
      return;
    }

    if (newPath.includes("/dashboard/merchants")) {
      currentPageTitle.value = "Merchants";
    } else if (newPath.includes("/dashboard/compliance")) {
      currentPageTitle.value = "Compliance";
    } else if (newPath.includes("/dashboard/users")) {
      currentPageTitle.value = "Users";
    } else if (newPath.includes("/dashboard/settings")) {
      currentPageTitle.value = "Settings";
    } else if (newPath.includes("/dashboard/cache")) {
      currentPageTitle.value = "Cache";
    }
  },
  { immediate: true },
);

const dashboardSidebarMenu = [
  {
    key: "Overview",
    name: "Overview",
    icon: "/icons/overview.svg",
    activeIcon: "/icons/overview_bold.svg",
    link: "/dashboard",
    comingSoon: false,
  },
  {
    key: "merchants",
    name: "Merchants",
    icon: "storefront",
    activeIcon: "storefront",
    link: "/dashboard/merchants",
    comingSoon: false,
  },
  {
    key: "compliance",
    name: "Compliance",
    icon: "verified_user",
    activeIcon: "verified_user",
    link: "/dashboard/compliance",
    comingSoon: false,
  },
  {
    key: "users",
    name: "Users",
    icon: "group",
    activeIcon: "group",
    link: "/dashboard/users",
    comingSoon: false,
  },
  {
    key: "settings",
    name: "Settings",
    icon: "settings",
    activeIcon: "settings",
    link: "/dashboard/settings",
    comingSoon: false,
  },
  {
    key: "cache",
    name: "Cache",
    icon: "cached",
    activeIcon: "cached",
    link: "/dashboard/cache",
    comingSoon: false,
  },
];
</script>
<template>
  <main class="h-screen overflow-x-hidden bg-[#EDEFF2]">
    <ModalsContainer />

    <!-- Mobile Header -->
    <header
      class="lg:hidden fixed top-0 left-0 w-full bg-[#fff] z-[60] flex items-center justify-between px-[2.4rem] h-[64px] border-b border-[#EDEFF2]"
    >
      <img
        src="/logos/dashboard-logo.png"
        class="w-[140px] h-[20px]"
        alt="ShopSynch logo"
      />
      <button @click="isSidebarOpen = true" class="p-2">
        <span class="material-symbols-outlined text-[#292D32]">menu</span>
      </button>
    </header>

    <!-- Sidebar Backdrop -->
    <div
      v-if="isSidebarOpen"
      class="lg:hidden fixed inset-0 bg-black/50 z-[90]"
      @click="isSidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <div
      class="z-[100] fixed h-screen w-[var(--sidebar-width)] bg-primary p-[40px] box-border transition-transform duration-300 transform"
      :class="
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      "
    >
      <div class="flex items-center justify-between lg:block mb-[32px]">
        <img
          src="/logos/dashboard-logo.png"
          class="w-[200px] h-[29px]"
          alt="ShopSynch logo for e-commerce backend api service"
        />
        <button
          @click="isSidebarOpen = false"
          class="lg:hidden p-2 text-white/70"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="grid grid-col-1 gap-y-[16px]">
        <DashboardMenuItem
          v-for="link in dashboardSidebarMenu"
          :key="link.key"
          :name="link.name"
          :icon="link.icon"
          :active-icon="link.activeIcon"
          :path-name="link.pathName"
          :link="link.link"
          :coming-soon="link.comingSoon"
        />
      </div>
    </div>

    <!-- Main Content Wrapper -->
    <div class="flex flex-col min-h-screen lg:pl-[var(--sidebar-width)]">
      <!-- horizontal header -->
      <header
        class="sticky top-[64px] lg:top-0 w-full bg-[#fff] p-[24px] border-b-2 h-auto lg:h-[114px] z-[50]"
        :class="{
          'border-primary': true,
        }"
      >
        <DashboardContainer>
          <div class="flex items-center flex-row justify-between">
            <div class="leading-[22.5px] w-auto lg:w-[190px]">
              <div v-if="currentPageTitle === 'Dashboard'">
                <p
                  class="hidden lg:block font-[400] text-[14px] text-[#616161]"
                >
                  Welcome back {{ authStore.user.fullName }}
                </p>
                <p class="text-[#000] font-[700] text-[16px] lg:text-[19px]">
                  Overview
                </p>
              </div>
              <div v-else>
                <p class="text-[#000] font-[700] text-[16px] lg:text-[19px]">
                  {{ currentPageTitle }}
                </p>
              </div>
            </div>

            <div class="flex gap-x-[12px] lg:gap-x-[24px] items-center">
              <div class="hidden md:block leading-[22.5px]">
                <p class="text-[#000] font-[700] text-[14px] lg:text-[19px]">
                  Admin
                </p>
                <client-only>
                  <p
                    v-if="authStore?.user"
                    class="font-[400] text-[12px] lg:text-[14px] text-[#616161] truncate max-w-[150px]"
                  >
                    {{ authStore?.user?.email }}
                  </p>
                </client-only>
              </div>
              <!-- the css for the dropdown button is majorly in styles below -->
              <div ref="dropdownRef" class="dropdown">
                <div
                  class="dropbtn cursor-pointer w-[32px] h-[32px] lg:w-[40px] lg:h-[40px] flex items-center justify-center rounded-[10px] bg-[#EDEFF2] hover:bg-slate-200 transition-all"
                  @click.stop="openDropdown = !openDropdown"
                >
                  <span class="material-symbols-outlined text-[#292D32]"
                    >keyboard_arrow_down</span
                  >
                </div>
                <div
                  :class="[
                    'dropdown-content text-[1.4rem] lg:text-[1.6rem] flex flex-col gap-y-[1rem]',
                    openDropdown ? 'block' : 'hidden',
                  ]"
                >
                  <div
                    class="flex justify-between cursor-pointer hover:bg-[#fff] p-[1.5rem] rounded-[10px]"
                    @click.stop="openLogoutModal = !openLogoutModal"
                  >
                    <span class="material-symbols-outlined text-[#FF0000]"
                      >Logout</span
                    >
                    <span>Logout</span>
                  </div>
                </div>
                <ModalsLogout
                  v-show="openLogoutModal"
                  v-model="openLogoutModal"
                />
              </div>
            </div>
          </div>
        </DashboardContainer>
      </header>

      <!-- Page Content -->
      <section class="flex-1 text-[#000]">
        <DashboardPage
          :fluid="route.meta.fluid"
          :no-padding="route.meta.noPadding"
        >
          <NuxtPage />
        </DashboardPage>
      </section>
    </div>
  </main>
</template>

<style scoped>
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-content {
  position: absolute;
  background-color: #f1f1f1;
  min-width: 120px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  z-index: 100;
  right: 0;
  color: red;
  text-decoration: none;
  border-radius: 10px;
}

.dropdown:hover .dropbtn {
  background-color: #fff;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
