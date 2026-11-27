<script setup>
import { VueFinalModal, useVfm } from "vue-final-modal";
import { useForm } from "vee-validate";
import { outreachFlagFormSchema } from "~/schemas/outreachFlagSchema";
import { useAdminOutreachFlagsStore } from "~/stores/adminOutreachFlags.store.js";
import { useAuthStore } from "~/stores/auth.store.js";
import { useErrorStore } from "~/stores/error.store.js";
import { formatDate, logger } from "~/utils/helpers.js";
import {
  OUTREACH_STATUS_OPTIONS,
  CLOSED_OUTREACH_STATUSES,
  outreachStatusBadge,
  outreachReasonLabels,
  outreachActionLabels,
  lifecycleStageLabels,
  humanizeMetricKey,
  formatMetricValue,
} from "~/utils/outreachFlags.js";

const props = defineProps({
  flag: { type: Object, default: null },
});
const emit = defineEmits(["saved", "closed"]);

const flagsStore = useAdminOutreachFlagsStore();
const authStore = useAuthStore();
const errorStore = useErrorStore();
const vfm = useVfm();

function valuesFor(flag) {
  return {
    status: flag?.status ?? "OPEN",
    assigneeEmail: flag?.assigneeEmail ?? "",
    pauseAutomatedEmails: Boolean(flag?.pauseAutomatedEmails),
    note: "",
  };
}

const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: outreachFlagFormSchema,
  initialValues: valuesFor(null),
});
const [status] = defineField("status");
const [assigneeEmail] = defineField("assigneeEmail");
const [pauseAutomatedEmails] = defineField("pauseAutomatedEmails");
const [note] = defineField("note");

watch(
  () => props.flag,
  (flag) => {
    resetForm({ values: valuesFor(flag) });
    errorStore.setValidationErrors({});
  },
  { immediate: true },
);

const isClosedStatus = computed(() => CLOSED_OUTREACH_STATUSES.includes(status.value));
// A closed flag cannot pause emails, and closing a flag turns the pause off.
watch(isClosedStatus, (closed) => {
  if (closed) pauseAutomatedEmails.value = false;
});

const metricRows = computed(() =>
  Object.entries(props.flag?.metricsSnapshot || {}).map(([key, value]) => ({
    label: humanizeMetricKey(key),
    value: formatMetricValue(value),
  })),
);

// Only what the admin changed is sent. The endpoint answers 422 when the update is empty.
const changes = computed(() => {
  const flag = props.flag;
  if (!flag) return {};
  const payload = {};
  if (status.value !== flag.status) payload.status = status.value;
  const nextAssigneeEmail = (assigneeEmail.value || "").trim();
  if (nextAssigneeEmail !== (flag.assigneeEmail ?? "")) {
    payload.assigneeEmail = nextAssigneeEmail;
    // The id must follow the email, otherwise a stale id would stay on the flag.
    payload.assigneeId = nextAssigneeEmail && nextAssigneeEmail === authStore.user?.email ? authStore.user.id : "";
  }
  if (pauseAutomatedEmails.value !== Boolean(flag.pauseAutomatedEmails)) {
    payload.pauseAutomatedEmails = pauseAutomatedEmails.value;
  }
  if ((note.value || "").trim()) payload.note = note.value.trim();
  return payload;
});
const hasChanges = computed(() => Object.keys(changes.value).length > 0);

function assignToMe() {
  assigneeEmail.value = authStore.user?.email || "";
}

function handleClose(close) {
  if (typeof close === "function") {
    close();
  } else {
    vfm.close("outreachFlagModal");
  }
  emit("closed");
}

const submit = handleSubmit(async () => {
  if (!props.flag || !hasChanges.value) return;
  try {
    await flagsStore.updateFlag(props.flag.id, changes.value);
    emit("saved");
    handleClose();
  } catch (err) {
    logger.error("Failed to update outreach flag", err);
  }
});
</script>

