// Display metadata for capacity add-ons. Enums come from the backend DTOs (AdminCapacityAddOnView).
export const addOnTypeLabel = (type) =>
  ({ STAFF: "Staff", BRANCH: "Branch", BOOKING_RESOURCE: "Booking resource" })[type] || type;

export const addOnStatusMeta = {
  PENDING_PAYMENT: { label: "Pending payment", badge: "bg-[#FFF9C5] text-[#E79640]" },
  ACTIVE: { label: "Active", badge: "bg-[#B5F9B4] text-[#3CA745]" },
  SCHEDULED_FOR_REMOVAL: { label: "Scheduled for removal", badge: "bg-[#FFE4C2] text-[#9A4A00]" },
  LAPSED: { label: "Lapsed", badge: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Cancelled", badge: "bg-[#FFBFBF] text-[#B42318]" },
};

export const originLabel = (origin) => (origin === "GRANT" ? "Granted by admin" : origin === "PURCHASE" ? "Purchased" : origin);

export const money = (amount, currency = "NGN") => `${currency || "NGN"} ${Number(amount || 0).toLocaleString()}`;

// Keys are counts of 30-day units, as strings; labelled "N mo" like the admin plans screen.
export const lockedRateText = (amounts, currency) => {
  const entries = Object.entries(amounts || {});
  if (!entries.length) return "No locked rate";
  return entries.map(([months, amount]) => `${money(amount, currency)} per ${months} mo`).join(", ");
};
