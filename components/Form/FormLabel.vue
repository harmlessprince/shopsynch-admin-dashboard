<script setup>
defineProps({
  name: {
    type: String,
    required: true,
  },

})

</script>

<template>
  <label class="font-normal text-[1.6rem] leading-[22.5px] text-[#1B1B19]" :for="name">{{ name }}</label>
</template>

<style scoped>

</style>