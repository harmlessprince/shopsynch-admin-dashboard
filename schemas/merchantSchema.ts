import { toTypedSchema } from '@vee-validate/zod';
import * as zod from 'zod';

export const registerMerchantSchema = toTypedSchema(
    zod.object({
        ownerName: zod.string()
            .trim()
            .min(1, { message: 'Owner name is required' }),
        ownerEmail: zod.string()
            .trim()
            .min(1, { message: 'Owner email is required' })
            .email({ message: 'Must be a valid email address' }),
        businessName: zod.string()
            .trim()
            .min(1, { message: 'Business / store name is required' }),
    })
);
