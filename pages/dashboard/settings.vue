<script setup>
import { logger } from "~/utils/helpers.js";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { validateTelegramWebhookUrl, getTelegramModeWarning } from "~/utils/telegram.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-settings",
});

const adminSettingsStore = useAdminSettingsStore();
const toastStore = useToastStore();
const displayModeCookie = useCookie("displayMode");

const categories = ["PAYMENT", "URL", "EMAIL", "FEATURE_FLAG", "SYSTEM", "O_AUTH"];
const valueTypes = ["STRING", "NUMBER", "BOOLEAN", "JSON"];
const askAnalyticsLimitKey = "askAnalyticsDailyQuestionLimit";

const category = ref("");
const drafts = ref({});
const savingKey = ref("");
const deletingKey = ref("");
const creating = ref(false);
const newSetting = ref({
  key: "",
  label: "",
  description: "",
  value: "",
  valueType: "STRING",
  category: "URL",
  isPublic: false,
});

const settingsByCategory = computed(() => {
  return adminSettingsStore.settings.reduce((groups, setting) => {
    const group = setting.category || "SYSTEM";
    groups[group] = groups[group] || [];
    groups[group].push(setting);
    return groups;
  }, {});
});

const visibleCategories = computed(() => {
  if (category.value) {
    return settingsByCategory.value[category.value] ? [category.value] : [];
  }

  return Object.keys(settingsByCategory.value).sort();
});

const askAnalyticsLimitSetting = computed(() =>
  adminSettingsStore.settings.find((setting) => setting.key === askAnalyticsLimitKey)
);

const askAnalyticsLimitDraft = computed({
  get() {
    return drafts.value[askAnalyticsLimitKey] ?? "";
  },
  set(value) {
    drafts.value[askAnalyticsLimitKey] = value;
  },
});

const paymentAlertEmailsKey = "platformPaymentAlertEmails";
const paymentAlertEmailError = ref("");

const paymentAlertDraft = computed({
  get() {
    return drafts.value[paymentAlertEmailsKey] ?? "";
  },
  set(value) {
    drafts.value[paymentAlertEmailsKey] = value;
  },
});

async function savePaymentAlertRecipients() {
  paymentAlertEmailError.value = "";
  const emails = (paymentAlertDraft.value || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of emails) {
    if (!emailRegex.test(email)) {
      paymentAlertEmailError.value = `"${email}" is not a valid email address.`;
      return;
    }
  }
  try {
    savingKey.value = paymentAlertEmailsKey;
    await adminSettingsStore.updateSettingValue(paymentAlertEmailsKey, emails.join(","));
    syncDrafts();
  } catch (err) {
    logger.error("Failed to update payment alert recipients", err);
    paymentAlertEmailError.value = err?.data?.message || err?.message || "Unable to update setting value";
  } finally {
    savingKey.value = "";
  }
}

const telegramWebhookKey = "telegramWebhookUrl";
const telegramValidationError = ref("");
const showRegisterConfirmModal = ref(false);
const registeringWebhook = ref(false);
const copiedTelegramExample = ref(false);

const currentMode = computed(() => displayModeCookie.value === "live" ? "live" : "test");

const telegramWebhookSetting = computed(() =>
  adminSettingsStore.settings.find((setting) => setting.key === telegramWebhookKey)
);

const telegramWebhookDraft = computed({
  get() {
    return drafts.value[telegramWebhookKey] ?? "";
  },
  set(value) {
    drafts.value[telegramWebhookKey] = value;
  },
});

const savedTelegramWebhookUrl = computed(() => {
  return (telegramWebhookSetting.value?.value ?? "").trim();
});

const hasUnsavedTelegramEdits = computed(() => {
  return telegramWebhookDraft.value.trim() !== savedTelegramWebhookUrl.value;
});

const expectedTelegramFormatExample = computed(() => {
  const keyPrefix = currentMode.value === "live" ? "pk_live_" : "pk_test_";
  return `https://<gateway-host>/v1/webhooks/telegram?apikey=${keyPrefix}xxx`;
});

const telegramModeWarning = computed(() => {
  return getTelegramModeWarning(telegramWebhookDraft.value, currentMode.value);
});

async function copyTelegramExample() {
  try {
    await navigator.clipboard.writeText(expectedTelegramFormatExample.value);
    copiedTelegramExample.value = true;
    setTimeout(() => {
      copiedTelegramExample.value = false;
    }, 2000);
  } catch (err) {
    logger.error("Failed to copy Telegram webhook example", err);
  }
}

