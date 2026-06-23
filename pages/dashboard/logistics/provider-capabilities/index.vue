<script setup>
import { logger } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";
import LogisticProviderCapabilityDrawer from "~/components/Dashboard/LogisticProviderCapabilityDrawer.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-logistics-provider-capabilities",
});

const logisticsStore = useAdminLogisticsStore();

const drawerOpen = ref(false);
const selectedCapability = ref(null);

const tableHeader = [
  { title: "Provider", accessor: "provider" },
  { title: "Status", accessor: "active" },
  { title: "Pickup from merchant", accessor: "supportsMerchantPickup" },
  { title: "Drop-off required", accessor: "requiresDropOffLocation" },
  { title: "Doorstep", accessor: "supportsDoorstepDelivery" },
  { title: "Interstate", accessor: "supportsInterstateDelivery" },
  { title: "International", accessor: "supportsInternationalDelivery" },
  { title: "Coverage", accessor: "coverageType" },
  { title: "Countries", accessor: "supportedCountries" },
  { title: "States", accessor: "supportedStates" },
  { title: "Action", accessor: "_action" },
];

function openEdit(capability) {
  selectedCapability.value = capability;
  drawerOpen.value = true;
}

function onSaved() {
  drawerOpen.value = false;
}

onMounted(async () => {
  try {
    await logisticsStore.fetchProviderCapabilities();
  } catch (err) {
    logger.error("Failed to load provider capabilities", err);
  }
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h1 class="text-[2rem] font-[700] text-[#000]">Provider Capabilities</h1>
      <p class="mt-[0.4rem]">Configure how each logistics provider operates on the platform.</p>
    </section>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <DataTable
        :table-header="tableHeader"
        :table-data="logisticsStore.providerCapabilities"
        :loading="logisticsStore.capabilitiesLoading"
      >
        <template #cell(provider)="{ row }">
          <span class="rounded-full bg-[#D0E8FF] px-[1rem] py-[0.3rem] text-[1.2rem] font-[600] text-[#0066CC]">
            {{ row.provider }}
          </span>
        </template>

        <template #cell(active)="{ row }">
          <span
            :class="row.active ? 'bg-[#B5F9B4] text-[#3CA745]' : 'bg-[#FFBFBF] text-[#FF3131]'"
            class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[500]"
          >
            {{ row.active ? "Active" : "Inactive" }}
          </span>
        </template>

        <template #cell(supportsMerchantPickup)="{ row }">
          <span :class="row.supportsMerchantPickup ? 'text-[#3CA745]' : 'text-[#FF3131]'" class="font-[600]">
            {{ row.supportsMerchantPickup ? "Yes" : "No" }}
          </span>
        </template>

        <template #cell(requiresDropOffLocation)="{ row }">
          <span :class="row.requiresDropOffLocation ? 'text-[#3CA745]' : 'text-gray-400'" class="font-[600]">
            {{ row.requiresDropOffLocation ? "Yes" : "No" }}
          </span>
        </template>

        <template #cell(supportsDoorstepDelivery)="{ row }">
          <span :class="row.supportsDoorstepDelivery ? 'text-[#3CA745]' : 'text-gray-400'" class="font-[600]">
            {{ row.supportsDoorstepDelivery ? "Yes" : "No" }}
          </span>
        </template>

        <template #cell(supportsInterstateDelivery)="{ row }">
          <span :class="row.supportsInterstateDelivery ? 'text-[#3CA745]' : 'text-gray-400'" class="font-[600]">
            {{ row.supportsInterstateDelivery ? "Yes" : "No" }}
          </span>
        </template>

        <template #cell(supportsInternationalDelivery)="{ row }">
          <span :class="row.supportsInternationalDelivery ? 'text-[#3CA745]' : 'text-gray-400'" class="font-[600]">
            {{ row.supportsInternationalDelivery ? "Yes" : "No" }}
          </span>
        </template>

        <template #cell(coverageType)="{ row }">
          <span class="rounded-full bg-slate-100 px-[1rem] py-[0.3rem] text-[1.2rem] font-[500] text-slate-700">
            {{ row.coverageType?.replace(/_/g, " ") || "—" }}
          </span>
        </template>

        <template #cell(supportedCountries)="{ row }">
          <span v-if="row.supportedCountries?.length" class="text-[1.2rem]">
            {{ row.supportedCountries.join(", ") }}
          </span>
          <span v-else class="text-gray-400">—</span>
        </template>

        <template #cell(supportedStates)="{ row }">
          <span v-if="row.supportedStates?.length" class="text-[1.2rem]">
            {{ row.supportedStates.join(", ") }}
          </span>
          <span v-else class="text-gray-400">—</span>
        </template>

        <template #cell(_action)="{ row }">
          <button
            class="rounded-[6px] bg-primary px-[1rem] py-[0.5rem] text-[1.2rem] font-[600] text-white hover:opacity-90"
            @click="openEdit(row)"
          >
            Edit
          </button>
        </template>
      </DataTable>
    </section>

    <LogisticProviderCapabilityDrawer
      :open="drawerOpen"
      :capability="selectedCapability"
      @update:open="drawerOpen = $event"
      @saved="onSaved"
    />
  </div>
</template>
