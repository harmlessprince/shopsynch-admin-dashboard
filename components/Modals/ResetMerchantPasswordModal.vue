<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="resetMerchantPasswordModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div
      class="w-[calc(100vw-3.2rem)] sm:w-[480px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]"
      data-testid="reset-merchant-password-modal"
    >
      <div class="bg-white rounded-[12px] shadow-2xl border border-[#E0E0E0] overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div class="flex items-center gap-[1.2rem]">
            <div class="w-[4rem] h-[4rem] rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <span class="material-symbols-outlined text-[2.2rem]">password</span>
            </div>
            <div>
              <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">Reset Merchant Password</h2>
              <p class="text-[1.3rem] text-[#616161]">Require a merchant to set a new password</p>
            </div>
          </div>
          <button
            class="p-[0.4rem] rounded-[6px] hover:bg-[#EBEBEB] transition-colors cursor-pointer text-[#616161]"
            @click="handleClose(close)"
          >
            <span class="material-symbols-outlined text-[2.4rem]">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-[2.4rem] flex flex-col gap-y-[2rem]">
          <div class="p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-900 text-[1.3rem] flex items-start gap-2.5">
            <span class="material-symbols-outlined text-amber-600 text-[1.8rem] shrink-0 mt-0.5">warning</span>
            <div>
              <p class="font-[500] leading-[1.7rem]">
                Type <strong class="font-mono text-amber-950">{{ expectedEmail }}</strong> to initiate password reset for this merchant.
              </p>
              <p class="mt-1 text-[1.2rem] text-amber-800 leading-[1.7rem]">
                The merchant will be required to set a new password the next time they log in.
              </p>
            </div>
          </div>

          <div>
            <label class="block font-[600] text-[1.4rem] text-[#1B1B19] mb-[0.6rem]">
              Merchant Email <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="email"
              type="email"
              placeholder="e.g. merchant@example.com"
              class="w-full h-[44px] rounded-[8px] border px-[1.4rem] text-[1.4rem] text-[#1B1B19] outline-none transition-colors"
              :class="error ? 'border-rose-400 bg-rose-50' : 'border-[#E0E0E0] focus:border-primary'"
            />
            <span v-if="error" class="text-[1.2rem] text-rose-500 mt-1 block">{{ error }}</span>
          </div>

          <!-- Footer Buttons -->
          <div class="flex items-center justify-end gap-[1.2rem] pt-[1.6rem] border-t border-[#E0E0E0]">
            <button
              type="button"
              class="px-[1.8rem] py-[1rem] rounded-[8px] border border-[#E0E0E0] text-[1.4rem] font-[600] text-[#616161] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              @click="handleClose(close)"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="confirm-reset-merchant-password"
              :disabled="isSubmitting || !emailMatches"
              class="px-[2.2rem] py-[1rem] rounded-[8px] bg-amber-600 text-white text-[1.4rem] font-[700] hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              @click="submit(close)"
            >
              <span v-if="isSubmitting" class="animate-spin material-symbols-outlined text-[1.8rem]">progress_activity</span>
              <span>{{ isSubmitting ? "Resetting..." : "Reset Password" }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { VueFinalModal, useVfm } from "vue-final-modal";
import { useAdminMerchantsStore } from "~/stores/adminMerchants.store.js";
import { useToastStore } from "~/stores/toast.store.js";

const props = defineProps({
  merchant: { type: Object, default: null },
});
const emit = defineEmits(["reset", "closed"]);

const adminMerchantsStore = useAdminMerchantsStore();
const toastStore = useToastStore();
const vfm = useVfm();

const email = ref("");
const isSubmitting = ref(false);
const error = ref("");

const expectedEmail = computed(() => props.merchant?.owner?.email || "");
const emailMatches = computed(() => email.value.trim().toLowerCase() === expectedEmail.value.trim().toLowerCase());

function handleClose(close) {
  error.value = "";
  email.value = "";
  if (typeof close === "function") {
    close();
  } else {
    vfm.close("resetMerchantPasswordModal");
  }
  emit("closed");
}

async function submit(close) {
  if (isSubmitting.value || !emailMatches.value) return;

  isSubmitting.value = true;
  error.value = "";

  try {
    await adminMerchantsStore.resetMerchantPassword(email.value.trim());
    toastStore.success("Password reset email sent to the merchant.", "");
    emit("reset");
    handleClose(close);
  } catch (err) {
    error.value = err?.data?.message || err?.message || "Failed to trigger the password reset.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>