async function saveTelegramWebhookUrl() {
  telegramValidationError.value = "";
  const url = telegramWebhookDraft.value.trim();
  const validationError = validateTelegramWebhookUrl(url);
  if (validationError) {
    telegramValidationError.value = validationError;
    return;
  }
  try {
    savingKey.value = telegramWebhookKey;
    await adminSettingsStore.updateSettingValue(telegramWebhookKey, url);
    syncDrafts();
  } catch (err) {
    logger.error("Failed to update telegram webhook URL", err);
    if (err?.statusCode === 404 || err?.response?.status === 404) {
      try {
        await adminSettingsStore.upsertSetting({
          key: telegramWebhookKey,
          label: "Telegram Webhook URL",
          description: "Public https URL Telegram sends bot updates to, ending in /v1/webhooks/telegram.",
          value: url,
          valueType: "STRING",
          category: "URL",
          public: false,
        });
        syncDrafts();
        return;
      } catch (upsertErr) {
        logger.error("Failed to upsert telegram webhook URL", upsertErr);
        telegramValidationError.value = upsertErr?.data?.message || upsertErr?.message || "Unable to save setting";
        return;
      }
    }
    telegramValidationError.value = err?.data?.message || err?.message || "Unable to update setting value";
  } finally {
    savingKey.value = "";
  }
}

function promptRegisterWebhook() {
  if (hasUnsavedTelegramEdits.value || registeringWebhook.value || savingKey.value === telegramWebhookKey) {
    return;
  }
  if (!savedTelegramWebhookUrl.value) {
    toastStore.error("Set and save a Telegram webhook URL before registering.", "URL Not Set");
    return;
  }
  showRegisterConfirmModal.value = true;
}

async function confirmRegisterWebhook() {
  showRegisterConfirmModal.value = false;
  registeringWebhook.value = true;
  try {
    const { post } = useApiService();
    const response = await post(
      endpoints.admin.telegram.registerWebhook,
      null,
      { silent: true }
    );
    toastStore.success(response?.message || "telegram webhook registered");
  } catch (err) {
    logger.error("Failed to register Telegram webhook", err);
    const status = err?.statusCode || err?.response?.status || err?.status;
    if (status === 401) {
      // Handled by auth flow
    } else if (status === 403) {
      navigateTo("/unauthorized");
    } else if (status === 404) {
      toastStore.error("The Telegram backend isn't available on this instance yet", "Not Available");
    } else if (status === 400) {
      const msg = err?.data?.message || err?.data?.description || err?.message || "Telegram webhook registration failed";
      toastStore.error(msg, "Registration Failed");
    } else if (!status || (err?.name === "FetchError" && !err?.response)) {
      toastStore.error("Check your internet connection or try again later", "Network error");
    } else {
      const msg = err?.data?.message || err?.message || "An error occurred while registering webhook";
      toastStore.error(msg, "Registration Error");
    }
  } finally {
    registeringWebhook.value = false;
  }
}

function valueToDraft(setting) {
  if (setting.valueType === "JSON") {
    return setting.value ? JSON.stringify(setting.value, null, 2) : "";
  }

  if (setting.valueType === "BOOLEAN") {
    return setting.value === true || setting.value === "true";
  }

  if (setting.value === null || setting.value === undefined) {
    return "";
  }

  return setting.value;
}

function syncDrafts() {
  drafts.value = adminSettingsStore.settings.reduce((nextDrafts, setting) => {
    nextDrafts[setting.key] = valueToDraft(setting);
    return nextDrafts;
  }, {});
}

function normalizeValue(value, valueType) {
  if (valueType === "NUMBER") {
    return value === "" || value === null || value === undefined ? null : Number(value);
  }

  if (valueType === "BOOLEAN") {
    return Boolean(value);
  }

  if (valueType === "JSON") {
    if (!value) {
      return null;
    }

    return JSON.parse(value);
  }

  return value ?? "";
}

async function fetchSettings() {
  try {
    await adminSettingsStore.fetchSettings({
      category: category.value || undefined,
    });
    syncDrafts();
  } catch (err) {
    logger.error("Failed to load global settings", err);
  }
}

async function saveSettingValue(setting) {
  try {
    savingKey.value = setting.key;
    const value = normalizeValue(drafts.value[setting.key], setting.valueType);
    await adminSettingsStore.updateSettingValue(setting.key, value);
    syncDrafts();
  } catch (err) {
    logger.error("Failed to update global setting", err);
    toastStore.error("Unable to update setting value");
  } finally {
    savingKey.value = "";
  }
}

