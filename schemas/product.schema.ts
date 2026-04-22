import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string()
    .min(5, 'Description must be between 5-1000 characters')
    .max(1000, 'Description must be between 5-1000 characters'),
  summary: z.string()
    .min(5, 'Summary must be between 5-500 characters')
    .max(500, 'Summary must be between 5-500 characters')
    .optional()
    .or(z.literal('')),
  image: z.string().min(1, 'Product image is required'),
  thumbnail: z.string().min(1, 'Thumbnail image is required'),
  price: z.number().min(1, 'Price cannot be less than 1'),
  quantityInStock: z.number().min(1, 'Quantity cannot be less than 1'),
  categoryId: z.string().min(1, 'Category is required'),
  
  // v2: Warehouse selection for initial inventory (optional, defaults to default warehouse)
  warehouseId: z.string().optional().or(z.literal('')),
  
  // Optional top-level fields
  ramSize: z.string().optional().or(z.literal('')),
  storage: z.string().optional().or(z.literal('')),
  size: z.string().optional().or(z.literal('')),
  sku: z.string().optional().or(z.literal('')),
  colorId: z.string().optional().or(z.literal('')),
  customColor: z.string().optional().or(z.literal('')),
  discount: z.number().min(0).max(100).optional(),
  videoUrl: z.string().url('Invalid video URL').optional().or(z.literal('')),
  
  // Arrays
  imageList: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  specifications: z.array(z.object({
    key: z.string().min(1, 'Key is required'),
    value: z.string().min(1, 'Value is required')
  })).optional(),
  
  // Nested Variations
  variations: z.array(z.object({
    color: z.string().min(1, 'Variation color is required'),
    image: z.string().optional().or(z.literal('')),
    priceDetails: z.array(z.object({
      price: z.number().min(1, 'Price is required'),
      newPrice: z.number().optional(),
      sku: z.string().optional().or(z.literal('')),
      quantityInStock: z.number().min(1, 'Stock is required'),
      discount: z.number().min(0).max(100).optional()
    })).min(1, 'At least one price detail is required per variation')
  })).optional().or(z.literal([]))
});

export type ProductSchema = z.infer<typeof productSchema>;
