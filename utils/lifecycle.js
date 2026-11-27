// Labels for the lifecycle overview. The codes are the enum values returned by /v1/admin/merchants/lifecycle/*.

// FIRST_SALE is left out on purpose: it is an event, never the stage a store resolves to.
export const LIFECYCLE_STAGE_ORDER = [
  "SETUP_INCOMPLETE",
  "NO_PRODUCTS",
  "NO_VISITORS",
  "VISITORS_NO_SALES",
  "SELLING",
  "SLIPPING",
  "DORMANT",
];

export const lifecycleStageHints = {
  SETUP_INCOMPLETE: "Blocked before going live",
  NO_PRODUCTS: "Live, nothing to sell yet",
  NO_VISITORS: "Has products, no visitors in 7 days",
  VISITORS_NO_SALES: "Has visitors, no paid order yet",
  SELLING: "Selling regularly",
  SLIPPING: "Has sold, now gone quiet",
  DORMANT: "No sales or logins for a month",
};

export const lifecycleStageBadge = {
  SETUP_INCOMPLETE: "bg-orange-100 text-orange-800",
  NO_PRODUCTS: "bg-yellow-100 text-yellow-800",
  NO_VISITORS: "bg-sky-100 text-sky-800",
  VISITORS_NO_SALES: "bg-indigo-100 text-indigo-800",
  SELLING: "bg-emerald-100 text-emerald-800",
  SLIPPING: "bg-rose-100 text-rose-800",
  DORMANT: "bg-slate-200 text-slate-700",
};

export const CLASSIFICATION_OPTIONS = [
  { label: "All stores", value: "" },
  { label: "Real", value: "REAL" },
  { label: "Internal", value: "INTERNAL" },
  { label: "Test", value: "TEST" },
];

export const classificationBadge = {
  REAL: { label: "Real", class: "bg-emerald-100 text-emerald-800" },
  INTERNAL: { label: "Internal", class: "bg-purple-100 text-purple-800" },
  TEST: { label: "Test", class: "bg-slate-200 text-slate-700" },
};

export const messageStatusBadge = {
  SENT: { label: "Sent", class: "bg-emerald-100 text-emerald-800" },
  DRY_RUN: { label: "Dry run", class: "bg-blue-100 text-blue-800" },
  SKIPPED: { label: "Skipped", class: "bg-amber-100 text-amber-800" },
  FAILED: { label: "Failed", class: "bg-red-100 text-red-700" },
};

export const messageTypeLabels = {
  WEEKLY: "Weekly email",
  FIRST_SALE: "First sale email",
};

export const skipReasonLabels = {
  NONE: "",
  MESSAGING_DISABLED: "Messaging was off",
  INACTIVE_STORE: "Store is inactive",
  MISSING_OWNER: "No owner on the store",
  UNVERIFIED_EMAIL: "Owner email not verified",
  NON_REAL_TEST_DISABLED: "Test store not enabled",
  TEST_STORES_ONLY_EXCLUDED: "Test-stores-only mode",
  OPTED_OUT: "Owner opted out",
  STAGE_NOT_ELIGIBLE: "Stage gets no email",
  NO_MATCHING_TIP: "No tip left to send",
  PAUSED_BY_FLAG: "Paused by the team",
  ALREADY_SENT_THIS_WEEK: "Already emailed this week",
  MAX_STAGE_EMAILS_REACHED: "Reached the email cap for this stage",
  DRY_RUN_ACTIVE: "Held during dry run",
};

// What the platform switches mean for a merchant right now, in the words the team uses.
export function resolveRolloutState(overview) {
  if (!overview?.enabled) {
    return {
      label: "Off",
      tone: "bg-slate-100 text-slate-700 border-slate-200",
      description: "Nothing is sent. Turn on lifecycleMessagingEnabled in Settings when you are ready.",
    };
  }
  if (overview.dryRun) {
    return {
      label: "Dry run",
      tone: "bg-amber-50 text-amber-900 border-amber-200",
      description: "Every decision is logged, but no email is sent.",
    };
  }
  if (overview.testStoresOnly) {
    return {
      label: "Test stores only",
      tone: "bg-blue-50 text-blue-900 border-blue-200",
      description: `Emails go only to the ${overview.testStoresCount} test store${overview.testStoresCount === 1 ? "" : "s"} you enabled.`,
    };
  }
  return {
    label: "Live",
    tone: "bg-emerald-50 text-emerald-900 border-emerald-200",
    description: "Real merchants get one email a week, every Monday at 09:00 Lagos time.",
  };
}
