import { toTypedSchema } from '@vee-validate/zod';
import * as zod from 'zod';

export const OUTREACH_FLAG_STATUSES = ['OPEN', 'CONTACTED', 'DEMO_BOOKED', 'RESOLVED', 'NO_RESPONSE'] as const;

// The body of PATCH /v1/admin/merchants/outreach-flags/{id}. Every field is optional because the endpoint is a partial
// update, but it answers 422 when nothing is sent. An empty assigneeId or assigneeEmail clears the assignment.
export const updateOutreachFlagPayloadSchema = zod
    .object({
        status: zod.enum(OUTREACH_FLAG_STATUSES).optional(),
        assigneeId: zod.string().trim().optional(),
        assigneeEmail: zod
            .string()
            .trim()
            .refine((value) => value === '' || zod.string().email().safeParse(value).success, {
                message: 'Must be a valid email address',
            })
            .optional(),
        pauseAutomatedEmails: zod.boolean().optional(),
        note: zod.string().trim().min(1, { message: 'A note cannot be empty' }).optional(),
    })
    .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
        message: 'Change at least one field before saving',
    });

// The fields the update form edits. The form always holds a value for each, and the page works out what changed.
export const outreachFlagFormSchema = toTypedSchema(
    zod.object({
        status: zod.enum(OUTREACH_FLAG_STATUSES),
        assigneeEmail: zod
            .string()
            .trim()
            .refine((value) => value === '' || zod.string().email().safeParse(value).success, {
                message: 'Must be a valid email address',
            }),
        pauseAutomatedEmails: zod.boolean(),
        note: zod.string().trim(),
    })
);
