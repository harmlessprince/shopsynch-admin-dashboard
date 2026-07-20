<script setup>
const props = defineProps({
  open: { type: Boolean, required: true },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(["update:open", "submit"]);

const overrideStatuses = [
  { value: "HIDDEN", label: "Hidden" },
  { value: "COMING_SOON", label: "Coming Soon" },
  { value: "BETA", label: "Beta" },
  { value: "ENABLED", label: "Enabled" },
  { value: "DEPRECATED", label: "Deprecated" }
];

const form = ref({
  tenantId: "",
  status: "HIDDEN",
  reason: "",
  expiresAt: "",
  adminNotes: "",
});

function resetForm() {
  form.value = {
    tenantId: "",
    status: "HIDDEN",
    reason: "",
    expiresAt: "",
    adminNotes: "",
  };
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetForm();
    }
  }
);

function handleSubmit() {
  if (!form.value.tenantId || !form.value.status) return;

  const payload = { ...form.value };

  // Clean empty/falsy optional values to match the API requirements
  if (!payload.expiresAt) delete payload.expiresAt;
  if (!payload.adminNotes) delete payload.adminNotes;
  if (!payload.reason) delete payload.reason;

  emit("submit", payload);
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-[1.6rem]"
    @click.self="emit('update:open', false)"
  >
    <div class="w-full max-w-[480px] rounded-[12px] bg-white p-[2.4rem] shadow-xl">
      <!-- Header -->
      <div class="mb-[2rem] flex items-center justify-between">
        <h2 class="text-[1.8rem] font-[700] text-[#000]">Add Tenant Override</h2>
        <button class="text-gray-400 hover:text-gray-600" @click="emit('update:open', false)">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Form -->
      <form class="space-y-[1.4rem]" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-[0.4rem] block font-[600] text-gray-700">Tenant ID <span class="text-red-500">*</span></label>
          <input
            v-model="form.tenantId"
            type="text"
            class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] font-mono"
            placeholder="Tenant UUID or ID"
            required
          >
        </div>

        <div>
          <label class="mb-[0.4rem] block font-[600] text-gray-700">Override Status <span class="text-red-500">*</span></label>
          <select
            v-model="form.status"
            class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] bg-white"
            required
          >
            <option v-for="s in overrideStatuses" :key="s.value" :value="s.value">
              {{ s.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-[0.4rem] block font-[600] text-gray-700">Reason</label>
          <input
            v-model="form.reason"
            type="text"
            class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Why this override is being applied"
          >
        </div>

        <div>
          <label class="mb-[0.4rem] block font-[600] text-gray-700">Expires At</label>
          <input
            v-model="form.expiresAt"
            type="date"
            class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
          >
          <p class="mt-[0.2rem] text-[1.1rem] text-gray-400">Date when the override automatically expires</p>
        </div>

        <div>
          <label class="mb-[0.4rem] block font-[600] text-gray-700">Admin Notes</label>
          <textarea
            v-model="form.adminNotes"
            rows="2"
            class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            placeholder="Internal notes for other admins"
          />
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-[1.2rem] pt-[0.8rem] border-t border-slate-100">
          <button
            type="button"
            class="rounded-[8px] border border-slate-200 px-[1.6rem] py-[0.9rem] font-[600] text-gray-600 hover:bg-gray-50"
            @click="emit('update:open', false)"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading || !form.tenantId"
            class="rounded-[8px] bg-primary px-[1.6rem] py-[0.9rem] font-[700] text-white disabled:opacity-50"
          >
            {{ loading ? "Applying..." : "Apply Override" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
