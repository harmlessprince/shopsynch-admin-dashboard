<template>
  <section class="w-full lg:w-[275px] min-h-auto lg:min-h-[440px] flex flex-col
                  gap-y-[1.2rem] lg:gap-y-[2.4rem] border-b lg:border-r
                  border-[#EBEBEB] lg:border-b-0 pb-[2.4rem] lg:pb-0 mb-[2.4rem] lg:mb-0">
    <DashboardSettingsLink
      name="URL Settings"
      icon="link"
      path-name="dashboard-general-settings-app-settings-url-settings"
    />
    <!-- <DashboardSettingsLink
      name="Payment Settings"
      icon="payments"
      path-name="dashboard-general-settings-app-settings-payment-settings"
    /> -->
    <DashboardSettingsLink
      name="OAuth Settings"
      icon="security"
      path-name="dashboard-general-settings-app-settings-o-auth-settings"
    />
  </section>
</template>
<script setup>

</script>