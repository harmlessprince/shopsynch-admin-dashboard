<script setup>
const route = useRoute()
const backgroundImage = computed(() => {
  return route.meta.backgroundImage || 'https://res.cloudinary.com/ibreathcode/image/upload/v1748437850/shopsynch/dashboard/auth_bg_second_prog4b.png'
})

const description = computed(() => {
  return route.meta.description || "  Integrate payments, manage orders, and sync inventory effortlessly. ShopSynch provides a scalable,\n" +
      "            developer friendly eCommerce API to help you sell online without the technical overhead.."
})

const title = computed(() => {
  return route.meta?.title || 'Powering Your Store...'
})
</script>
<template>
  <div
      class="min-h-screen pt-[5rem] bg-cover bg-no-repeat bg-center"
      :style="{ backgroundImage: `url(${backgroundImage})`}"
  >
    <section
        class="min-h-screen grid grid-cols-2 authentication_section_grid max-w-[1000px] gap-x-[116px] mx-auto px-[2rem] items-center">
      <div class="max-w-[383px]">
        <img src="/logos/white-logo.png" class='max-w-[280px] h-[40px]'
             alt="shopsync login for e-commerce backend api service"/>
        <div class="mt-[14.0rem] text-[#fff] powering_your_store">
          <h1 class="font-[700] text-[3.9rem] leading-[47px]">{{ title }}</h1>
          <p class="text-[1.6rem] leading-[28px] font-[400] mt-[2.4rem]">
            {{ description }}
          </p>
        </div>
      </div>

      <div
          class="mt-[6.5rem] min-h-[768px] self-end rounded-t-[24px] rounded-b-0 max-w-[460px] bg-[#fff] p-[4.5rem] box-border">
        <NuxtPage/>
      </div>

    </section>
  </div>
</template>

<style scoped>


.powering_your_store {
  font-family: 'Zen Kaku Gothic Antique'
}

</style>