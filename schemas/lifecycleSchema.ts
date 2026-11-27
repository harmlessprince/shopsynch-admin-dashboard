import { toTypedSchema } from '@vee-validate/zod';
import * as zod from 'zod';

// The body of POST /v1/admin/merchants/{tenantId}/lifecycle/send-test.
export const sendTestEmailPayloadSchema = zod.object({
    recipientEmail: zod.string().trim().email({ message: 'Must be a valid email address' }),
});

// The body of PUT /v1/admin/merchants/{tenantId}/lifecycle/test-enabled.
export const updateTestEnabledPayloadSchema = zod.object({
    enabled: zod.boolean(),
});

// The recipient box in the preview modal.
export const sendTestEmailFormSchema = toTypedSchema(
    zod.object({
        recipientEmail: zod
            .string()
            .trim()
            .min(1, { message: 'Enter the email address to send the test to' })
            .email({ message: 'Must be a valid email address' }),
    })
);
