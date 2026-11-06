<script setup>
import { computed } from "vue";

// Shared status pill (design kit §2.9). Order/stock statuses get a dot; generic tones
// (success | info | neutral | danger) render as the plain DS Badge.
const props = defineProps({
  status: { type: String, default: "" },
  tone: { type: String, default: "" },
  label: { type: String, default: "" },
});

const STATUSES = {
  pending: { label: "Pending", pill: "bg-[#F2F2F2] text-ink", dot: "bg-[#616161]" },
  processing: { label: "Processing", pill: "bg-ss-teal-tint text-ink", dot: "bg-ss-teal" },
  in_transit: {
    label: "In transit",
    pill: "bg-white text-ink border border-ss-teal !py-[1px] !px-[9px]",
    dot: "bg-ss-teal",
  },
  shipped: { label: "Shipped", pill: "bg-ss-teal text-ink", dot: "bg-ink" },
  completed: { label: "Completed", pill: "bg-ss-green text-on-accent", dot: "bg-ink" },
  cancelled: { label: "Cancelled", pill: "bg-danger-tint text-ink", dot: "bg-danger" },
  returned: { label: "Returned", pill: "bg-[#F2F2F2] text-ink", dot: "bg-[#616161]" },
  partially_returned: { label: "Partially returned", pill: "bg-warning-tint text-ink", dot: "bg-warning" },
  in_stock: { label: "In stock", pill: "bg-ss-green-tint text-ink", dot: "bg-ss-green" },
  low: { label: "Low", pill: "bg-warning-tint text-ink", dot: "bg-warning" },
  critical: { label: "Critical", pill: "bg-warning text-ink", dot: "bg-ink" },
  out_of_stock: { label: "Out of stock", pill: "bg-danger text-white", dot: "bg-white" },
  active: { label: "Active", pill: "bg-ss-green text-on-accent", dot: "bg-ink" },
  scheduled: { label: "Scheduled", pill: "bg-ss-teal-tint text-ink", dot: "bg-ss-teal" },
  draft: { label: "Draft", pill: "bg-[#F2F2F2] text-ink", dot: "bg-[#616161]" },
  paused: { label: "Paused", pill: "bg-warning-tint text-ink", dot: "bg-warning" },
  expired: {
    label: "Expired",
    pill: "bg-white text-ink border border-hairline !py-[1px] !px-[9px]",
    dot: "bg-[#616161]",
  },
  limit_reached: {
    label: "Limit reached",
    pill: "bg-white text-ink border border-hairline !py-[1px] !px-[9px]",
    dot: "bg-warning",
  },
  archived: {
    label: "Archived",
    pill: "bg-white text-ink border border-dashed border-[#BDBDBD] !py-[1px] !px-[9px]",
    dot: "bg-[#BDBDBD]",
  },
  counted: { label: "Counted", pill: "bg-ss-green-tint text-ink", dot: "bg-ss-green-strong" },
  pending_payment: { label: "Awaiting payment", pill: "bg-[#F2F2F2] text-ink", dot: "bg-[#616161]" },
  released: {
    label: "Released · refunded",
    pill: "bg-white text-ink border border-hairline !py-[1px] !px-[9px]",
    dot: "bg-warning",
  },
  used: { label: "Used", pill: "bg-ss-green-tint text-ink", dot: "bg-ss-green-strong" },
  unused: { label: "Unused", pill: "bg-[#F2F2F2] text-ink", dot: "bg-[#616161]" },
  disabled: {
    label: "Disabled",
    pill: "bg-white text-ink border border-hairline !py-[1px] !px-[9px]",
    dot: "bg-[#BDBDBD]",
  },
};

const TONES = {
  success: "bg-ss-green text-on-accent",
  info: "bg-ss-teal text-ink",
  neutral: "bg-[#F2F2F2] text-ink",
  danger: "bg-danger text-ink",
  warning: "bg-warning text-ink",
};

// Legacy lowercase statuses used by DataTable status columns.
const ALIASES = { paid: "success", open: "success", success: "success", failed: "danger", error: "danger" };

const titleCase = (s) =>
  s.replace(/[_-]+/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const key = computed(() => (props.status || "").trim().toLowerCase().replace(/[\s-]+/g, "_"));
const config = computed(() => (props.tone ? null : STATUSES[key.value] || null));
const tone = computed(() => props.tone || ALIASES[key.value] || "neutral");
const text = computed(() => props.label || config.value?.label || titleCase(props.status || ""));
</script>

<template>
  <span
    v-if="config"
    class="inline-flex items-center gap-[6px] px-[10px] py-[2px] rounded-full text-[12px] font-medium leading-[1.5] whitespace-nowrap"
    :class="config.pill"
  >
    <span class="size-[6px] rounded-full shrink-0" :class="config.dot" />
    {{ text }}
  </span>
  <span
    v-else
    class="inline-flex items-center px-[10px] py-[2px] rounded-full text-[11px] font-medium leading-[1.4] tracking-[0.1px] whitespace-nowrap"
    :class="TONES[tone] || TONES.neutral"
  >
    {{ text }}
  </span>
</template>
