<script setup>
defineProps({
  type: {
    type: String,
    default: 'submit',
  },
})

</script>

<template>
  <button
      class="cursor-pointer w-full rounded-[10px] bg-[#003366] h-[47px] text-[1.6rem] text-[#fff] font-[700] leading-[22.5px]"
      :type="type">
    <slot></slot>
  </button>
</template>

<style scoped>

</style>