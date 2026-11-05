<template>
  <div class="mb-[2.4rem] w-full bg-white rounded-[10px] border border-slate-200/80 shadow-sm overflow-hidden">
    <div class="flex items-center gap-x-[1.2rem] px-[2.4rem] pt-[1.8rem] pb-[1rem] border-b border-slate-100">
      <span class="material-symbols-outlined text-primary text-[2.4rem]">payments</span>
      <div>
        <h1 class="text-[1.8rem] font-[700] text-slate-900">Billing Management</h1>
        <p class="text-[1.25rem] text-slate-500">Subscription plans, price locks, attempts, payments, and overrides</p>
      </div>
    </div>
    <div class="flex items-end gap-x-[1rem] sm:gap-x-[2.4rem] px-[1.6rem] sm:px-[2.4rem] overflow-x-auto no-scrollbar">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.link"
        :to="tab.link"
        class="group relative py-[1.4rem] text-[1.4rem] font-[600] transition-colors whitespace-nowrap"
        :class="[
          isActive(tab.link)
            ? 'text-primary'
            : 'text-slate-500 hover:text-slate-900'
        ]"
      >
        <span>{{ tab.name }}</span>
        <div
          v-if="isActive(tab.link)"
          class="absolute bottom-0 left-0 h-[3px] w-full rounded-t-sm bg-primary"
        />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
const route = useRoute();

const tabs = [
  { name: "Plans", link: "/dashboard/billing/plans" },
  { name: "Operations & Overrides", link: "/dashboard/billing/operations" },
  { name: "Payment Attempts", link: "/dashboard/billing/payment-attempts" },
  { name: "Payments", link: "/dashboard/billing/payments" },
  { name: "Pricing Offers", link: "/dashboard/billing/offers" },
  { name: "Refunds", link: "/dashboard/billing/refunds" },
  { name: "Duplicate Payments", link: "/dashboard/billing/duplicate-payments" },
];

function isActive(link) {
  if (link === "/dashboard/billing/plans") {
    return route.path === "/dashboard/billing/plans" || route.path === "/dashboard/billing/plans/";
  }
  return route.path.startsWith(link);
}
</script>
