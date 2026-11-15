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

/**
 * The API usage policy of a billing plan, as the plan editor submits it. Saving it on a plan publishes a new plan
 * version, so merchants already on the plan keep the policy of the version they were pinned to.
 */
export const apiUsagePolicySchema = zod.object({
    liveRateLimitPerMinute: optionalCount('Live rate limit'),
    includedMonthlyCalls: optionalCount('Included monthly calls'),
    testRateLimitPerMinute: optionalCount('Test rate limit'),
    testMonthlySafetyCap: optionalCount('Test monthly cap'),
    overageCalls: optionalCount('Overage calls'),
    enforcementMode: zod.enum(apiUsageEnforcementModes),
});

export type ApiUsagePolicyPayload = zod.infer<typeof apiUsagePolicySchema>;