<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="outreachFlagModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div
      v-if="flag"
      class="w-[calc(100vw-3.2rem)] sm:w-[720px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]"
    >
      <div class="bg-white rounded-[12px] shadow-xl overflow-hidden border border-[#E0E0E0]">
        <!-- Header: who, and why we flagged them -->
        <div class="flex items-start justify-between gap-[1.2rem] px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div>
            <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">{{ flag.storeName || flag.slug || flag.tenantId }}</h2>
            <div class="mt-[0.6rem] flex flex-wrap items-center gap-[0.8rem]">
              <span class="rounded-full bg-primary/10 px-[1rem] py-[0.2rem] text-[1.2rem] font-[700] text-primary">
                {{ outreachReasonLabels[flag.reason] || flag.reason }}
              </span>
              <span class="rounded-full bg-slate-100 px-[1rem] py-[0.2rem] text-[1.2rem] font-[700] text-slate-700">
                Suggested: {{ outreachActionLabels[flag.suggestedAction] || flag.suggestedAction }}
              </span>
              <span
                :class="['rounded-full px-[1rem] py-[0.2rem] text-[1.2rem] font-[700]', outreachStatusBadge[flag.status]?.class]"
              >
                {{ outreachStatusBadge[flag.status]?.label || flag.status }}
              </span>
            </div>
            <NuxtLink
              :to="`/dashboard/merchants/${flag.tenantId}`"
              class="mt-[0.8rem] inline-flex items-center gap-[0.4rem] text-[1.3rem] font-[700] text-primary hover:underline"
              @click="handleClose(close)"
            >
              View merchant and contact details
              <span class="material-symbols-outlined text-[1.6rem]">arrow_forward</span>
            </NuxtLink>
          </div>
          <button
            type="button"
            class="p-[0.4rem] rounded-[6px] hover:bg-[#EBEBEB] transition-colors cursor-pointer text-[#616161]"
            @click="handleClose(close)"
          >
            <span class="material-symbols-outlined text-[2.4rem]">close</span>
          </button>
        </div>

        <div class="p-[2.4rem] flex flex-col gap-y-[2.4rem]">
          <!-- Why we flagged them -->
          <section class="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[1.6rem] space-y-[1rem]">
            <div class="grid grid-cols-2 gap-[1.2rem] text-[1.3rem] sm:grid-cols-4">
              <div>
                <p class="text-[1.1rem] font-[700] uppercase tracking-wider text-slate-500">Raised</p>
                <p class="font-[600] text-slate-900">{{ formatDate(flag.raisedAt) }}</p>
              </div>
              <div>
                <p class="text-[1.1rem] font-[700] uppercase tracking-wider text-slate-500">Stage then</p>
                <p class="font-[600] text-slate-900">{{ lifecycleStageLabels[flag.raisedAtStage] || flag.raisedAtStage || "—" }}</p>
              </div>
              <div>
                <p class="text-[1.1rem] font-[700] uppercase tracking-wider text-slate-500">Emails sent</p>
                <p class="font-[600] text-slate-900">{{ flag.lifecycleEmailsSentCount }}</p>
              </div>
              <div>
                <p class="text-[1.1rem] font-[700] uppercase tracking-wider text-slate-500">Automated emails</p>
                <p :class="['font-[600]', flag.pauseAutomatedEmails ? 'text-amber-700' : 'text-slate-900']">
                  {{ flag.pauseAutomatedEmails ? "Paused" : "Sending" }}
                </p>
              </div>
            </div>
            <div v-if="metricRows.length" class="border-t border-[#E2E8F0] pt-[1rem]">
              <p class="mb-[0.6rem] text-[1.1rem] font-[700] uppercase tracking-wider text-slate-500">What we saw</p>
              <dl class="grid grid-cols-1 gap-x-[2rem] gap-y-[0.4rem] text-[1.3rem] sm:grid-cols-2">
                <div v-for="row in metricRows" :key="row.label" class="flex justify-between gap-[1rem]">
                  <dt class="text-slate-600">{{ row.label }}</dt>
                  <dd class="font-[600] text-slate-900 text-right">{{ row.value }}</dd>
                </div>
              </dl>
            </div>
          </section>

          <!-- Update -->
          <form class="flex flex-col gap-y-[1.8rem]" @submit.prevent="submit">
            <BaseSelectInput
              v-model="status"
              name="status"
              label="Status"
              :options="OUTREACH_STATUS_OPTIONS"
              :error="errors.status || errorStore.validationErrors?.status"
            />

            <div class="space-y-[0.6rem]">
              <AppInput
                v-model="assigneeEmail"
                name="assigneeEmail"
                type="email"
                label="Assigned to (email)"
                placeholder="Nobody yet"
                :error="errors.assigneeEmail || errorStore.validationErrors?.assigneeEmail"
              />
              <div class="flex items-center gap-[1.2rem] text-[1.3rem]">
                <button type="button" class="font-[700] text-primary hover:underline" @click="assignToMe">Assign to me</button>
                <button
                  v-if="assigneeEmail"
                  type="button"
                  class="font-[600] text-slate-600 hover:underline"
                  @click="assigneeEmail = ''"
                >
                  Unassign
                </button>
              </div>
            </div>

            <label
              :class="['flex items-start gap-[1rem] rounded-[10px] border border-[#E2E8F0] p-[1.4rem]', isClosedStatus ? 'opacity-60' : 'cursor-pointer']"
            >
              <input v-model="pauseAutomatedEmails" type="checkbox" class="mt-[0.3rem]" :disabled="isClosedStatus">
              <span>
                <span class="block text-[1.4rem] font-[700] text-[#0F172A]">Pause automated emails for this merchant</span>
                <span class="block text-[1.25rem] text-slate-600">
                  Use this while you are handling them yourself, so they do not get a generic email right after your call.
                  {{ isClosedStatus ? "Not available once the flag is resolved." : "" }}
                </span>
                <span v-if="errorStore.validationErrors?.pauseAutomatedEmails" class="block text-[1.2rem] text-red-600">
                  {{ errorStore.validationErrors.pauseAutomatedEmails }}
                </span>
              </span>
            </label>

            <BaseTextArea
              v-model="note"
              name="note"
              label="Add a note (optional)"
              placeholder="What was said, what happens next"
              :rows="3"
              :error="errors.note"
            />

            <!-- Notes so far -->
            <div v-if="flag.notes?.length" class="space-y-[0.8rem]">
              <p class="text-[1.1rem] font-[700] uppercase tracking-wider text-slate-500">Notes so far</p>
              <div
                v-for="(existingNote, noteIndex) in [...flag.notes].reverse()"
                :key="noteIndex"
                class="rounded-[8px] border border-[#E2E8F0] p-[1.2rem] text-[1.3rem]"
              >
                <p class="text-slate-900">{{ existingNote.body }}</p>
                <p class="mt-[0.4rem] text-[1.15rem] text-slate-500">
                  {{ existingNote.authorEmail || "System" }} · {{ formatDate(existingNote.createdAt) }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-end gap-[1rem] border-t border-[#E0E0E0] pt-[1.6rem]">
              <BaseButton variant="outline" @click="handleClose(close)">Cancel</BaseButton>
              <BaseButton type="submit" :disabled="!hasChanges" :loading="flagsStore.saving">Save changes</BaseButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  </vue-final-modal>
</template>
