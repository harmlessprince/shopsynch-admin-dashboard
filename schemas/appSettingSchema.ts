import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'

export const UrlSettingsSchema = toTypedSchema(
  z.object({
    merchantClientUrlBase: z
      .string()
      .url('Must be a valid URL')
      .or(z.literal('')),
    merchantClientUrlCart: z
      .string()
      .startsWith('/', 'Must start with /')
      .or(z.literal('')),
    merchantClientUrlVerifyEmail: z
      .string()
      .startsWith('/', 'Must start with /')
      .or(z.literal('')),
    merchantClientUrlLogin: z
      .string()
      .startsWith('/', 'Must start with /')
      .or(z.literal('')),
  })
)

export const AppSettingSchema = toTypedSchema(
  z.object({
    value: z.union([z.string(), z.number(), z.boolean(), z.record(z.any())]),
  })
)
