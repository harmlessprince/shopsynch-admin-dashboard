<script setup>
import { logger } from "~/utils/helpers.js";
definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-compliance",
});

const router = useRouter();
const adminComplianceStore = useAdminComplianceStore();

async function fetchQueue() {
  try {
    await adminComplianceStore.fetchComplianceQueue({
      page: 0,
      size: 20,
      sort: "updatedAt,desc",
    });
  } catch (err) {
    logger.error("Failed to load compliance queue", err);
  }
}

async function reviewCompliance(tenantId, status) {
  try {
    const reviewNote = status === "APPROVE"
      ? "All submitted documents are valid."
      : "Review started by compliance team.";
    await adminComplianceStore.reviewCompliance(tenantId, { action: status, reviewNote });
    await fetchQueue();
  } catch (err) {
    logger.error("Failed to review compliance", err);
  }
}

function openAudit(tenantId) {
  router.push({ name: "dashboard-compliance-detail", params: { tenantId } });
}

onMounted(fetchQueue);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h1 class="text-[2rem] font-[700] text-[#000]">Compliance queue</h1>
      <p class="mt-[0.4rem]">Merchants awaiting approval or currently under review.</p>
    </section>

    <div v-if="adminComplianceStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ adminComplianceStore.error }}
    </div>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <table class="w-full min-w-[76rem] text-left">
        <thead class="bg-slate-50 text-[1.2rem] uppercase text-[#616161]">
          <tr>
            <th class="px-[1.6rem] py-[1.2rem]">Merchant</th>
            <th class="px-[1.6rem] py-[1.2rem]">Owner</th>
            <th class="px-[1.6rem] py-[1.2rem]">Status</th>
            <th class="px-[1.6rem] py-[1.2rem]"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="adminComplianceStore.loading">
            <td colspan="4" class="px-[1.6rem] py-[2rem]">Loading queue...</td>
          </tr>
          <tr
            v-for="merchant in adminComplianceStore.queue"
            :key="merchant.id"
            class="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
            @click="openAudit(merchant.id)"
          >
            <td class="px-[1.6rem] py-[1.4rem]">
              <p class="font-[700] text-[#000]">{{ merchant.businessTradingName || "Untitled merchant" }}</p>
              <p class="text-[1.2rem]">{{ merchant.businessSupportEmailAddress || "-" }}</p>
            </td>
            <td class="px-[1.6rem] py-[1.4rem]">{{ merchant.ownerFullName || merchant.ownerEmail || "-" }}</td>
            <td class="px-[1.6rem] py-[1.4rem]">{{ merchant.complianceReviewStatus || "-" }}</td>
            <td class="px-[1.6rem] py-[1.4rem]">
              <div class="flex justify-end gap-[0.8rem]" @click.stop>
                <button class="font-[700] text-primary" @click="reviewCompliance(merchant.id, 'UNDER_REVIEW')">
                  Review
                </button>
                <button class="font-[700] text-green-700" @click="reviewCompliance(merchant.id, 'APPROVE')">
                  Approve
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!adminComplianceStore.loading && adminComplianceStore.queue.length === 0">
            <td colspan="4" class="px-[1.6rem] py-[2rem]">No merchants in the queue.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
