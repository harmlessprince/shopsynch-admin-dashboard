import { z } from 'zod';
import { addOnTypeSchema } from './capacityAddOnAdmin.schema';

const reasonField = z
  .string({ required_error: 'A reason is required.' })
  .trim()
  .min(1, 'A reason is required.')
  .max(500, 'The reason must be 500 characters or fewer.');

const kindSchema = z.enum(['PLAN', 'CAPACITY_ADDON']);

const versionNumber = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} is required` }).int().min(1, `${label} is required`);

const kindRefs = (data: { kind: string; planId?: string; addOnType?: string }, ctx: z.RefinementCtx) => {
  if (data.kind === 'PLAN' && !data.planId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['planId'], message: 'Plan is required' });
  }
  if (data.kind === 'CAPACITY_ADDON' && !data.addOnType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['addOnType'], message: 'Add-on type is required' });
  }
};

const moveBase = z.object({
  kind: kindSchema,
  planId: z.string().optional(),
  addOnType: addOnTypeSchema.optional(),
  fromVersionNumber: versionNumber('From version').optional(),
  toVersionNumber: versionNumber('Target version'),
  tenantIds: z.array(z.string()).optional(),
});

export const versionMovePreviewSchema = moveBase.superRefine(kindRefs);

export const versionMoveConfirmSchema = moveBase
  .extend({ reason: reasonField })
  .superRefine(kindRefs);

export const versionMoveCancelSchema = z.object({
  reason: reasonField,
});

export const versionPolicySchema = z
  .object({
    kind: kindSchema,
    planId: z.string().optional(),
    addOnType: addOnTypeSchema.optional(),
    versionNumber: versionNumber('Version'),
    policy: z.enum(['CONTINUE', 'SUNSET']),
    sunsetAt: z.string().optional().or(z.literal('')),
    targetVersionNumber: versionNumber('Target version').optional(),
    acknowledgeFewerFeatures: z.boolean().optional(),
    reason: reasonField,
  })
  .superRefine((data, ctx) => {
    kindRefs(data, ctx);
    if (data.policy === 'SUNSET') {
      if (!data.sunsetAt) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sunsetAt'], message: 'Sunset date is required' });
      }
      if (!data.targetVersionNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetVersionNumber'], message: 'Target version is required' });
      }
    }
  });

export const versionPolicyApproveSchema = z.object({
  reason: reasonField,
});

export type VersionMovePreviewSchema = z.infer<typeof versionMovePreviewSchema>;
export type VersionMoveConfirmSchema = z.infer<typeof versionMoveConfirmSchema>;
export type VersionMoveCancelSchema = z.infer<typeof versionMoveCancelSchema>;
export type VersionPolicySchema = z.infer<typeof versionPolicySchema>;
