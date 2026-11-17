// How an API overage invoice reads in the admin screens, from its status and collection state.
export function overageStateMeta(invoice) {
  if (invoice.status === "PAID" || invoice.collectionState === "PAID") return { label: "Paid", tone: "success" };
  if (invoice.collectionState === "WAIVED") return { label: "Waived", tone: "neutral" };
  if (invoice.status === "EXPIRED") return { label: "Expired", tone: "neutral" };
  if (invoice.status === "CANCELLED") return { label: "Cancelled", tone: "neutral" };
  if (invoice.collectionState === "CHARGE_RETRY_SCHEDULED") return { label: "Charge failed, retrying", tone: "danger" };
  if (invoice.collectionState === "AWAITING_MERCHANT_PAYMENT") return { label: "Awaiting merchant payment", tone: "info" };
  return { label: "Waiting for first charge", tone: "neutral" };
}

// "2026-10" as "October 2026".
export function usageMonthLabel(usageMonth) {
  const [year, month] = String(usageMonth).split("-").map(Number);
  if (!year || !month) return usageMonth || "";
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" });
}
