<script setup>
import {Form} from "vee-validate"; 
import {LoginFormSchema} from "~/schemas/authSchema.ts";

definePageMeta({
  layout: "authentication",
  backgroundImage: "https://res.cloudinary.com/ibreathcode/image/upload/v1748437850/shopsynch/dashboard/auth_bg_first_s2xae6.png",
  description: "Manage ShopSynch platform operations from one dashboard.",
  title: "Admin Dashboard"
})
const authStore = useAuthStore();
const config = useRuntimeConfig();
const appEnv = config.public.appEnv;
const userData = ref({
  password: appEnv === 'development' ? 'password' : '',
  email: appEnv === 'development' ? 'superadmin@yopmail.com' : '',
});
const route = useRoute();
const onSubmit = async (e) => {
  try {
    const redirect = route.query.redirect;
    await authStore.login(userData.value.email, userData.value.password, redirect);
  } catch (e) {
    return e;
  }
};
onMounted(() => {
  authStore.resetAll()
})
</script>
<template>
  <div>
    <TitleMeta title="Login"/>
    <p class="font-[400] text-[1.4rem] text-[#1B1B19] leading-[22.5px]">WELCOME BACK</p>
    <p class="font-[500] text-[25px] leading-[44px] text-[#1B1B19]">Login to continue</p>
    <div class="flex flex-col gap-y-[2.4rem]">
      <Form
          v-slot="{ errors, isSubmitting }" class="mt-[5.5rem] flex flex-col gap-y-[1.6rem]"
          :validation-schema="LoginFormSchema"
          @submit="onSubmit"
      >
        <div>
          <FormLabel name="Email address"/>
          <FormInput v-model="userData.email" type="text" placeholder="Enter your email address" name="email"/>
          <span class="invalid-feedback">{{ errors.email }}</span>
        </div>
        <div>
          <div>
            <FormLabel name="Password"/>
            <FormInput v-model="userData.password" type="password" placeholder="Enter your password" name="password"/>
            <span class="invalid-feedback">{{ errors.password }}</span>
          </div>

          <div
              class="font-[400] text-[14px] leading-[22.5px] text-[#1B1B19] mt-[0.5rem] flex justify-between items-center">
            <span>Forgot your password?</span>
            <NuxtLink to="/forgot-password" class="text-[#003366] font-[700] underline">Reset password</NuxtLink>
          </div>
        </div>

        <div class="my-[0.8rem]">
          <FormButton
              :class="[{ 'disabled-button': isSubmitting }]"
              :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">
                Logging in<span class="dot">.</span><span class="dot delay-200">.</span><span
                class="dot delay-400">.</span>
            </span>
            <span v-else>Login</span>
          </FormButton>
        </div>

      </Form>
      <div class="bg-[#E0E0E0] w-full h-[2px] orLine relative">
        <span class="absolute top-[-1rem] left-[50%] bg-[#fff] font-[700] text-[1.4rem] text-[#212121]">Or</span>
      </div>

      <div>
        <div class="mt-[0.8rem]">
          <FormGoogleButton/>
        </div>
      </div>

    </div>
  </div>

</template>

<style scoped>

</style>
