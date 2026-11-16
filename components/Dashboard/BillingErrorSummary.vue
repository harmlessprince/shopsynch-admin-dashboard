<script setup>
import { readableError } from "~/utils/billingAdminWrite.js";

// Lists API refusals that no visible field shows, so a failed submit always says why.
defineProps({
  errors: { type: Array, default: () => [] },
  title: { type: String, default: "This could not be saved" },
  hint: { type: String, default: "" },
});
</script>

<template>
  <div v-if="errors.length" data-form-error tabindex="-1" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] text-[#B42318]" role="alert">
    <p class="font-[700]">{{ title }}</p>
    <ul class="mt-[0.4rem] list-disc space-y-[0.2rem] pl-[1.8rem] font-[600]">
      <li v-for="item in errors" :key="item.key">{{ readableError(item) }}</li>
    </ul>
    <p v-if="hint" class="mt-[0.6rem]">{{ hint }}</p>
  </div>
</template>
