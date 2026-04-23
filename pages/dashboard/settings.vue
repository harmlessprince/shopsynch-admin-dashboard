<script setup>
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-settings",
});

const adminSettingsStore = useAdminSettingsStore();
const toastStore = useToastStore();

const categories = ["PAYMENT", "URL", "EMAIL", "FEATURE_FLAG", "SYSTEM", "O_AUTH"];
const valueTypes = ["STRING", "NUMBER", "BOOLEAN", "JSON"];

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
