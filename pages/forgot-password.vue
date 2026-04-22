<script setup>
import {ForgotPasswordSchema} from "~/schemas/authSchema.js";
import {Form} from "vee-validate";

definePageMeta({
  layout: "authentication"
})
const router = useRouter()
const authStore = useAuthStore();
const errorStore = useErrorStore();
const email = ref("")
const onSubmit = async (e) => {
  try {
    // await delay(5000);
    await authStore.requestPasswordReset(email.value);
  } catch (e) {
    return e;
  }
};

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
     <p @click="goBack" class="cursor-pointer font-[400] text-[1.2rem] text-[#1B1B19] leading-[22.5px] flex gap-[5px] items-center">
      <span class="material-symbols-outlined text-[#1B1B19]">arrow_back</span>
      <span>BACK</span>
    </p>
    <p class="font-[500] text-[25px] leading-[44px] text-[#1B1B19]">Request password reset</p>
    <div>

      <Form
          v-slot="{ errors, isSubmitting, meta }" class="mt-[5.5rem] flex flex-col gap-y-[1.6rem]"
          :validation-schema="ForgotPasswordSchema"
          @submit="onSubmit"
      >
        <p v-if="errorStore.getErrorMessage()" class="font-[500] text-[16px] text-red-500">
          {{ errorStore.getErrorMessage() }}</p>
        <div>
          <FormLabel name="Email address"/>
          <FormInput v-model="email" type="text" placeholder="Enter your email address" name="email"/>
          <span class="invalid-feedback">{{ errors.email }}</span>
        </div>

        <div class="my-[0.8rem]">
          <FormSubmitButton
              label="Request reset"
              submitting-label="Requesting"
              :disabled="!meta.valid || !meta.dirty"
              :is-submitting="isSubmitting"
          />
        </div>

      </Form>
    </div>
  </div>
</template>

<style scoped>

</style>