async function createSetting() {
  try {
    creating.value = true;
    const payload = {
      key: newSetting.value.key.trim(),
      label: newSetting.value.label.trim(),
      description: newSetting.value.description.trim(),
      value: normalizeValue(newSetting.value.value, newSetting.value.valueType),
      valueType: newSetting.value.valueType,
      category: newSetting.value.category,
      public: newSetting.value.isPublic,
    };

    if (!payload.key) {
      toastStore.error("Setting key is required");
      return;
    }

    await adminSettingsStore.upsertSetting(payload);
    newSetting.value = {
      key: "",
      label: "",
      description: "",
      value: "",
      valueType: "STRING",
      category: "URL",
      isPublic: false,
    };
    syncDrafts();
  } catch (err) {
    logger.error("Failed to create global setting", err);
    toastStore.error("Unable to save setting");
  } finally {
    creating.value = false;
  }
}

async function deleteSetting(setting) {
  try {
    deletingKey.value = setting.key;
    await adminSettingsStore.deleteSetting(setting.key);
    syncDrafts();
  } catch (err) {
    logger.error("Failed to delete global setting", err);
    toastStore.error("Unable to delete setting");
  } finally {
    deletingKey.value = "";
  }
}

function isPublic(setting) {
  return setting.isPublic ?? setting.public ?? false;
}

