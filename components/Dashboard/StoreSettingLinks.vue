<template>
  <section
      class="w-full lg:w-[275px] min-h-auto lg:min-h-[440px] flex flex-col gap-y-[1.2rem] lg:gap-y-[2.4rem] border-b lg:border-r border-[#EBEBEB] lg:border-b-0 lg:border-t-0 lg:border-l-0 pb-[2.4rem] lg:pb-0 mb-[2.4rem] lg:mb-0 ">
    <DashboardSettingsLink
        name="Branding"
        icon="edit"
        link="/dashboard/general-settings/store-settings/branding"
    />
    <DashboardSettingsLink
        name="Social media"
        icon="language"
        link="/dashboard/general-settings/store-settings/social-media"
    />
    <DashboardSettingsLink
        name="Store settings"
        icon="store"
        link="/dashboard/general-settings/store-settings/configuration"
    />

  </section>
</template>

<script setup>
// No props needed for now
</script>
