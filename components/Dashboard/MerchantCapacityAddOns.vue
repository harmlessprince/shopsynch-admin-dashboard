<script setup>
defineProps({
  tenantId: { type: String, required: true },
});
</script>

<template>
  <div class="mt-[2.4rem] overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm">
    <div class="flex items-center gap-[1rem] border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
      <span class="material-symbols-outlined text-primary">add_circle</span>
      <h2 class="text-[1.6rem] font-[700] text-[#000]">Capacity Add-ons</h2>
    </div>
    <p class="p-[1.6rem] italic text-slate-400">No add-on information loaded yet.</p>
  </div>
</template>
