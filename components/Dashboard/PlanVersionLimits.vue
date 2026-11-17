<script setup>
import { computed } from "vue";
import { displayValue, humanizeKey } from "~/utils/planVersions.js";

const props = defineProps({
  limits: { type: Object, default: null },
});

const features = computed(() => props.limits?.featureEntitlements || []);
const usage = computed(() => Object.entries(props.limits?.usageLimits || {}));
const rules = computed(() => Object.entries(props.limits?.featureAccessRules || {}));
const api = computed(() => Object.entries(props.limits?.apiUsagePolicy || {}).filter(([, v]) => v !== null && v !== undefined));
</script>

<template>
  <div class="space-y-[1.6rem]">
    <section>
      <h5 class="mb-[0.6rem] text-[1.2rem] font-[700] uppercase tracking-wide text-slate-500">Features</h5>
      <div v-if="features.length" class="flex flex-wrap gap-[0.6rem]">
        <span v-for="feature in features" :key="feature" class="rounded-full bg-slate-100 px-[1rem] py-[0.3rem] text-[1.2rem] text-slate-700">{{ humanizeKey(feature) }}</span>
      </div>
      <p v-else class="text-slate-400">No features listed.</p>
    </section>
    <section>
      <h5 class="mb-[0.6rem] text-[1.2rem] font-[700] uppercase tracking-wide text-slate-500">Usage limits</h5>
      <ul v-if="usage.length" class="space-y-[0.2rem]">
        <li v-for="[key, value] in usage" :key="key" class="flex justify-between gap-[1.6rem]">
          <span class="text-slate-500">{{ humanizeKey(key) }}</span>
          <span class="font-[600] text-slate-900">{{ displayValue(value) }}</span>
        </li>
      </ul>
      <p v-else class="text-slate-400">No usage limits.</p>
    </section>
    <section v-if="rules.length">
      <h5 class="mb-[0.6rem] text-[1.2rem] font-[700] uppercase tracking-wide text-slate-500">Access levels</h5>
      <ul class="space-y-[0.2rem]">
        <li v-for="[key, value] in rules" :key="key" class="flex justify-between gap-[1.6rem]">
          <span class="text-slate-500">{{ humanizeKey(key) }}</span>
          <span class="font-[600] text-slate-900">{{ displayValue(value) }}</span>
        </li>
      </ul>
    </section>
    <section v-if="api.length">
      <h5 class="mb-[0.6rem] text-[1.2rem] font-[700] uppercase tracking-wide text-slate-500">API usage</h5>
      <ul class="space-y-[0.2rem]">
        <li v-for="[key, value] in api" :key="key" class="flex justify-between gap-[1.6rem]">
          <span class="text-slate-500">{{ humanizeKey(key) }}</span>
          <span class="font-[600] text-slate-900">{{ displayValue(value) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
