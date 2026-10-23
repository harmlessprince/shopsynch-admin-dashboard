// Display metadata for subscription refunds. Statuses are defined by the backend's SubscriptionRefundStatus.
export const refundStatusMeta = {
  REQUESTING: { label: "Requesting", badge: "bg-[#FFF9C5] text-[#E79640]", hint: "Saved, waiting for the provider. Usually transient." },
  PENDING: { label: "Pending", badge: "bg-[#FFF9C5] text-[#E79640]", hint: "The provider accepted it. Wait, or refresh." },
  PROCESSING: { label: "Processing", badge: "bg-[#D0E8FF] text-[#335C85]", hint: "The provider is returning the money. Wait, or refresh." },
  NEEDS_ATTENTION: { label: "Needs attention", badge: "bg-[#FFE4C2] text-[#9A4A00]", hint: "Paystack needs the customer's bank details. Act in the Paystack dashboard, then refresh." },
  UNCERTAIN: { label: "Uncertain", badge: "bg-[#FFE4C2] text-[#9A4A00]", hint: "The request got no answer, so nobody knows if it went through. Refresh; never start another refund." },
  PROCESSED: { label: "Processed", badge: "bg-[#B5F9B4] text-[#3CA745]", hint: "Money returned." },
  FAILED: { label: "Failed", badge: "bg-[#FFBFBF] text-[#B42318]", hint: "Refused or never arrived. The payment can be refunded again." },
};

// A refund in one of these states can still change, so the admin can ask the provider about it.
export const refundFinalStatuses = ["PROCESSED", "FAILED"];

export const isRefundFinal = (status) => refundFinalStatuses.includes(status);

export const billingEventLabels = {
  "subscription_refund.requested": "Refund requested",
  "subscription_refund.status_changed": "Refund status changed",
  "merchant_subscription.refunded_period_removed": "Refunded time taken off subscription",
};

export const billingEventLabel = (action) => billingEventLabels[action] || action;
