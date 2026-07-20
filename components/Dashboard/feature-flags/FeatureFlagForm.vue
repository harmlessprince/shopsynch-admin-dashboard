<script setup>
const props = defineProps({
  isEdit: { type: Boolean, default: false },
  initialData: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(["submit", "cancel"]);

const defaultStatuses = [
  { value: "HIDDEN", label: "Hidden" },
  { value: "COMING_SOON", label: "Coming Soon" },
  { value: "BETA", label: "Beta" },
  { value: "ENABLED", label: "Enabled" },
  { value: "DEPRECATED", label: "Deprecated" }
];

const categories = ["INSIGHTS", "PAYMENTS", "LOGISTICS", "COMPLIANCE", "GENERAL"];

const form = ref({
  code: "",
  name: "",
  description: "",
  defaultStatus: "HIDDEN",
  category: "",
  displayOrder: null,
  releaseNotes: "",
  targetReleaseDate: "",
  documentation: "",
  requiredPlanTiers: "",
  requiredCountries: "",
  isExperimental: false,
  ownerTeam: "",
  enabled: true,
});

watch(
  () => props.initialData,
  (newVal) => {
    if (newVal) {
      form.value = {
        code: newVal.code || "",
        name: newVal.name || "",
        description: newVal.description || "",
        defaultStatus: newVal.defaultStatus || "HIDDEN",
        category: newVal.category || "",
        displayOrder: newVal.displayOrder ?? null,
        releaseNotes: newVal.releaseNotes || "",
        targetReleaseDate: newVal.targetReleaseDate ? newVal.targetReleaseDate.substring(0, 10) : "",
        documentation: newVal.documentation || newVal.documentationUrl || "",
        requiredPlanTiers: Array.isArray(newVal.requiredPlanTiers)
          ? newVal.requiredPlanTiers.join(", ")
          : newVal.requiredPlanTiers || "",
        requiredCountries: Array.isArray(newVal.requiredCountries)
          ? newVal.requiredCountries.join(", ")
          : newVal.requiredCountries || "",
        isExperimental: newVal.isExperimental ?? false,
        ownerTeam: newVal.ownerTeam || "",
        enabled: newVal.enabled ?? true,
      };
    }
  },
  { immediate: true, deep: true }
);

function handleSubmit() {
  if (!form.value.name) return;
  if (!props.isEdit && !form.value.code) return;

  const payload = { ...form.value };

  // Parse arrays
  payload.requiredPlanTiers = typeof payload.requiredPlanTiers === "string"
    ? payload.requiredPlanTiers.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  payload.requiredCountries = typeof payload.requiredCountries === "string"
    ? payload.requiredCountries.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  // Cleanup fields if they are empty
  if (!payload.displayOrder && payload.displayOrder !== 0) delete payload.displayOrder;
  if (!payload.releaseNotes) delete payload.releaseNotes;
  if (!payload.targetReleaseDate) delete payload.targetReleaseDate;
  if (!payload.documentation) delete payload.documentation;
  if (!payload.ownerTeam) delete payload.ownerTeam;
  if (!payload.category) delete payload.category;

  emit("submit", payload);
}
</script>

<template>
  <form class="space-y-[1.6rem]" @submit.prevent="handleSubmit">
    <!-- Code & Name -->
    <div class="grid grid-cols-1 gap-[1.2rem] md:grid-cols-2">
      <div>
        <label class="mb-[0.4rem] block font-[600] text-gray-700">Code <span v-if="!isEdit" class="text-red-500">*</span></label>
        <input
          v-model="form.code"
          type="text"
          :disabled="isEdit"
          class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] font-mono uppercase disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="e.g. INSIGHTS_V2"
          required
        >
      </div>
      <div>
        <label class="mb-[0.4rem] block font-[600] text-gray-700">Name <span class="text-red-500">*</span></label>
        <input
          v-model="form.name"
          type="text"
          class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="Human-readable name"
          required
        >
      </div>
    </div>

    <!-- Description -->
    <div>
      <label class="mb-[0.4rem] block font-[600] text-gray-700">Description</label>
      <textarea
        v-model="form.description"
        rows="2"
        class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
        placeholder="What feature this flag controls"
      />
    </div>

    <!-- Default Status & Category -->
    <div class="grid grid-cols-1 gap-[1.2rem] md:grid-cols-2">
      <div>
        <label class="mb-[0.4rem] block font-[600] text-gray-700">Default Status</label>
        <select
          v-model="form.defaultStatus"
          class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] bg-white"
        >
          <option v-for="s in defaultStatuses" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>
      </div>
      <div>
        <label class="mb-[0.4rem] block font-[600] text-gray-700">Category</label>
        <select
          v-model="form.category"
          class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] bg-white"
        >
          <option value="">— None —</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>

    <!-- Display Order & Owner Team -->
    <div class="grid grid-cols-1 gap-[1.2rem] md:grid-cols-2">
      <div>
        <label class="mb-[0.4rem] block font-[600] text-gray-700">Owner Team</label>
        <input
          v-model="form.ownerTeam"
          type="text"
          class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="e.g. Platform Team"
        >
      </div>
      <div>
        <label class="mb-[0.4rem] block font-[600] text-gray-700">Display Order</label>
        <input
          v-model.number="form.displayOrder"
          type="number"
          class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="e.g. 10"
        >
      </div>
    </div>

    <!-- Target Release Date & Documentation URL -->
    <div class="grid grid-cols-1 gap-[1.2rem] md:grid-cols-2">
      <div>
        <label class="mb-[0.4rem] block font-[600] text-gray-700">Target Release Date</label>
        <input
          v-model="form.targetReleaseDate"
          type="date"
          class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
        >
      </div>
      <div>
        <label class="mb-[0.4rem] block font-[600] text-gray-700">Documentation URL</label>
        <input
          v-model="form.documentation"
          type="url"
          class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="https://docs.shopsynch.com/..."
        >
      </div>
    </div>

    <!-- Required Plan Tiers & Countries -->
    <div class="grid grid-cols-1 gap-[1.2rem] md:grid-cols-2">
      <div>
        <label class="mb-[0.4rem] block font-[600] text-gray-700">Required Plan Tiers</label>
        <input
          v-model="form.requiredPlanTiers"
          type="text"
          class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="e.g. BASIC, GROWTH, ENTERPRISE"
        >
        <p class="mt-[0.2rem] text-[1.1rem] text-gray-400">Comma-separated values</p>
      </div>
      <div>
        <label class="mb-[0.4rem] block font-[600] text-gray-700">Required Countries</label>
        <input
          v-model="form.requiredCountries"
          type="text"
          class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          placeholder="e.g. US, CA, GB"
        >
        <p class="mt-[0.2rem] text-[1.1rem] text-gray-400">Comma-separated ISO 2-letter country codes</p>
      </div>
    </div>

    <!-- Release Notes -->
    <div>
      <label class="mb-[0.4rem] block font-[600] text-gray-700">Release Notes</label>
      <textarea
        v-model="form.releaseNotes"
        rows="3"
        class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
        placeholder="Optional release details..."
      />
    </div>

    <!-- Toggles (Enabled & Experimental) -->
    <div class="flex flex-wrap gap-[2.4rem] items-center pt-[0.4rem]">
      <div class="flex items-center gap-[1rem]">
        <label class="font-[600] text-gray-700">Enabled</label>
        <button
          type="button"
          :class="form.enabled ? 'bg-primary' : 'bg-gray-300'"
          class="relative inline-flex h-[24px] w-[44px] items-center rounded-full transition-colors"
          @click="form.enabled = !form.enabled"
        >
          <span
            :class="form.enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'"
            class="inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition-transform"
          />
        </button>
      </div>

      <div class="flex items-center gap-[1rem]">
        <label class="font-[600] text-gray-700">Experimental Feature</label>
        <button
          type="button"
          :class="form.isExperimental ? 'bg-primary' : 'bg-gray-300'"
          class="relative inline-flex h-[24px] w-[44px] items-center rounded-full transition-colors"
          @click="form.isExperimental = !form.isExperimental"
        >
          <span
            :class="form.isExperimental ? 'translate-x-[22px]' : 'translate-x-[2px]'"
            class="inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition-transform"
          />
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-[1.2rem] pt-[1.2rem] border-t border-slate-100">
      <button
        type="button"
        class="rounded-[8px] border border-slate-200 px-[1.6rem] py-[0.9rem] font-[600] text-gray-600 hover:bg-gray-50"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        :disabled="loading || (!isEdit && !form.code) || !form.name"
        class="rounded-[8px] bg-primary px-[1.6rem] py-[0.9rem] font-[700] text-white disabled:opacity-50"
      >
        <span v-if="loading">Saving...</span>
        <span v-else>{{ isEdit ? 'Save Changes' : 'Create' }}</span>
      </button>
    </div>
  </form>
</template>
