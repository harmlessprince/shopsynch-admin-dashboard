<script setup>
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-merchants",
});

const adminMerchantsStore = useAdminMerchantsStore();
const router = useRouter();
const search = ref("");
const complianceReviewStatus = ref("");

const params = computed(() => ({
  search: search.value || undefined,
  complianceReviewStatus: complianceReviewStatus.value || undefined,
  page: 0,
  size: 20,
  sort: "createdAt,desc",
}));

async function fetchMerchants() {
  try {
    await adminMerchantsStore.fetchMerchants(params.value);
  } catch (err) {
    logger.error("Failed to load merchants", err);
  }
}

async function updateMerchantStatus(merchant) {
  try {
    await adminMerchantsStore.updateMerchantStatus(merchant.id, !merchant.status);
    await fetchMerchants();
  } catch (err) {
    logger.error("Failed to update merchant status", err);
  }
}

onMounted(fetchMerchants);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Merchants</h1>
          <p class="mt-[0.4rem]">All platform merchants: {{ adminMerchantsStore.total }}</p>
        </div>
        <div class="flex flex-col gap-[1rem] sm:flex-row">
          <input
            v-model="search"
            type="search"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Search merchants"
            @keyup.enter="fetchMerchants"
          />
          <select
            v-model="complianceReviewStatus"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="fetchMerchants"
          >
            <option value="">All compliance statuses</option>
            <option value="AWAITING_APPROVAL">Awaiting approval</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <button class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white" @click="fetchMerchants">
            Filter
          </button>
        </div>
      </div>
    </section>

    <div v-if="adminMerchantsStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ adminMerchantsStore.error }}
    </div>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <table class="w-full min-w-[92rem] text-left">
        <thead class="bg-slate-50 text-[1.2rem] uppercase text-[#616161]">
          <tr>
            <th class="px-[1.6rem] py-[1.2rem]">Merchant</th>
            <th class="px-[1.6rem] py-[1.2rem]">Owner</th>
            <th class="px-[1.6rem] py-[1.2rem]">Mode</th>
            <th class="px-[1.6rem] py-[1.2rem]">Compliance</th>
            <th class="px-[1.6rem] py-[1.2rem]">Status</th>
            <th class="px-[1.6rem] py-[1.2rem]"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="adminMerchantsStore.loading">
            <td colspan="6" class="px-[1.6rem] py-[2rem]">Loading merchants...</td>
          </tr>
          <tr
            v-for="merchant in adminMerchantsStore.merchants"
            :key="merchant.id"
            class="border-t border-slate-100"
          >
            <td class="px-[1.6rem] py-[1.4rem]">
              <p class="font-[700] text-[#000]">{{ merchant.businessTradingName || "Untitled merchant" }}</p>
              <p class="text-[1.2rem]">{{ merchant.code || merchant.slug }}</p>
            </td>
            <td class="px-[1.6rem] py-[1.4rem]">
              <p>{{ merchant.ownerFullName || "-" }}</p>
              <p class="text-[1.2rem]">{{ merchant.ownerEmail || "-" }}</p>
            </td>
            <td class="px-[1.6rem] py-[1.4rem]">{{ merchant.currentMode || "-" }}</td>
            <td class="px-[1.6rem] py-[1.4rem]">{{ merchant.complianceReviewStatus || "-" }}</td>
            <td class="px-[1.6rem] py-[1.4rem]">{{ merchant.status ? "Active" : "Inactive" }}</td>
            <td class="px-[1.6rem] py-[1.4rem]">
              <div class="flex items-center justify-end gap-[0.8rem]">
                <button class="font-[700] text-primary" @click="router.push(`/dashboard/merchants/${merchant.id}`)">
                  View
                </button>
                <button class="font-[700] text-primary" @click="updateMerchantStatus(merchant)">
                  {{ merchant.status ? "Deactivate" : "Activate" }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!adminMerchantsStore.loading && adminMerchantsStore.merchants.length === 0">
            <td colspan="6" class="px-[1.6rem] py-[2rem]">No merchants found.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
