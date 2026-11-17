import { z } from 'zod';

export const capacityAddOnTypes = ['STAFF', 'BRANCH', 'BOOKING_RESOURCE'] as const;

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

export const addOnTypeSchema = z.enum(capacityAddOnTypes);

export const grantCapacityAddOnSchema = z.object({
  tenantId: z.string().min(1, 'Merchant is required'),
  type: addOnTypeSchema,
  quantity: z.coerce.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1'),
  reason: reasonField,
});

export const revokeCapacityAddOnSchema = z.object({
  reason: reasonField,
});

// Keys of amountsByPeriodUnit are counts of 30-day units, as strings.
export const catalogueDraftSchema = z.object({
  type: addOnTypeSchema,
  amountsByPeriodUnit: z
    .record(z.string(), z.coerce.number().min(0, 'Amount cannot be negative'))
    .refine((v) => Object.keys(v).length > 0, 'Add at least one price'),
  maxQuantityByPlanCode: z.record(z.string(), z.coerce.number().int().min(0, 'Maximum cannot be negative')),
  onSale: z.boolean().optional(),
  changeNote: changeNoteField,
  reason: reasonField,
});

// Update is a draft-only PUT; the type cannot change.
export const catalogueDraftUpdateSchema = catalogueDraftSchema.omit({ type: true });

export const publishCatalogueVersionSchema = z.object({
  // Empty means now; a future ISO timestamp schedules the version.
  effectiveFrom: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined),
  reason: reasonField,
});

export const retireCatalogueVersionSchema = z.object({
  reason: reasonField,
});

export type GrantCapacityAddOnSchema = z.infer<typeof grantCapacityAddOnSchema>;
export type RevokeCapacityAddOnSchema = z.infer<typeof revokeCapacityAddOnSchema>;
export type CatalogueDraftSchema = z.infer<typeof catalogueDraftSchema>;
export type PublishCatalogueVersionSchema = z.infer<typeof publishCatalogueVersionSchema>;
export type RetireCatalogueVersionSchema = z.infer<typeof retireCatalogueVersionSchema>;
