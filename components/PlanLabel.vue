<script setup>
import { computed, onMounted } from "vue";
import { useAdminBillingPlansStore } from "~/stores/adminBillingPlans.store.js";

const props = defineProps({
  planId: {
    type: String,
    default: "",
  },
  periodUnitCount: {
    type: [Number, String],
    default: null,
  },
  periodDays: {
    type: [Number, String],
    default: null,
  },
  showCode: {
    type: Boolean,
    default: true,
  },
  badge: {
    type: Boolean,
    default: false,
  },
});

const plansStore = useAdminBillingPlansStore();

onMounted(async () => {
  if (!plansStore.plans.length && !plansStore.loading) {
    try {
      await plansStore.fetchPlans();
    } catch {
      // ignore
    }
  }
});

const matchedPlan = computed(() => {
  if (!props.planId) return null;
  return (plansStore.plans || []).find(
    (p) => p.id === props.planId || p.code === props.planId
  );
});

const planName = computed(() => {
  if (!props.planId) return "—";
  return matchedPlan.value?.name || props.planId;
});

const isCodeDifferent = computed(() => {
  if (!matchedPlan.value) return false;
  return matchedPlan.value.name !== props.planId;
});
</script>

<template>
  <div class="text-[1.3rem]">
    <div class="flex items-center gap-[0.6rem] flex-wrap">
      <span class="font-[700] text-slate-900 leading-snug">
        {{ planName }}
      </span>
      <span
        v-if="badge && matchedPlan?.status"
        class="rounded-full px-[0.7rem] py-[0.1rem] text-[1rem] font-[700] border"
        :class="matchedPlan.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
      >
        {{ matchedPlan.status }}
      </span>
    </div>

    <!-- Code / ID if different from display name -->
    <span
      v-if="showCode && props.planId && isCodeDifferent"
      class="block font-mono text-[1.15rem] text-slate-400 uppercase mt-[0.1rem]"
    >
      {{ props.planId }}
    </span>

    <!-- Period info if supplied -->
    <span
      v-if="periodUnitCount"
      class="block text-[1.15rem] text-slate-500 mt-[0.1rem]"
    >
      {{ periodUnitCount }} mo <span v-if="periodDays">({{ periodDays }}d)</span>
    </span>
  </div>
</template>
