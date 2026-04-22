<script setup>
import {useErrorStore} from "~/stores/error.store.js";
import SuccessfulGif from "~/components/SuccessfulGif.vue";
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "authentication",
  middleware: 'protect-flow-page',
  description: "We sent you an email containing the verification code. Please check your mail and click on the verification link or input the verification code to proceed",
  title: "Please verify your identity to proceed with the reset password.",
})
const route = useRoute();
const router = useRouter();
const email = route.query?.email || null
const token = route.query?.token || null
const authStore = useAuthStore();
const toastStore = useToastStore();
const isVerifying = ref(false)
const isVerified = ref(false)
const errorStore = useErrorStore();
const code = ref('')

async function verifyToken() {
  if (!code.value) {
    toastStore.error("Verification code is required", "error");
  }
  isVerifying.value = true;
  await authStore.verifyPasswordResetToken(authStore.forgotPasswordTokenEmail, code.value);
  isVerifying.value = false
}

onMounted(async () => {
  if (email && token) {
    try {
      isVerifying.value = true;
      await authStore.verifyPasswordResetToken(email, token);
      isVerifying.value = false
    } catch (error) {
      logger.error("Failed to verify reset token", error)
      isVerifying.value = false
    }
  }
})

 function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>
<template>
  <div class=" text-[#1B1B19]">
      <p @click="goBack" class="mb-[2rem] cursor-pointer font-[400] text-[1.2rem] text-[#1B1B19] leading-[22.5px] flex gap-[5px] items-center">
      <span class="material-symbols-outlined text-[#1B1B19]">arrow_back</span>
      <span>BACK</span>
    </p>
    
    <p class="font-[400] text-[1.4rem] leading-[22.5px]">LET'S GET YOU VERIFIED</p>
    <p class="font-[500] text-[25px] leading-[44px]">Reset Password OTP verification pending</p>
    <div v-if="email && token">
      <div class="my-[22.0rem] text-center flex items-center justify-center p-5">
        <Spinner v-if="isVerifying"/>
        <SuccessfulGif v-if="!isVerifying && !errorStore.getErrorMessage()" width="150px" height="150px"/>
        <p v-if="errorStore.getErrorMessage()" class="font-[500] text-[16px] text-red-500">
          {{ errorStore.getErrorMessage() }}</p>

      </div>
    </div>
    <div v-else>
      <div v-if="!isVerified" class="mt-[3.0rem] text-left flex flex-col text-[16px]">
        <p class=" font-[400] mb-[2.4rem]">
          An email containing the verification code has been sent to {{ authStore.emailToVerify }}.
          Please enter the code in the field below to proceed or click on the link in the mail to proceed.
        </p>

        <p v-if="errorStore.getErrorMessage()" class="font-[500] text-[16px] text-red-500">
          {{ errorStore.getErrorMessage() }}</p>

        <div class="mb-[2.4rem]">
          <FormLabel name="Verification Code"/>
          <FormInput v-model="code" type="text" placeholder="Enter Verification Code" name="code"/>
        </div>


        <FormButton
            :class="{ 'disabled-button': code.length < 6 || isVerifying}"
            :disabled="code.length < 6 || isVerifying"
            @click="verifyToken"
        >
            <span v-if="isVerifying">
                Verifying <span class="dot">.</span><span class="dot delay-200">.</span><span
                class="dot delay-400">.</span>
            </span>
          <span v-else>Verify</span>
        </FormButton>

      </div>
    </div>
  </div>

</template>

<style scoped>

</style>
