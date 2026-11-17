<script setup>
import LimitExplanation from "./MerchantAddOns/LimitExplanation.vue";
import AddOnRow from "./MerchantAddOns/AddOnRow.vue";
import AbuseSignals from "./MerchantAddOns/AbuseSignals.vue";
import ReasonModal from "./MerchantAddOns/ReasonModal.vue";

const props = defineProps({
  tenantId: { type: String, required: true },
});

const store = useAdminMerchantAddOnsStore();

// null | { mode: "grant" } | { mode: "revoke", addOn }
const modal = ref(null);

watch(() => props.tenantId, (id) => store.fetchAll(id), { immediate: true });
</script>

<template>
  <div class="mt-[2.4rem] overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm">
    <div class="flex items-center gap-[1rem] border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
      <span class="material-symbols-outlined text-primary">add_circle</span>
      <h2 class="text-[1.6rem] font-[700] text-[#000]">Capacity Add-ons</h2>
      <BaseButton class="ml-auto" size="sm" radius="8px" @click="modal = { mode: 'grant' }">Grant add-on</BaseButton>
    </div>

    <div class="space-y-[2.4rem] p-[2rem] text-[1.4rem]">
      <p v-if="!store.featureEnabled" class="rounded-[8px] bg-[#FFE4C2] p-[1.2rem] font-[600] text-[#9A4A00]" role="status">
        Capacity add-ons are switched off for this merchant. Existing add-ons are listed below but do not change what the merchant can use.
      </p>

      <section>
        <h3 class="mb-[1rem] text-[1.5rem] font-[700] text-slate-900">Effective limits</h3>
        <p v-if="store.explanationLoading && !store.explanation" class="text-slate-400">Loading limits...</p>
        <p v-else-if="store.explanationError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.explanationError }}</p>
        <LimitExplanation v-else-if="store.explanation" :explanation="store.explanation" />
      </section>

      <section>
        <h3 class="mb-[1rem] text-[1.5rem] font-[700] text-slate-900">Add-ons</h3>
        <p v-if="store.loading && !store.addOns.length" class="text-slate-400">Loading add-ons...</p>
        <p v-else-if="store.error" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.error }}</p>
        <p v-else-if="!store.addOns.length" class="italic text-slate-400">This merchant has no add-ons.</p>
        <ul v-else class="space-y-[1rem]">
          <AddOnRow v-for="addOn in store.addOns" :key="addOn.id" :add-on="addOn" @revoke="(a) => (modal = { mode: 'revoke', addOn: a })" />
        </ul>
      </section>

      <section>
        <h3 class="mb-[1rem] text-[1.5rem] font-[700] text-slate-900">Abuse signals</h3>
        <p v-if="store.signalsLoading && !store.signals" class="text-slate-400">Loading signals...</p>
        <p v-else-if="store.signalsError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">{{ store.signalsError }}</p>
        <AbuseSignals v-else-if="store.signals" :signals="store.signals" />
      </section>
    </div>

    <ReasonModal v-if="modal" :mode="modal.mode" :add-on="modal.addOn" @close="modal = null" />
  </div>
</template>
