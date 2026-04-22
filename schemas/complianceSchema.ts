import {toTypedSchema} from "@vee-validate/zod";
import * as zod from "zod";


export const complianceProfileFormSchema = toTypedSchema(
    zod.object({
        businessTradingName: zod.string()
            .min(1, {message: 'Please enter a trading name'})
            .min(3, {message: 'Trading name should be at least 3 characters'}),

        businessDescription: zod.string()
            .min(1, {message: 'Please enter your business description'})
            .min(3, {message: 'Description should be at least 3 characters'}),

        staffSize: zod.number()
            .min(0, {message: 'Please enter your staff size'}),

        businessExpectedMonthlyIncome: zod.string()
            .min(1, {message: 'Expected monthly income is required'})
            .regex(/^\d+$/, {message: 'Expected monthly income must be a valid number'}),

        industry: zod.string()
            .min(1, {message: 'Please select your business industry'})
            .min(2, {message: 'Industry should be at least 2 characters'}),

        businessType: zod.string()
            .min(1, {message: 'Please select your  business type'})
            .min(2, {message: 'Business type should be at least 2 characters'}),

        businessStorefrontUrl: zod.string()
            .min(1, {message: 'Business storefront URL is required'})
            .url({message: 'Storefront URL must be a valid URL'}),

        businessAddress: zod.string()
            .min(1, {message: 'Business address is required'})
            .min(3, {message: 'Address should be at least 3 characters'}),

        businessState: zod.string()
            .min(1, {message: 'Business state is required'})
            .min(2, {message: 'State should be at least 2 characters'}),

        businessCity: zod.string()
            .min(1, {message: 'Business city is required'})
            .min(2, {message: 'City should be at least 2 characters'}),

        businessTaxIdNumber: zod.string().optional(),
        cacDocumentUrl: zod.string().optional(),
        legalBusinessName: zod.string().optional(),
        businessRegistrationNumber: zod.string().optional(),
    }).superRefine((data, ctx) => {
        if (data.businessType === 'registered') {
            if (!data.legalBusinessName || data.legalBusinessName.trim().length < 1) {
                ctx.addIssue({
                    path: ['legalBusinessName'],
                    message: 'Please enter a legal business name',
                    code: zod.ZodIssueCode.custom,
                })
            }

            if (!data.businessRegistrationNumber || data.businessRegistrationNumber.trim().length < 1) {
                ctx.addIssue({
                    path: ['businessRegistrationNumber'],
                    message: 'Please enter registration number',
                    code: zod.ZodIssueCode.custom,
                })
            }

            if (!data.businessTaxIdNumber || data.businessTaxIdNumber.trim().length < 1) {
                ctx.addIssue({
                    path: ['businessTaxIdNumber'],
                    message: 'Please enter tax ID number',
                    code: zod.ZodIssueCode.custom,
                })
            }

            if (!data.cacDocumentUrl || data.cacDocumentUrl.trim().length < 1) {
                ctx.addIssue({
                    path: ['cacDocumentUrl'],
                    message: 'Please enter CAC document URL',
                    code: zod.ZodIssueCode.custom,
                })
            }
        }
    })
)


export const complianceContactFormSchema = toTypedSchema(
    zod.object({

        businessCountry: zod.string()
            .min(1, {message: 'Country is required'})
            .min(2, {message: 'Country should be at least 2 characters'}),

        businessPrimaryPhoneNumber: zod.string()
            .min(1, {message: 'Primary phone number is required'})
            .regex(/^\+?\d{1,15}$/, {message: 'Primary phone number must be valid (e.g., +2348000000000)'}),

        businessSecondaryPhoneNumber: zod.string()
            .min(1, {message: 'Secondary phone number is required'})
            .regex(/^\+?\d{1,15}$/, {message: 'Secondary phone number must be valid (e.g., +2348000000000)'}),

        businessSupportEmailAddress: zod.string()
            .min(1, {message: 'Support email address is required'})
            .email({message: 'Support email must be a valid email address'}),

        businessGeneralEmailAddress: zod.string()
            .min(1, {message: 'General email address is required'})
            .email({message: 'General email must be a valid email address'}),
    })
)

export const complianceAccountFormSchema = toTypedSchema(
    zod.object({
        accountNumber: zod.string()
            .min(10, {message: 'Account number must be 10 digits'})
            .max(10, {message: 'Account number must be 10 digits'})
            .regex(/^\d+$/, {message: 'Account number must be numeric'}),
        bankCode: zod.string()
            .min(1, {message: 'Please select a bank'}),
        gateway: zod.string()
            .min(1, {message: 'Gateway is required'}),
        accountName: zod.string()
            .min(1, {message: 'Account name is required'}),
    })
)

export const complianceOwnerFormSchema = toTypedSchema(
    zod.object({
        fullName: zod.string()
            .min(1, {message: 'Full name is required'})
            .min(2, {message: 'Full name must be at least 2 characters'}),

        phoneNumber: zod.string()
            .min(1, {message: 'Phone number is required'})
            .regex(/^\+?[1-9]\d{9,14}$/, {message: 'Phone number must include country code (e.g. 2348012345678)'}),

        address: zod.string()
            .min(1, {message: 'Address is required'})
            .min(5, {message: 'Address must be at least 5 characters'}),

        idNumber: zod.string().optional(),

        dateOfBirth: zod.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, {message: 'Date of birth must be in YYYY-MM-DD format'})
            .optional()
            .or(zod.literal('')),

        nationality: zod.string().optional(),

        idType: zod.string().optional(),

        idDocumentUrl: zod.string().optional(),

        profileUrl: zod.string().optional(),

        proofOfAddress: zod.string().optional(),
    })
)
