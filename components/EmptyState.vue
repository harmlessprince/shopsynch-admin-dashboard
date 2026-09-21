<template>
  <div class="empty-state flex flex-col items-center justify-center text-center p-8 mx-auto">
    <img
      :src="EmptyStateImg"
      class="max-h-64 max-w-xs mb-6 opacity-80"
      alt=""
      aria-hidden="true"
    />
    <slot>
      <h3 class="text-xl font-semibold text-slate-700 mb-2">
        {{ title }}
      </h3>
      <p class="text-base text-slate-500 max-w-md">
        {{ description }}
      </p>
    </slot>
  </div>
</template>

<script setup>
import EmptyStateImg from "~/assets/img/empty-state.png";

defineProps({
  title: {
    type: String,
    default: "No records found"
  },
  description: {
    type: String,
    default: "There are no items to display at the moment."
  }
})
</script>