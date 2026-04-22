import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required if no system category is selected').max(50, 'Name cannot exceed 50 characters').optional().or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
  parentId: z.string().optional().or(z.literal('')),
  tenantId: z.string().optional()
}).refine((data) => data.name || data.categoryId, {
  message: "You must provide either a Category Name or select a System Category",
  path: ["name"]
});

export type CategorySchema = z.infer<typeof categorySchema>;
