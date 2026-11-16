<script setup>
definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-versions",
});

useHead({
  title: "Plan Versions - ShopSynch Admin",
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <DashboardBillingTabs />

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h1 class="text-[2rem] font-[700] text-[#000]">Plan Versions</h1>
      <p class="mt-[0.4rem] text-slate-500">Plan and add-on versions, renewal policy, and cohort moves.</p>
      <p class="mt-[2.4rem] py-[3.2rem] text-center italic text-slate-400">Nothing to show yet.</p>
    </section>
  </div>
</template>
