// Display helpers for plan versions and cohort moves. They only format what the API returns; they never compute a price.

export const moveStatusMeta = {
  SCHEDULED: { status: "scheduled", label: "Scheduled" },
  COMPLETED: { tone: "success", label: "Completed" },
  CANCELLED: { status: "archived", label: "Cancelled" },
};

export const rowStatusMeta = {
  PENDING: { status: "scheduled", label: "Pending" },
  APPLIED: { tone: "success", label: "Applied" },
  SKIPPED: { tone: "warning", label: "Skipped" },
  CANCELLED: { status: "archived", label: "Cancelled" },
};

export const directionMeta = {
  INCREASE: { tone: "warning", label: "Price goes up" },
  DECREASE: { tone: "success", label: "Price goes down" },
  SAME: { tone: "neutral", label: "No change" },
};

export const formatPlanMoney = (amount, currency = "NGN") =>
  amount === null || amount === undefined ? "None" : `${currency || "NGN"} ${Number(amount).toLocaleString()}`;

// Period counts are 30-day units (periodDays = count * 30); labelled "N mo (Dd)" like the admin plans screen (PlanLabel).
export const unitsLabel = (count, days) => (days ? `${count} mo (${days}d)` : `${count} mo`);

export const displayValue = (value) => {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

// "usage_limits_x" style keys read better as words.
export const humanizeKey = (key) => String(key).replace(/[_.-]+/g, " ").replace(/\b\w/, (c) => c.toUpperCase());
