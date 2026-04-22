<script setup lang="ts">
defineProps({
  width: {
    type: String,
    required: false,
    default: "120px"
  },
  height: {
    type: String,
    required: false,
    default: "120px"
  }
});
</script>

<template>
  <div>
    <img src="~/assets/success.gif" alt="Successful" :width="width" :height="height">
  </div>

</template>

<style scoped>

</style>