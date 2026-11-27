<script setup>
import { VueFinalModal, useVfm } from "vue-final-modal";
import { useForm } from "vee-validate";
import { sendTestEmailFormSchema } from "~/schemas/lifecycleSchema";
import { useAdminLifecycleStore } from "~/stores/adminLifecycle.store.js";
import { useAuthStore } from "~/stores/auth.store.js";
import { useErrorStore } from "~/stores/error.store.js";
import { logger } from "~/utils/helpers.js";
import { lifecycleStageLabels, humanizeMetricKey } from "~/utils/outreachFlags.js";
import { lifecycleStageBadge, classificationBadge, skipReasonLabels } from "~/utils/lifecycle.js";

// The row from the lifecycle store list: tenantId, storeName, classification, lifecycleMessagingTestEnabled.
const props = defineProps({
  store: { type: Object, default: null },
});
const emit = defineEmits(["closed"]);

const lifecycleStore = useAdminLifecycleStore();
const authStore = useAuthStore();
const errorStore = useErrorStore();
const vfm = useVfm();

const preview = ref(null);
const previewLoading = ref(false);
const previewError = ref("");

const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: sendTestEmailFormSchema,
  initialValues: { recipientEmail: "" },
});
const [recipientEmail] = defineField("recipientEmail");

const isRealStore = computed(() => props.store?.classification === "REAL");
const testEmailEnabled = computed(() => Boolean(props.store?.lifecycleMessagingTestEnabled));
// Test sends go to the admin by default, so trying a preview never emails a merchant by accident.
const canSendTest = computed(() => !isRealStore.value && testEmailEnabled.value && Boolean(preview.value?.eligible));

async function loadPreview(store) {
  preview.value = null;
  previewError.value = "";
  errorStore.setValidationErrors({});
  resetForm({ values: { recipientEmail: authStore.user?.email || "" } });
  if (!store) return;

  previewLoading.value = true;
  try {
    preview.value = await lifecycleStore.previewEmail(store.tenantId);
  } catch (err) {
    previewError.value = "Unable to build the preview for this store.";
    logger.error("Failed to load the lifecycle email preview", err);
  } finally {
    previewLoading.value = false;
  }
}

watch(() => props.store, loadPreview, { immediate: true });

async function enableTestEmails() {
  try {
    await lifecycleStore.setTestEnabled(props.store.tenantId, true);
  } catch (err) {
    logger.error("Failed to turn on test emails", err);
  }
}

const sendTest = handleSubmit(async (values) => {
  try {
    await lifecycleStore.sendTestEmail(props.store.tenantId, values.recipientEmail);
  } catch (err) {
    logger.error("Failed to send the lifecycle test email", err);
  }
});

function handleClose(close) {
  if (typeof close === "function") {
    close();
  } else {
    vfm.close("lifecycleEmailPreviewModal");
  }
  emit("closed");
}
</script>

