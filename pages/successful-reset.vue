<script setup>
definePageMeta({
  layout: "authentication"
})
</script>
<template>
  <div class="">
    <p class="font-[400] text-[1.4rem] text-[#1B1B19] leading-[22.5px]">WELCOME BACK</p>
    <p class="font-[500] text-[25px] leading-[44px] text-[#1B1B19]">Reset password</p>

    <form class="mt-[5.5rem] flex flex-col gap-y-[1.6rem]">
      <p class="text-[16px] text-center font-[400] text-[#1B1B19]">Password has been reset</p>

      <div class="my-[0.8rem]">
        <NuxtLink to="/pages/login">
          <FormButton name="Login"/>
        </NuxtLink>
      </div>

    </form>
  </div>
</template>

<style scoped>

</style>