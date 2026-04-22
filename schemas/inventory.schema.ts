import { z } from 'zod';

export const inventorySchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  skuId: z.string().optional().or(z.literal('')),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  initialQty: z.number().min(0, 'Quantity cannot be negative'),
  location: z.string().optional().or(z.literal('')),
  reorderLevel: z.number().min(0, 'Reorder level cannot be negative').optional(),
  reorderQty: z.number().min(0, 'Reorder quantity cannot be negative').optional(),
  variantAttributes: z.record(z.string()).optional(),
});

export type InventorySchema = z.infer<typeof inventorySchema>;

export const inventoryAdjustmentSchema = z.object({
  qty: z.number().refine(
    (value) => value !== 0,
    'Adjustment quantity cannot be zero'
  ),
  action: z.enum([
    'RECEIVED',
    'SOLD',
    'ADJUSTED',
    'RESERVED',
    'RELEASED',
    'DAMAGED',
    'RETURNED',
    'TRANSFERRED_IN',
    'TRANSFERRED_OUT',
  ]).describe('Type of inventory adjustment'),
  reference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type InventoryAdjustmentSchema = z.infer<typeof inventoryAdjustmentSchema>;

export const inventoryReserveSchema = z.object({
  quantity: z.number()
    .min(1, 'Reservation quantity must be at least 1')
    .describe('Quantity to reserve'),
});

export type InventoryReserveSchema = z.infer<typeof inventoryReserveSchema>;

export const inventoryResponseSchema = inventorySchema.extend({
  id: z.string(),
  tenantId: z.string(),
  warehouseName: z.string(),
  onHandQty: z.number(),
  reservedQty: z.number(),
  availableQty: z.number(),
  lastStockAdjusted: z.string(),
  lastAdjustedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type InventoryResponse = z.infer<typeof inventoryResponseSchema>;
