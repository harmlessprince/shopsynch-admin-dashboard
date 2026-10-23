<script setup>
import { computed, onMounted } from "vue";
import { useAdminSettingsStore } from "~/stores/adminSettings.store.js";
import { logger } from "~/utils/helpers.js";

const props = defineProps({
  settingKey: { type: String, required: true },
  // The setting's category, so only that group is loaded when the setting is not in the store yet.
  category: { type: String, default: "" },
  title: { type: String, required: true },
  // 'warning' when nothing happens until it is set, 'info' when there is a working fallback.
  tone: { type: String, default: "warning" },
  icon: { type: String, default: "notifications_off" },
  linkLabel: { type: String, default: "Set it in Settings" },
  // The element id on the Settings page to jump to; defaults to the setting key.
  anchor: { type: String, default: "" },
  testId: { type: String, default: "empty-setting-notice" },
});

const tones = {
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: "text-amber-600", body: "text-amber-800" },
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: "text-sky-600", body: "text-sky-800" },
};

const settingsStore = useAdminSettingsStore();

const setting = computed(() => settingsStore.settings.find((item) => item.key === props.settingKey));

// Only show once the setting is known and empty; an unloaded setting says nothing.
const isEmpty = computed(() => {
  if (!setting.value) return false;
  const value = setting.value.value;
  if (Array.isArray(value)) return value.filter(Boolean).length === 0;
  return !String(value ?? "").trim();
});

onMounted(async () => {
  if (setting.value) return;
  try {
    await settingsStore.fetchSettings(props.category ? { category: props.category } : {});
  } catch (err) {
    logger.error(`Failed to load the ${props.settingKey} setting`, err);
  }
});
</script>

<template>
  <div
    v-if="isEmpty"
    class="flex items-start gap-[1.2rem] rounded-[10px] border p-[1.6rem]"
    :class="tones[tone]?.box"
    role="alert"
    :data-testid="testId"
  >
    <span class="material-symbols-outlined text-[2.4rem]" :class="tones[tone]?.icon">{{ icon }}</span>
    <div>
      <h4 class="text-[1.5rem] font-[700]">{{ title }}</h4>
      <p class="text-[1.3rem]" :class="tones[tone]?.body">
        <slot />
        <NuxtLink
          :to="{ path: '/dashboard/settings', hash: `#${anchor || settingKey}` }"
          class="font-[700] underline hover:no-underline"
        >
          {{ linkLabel }} &rarr;
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
