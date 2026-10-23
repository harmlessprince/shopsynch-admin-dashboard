<template>
  <DashboardEmptySettingNotice
    setting-key="platformPaymentAlertEmails"
    category="PAYMENT"
    title="Nobody is emailed about payment problems"
    link-label="Set the recipients in Settings"
    test-id="payment-alert-emails-warning"
  >
    Payment Alert Emails is empty, so these alerts are only written to the server log: rejected or recovered
    gateway credentials, gateway circuits opening or closing, a low payment success rate, unmatched or repeatedly
    failing webhooks, and subscription refunds that need a person.
  </DashboardEmptySettingNotice>
</template>
