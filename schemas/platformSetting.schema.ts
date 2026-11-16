import { z } from "zod";

// What the value of a platform setting may be when it is saved, per key. A key not listed here keeps only the
// generic payload check. Rules mirror how the backend reads the setting (ApiOverageCollectionPolicy and the
// developer safety valve), which falls back to its default on a value it cannot use.

const wholeNumber = (label: string, minimum: number) =>
  z
    .number({ invalid_type_error: `${label} must be a number`, required_error: `${label} is required` })
    .int(`${label} must be a whole number`)
    .min(minimum, minimum === 0 ? `${label} cannot be negative` : `${label} must be at least ${minimum}`);

// "1,3,7": positive whole days, nearest first, written as a comma separated list.
const dayList = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} needs at least one day`)
    .refine((value) => value.split(",").every((part) => /^[1-9]\d*$/.test(part.trim())), {
      message: `${label} must be whole days of 1 or more, separated by commas, such as 1,3,7`,
    });

export type PlatformSettingRule = { schema: z.ZodTypeAny; hint: string };

export const platformSettingRules: Record<string, PlatformSettingRule> = {
  developerPlatformCallsPerMinuteBudget: {
    schema: wholeNumber("The budget", 0),
    hint: "Whole number of calls per minute across all Developer plan keys. 0 turns the safety valve off.",
  },
  apiOverageChargeDelayDays: {
    schema: wholeNumber("The delay", 0),
    hint: "Whole days. 0 charges the saved card as soon as the invoice is issued.",
  },
  apiOverageChargeRetryDays: {
    schema: dayList("Retry days"),
    hint: "Days after a failed charge, separated by commas, such as 1,3,7.",
  },
  apiOverageReminderDays: {
    schema: dayList("Reminder days"),
    hint: "Days after the invoice is issued, separated by commas, such as 3,6.",
  },
  apiOverageGracePeriodDays: {
    schema: wholeNumber("The grace period", 0),
    hint: "Whole days after the due date. 0 flags an invoice overdue the day after it is due.",
  },
  apiOveragePaymentTermDays: {
    schema: wholeNumber("The payment term", 1),
    hint: "Whole days, at least 1. This sets the invoice due date.",
  },
  apiOverageStuckAttemptMinutes: {
    schema: wholeNumber("The wait", 1),
    hint: "Whole minutes, at least 1.",
  },
  apiOverageMaxCollectionErrors: {
    schema: wholeNumber("The limit", 1),
    hint: "Whole number of failures, at least 1.",
  },
};

// The body sent to PATCH /v1/admin/settings/:key/value, for every setting.
export const platformSettingValuePayloadSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.any()), z.array(z.any()), z.null()]),
});

// Checks the value against the key's rule when it has one, then builds the request body. Returns the body to
// send, or the message to show beside the field.
export function buildPlatformSettingPayload(
  key: string,
  value: unknown,
): { ok: true; payload: { value: unknown } } | { ok: false; message: string } {
  const rule = platformSettingRules[key];
  if (rule) {
    const result = rule.schema.safeParse(value);
    if (!result.success) return { ok: false, message: result.error.issues[0].message };
    value = result.data;
  }
  const payload = platformSettingValuePayloadSchema.safeParse({ value });
  if (!payload.success) return { ok: false, message: "This value cannot be saved" };
  return { ok: true, payload: payload.data };
}
