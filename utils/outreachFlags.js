// Labels for the outreach queue. The codes are the enum values returned by /v1/admin/merchants/outreach-flags.

export const OUTREACH_STATUS_OPTIONS = [
  { label: "Open", value: "OPEN" },
  { label: "Contacted", value: "CONTACTED" },
  { label: "Demo booked", value: "DEMO_BOOKED" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "No response", value: "NO_RESPONSE" },
];

export const outreachStatusBadge = {
  OPEN: { label: "Open", class: "bg-amber-100 text-amber-800" },
  CONTACTED: { label: "Contacted", class: "bg-blue-100 text-blue-800" },
  DEMO_BOOKED: { label: "Demo booked", class: "bg-purple-100 text-purple-800" },
  RESOLVED: { label: "Resolved", class: "bg-emerald-100 text-emerald-800" },
  NO_RESPONSE: { label: "No response", class: "bg-slate-200 text-slate-700" },
};

// A resolved or no-response flag is closed: its automated emails can no longer be paused.
export const CLOSED_OUTREACH_STATUSES = ["RESOLVED", "NO_RESPONSE"];

export const outreachReasonLabels = {
  STUCK_IN_SETUP: "Stuck in setup",
  COMPLIANCE_BLOCKED: "Compliance blocked",
  READY_NO_TRAFFIC: "Ready but no traffic",
  VISITORS_NO_SALES: "Visitors but no sales",
  VALUABLE_SLIPPING: "Valuable store slipping",
  RENEWAL_RISK: "Renewal at risk",
  MERCHANT_REQUESTED: "Asked to talk to us",
};

export const OUTREACH_REASON_OPTIONS = Object.entries(outreachReasonLabels).map(([value, label]) => ({ label, value }));

export const outreachActionLabels = {
  CALL: "Call",
  DEMO: "Offer a demo",
};

export const lifecycleStageLabels = {
  SETUP_INCOMPLETE: "Setup incomplete",
  NO_PRODUCTS: "No products",
  NO_VISITORS: "No visitors",
  VISITORS_NO_SALES: "Visitors, no sales",
  FIRST_SALE: "First sale",
  SELLING: "Selling",
  SLIPPING: "Slipping",
  DORMANT: "Dormant",
};

// "daysSinceFirstShareTip" -> "Days since first share tip"
export function humanizeMetricKey(key) {
  const spaced = String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatMetricValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
