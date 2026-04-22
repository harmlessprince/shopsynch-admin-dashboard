<script setup>
const error = useError();
const handleError = () => {
  clearError({
    redirect: '/dashboard',
  });
};
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  document.documentElement.classList.add('h-full');
  document.body.classList.add('h-full');
});

onUnmounted(() => {
  document.documentElement.classList.remove('h-full');
  document.body.classList.remove('h-full');
});
</script>

<template>
  <NuxtLayout>
    <div class="flex flex-col items-center justify-center min-h-screen">
      <template v-if="error.statusCode === 404">
        <NotFound/>
      </template>
      <template v-else>
        <h1>Dang</h1>
        <p>
          <strong>{{ error.message }}</strong>
        </p>
        <p>Sorry about that.</p>
        <p>
          Go back to your
          <a @click="handleError">
            dashboard.
          </a>
        </p>
      </template>
    </div>
  </NuxtLayout>
</template>

<style scoped>

</style>