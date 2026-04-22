<script setup>
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-merchant-detail",
});

const route = useRoute();
const adminMerchantsStore = useAdminMerchantsStore();

async function fetchMerchant() {
  try {
    await adminMerchantsStore.fetchMerchantDetail(route.params.tenantId);
  } catch (err) {
    logger.error("Failed to load merchant detail", err);
  }
}

onMounted(fetchMerchant);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <NuxtLink to="/dashboard/merchants" class="inline-flex items-center gap-[0.6rem] font-[700] text-primary">
      <span class="material-symbols-outlined text-[1.8rem]">arrow_back</span>
      Merchants
    </NuxtLink>

    <div v-if="adminMerchantsStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ adminMerchantsStore.error }}
    </div>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <p v-if="adminMerchantsStore.detailLoading">Loading merchant...</p>
      <template v-else-if="adminMerchantsStore.merchant">
        <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-start md:justify-between">
          <div>
            <h1 class="text-[2.4rem] font-[700] text-[#000]">{{ adminMerchantsStore.merchant.businessTradingName || "Untitled merchant" }}</h1>
            <p class="mt-[0.4rem]">{{ adminMerchantsStore.merchant.businessSupportEmailAddress || adminMerchantsStore.merchant.owner?.email || "-" }}</p>
          </div>
          <div class="rounded-[8px] bg-primary/10 px-[1.4rem] py-[0.8rem] font-[700] text-primary">
            {{ adminMerchantsStore.merchant.complianceReviewStatus || "UNKNOWN" }}
          </div>
        </div>

        <div class="mt-[2rem] grid grid-cols-1 gap-[1.2rem] md:grid-cols-3">
          <div class="rounded-[8px] border border-slate-100 p-[1.4rem]">
            <p class="text-[#616161]">Mode</p>
            <p class="mt-[0.4rem] font-[700] text-[#000]">{{ adminMerchantsStore.merchant.currentMode || "-" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.4rem]">
            <p class="text-[#616161]">Account status</p>
            <p class="mt-[0.4rem] font-[700] text-[#000]">{{ adminMerchantsStore.merchant.status ? "Active" : "Inactive" }}</p>
          </div>
          <div class="rounded-[8px] border border-slate-100 p-[1.4rem]">
            <p class="text-[#616161]">Live mode access</p>
            <p class="mt-[0.4rem] font-[700] text-[#000]">{{ adminMerchantsStore.merchant.canOperateInLiveMode ? "Allowed" : "Blocked" }}</p>
          </div>
        </div>
      </template>
      <p v-else>No merchant found.</p>
    </section>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h2 class="text-[1.8rem] font-[700] text-[#000]">Payment gateway secrets</h2>
      <div class="mt-[1.6rem] space-y-[1rem]">
        <div
          v-for="secret in adminMerchantsStore.paymentSecrets"
          :key="secret.id"
          class="flex flex-col gap-[0.6rem] rounded-[8px] border border-slate-100 p-[1.4rem] sm:flex-row sm:items-center sm:justify-between"
        >
          <span class="font-[700] text-[#000]">{{ secret.gateway }}</span>
          <span>Live: {{ secret.hasLiveSecret ? "Configured" : "Missing" }}</span>
          <span>Test: {{ secret.hasTestSecret ? "Configured" : "Missing" }}</span>
        </div>
        <p v-if="!adminMerchantsStore.detailLoading && adminMerchantsStore.paymentSecrets.length === 0">No payment secret metadata available.</p>
      </div>
    </section>
  </div>
</template>
