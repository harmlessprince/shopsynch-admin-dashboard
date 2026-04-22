import { toTypedSchema } from '@vee-validate/zod';
import * as zod from 'zod';

export const inviteMemberSchema = toTypedSchema(
    zod.object({
        email: zod.string()
            .min(1, { message: 'Email is required' })
            .email({ message: 'Must be a valid email' }),
        roleId: zod.string()
            .min(1, { message: 'Please select a role' }),
    })
);

export const createRoleSchema = toTypedSchema(
    zod.object({
        name: zod.string()
            .min(1, { message: 'Role name is required' })
            .min(2, { message: 'Role name must be at least 2 characters' })
            .max(50, { message: 'Role name must be 50 characters or less' }),
        description: zod.string().optional(),
        permissionIds: zod.array(zod.string())
            .min(1, { message: 'At least one permission must be selected' }),
    })
);
