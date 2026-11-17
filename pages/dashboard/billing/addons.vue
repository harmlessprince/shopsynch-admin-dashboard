<script setup>
import { ref, onMounted } from "vue";
import { capacityAddOnTypes } from "~/schemas/capacityAddOnAdmin.schema";
import { useAdminCapacityAddOnsStore } from "~/stores/adminCapacityAddOns.store.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-addons",
});

useHead({
  title: "Add-on Catalogue - ShopSynch Admin",
});

const store = useAdminCapacityAddOnsStore();
const drawerOpen = ref(false);
const activeType = ref("");

function manage(type) {
  activeType.value = type;
  drawerOpen.value = true;
}

onMounted(() => store.fetchAll());
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <DashboardBillingTabs />

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.6rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Add-on Catalogue</h1>
          <p class="mt-[0.4rem] max-w-[80rem] text-[#616161]">
            Prices and per-plan limits for each capacity add-on, kept as versions. Publishing a new version changes the
            price for new purchases only; merchants who already hold the add-on keep the version they bought.
          </p>
        </div>
        <BaseButton radius="8px" variant="outline" :loading="store.loading" @click="store.fetchAll()">Reload</BaseButton>
      </div>
    </section>

    <p v-if="store.loadError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.loadError }}</p>

    <div class="grid grid-cols-1 gap-[1.6rem] lg:grid-cols-3">
      <DashboardAddOnTypeCard
        v-for="type in capacityAddOnTypes"
        :key="type"
        :type="type"
        :versions="store.versionsByType[type]"
        :loading="store.loading"
        @manage="manage"
      />
    </div>

    <DashboardAddOnVersionsDrawer v-model:open="drawerOpen" :type="activeType" />
  </div>
</template>
