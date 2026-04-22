<script setup>
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-cache",
});

const adminCacheStore = useAdminCacheStore();

async function fetchCaches() {
  try {
    await adminCacheStore.fetchCaches();
  } catch (err) {
    logger.error("Failed to load caches", err);
  }
}

async function clearCache(cacheName) {
  try {
    await adminCacheStore.clearCache(cacheName);
    await fetchCaches();
  } catch (err) {
    logger.error("Failed to clear cache", err);
  }
}

async function clearAllCaches() {
  try {
    await adminCacheStore.clearAllCaches();
    await fetchCaches();
  } catch (err) {
    logger.error("Failed to clear all caches", err);
  }
}

onMounted(fetchCaches);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Cache</h1>
          <p class="mt-[0.4rem]">Named platform caches.</p>
        </div>
        <button class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white" @click="clearAllCaches">
          Clear all
        </button>
      </div>
    </section>

    <div v-if="adminCacheStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ adminCacheStore.error }}
    </div>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <p v-if="adminCacheStore.loading">Loading caches...</p>
      <div v-else class="space-y-[1rem]">
        <div
          v-for="cache in adminCacheStore.caches"
          :key="cache"
          class="flex items-center justify-between rounded-[8px] border border-slate-100 p-[1.4rem]"
        >
          <span class="font-[700] text-[#000]">{{ cache }}</span>
          <button class="font-[700] text-red-700" @click="clearCache(cache)">Clear</button>
        </div>
        <p v-if="adminCacheStore.caches.length === 0">No named caches returned.</p>
      </div>
    </section>
  </div>
</template>
