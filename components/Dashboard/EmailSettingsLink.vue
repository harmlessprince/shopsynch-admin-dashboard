<template>
    <section class="w-full lg:w-[250px] min-h-auto lg:min-h-[440px] flex flex-col gap-y-[1.2rem] lg:gap-y-[2.4rem] border-b lg:border-r border-[#EBEBEB] lg:border-b-0 lg:border-t-0 lg:border-l-0 pb-[2.4rem] lg:pb-0 mb-[2.4rem] lg:mb-0">
    <DashboardSettingsLink
    name="Email verification"
    icon="mail"
    link="/dashboard/general-settings/email/verification"
    />
    <DashboardSettingsLink
    name="SMTP settings"
    icon="instant_mix"
    link="/dashboard/general-settings/email/smtp_settings"
    />
    <DashboardSettingsLink
    name="Customize email"
    icon="brush"
    link="/dashboard/general-settings/email/customize_email"
    />
    <DashboardSettingsLink
    name="Email notification"
    icon="notifications_active"
    link="/dashboard/general-settings/email/email_notification"
    />
   
</section>
</template>