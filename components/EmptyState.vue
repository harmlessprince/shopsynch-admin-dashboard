<template>
  <div class="empty-state flex justify-center items-center flex-col mx-auto">
    <img :src="EmptyState" class="max-h-96 max-w-xs mb-5" alt="Login Image" />
    <slot/>
  </div>
</template>
    
    <script setup>
import EmptyState from "~/assets/img/empty-state.png";
</script>