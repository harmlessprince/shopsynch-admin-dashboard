<script setup>
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-settings",
});

const adminSettingsStore = useAdminSettingsStore();
const category = ref("");

async function fetchSettings() {
  try {
    await adminSettingsStore.fetchSettings({
      category: category.value || undefined,
    });
  } catch (err) {
    logger.error("Failed to load global settings", err);
  }
}

onMounted(fetchSettings);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Global settings</h1>
          <p class="mt-[0.4rem]">Platform-wide app settings.</p>
        </div>
        <select
          v-model="category"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          @change="fetchSettings"
        >
          <option value="">All categories</option>
          <option value="PAYMENT">Payment</option>
          <option value="URL">URL</option>
          <option value="EMAIL">Email</option>
          <option value="FEATURE_FLAG">Feature flag</option>
          <option value="SYSTEM">System</option>
          <option value="O_AUTH">OAuth</option>
        </select>
      </div>
    </section>

    <div v-if="adminSettingsStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ adminSettingsStore.error }}
    </div>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <p v-if="adminSettingsStore.loading">Loading settings...</p>
      <div v-else class="grid grid-cols-1 gap-[1.2rem] xl:grid-cols-2">
        <div
          v-for="setting in adminSettingsStore.settings"
          :key="setting.key"
          class="rounded-[8px] border border-slate-100 p-[1.4rem]"
        >
          <div class="flex items-start justify-between gap-[1rem]">
            <div>
              <p class="font-[700] text-[#000]">{{ setting.label || setting.key }}</p>
              <p class="mt-[0.4rem] text-[1.2rem]">{{ setting.description || setting.key }}</p>
            </div>
            <span class="rounded-[8px] bg-primary/10 px-[1rem] py-[0.4rem] text-[1.2rem] font-[700] text-primary">
              {{ setting.category }}
            </span>
          </div>
        </div>
        <p v-if="adminSettingsStore.settings.length === 0">No settings found.</p>
      </div>
    </section>
  </div>
</template>
