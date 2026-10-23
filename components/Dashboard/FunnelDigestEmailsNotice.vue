<template>
  <DashboardEmptySettingNotice
    setting-key="merchantFunnelWeeklyDigestEmails"
    category="SYSTEM"
    anchor="setting-merchantFunnelWeeklyDigestEmails"
    tone="info"
    icon="mail"
    title="The weekly funnel digest goes to every Super Admin"
    link-label="Choose the recipients in Settings"
    test-id="funnel-digest-emails-notice"
  >
    Weekly Merchant Funnel Digest Emails is empty, so the Monday activation digest falls back to every Super Admin
    user. Set it to send the digest only to the people who act on it.
  </DashboardEmptySettingNotice>
</template>
