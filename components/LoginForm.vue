<script setup>

import {LoginFormSchema} from "~/schemas/authSchema.js";
import {ErrorMessage, Form} from "vee-validate";
import PasswordToggleButton from "~/components/PasswordToggleButton.vue";
import { logger } from "~/utils/helpers.js";

const business_name = ref("");
const email = ref("");
const password = ref("");
const confirm_password = ref("");

function onSubmit(values) {
  logger.log(values);
}
</script>

<template>
  <!-- Form -->
  <Form
      v-slot="{ errors, isSubmitting }"
      :validation-schema="LoginFormSchema"
      @submit="onSubmit"
  >
    {{ errors }}
    <div class="mb-4">
      <AppInput v-model="business_name" type="text" placeholder="Business Name" name="business_name" />
      <AppErrorMessage name="business_name" />
    </div>
    <div class="mb-4">
      <AppInput v-model="email" type="email" placeholder="Email" name="email"/>
    </div>
    <div class="mb-6 relative">
      <AppInput v-model="password" type="password" placeholder="Password" name="password"/>
      <PasswordToggleButton/>
    </div>
    <div class="mb-6 relative">
      <AppInput v-model="confirm_password" type="password" placeholder="Confirm Password" name="confirm_password"/>
      <PasswordToggleButton/>
    </div>
    <div class="flex justify-between mb-7">
      <div class="flex items-center gap-x-3">
        <input
            id="remember"
            type="checkbox"
            class="w-5 h-5 focus:ring-transparent rounded-md border border-bgray-300 focus:accent-success-300 text-success-300 dark:bg-transparent dark:border-darkblack-400"
            name="remember"
        >
        <label for="remember" class="text-bgray-600 dark:text-bgray-50 text-base"
        >By creating an account, you agreeing to our
          <span class="text-bgray-900 dark:text-white">Privacy Policy,</span> and
          <span class="text-bgray-900 dark:text-white"
          >Electronics Communication Policy</span
          >.</label
        >
      </div>
    </div>
    <button
        type="submit"
        class="py-3.5 flex items-center justify-center text-white font-bold bg-primary hover:bg-success-400 transition-all rounded-lg w-full"
    >
      <span v-show="isSubmitting">Submitting</span>
      Sign Up
    </button>
  </Form>
</template>

<style scoped>

</style>
