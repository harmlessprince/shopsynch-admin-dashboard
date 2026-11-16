import * as zod from 'zod';

export const apiUsageEnforcementModes = ['NONE', 'ALERT_ONLY', 'THROTTLE', 'BLOCK', 'ADMIN_REVIEW'] as const;

/** A blank field means "no limit"; anything else must be a whole number of 0 or more. */
const optionalCount = (label: string) =>
    zod.preprocess(
        (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
        zod.number({ invalid_type_error: `${label} must be a number` })
            .int({ message: `${label} must be a whole number` })
            .min(0, { message: `${label} cannot be negative` })
            .optional()
    );

/** A blank field means "not set"; anything else must be a whole number of 1 or more. */
const optionalPositiveCount = (label: string) =>
    zod.preprocess(
        (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
        zod.number({ invalid_type_error: `${label} must be a number` })
            .int({ message: `${label} must be a whole number` })
            .min(1, { message: `${label} must be 1 or more` })
            .optional()
    );

/** A blank field means "use the platform default"; anything else must be a whole percentage from 1 to 100. */
const optionalPercent = (label: string) =>
    zod.preprocess(
        (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
        zod.number({ invalid_type_error: `${label} must be a number` })
            .int({ message: `${label} must be a whole number` })
            .min(1, { message: `${label} must be between 1 and 100` })
            .max(100, { message: `${label} must be between 1 and 100` })
            .optional()
    );

/**
 * The API usage policy of a billing plan, as the plan editor submits it. Saving it on a plan publishes a new plan
 * version, so merchants already on the plan keep the policy of the version they were pinned to.
 */
export const apiUsagePolicySchema = zod.object({
    liveRateLimitPerMinute: optionalCount('Live rate limit'),
    includedMonthlyCalls: optionalCount('Included monthly calls'),
    testRateLimitPerMinute: optionalCount('Test rate limit'),
    testMonthlySafetyCap: optionalCount('Test monthly cap'),
    overageBlockSizeCalls: optionalPositiveCount('Overage block size'),
    overagePricePerBlock: optionalPositiveCount('Overage price per block'),
    quotaWarningThresholdPercent: optionalPercent('Quota warning threshold'),
    quotaLimitThresholdPercent: optionalPercent('Quota limit threshold'),
    liveKeysAllowed: zod.boolean().default(true),
    enforcementMode: zod.enum(apiUsageEnforcementModes),
    /** A blank field means "use the main enforcement mode" for test calls past the monthly cap. */
    testCapEnforcementMode: zod.preprocess(
        (value) => (value === '' || value === null || value === undefined ? undefined : value),
        zod.enum(apiUsageEnforcementModes).optional()
    ),
}).superRefine((policy, context) => {
    // Overage is billed only when the plan has both a block size and a price, so one without the other is a mistake.
    if (policy.overageBlockSizeCalls !== undefined && policy.overagePricePerBlock === undefined) {
        context.addIssue({ code: zod.ZodIssueCode.custom, path: ['overagePricePerBlock'], message: 'Set a price per block, or clear the block size to bill no overage' });
    }
    if (policy.overagePricePerBlock !== undefined && policy.overageBlockSizeCalls === undefined) {
        context.addIssue({ code: zod.ZodIssueCode.custom, path: ['overageBlockSizeCalls'], message: 'Set a block size, or clear the price to bill no overage' });
    }
    if (
        policy.quotaWarningThresholdPercent !== undefined && policy.quotaLimitThresholdPercent !== undefined
        && policy.quotaWarningThresholdPercent >= policy.quotaLimitThresholdPercent
    ) {
        context.addIssue({ code: zod.ZodIssueCode.custom, path: ['quotaWarningThresholdPercent'], message: 'The warning notice must come before the limit notice' });
    }
});

export type ApiUsagePolicyPayload = zod.infer<typeof apiUsagePolicySchema>;
