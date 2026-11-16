import { z } from 'zod';

const reasonField = z
  .string({ required_error: 'A reason is required.' })
  .trim()
  .min(1, 'A reason is required.')
  .max(500, 'The reason must be 500 characters or fewer.');

const changeNoteField = z
  .string({ required_error: 'A change note is required.' })
  .trim()
  .min(1, 'A change note is required.')
  .max(500, 'The change note must be 500 characters or fewer.');

const optionalAmount = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Amount cannot be negative').optional(),
);

// periodUnitCount is the number of 30-day units the price covers.
export const planVersionPriceSchema = z.object({
  periodUnitCount: z.coerce
    .number({ invalid_type_error: 'Billing period is required' })
    .int('Billing period must be a whole number')
    .min(1, 'The billing period must be at least one 30-day unit.'),
  amount: z.coerce
    .number({ invalid_type_error: 'Price is required' })
    .min(0, 'The price amount cannot be negative.'),
  baselineAmount: optionalAmount,
  active: z.boolean().optional(),
  publicVisible: z.boolean().optional(),
  adminOnly: z.boolean().optional(),
  // null/undefined stay absent; z.coerce alone would turn null into 0.
  sortOrder: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().optional(),
  ),
});

export const planVersionLimitsSchema = z.object({
  featureEntitlements: z.array(z.string()).optional(),
  featureAccessRules: z.record(z.string(), z.unknown()).optional(),
  usageLimits: z.record(z.string(), z.unknown()).optional(),
  apiUsagePolicy: z.record(z.string(), z.unknown()).optional(),
});

// Prices and limits are optional: on create an absent part copies the version new purchases use.
export const planVersionDraftSchema = z.object({
  planId: z.string().min(1, 'Plan is required'),
  prices: z.array(planVersionPriceSchema).optional(),
  limits: planVersionLimitsSchema.optional(),
  changeNote: changeNoteField,
  reason: reasonField,
});

// Update is a draft-only PUT; the plan cannot change.
export const planVersionDraftUpdateSchema = planVersionDraftSchema.omit({ planId: true });

export const publishPlanVersionSchema = z.object({
  // Empty means now; a future ISO timestamp schedules the version.
  effectiveFrom: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined),
  reason: reasonField,
});

export const retirePlanVersionSchema = z.object({
  reason: reasonField,
});

export type PlanVersionDraftSchema = z.infer<typeof planVersionDraftSchema>;
export type PublishPlanVersionSchema = z.infer<typeof publishPlanVersionSchema>;
