<template>
  <div
    class="fixed inset-0 bg-black/40 backdrop-blur-xs z-[99999999] flex items-center justify-center p-4"
    data-testid="register-merchant-modal-backdrop"
    @click.self="handleClose"
  >
    <div class="w-full max-w-[580px] max-h-[90vh] overflow-y-auto bg-white rounded-[12px] shadow-2xl border border-[#E0E0E0]">
      <!-- Header -->
      <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0] bg-[#FAFAFA]">
        <div class="flex items-center gap-[1.2rem]">
          <div class="w-[4rem] h-[4rem] rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[2.2rem]">store</span>
          </div>
          <div>
            <h2 class="font-[700] text-[1.8rem] text-[#1B1B19]">Register New Merchant</h2>
            <p class="text-[1.3rem] text-[#616161]">Staff-assisted merchant onboarding</p>
          </div>
        </div>
        <button class="p-[0.4rem] rounded-[6px] hover:bg-[#EBEBEB] transition-colors cursor-pointer text-[#616161]" @click="handleClose">
          <span class="material-symbols-outlined text-[2.4rem]">close</span>
        </button>
      </div>

      <!-- Body -->
      <div class="p-[2.4rem] flex flex-col gap-y-[2rem]">
        <!-- Advisory Note -->
        <div class="p-3 rounded-[8px] bg-blue-50 border border-blue-200 text-blue-900 text-[1.3rem] flex items-start gap-2.5">
          <span class="material-symbols-outlined text-blue-600 text-[1.8rem] shrink-0 mt-0.5">info</span>
          <div>
            <p class="font-[500] leading-[1.7rem]">
              Minimal registration creates the merchant and store immediately. A temporary password is generated and the merchant will be required to reset it upon first login.
            </p>
          </div>
        </div>

        <!-- Outcome Warning / Error Callouts -->
        <div
          v-if="outcome === 'EMAIL_ALREADY_REGISTERED_UNVERIFIED'"
          class="p-4 rounded-[8px] bg-amber-50 border border-amber-300 text-amber-950 text-[1.3rem] flex items-start gap-3"
          data-testid="outcome-unverified-alert"
        >
          <span class="material-symbols-outlined text-amber-600 text-[2rem] shrink-0 mt-0.5">warning</span>
          <div>
            <h4 class="font-[700] text-amber-950 text-[1.4rem]">Email Already Registered (Unverified)</h4>
            <p class="mt-1 text-amber-800 leading-[1.8rem]">
              {{ outcomeMessage || "This merchant already started registration but has not verified their email. Advise the merchant to check their inbox for their original setup email." }}
            </p>
          </div>
        </div>

        <div
          v-if="outcome === 'EMAIL_ALREADY_REGISTERED'"
          class="p-4 rounded-[8px] bg-rose-50 border border-rose-300 text-rose-950 text-[1.3rem] flex items-start gap-3"
          data-testid="outcome-verified-alert"
        >
          <span class="material-symbols-outlined text-rose-600 text-[2rem] shrink-0 mt-0.5">error</span>
          <div>
            <h4 class="font-[700] text-rose-950 text-[1.4rem]">Email Already Registered</h4>
            <p class="mt-1 text-rose-800 leading-[1.8rem]">
              {{ outcomeMessage || "An account with this email address already exists and is verified. Duplicate registration is not permitted." }}
            </p>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="flex flex-col gap-y-[1.6rem]">
          <!-- Owner Name -->
          <div>
            <label class="block font-[600] text-[1.4rem] text-[#1B1B19] mb-[0.6rem]">
              Owner Full Name <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.ownerName"
              type="text"
              name="ownerName"
              required
              placeholder="e.g. John Doe"
              class="w-full h-[44px] rounded-[8px] border border-[#E0E0E0] px-[1.4rem] text-[1.4rem] text-[#1B1B19] outline-none focus:border-primary transition-colors"
            />
          </div>

          <!-- Owner Email -->
          <div>
            <label class="block font-[600] text-[1.4rem] text-[#1B1B19] mb-[0.6rem]">
              Owner Email Address <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.ownerEmail"
              type="email"
              name="ownerEmail"
              required
              placeholder="e.g. merchant@example.com"
              class="w-full h-[44px] rounded-[8px] border border-[#E0E0E0] px-[1.4rem] text-[1.4rem] text-[#1B1B19] outline-none focus:border-primary transition-colors"
            />
          </div>

          <!-- Business Name -->
          <div>
            <label class="block font-[600] text-[1.4rem] text-[#1B1B19] mb-[0.6rem]">
              Business / Store Name <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.businessName"
              type="text"
              name="businessName"
              required
              placeholder="e.g. Acme Superstore"
              class="w-full h-[44px] rounded-[8px] border border-[#E0E0E0] px-[1.4rem] text-[1.4rem] text-[#1B1B19] outline-none focus:border-primary transition-colors"
            />
          </div>

          <!-- Footer Buttons -->
          <div class="flex items-center justify-end gap-[1.2rem] pt-[1.6rem] border-t border-[#E0E0E0] mt-[0.8rem]">
            <button
              type="button"
              class="px-[1.8rem] py-[1rem] rounded-[8px] border border-[#E0E0E0] text-[1.4rem] font-[600] text-[#616161] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              @click="handleClose"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-register-merchant"
              :disabled="isSubmitting || !isFormValid"
              class="px-[2.2rem] py-[1rem] rounded-[8px] bg-primary text-white text-[1.4rem] font-[700] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              <span v-if="isSubmitting" class="animate-spin material-symbols-outlined text-[1.8rem]">progress_activity</span>
              <span>{{ isSubmitting ? "Registering..." : "Register Merchant" }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAdminMerchantsStore } from "~/stores/adminMerchants.store.js";
import { useToastStore } from "~/stores/toast.store.js";

const emit = defineEmits(["registered", "closed"]);

const adminMerchantsStore = useAdminMerchantsStore();
const toastStore = useToastStore();

const form = ref({
  ownerName: "",
  ownerEmail: "",
  businessName: "",
});

const isSubmitting = ref(false);
const outcome = ref(null);
const outcomeMessage = ref("");

const isFormValid = computed(() => {
  return (
    form.value.ownerName.trim().length > 0 &&
    form.value.ownerEmail.trim().length > 0 &&
    form.value.businessName.trim().length > 0
  );
});

function resetForm() {
  form.value = {
    ownerName: "",
    ownerEmail: "",
    businessName: "",
  };
  outcome.value = null;
  outcomeMessage.value = "";
}

function handleClose() {
  resetForm();
  emit("closed");
}

async function handleSubmit() {
  if (!isFormValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  outcome.value = null;
  outcomeMessage.value = "";

  try {
    const response = await adminMerchantsStore.registerMerchant({
      ownerName: form.value.ownerName.trim(),
      ownerEmail: form.value.ownerEmail.trim(),
      businessName: form.value.businessName.trim(),
    });

    const result = response?.data;
    if (result?.outcome === "CREATED") {
      toastStore.success(result.message || "Merchant registered successfully", "");
      emit("registered", result);
      handleClose();
    } else if (result?.outcome === "EMAIL_ALREADY_REGISTERED_UNVERIFIED") {
      outcome.value = "EMAIL_ALREADY_REGISTERED_UNVERIFIED";
      outcomeMessage.value = result.message;
    } else if (result?.outcome === "EMAIL_ALREADY_REGISTERED") {
      outcome.value = "EMAIL_ALREADY_REGISTERED";
      outcomeMessage.value = result.message;
    } else {
      // Fallback
      toastStore.success(response?.message || "Merchant registered successfully", "");
      emit("registered", result);
      handleClose();
    }
  } catch (err) {
    outcomeMessage.value = err?.data?.message || err?.message || "An error occurred during registration.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>