<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="lifecycleEmailPreviewModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div
      v-if="store"
      class="w-[calc(100vw-3.2rem)] sm:w-[820px] max-h-[92vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]"
    >
      <div class="bg-white rounded-[12px] shadow-xl overflow-hidden border border-[#E0E0E0]">
        <div class="flex items-start justify-between gap-[1.2rem] px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div>
            <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">{{ store.storeName || store.slug || store.tenantId }}</h2>
            <p class="text-[1.3rem] text-[#616161]">The email this store would get right now. Nothing is sent or logged by looking.</p>
            <div class="mt-[0.6rem] flex flex-wrap items-center gap-[0.8rem]">
              <span :class="['rounded-full px-[1rem] py-[0.2rem] text-[1.2rem] font-[700]', lifecycleStageBadge[store.stage]]">
                {{ lifecycleStageLabels[store.stage] || store.stage }}
              </span>
              <span :class="['rounded-full px-[1rem] py-[0.2rem] text-[1.2rem] font-[700]', classificationBadge[store.classification]?.class]">
                {{ classificationBadge[store.classification]?.label || store.classification }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="p-[0.4rem] rounded-[6px] hover:bg-[#EBEBEB] transition-colors cursor-pointer text-[#616161]"
            @click="handleClose(close)"
          >
            <span class="material-symbols-outlined text-[2.4rem]">close</span>
          </button>
        </div>

        <div class="p-[2.4rem] flex flex-col gap-y-[2rem]">
          <div v-if="previewLoading" class="flex items-center justify-center py-[4rem] text-[#616161]">
            <span class="animate-spin material-symbols-outlined mr-[1rem] text-[2.4rem] text-primary">progress_activity</span>
            Building the email...
          </div>

          <div v-else-if="previewError" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.4rem] text-red-700">
            {{ previewError }}
          </div>

          <!-- No email would go out -->
          <div
            v-else-if="preview && !preview.eligible"
            class="rounded-[8px] border border-amber-300 bg-amber-50 p-[1.6rem] text-amber-950"
          >
            <p class="text-[1.5rem] font-[700]">No email would be sent to this store right now</p>
            <p class="mt-[0.4rem] text-[1.3rem]">
              {{ skipReasonLabels[preview.skipReason] || preview.skipReason }}.
            </p>
          </div>

          <template v-else-if="preview">
            <div class="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[1.6rem] space-y-[0.6rem]">
              <p class="text-[1.1rem] font-[700] uppercase tracking-wider text-slate-500">Subject</p>
              <p class="text-[1.6rem] font-[700] text-slate-900">{{ preview.subject }}</p>
              <div class="flex flex-wrap items-center gap-[0.8rem] text-[1.25rem] text-slate-600">
                <span v-if="preview.tipKey">Tip: <strong class="text-slate-900">{{ humanizeMetricKey(preview.tipKey) }}</strong></span>
                <span v-else>Weekly performance report</span>
                <span
                  v-if="preview.waitingOnPlatform"
                  class="rounded-full bg-blue-100 px-[0.9rem] py-[0.1rem] text-[1.15rem] font-[700] text-blue-800"
                >
                  "We are reviewing your documents" version
                </span>
              </div>
            </div>

            <!-- Scripts and navigation are blocked inside the frame, it only shows the email. -->
            <iframe
              :srcdoc="preview.html"
              sandbox=""
              title="Email preview"
              class="w-full h-[480px] rounded-[10px] border border-[#E2E8F0] bg-white"
            />

            <!-- Send a test -->
            <section class="rounded-[10px] border border-[#E2E8F0] p-[1.6rem] space-y-[1.2rem]">
              <p class="text-[1.5rem] font-[700] text-[#0F172A]">Send a test</p>

              <p v-if="isRealStore" class="text-[1.3rem] text-slate-600">
                Test sends are limited to internal and test stores, so a real merchant never gets one by mistake. The preview above is
                what they would receive.
              </p>

              <template v-else-if="!testEmailEnabled">
                <p class="text-[1.3rem] text-slate-600">
                  Test emails are off for this store. Turn them on to send this email to an inbox you choose.
                </p>
                <BaseButton variant="outline" :loading="lifecycleStore.testActionLoading" @click="enableTestEmails">
                  Turn on test emails for this store
                </BaseButton>
              </template>

              <form v-else-if="canSendTest" class="space-y-[1rem]" @submit.prevent="sendTest">
                <AppInput
                  v-model="recipientEmail"
                  name="recipientEmail"
                  type="email"
                  label="Send the test to"
                  placeholder="you@example.com"
                  :error="errors.recipientEmail || errorStore.validationErrors?.recipientEmail || errorStore.validationErrors?.tenantId || errorStore.validationErrors?.tipKey"
                />
                <BaseButton type="submit" :loading="lifecycleStore.testActionLoading">Send test email</BaseButton>
              </form>
            </section>
          </template>
        </div>
      </div>
    </div>
  </vue-final-modal>
</template>
