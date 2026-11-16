<script setup>
definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-addons",
});

useHead({
  title: "Add-on Catalogue - ShopSynch Admin",
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <DashboardBillingTabs />

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <h1 class="text-[2rem] font-[700] text-[#000]">Add-on Catalogue</h1>
      <p class="mt-[0.4rem] text-slate-500">Capacity add-on prices and versions.</p>
      <p class="mt-[2.4rem] py-[3.2rem] text-center italic text-slate-400">Nothing to show yet.</p>
    </section>
  </div>
</template>
