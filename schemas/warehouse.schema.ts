import { z } from 'zod';

export const warehouseSchema = z.object({
  name: z.string()
    .min(1, 'Warehouse name is required')
    .max(100, 'Warehouse name must be less than 100 characters'),
  code: z.string()
    .min(1, 'Warehouse code is required')
    .max(20, 'Warehouse code must be less than 20 characters'),
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(255, 'Address must be less than 255 characters'),
  type: z.enum(['OWNED', 'SUPPLIER', 'CONSIGNMENT', 'THIRD_PARTY_LOGISTICS'])
    .optional()
    .default('OWNED'),
  default: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
});

export type WarehouseSchema = z.infer<typeof warehouseSchema>;

export const warehouseResponseSchema = warehouseSchema.extend({
  id: z.string(),
  tenantId: z.string(),
  partnerTenantIds: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WarehouseResponse = z.infer<typeof warehouseResponseSchema>;
