<template>
   <TitleMeta/>
  <!-- <NuxtLayout /> -->
  <!-- <NuxtPage/> -->
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <GlobalErrorAlert />
  </ClientOnly>
</template>
<script setup lang="ts">
import "izitoast/dist/css/iziToast.min.css";

</script>
