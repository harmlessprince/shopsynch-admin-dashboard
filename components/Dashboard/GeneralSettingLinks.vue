<template>
  <section
      class="bg-red h-100px w-full lg:w-[275px] min-h-auto lg:min-h-[440px] flex flex-col gap-y-[1.2rem] lg:gap-y-[2.4rem] border-b lg:border-r border-[#EBEBEB] lg:border-b-0 lg:border-t-0 lg:border-l-0 pb-[2.4rem] lg:pb-0 mb-[2.4rem] lg:mb-0 ">
    <DashboardSettingsLink
        name="Personal Profile"
        icon="person"
        path-name="dashboard-general-settings-profile"
    />
    <DashboardSettingsLink
        name="Business details"
        icon="business_center"
        path-name="dashboard-general-settings-profile-business-details"
    />
    <DashboardSettingsLink
        name="Change login password"
        icon="lock"
        path-name="dashboard-general-settings-profile-change-login-password"
    />
    <DashboardSettingsLink
        v-if="!enableChangeWithdrawalPin && config.public.appEnv !== 'production'"
        name="Change withdrawal pin"
        icon="password"
        path-name="dashboard-general-settings-profile-change-withdrawal-pin"
    />

  </section>
</template>
<script setup>
const enableChangeWithdrawalPin = ref(false);
const config = useRuntimeConfig();
</script>