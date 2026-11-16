// Display helpers for the add-on catalogue. They only format what the API returns; they never compute a price.

export const addOnTypeMeta = {
  STAFF: { label: "Staff", description: "Extra staff accounts", icon: "group" },
  BRANCH: { label: "Branch", description: "Extra branches", icon: "storefront" },
  BOOKING_RESOURCE: { label: "Booking resource", description: "Extra booking calendars", icon: "calendar_month" },
};

export const versionStatusMeta = {
  DRAFT: { status: "draft", label: "Draft" },
  SCHEDULED: { status: "scheduled", label: "Scheduled" },
  PUBLISHED: { tone: "success", label: "Published" },
  RETIRED: { status: "archived", label: "Retired" },
};

export const formatAddOnMoney = (amount, currency = "NGN") =>
  `${currency || "NGN"} ${Number(amount ?? 0).toLocaleString()}`;

// Keys of the per-period maps are counts of 30-day units, as text. Labelled "N mo" like the admin plans screen (PlanLabel).
export const periodLabel = (key) => `${key} mo`;

export const sortedPeriodEntries = (map) =>
  Object.entries(map || {}).sort(([a], [b]) => Number(a) - Number(b));

export const sortedPlanEntries = (map) => Object.entries(map || {}).sort(([a], [b]) => a.localeCompare(b));

// 422 field errors may be strings or lists.
export const firstError = (value) => (Array.isArray(value) ? value.join(" ") : value || "");
