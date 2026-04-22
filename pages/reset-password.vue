<script setup>
import {ResetPasswordSchema} from "~/schemas/authSchema.js";
import {Form} from "vee-validate";
import zxcvbn from "zxcvbn";
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "authentication",
  middleware: 'protect-flow-page',
})
const authStore = useAuthStore();
const route = useRoute()
const token = route.query?.token || authStore.forgotPasswordToken;
const loading = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const result = computed(() => newPassword.value.length > 1 ? zxcvbn(newPassword.value) : null)
const strength = computed(() => zxcvbn(newPassword.value))
const suggestions = computed(() => result.value?.feedback.suggestions || [])
const strengthColor = computed(() => {
  if (!result.value) return 'bg-transparent'
  return ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][result.value.score]
})

async function onsubmit() {
  if (!token) {
    navigateTo("/login");
  }
  try {
    loading.value = true;
    await authStore.resetPassword(token, newPassword.value, confirmPassword.value);
  } catch (e) {
    logger.error("Failed to reset password", e)
  } finally {
    loading.value = false;
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>
<template>
  <div class="">
    <p @click="goBack" class="mb-[2rem] cursor-pointer font-[400] text-[1.2rem] text-[#1B1B19] leading-[22.5px] flex gap-[5px] items-center">
      <span class="material-symbols-outlined text-[#1B1B19]">arrow_back</span>
      <span>BACK</span>
    </p>
    <p class="font-[500] text-[25px] leading-[44px] text-[#1B1B19]">Reset password</p>
    <Form
        v-slot="{ errors, isSubmitting, meta }" class="mt-[5.5rem] flex flex-col gap-y-[1.6rem]"
        :validation-schema="ResetPasswordSchema"
        @submit="onsubmit"
    >
      <div>
        <div class="mb-[0.4rem]">
          <FormLabel name="Choose a new password"/>
          <FormInput v-model="newPassword" type="password" placeholder="Enter password" name="newPassword"/>
        </div>
        <div class="w-full">
          <div class="flex items-center justify-between w-full">
            <div class="font-normal text-[#1B1B19] text-[1rem] whitespace-nowrap">
              Choose a strong password
            </div>
            <div class="h-2 bg-[#E0E0E0] rounded w-[17rem]">
              <div
                  :class="`h-2 rounded transition-all ${strengthColor}`"
                  :style="{ width: `${(strength.score + 1) * 20}%` }"
              />
            </div>
          </div>
          <ul v-if="suggestions.length" class="text-md text-gray-600 list-disc list-inside font-normal">
            <li v-for="(suggestion, index) in suggestions" :key="index">{{ suggestion }}</li>
          </ul>
        </div>
        <span class="invalid-feedback">{{ errors.newPassword }}</span>
      </div>
      <div>
        <FormLabel name="Confirm Password"/>
        <FormInput
            v-model="confirmPassword" type="password" placeholder="Enter your password"
            name="confirmPassword"
        />
        <span class="invalid-feedback">{{ errors.confirmPassword }}</span>
      </div>
      <div>
        <FormSubmitButton
            label="Reset Password"
            submitting-label="Please wait"
            :disabled="!meta.valid || !meta.dirty"
            :is-submitting="isSubmitting"
        />
      </div>
    </Form>
  </div>
</template>

<style scoped>

</style>
