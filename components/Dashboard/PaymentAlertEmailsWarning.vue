<script setup>
import { computed, onMounted } from "vue";
import { useAdminSettingsStore } from "~/stores/adminSettings.store.js";
import { logger } from "~/utils/helpers.js";

const alertSettingKey = "platformPaymentAlertEmails";

const settingsStore = useAdminSettingsStore();

const alertSetting = computed(() =>
  settingsStore.settings.find((setting) => setting.key === alertSettingKey)
);

// Only warn once the setting is known and empty; an unloaded setting says nothing.
const isEmpty = computed(() => {
  if (!alertSetting.value) return false;
  const value = alertSetting.value.value;
  if (Array.isArray(value)) return value.filter(Boolean).length === 0;
  return !String(value ?? "").trim();
});

onMounted(async () => {
  if (alertSetting.value) return;
  try {
    await settingsStore.fetchSettings({ category: "PAYMENT" });
  } catch (err) {
    logger.error("Failed to load payment alert recipients setting", err);
  }
});
</script>

<template>
  <div
    v-if="isEmpty"
    class="rounded-[10px] border border-amber-200 bg-amber-50 p-[1.6rem] text-amber-900 flex items-start gap-[1.2rem]"
    role="alert"
    data-testid="payment-alert-emails-warning"
  >
    <span class="material-symbols-outlined text-[2.4rem] text-amber-600">notifications_off</span>
    <div>
      <h4 class="font-[700] text-[1.5rem]">Nobody is emailed about payment problems</h4>
      <p class="text-[1.3rem] text-amber-800">
        Payment Alert Emails is empty, so these alerts are only written to the server log: rejected or recovered
        gateway credentials, gateway circuits opening or closing, a low payment success rate, unmatched or repeatedly
        failing webhooks, and subscription refunds that need a person.
        <NuxtLink
          :to="{ path: '/dashboard/settings', hash: `#${alertSettingKey}` }"
          class="font-[700] underline hover:no-underline"
        >
          Set the recipients in Settings &rarr;
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