onMounted(fetchSettings);
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Global settings</h1>
          <p class="mt-[0.4rem]">Backend environment values that can be changed without redeploying.</p>
        </div>
        <div class="flex flex-col gap-[1rem] sm:flex-row">
          <select
            v-model="category"
            class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            @change="fetchSettings"
          >
            <option value="">All categories</option>
            <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
          </select>
          <button class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white" @click="fetchSettings">
            Refresh
          </button>
        </div>
      </div>
    </section>

    <div v-if="adminSettingsStore.error" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.6rem] text-red-700">
      {{ adminSettingsStore.error }}
    </div>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 class="text-[1.6rem] font-[700] text-[#000]">Ask Analytics daily cap</h2>
          <p class="mt-[0.4rem] text-[1.2rem] text-slate-600">
            Controls how many Ask Analytics questions each tenant can submit per day. Default is 5.
          </p>
        </div>
        <div v-if="askAnalyticsLimitSetting" class="flex w-full flex-col gap-[0.8rem] sm:w-auto sm:min-w-[26rem]">
          <label class="text-[1.2rem] font-[700] text-[#000]" for="askAnalyticsDailyLimit">
            Questions per tenant per day
          </label>
          <div class="flex gap-[1rem]">
            <input
              id="askAnalyticsDailyLimit"
              v-model="askAnalyticsLimitDraft"
              type="number"
              min="1"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              :disabled="!askAnalyticsLimitSetting.editable"
            />
            <button
              class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!askAnalyticsLimitSetting.editable || savingKey === askAnalyticsLimitKey"
              @click="saveSettingValue(askAnalyticsLimitSetting)"
            >
              {{ savingKey === askAnalyticsLimitKey ? "Saving..." : "Save" }}
            </button>
          </div>
        </div>
        <p v-else class="rounded-[8px] bg-amber-50 px-[1.2rem] py-[0.9rem] text-[1.2rem] font-[700] text-amber-700">
          Setting will appear after backend settings are seeded.
        </p>
      </div>
    </section>

    <!-- Platform Payment Alert Recipients Card (Issue 005) -->
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 class="text-[1.6rem] font-[700] text-[#000]">Platform Payment Alert Recipients</h2>
          <p class="mt-[0.4rem] text-[1.2rem] text-slate-600">
            Who is emailed about payment problems: platform gateway credentials rejected or valid again, a gateway
            circuit opening or closing, a low payment success rate, a signed webhook that matched no payment
            (<code>WEBHOOK_UNMATCHED</code>), a webhook that failed three times (<code>WEBHOOK_PROCESSING_FAILED</code>),
            and a subscription refund that needs a person (<code>REFUND_NEEDS_ATTENTION</code>). Alerts are only sent
            from the live backend.
            <NuxtLink to="/dashboard/payment-gateways" class="text-primary font-[600] ml-[0.4rem] hover:underline">
              View Payment Gateways &rarr;
            </NuxtLink>
          </p>
          <p v-if="!paymentAlertDraft" class="mt-[0.6rem] text-[1.2rem] text-amber-700 bg-amber-50 p-[0.6rem] rounded-[6px] inline-block font-[500]">
            No recipients configured. Nobody is emailed while this setting is empty.
          </p>
        </div>
        <div class="flex w-full flex-col gap-[0.8rem] sm:w-auto sm:min-w-[36rem]">
          <label class="text-[1.2rem] font-[700] text-[#000]" for="platformPaymentAlertEmails">
            Recipient emails (comma-separated)
          </label>
          <div class="flex flex-col gap-[0.6rem]">
            <div class="flex gap-[1rem]">
              <input
                id="platformPaymentAlertEmails"
                v-model="paymentAlertDraft"
                type="text"
                placeholder="alerts@shopsynch.com, devops@shopsynch.com"
                class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              />
              <button
                class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="savingKey === paymentAlertEmailsKey"
                @click="savePaymentAlertRecipients"
              >
                {{ savingKey === paymentAlertEmailsKey ? "Saving..." : "Save" }}
              </button>
            </div>
            <p v-if="paymentAlertEmailError" class="text-[1.2rem] font-[600] text-rose-600">
              {{ paymentAlertEmailError }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Telegram Bot Webhook Settings Card -->
    <section id="setting-telegramWebhookUrl" class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.6rem]">
        <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 class="text-[1.6rem] font-[700] text-[#000]">Telegram Bot Webhook</h2>
            <p class="mt-[0.4rem] text-[1.2rem] text-slate-600">
              Configure and register the public HTTPS webhook URL where Telegram delivers bot updates.
              Routing to the test or live bot is determined by the <code>apikey</code> query parameter.
            </p>
            <p v-if="!savedTelegramWebhookUrl" class="mt-[0.6rem] text-[1.2rem] text-amber-700 bg-amber-50 p-[0.6rem] rounded-[6px] inline-block font-[500]">
              No webhook URL configured. Updates cannot be delivered until a valid URL is saved and registered.
            </p>
          </div>
          <div class="flex flex-col gap-[0.6rem] sm:flex-row sm:items-center">
            <button
              type="button"
              class="rounded-[8px] bg-primary px-[1.6rem] py-[0.9rem] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="registeringWebhook || savingKey === telegramWebhookKey || hasUnsavedTelegramEdits || !savedTelegramWebhookUrl"
              data-testid="register-telegram-webhook-btn"
              @click="promptRegisterWebhook"
            >
              {{ registeringWebhook ? "Registering..." : "Register webhook with Telegram" }}
            </button>
          </div>
        </div>

        <!-- Help line showing expected format and copy button -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-[0.8rem] rounded-[8px] bg-slate-50 border border-slate-200 px-[1.4rem] py-[1rem] text-[1.2rem]">
          <div class="text-slate-700">
            <span class="font-[600]">Expected format for {{ currentMode }} mode:</span>
            <code class="ml-[0.6rem] font-mono text-[1.2rem] text-slate-900 break-all select-all">{{ expectedTelegramFormatExample }}</code>
          </div>
          <button
            type="button"
            class="flex items-center gap-[0.4rem] font-[700] text-primary hover:underline whitespace-nowrap self-start sm:self-auto cursor-pointer"
            data-testid="copy-telegram-example-btn"
            @click="copyTelegramExample"
          >
            <span class="material-symbols-outlined text-[1.6rem]">{{ copiedTelegramExample ? "check" : "content_copy" }}</span>
            <span>{{ copiedTelegramExample ? "Copied!" : "Copy example" }}</span>
          </button>
        </div>

        <!-- Input and Save URL -->
        <div class="flex flex-col gap-[0.8rem]">
          <label class="text-[1.2rem] font-[700] text-[#000]" for="telegramWebhookUrlInput">
            Webhook URL
          </label>
          <div class="flex flex-col sm:flex-row gap-[1rem]">
            <input
              id="telegramWebhookUrlInput"
              v-model="telegramWebhookDraft"
              type="text"
              placeholder="https://<gateway-host>/v1/webhooks/telegram?apikey=pk_test_xxx"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              data-testid="telegram-webhook-input"
            >
            <button
              type="button"
              class="rounded-[8px] bg-primary px-[1.6rem] py-[0.9rem] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
              :disabled="savingKey === telegramWebhookKey || !hasUnsavedTelegramEdits"
              data-testid="save-telegram-webhook-btn"
              @click="saveTelegramWebhookUrl"
            >
              {{ savingKey === telegramWebhookKey ? "Saving..." : "Save URL" }}
            </button>
          </div>

          <!-- Mode warning (warn, don't block) -->
          <div
            v-if="telegramModeWarning"
            class="flex items-center gap-[0.6rem] rounded-[6px] bg-amber-50 border border-amber-200 p-[0.8rem] text-[1.2rem] text-amber-800 font-[500]"
            data-testid="telegram-mode-warning"
          >
            <span class="material-symbols-outlined text-[1.6rem] text-amber-600">warning</span>
            <span>{{ telegramModeWarning }}</span>
          </div>

          <!-- Validation Error -->
          <p
            v-if="telegramValidationError"
            class="text-[1.2rem] font-[600] text-rose-600"
            data-testid="telegram-validation-error"
          >
            {{ telegramValidationError }}
          </p>

          <!-- Warning note: Saving does not register -->
          <div class="flex flex-col gap-[0.4rem] mt-[0.4rem]">
            <p class="text-[1.2rem] text-amber-700 font-[500] flex items-center gap-[0.4rem]">
              <span class="material-symbols-outlined text-[1.6rem]">info</span>
              Saving the URL does not register it with Telegram. The button above must be pressed after every change.
            </p>
            <p v-if="hasUnsavedTelegramEdits" class="text-[1.2rem] text-amber-600 font-[500]" data-testid="telegram-unsaved-warning">
              You have unsaved edits. Save the URL before registering with Telegram.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Confirmation Modal for Telegram Webhook Registration -->
    <div
      v-if="showRegisterConfirmModal"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
      role="dialog"
      aria-modal="true"
      data-testid="telegram-register-confirm-modal"
    >
      <div class="w-full max-w-[48rem] rounded-[12px] bg-white p-[2.4rem] shadow-xl border border-slate-200">
        <h3 class="text-[1.8rem] font-[700] text-slate-900 flex items-center gap-[0.8rem]">
          <span class="material-symbols-outlined text-primary">send</span>
          Register Webhook with Telegram?
        </h3>
        <p class="mt-[1.2rem] text-[1.4rem] text-slate-600 leading-relaxed">
          Are you sure you want to register the current saved webhook URL with Telegram?
        </p>
        <div class="mt-[1.2rem] rounded-[8px] bg-slate-50 border border-slate-200 p-[1.2rem]">
          <p class="text-[1.2rem] font-[700] text-slate-700 mb-[0.4rem]">URL to be registered:</p>
          <code class="font-mono text-[1.3rem] text-slate-900 break-all select-all">{{ savedTelegramWebhookUrl }}</code>
        </div>
        <p class="mt-[1.2rem] text-[1.2rem] text-slate-500">
          This will instruct the Telegram Bot API to send all future updates to this endpoint.
        </p>
        <div class="mt-[2.4rem] flex justify-end gap-[1.2rem]">
          <button
            type="button"
            class="rounded-[8px] border border-slate-300 px-[1.6rem] py-[0.8rem] font-[600] text-slate-700 hover:bg-slate-50 transition"
            @click="showRegisterConfirmModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-[8px] bg-primary px-[1.8rem] py-[0.8rem] font-[700] text-white hover:bg-primary/90 transition"
            data-testid="confirm-register-telegram-btn"
            @click="confirmRegisterWebhook"
          >
            Confirm &amp; Register
          </button>
        </div>
      </div>
    </div>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="mb-[1.6rem]">
        <h2 class="text-[1.6rem] font-[700] text-[#000]">Create or upsert setting</h2>
        <p class="mt-[0.4rem] text-[1.2rem]">Saving with an existing key fully replaces that global setting.</p>
      </div>
      <form class="grid grid-cols-1 gap-[1.2rem] lg:grid-cols-4" @submit.prevent="createSetting">
        <input
          v-model="newSetting.key"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="key"
        />
        <input
          v-model="newSetting.label"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="Label"
        />
        <select v-model="newSetting.category" class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]">
          <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
        </select>
        <select v-model="newSetting.valueType" class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]">
          <option v-for="item in valueTypes" :key="item" :value="item">{{ item }}</option>
        </select>
        <textarea
          v-model="newSetting.description"
          class="min-h-[4.4rem] rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] lg:col-span-2"
          placeholder="Description"
        />
        <textarea
          v-if="newSetting.valueType === 'JSON'"
          v-model="newSetting.value"
          class="min-h-[4.4rem] rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="{ }"
        />
        <select
          v-else-if="newSetting.valueType === 'BOOLEAN'"
          v-model="newSetting.value"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
        >
          <option :value="true">true</option>
          <option :value="false">false</option>
        </select>
        <input
          v-else
          v-model="newSetting.value"
          :type="newSetting.valueType === 'NUMBER' ? 'number' : 'text'"
          class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="Value"
        />
        <div class="flex items-center justify-between gap-[1rem]">
          <label class="flex items-center gap-[0.8rem] text-[1.2rem] font-[700] text-[#000]">
            <input v-model="newSetting.isPublic" type="checkbox" class="rounded border-slate-300 text-primary focus:ring-primary" />
            Public
          </label>
          <button
            type="submit"
            class="rounded-[8px] bg-primary px-[1.4rem] py-[0.9rem] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="creating"
          >
            {{ creating ? "Saving..." : "Save setting" }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <p v-if="adminSettingsStore.loading">Loading settings...</p>
      <div v-else class="space-y-[2rem]">
        <div v-for="group in visibleCategories" :key="group" class="space-y-[1rem]">
          <h2 class="text-[1.6rem] font-[700] text-[#000]">{{ group }}</h2>
          <div class="grid grid-cols-1 gap-[1.2rem] xl:grid-cols-2">
            <article
              v-for="setting in settingsByCategory[group]"
              :id="`setting-${setting.key}`"
              :key="setting.key"
              class="rounded-[8px] border border-slate-100 p-[1.4rem]"
            >
              <div class="flex items-start justify-between gap-[1rem]">
                <div>
                  <p class="font-[700] text-[#000]">{{ setting.label || setting.key }}</p>
                  <p class="mt-[0.4rem] break-all text-[1.2rem] text-slate-500">{{ setting.key }}</p>
                  <p class="mt-[0.4rem] text-[1.2rem]">{{ setting.description || "-" }}</p>
                </div>
                <div class="flex flex-wrap justify-end gap-[0.6rem]">
                  <span class="rounded-[8px] bg-primary/10 px-[1rem] py-[0.4rem] text-[1.2rem] font-[700] text-primary">
                    {{ setting.valueType }}
                  </span>
                  <span class="rounded-[8px] bg-slate-100 px-[1rem] py-[0.4rem] text-[1.2rem] font-[700] text-slate-700">
                    {{ isPublic(setting) ? "Public" : "Private" }}
                  </span>
                </div>
              </div>

              <div class="mt-[1.4rem]">
                <textarea
                  v-if="setting.valueType === 'JSON'"
                  v-model="drafts[setting.key]"
                  class="min-h-[9rem] w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] font-mono text-[1.2rem] disabled:bg-slate-50"
                  :disabled="!setting.editable"
                />
                <label
                  v-else-if="setting.valueType === 'BOOLEAN'"
                  class="flex w-full items-center justify-between rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
                >
                  <span class="font-[700] text-[#000]">Enabled</span>
                  <input
                    v-model="drafts[setting.key]"
                    type="checkbox"
                    class="rounded border-slate-300 text-primary focus:ring-primary"
                    :disabled="!setting.editable"
                  />
                </label>
                <input
                  v-else
                  v-model="drafts[setting.key]"
                  :type="setting.valueType === 'NUMBER' ? 'number' : 'text'"
                  class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] disabled:bg-slate-50"
                  :disabled="!setting.editable"
                />
              </div>

              <div class="mt-[1.4rem] flex items-center justify-between gap-[1rem]">
                <p class="text-[1.2rem] font-[700]" :class="setting.editable ? 'text-emerald-700' : 'text-slate-500'">
                  {{ setting.editable ? "Editable" : "Read-only" }}
                </p>
                <div class="flex gap-[1rem]">
                  <button
                    class="font-[700] text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="deletingKey === setting.key"
                    @click="deleteSetting(setting)"
                  >
                    {{ deletingKey === setting.key ? "Deleting..." : "Delete" }}
                  </button>
                  <button
                    class="rounded-[8px] bg-primary px-[1.4rem] py-[0.8rem] font-[700] text-white disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!setting.editable || savingKey === setting.key"
                    @click="saveSettingValue(setting)"
                  >
                    {{ savingKey === setting.key ? "Saving..." : "Save value" }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
        <p v-if="adminSettingsStore.settings.length === 0">No settings found.</p>
      </div>
    </section>
  </div>
</template>
