import { z } from 'zod';
import { ProductTypeSchema } from './enums.js';

// ────────────────────────────────────────────────────────────────────────────
// ProductCategory schemas
// ────────────────────────────────────────────────────────────────────────────

export const CreateProductCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
});

export const ProductCategoryResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ────────────────────────────────────────────────────────────────────────────
// Product schemas
// ────────────────────────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  brand: z.string().optional(),
  productType: ProductTypeSchema.default('SALE'),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  purchasePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio de compra inválido'),
  salePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio de venta inválido'),
  packageQty: z.number().int().min(1).default(1),
  globalAlert: z.number().int().min(0).default(0),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().nullable().optional(),
  productType: ProductTypeSchema.optional(),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  purchasePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio de compra inválido')
    .optional(),
  salePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio de venta inválido')
    .optional(),
  packageQty: z.number().int().min(1).optional(),
  globalAlert: z.number().int().min(0).optional(),
});

export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  productType: ProductTypeSchema.optional(),
  sortBy: z
    .enum(['name', 'purchasePrice', 'salePrice'])
    .default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const ProductResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  brand: z.string().nullable(),
  productType: ProductTypeSchema,
  categoryId: z.string().uuid().nullable(),
  categoryName: z.string().nullable(),
  description: z.string().nullable(),
  purchasePrice: z.string(),
  salePrice: z.string(),
  packageQty: z.number().int(),
  globalAlert: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ProductDetailResponseSchema = ProductResponseSchema.extend({
  stock: z
    .object({
      id: z.string().uuid(),
      quantity: z.number().int(),
      minStock: z.number().int(),
      alertLevel: z.number().int(),
      effectiveAlertLevel: z.number().int(),
      isBelowAlert: z.boolean(),
      packageQty: z.number().int().nullable(),
      effectivePackageQty: z.number().int(),
    })
    .nullable(),
});

export const PaginatedProductsResponseSchema = z.object({
  data: z.array(ProductResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

// ────────────────────────────────────────────────────────────────────────────
// LocationStock schemas
// ────────────────────────────────────────────────────────────────────────────

export const UpsertLocationStockSchema = z.object({
  locationId: z.string().uuid(),
  productId: z.string().uuid(),
  minStock: z.number().int().min(0).default(0).optional(),
  alertLevel: z.number().int().min(0).default(0).optional(),
  packageQty: z.number().int().min(1).nullable().optional(),
});

export const StockQuantityAdjustmentSchema = z.discriminatedUnion(
  'adjustmentType',
  [
    z.object({
      adjustmentType: z.literal('SET'),
      quantity: z.number().int().min(0, 'Quantity must be >= 0'),
    }),
    z.object({
      adjustmentType: z.literal('DELTA'),
      delta: z.number().int().refine((v) => v !== 0, 'Delta must be non-zero'),
    }),
  ],
);

export const StockQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  locationId: z.string().uuid().optional(),
  onlyLowStock: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === 'true' || v === true)
    .default(false),
  search: z.string().optional(),
});

export const LocationStockResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int(),
  minStock: z.number().int(),
  alertLevel: z.number().int(),
  packageQty: z.number().int().nullable(),
  productName: z.string(),
  productBrand: z.string().nullable(),
  productCategory: z.string().nullable(),
  locationName: z.string().nullable(),
  effectiveAlertLevel: z.number().int(),
  isBelowAlert: z.boolean(),
  effectivePackageQty: z.number().int(),
});

export const PaginatedStockResponseSchema = z.object({
  data: z.array(LocationStockResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export const BulkStockItemSchema = z.object({
  locationId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(0, 'Quantity must be >= 0'),
  minStock: z.number().int().min(0).optional(),
  alertLevel: z.number().int().min(0).optional(),
});

export const BulkStockRequestSchema = z.object({
  items: z.array(BulkStockItemSchema).min(1).max(50),
});

export const BulkStockResponseSchema = z.object({
  created: z.number().int(),
  updated: z.number().int(),
  errors: z.array(
    z.object({
      index: z.number().int(),
      productId: z.string(),
      message: z.string(),
    }),
  ),
});

export const StockSummaryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isAnyLocationBelowAlert: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === 'true' || v === true)
    .optional(),
});

export const StockSummaryItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  totalQuantity: z.number().int(),
  isAnyLocationBelowAlert: z.boolean(),
  locationBreakdown: z.array(
    z.object({
      locationId: z.string().uuid(),
      locationName: z.string(),
      quantity: z.number().int(),
      alertLevel: z.number().int(),
      effectiveAlertLevel: z.number().int(),
      isBelowAlert: z.boolean(),
    }),
  ),
});

export const PaginatedStockSummaryResponseSchema = z.object({
  data: z.array(StockSummaryItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

// ────────────────────────────────────────────────────────────────────────────
// Inferred types
// ────────────────────────────────────────────────────────────────────────────

export type CreateProductCategoryDto = z.infer<
  typeof CreateProductCategorySchema
>;
export type ProductCategoryResponse = z.infer<
  typeof ProductCategoryResponseSchema
>;
export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type ProductQuery = z.infer<typeof ProductQuerySchema>;
export type ProductResponse = z.infer<typeof ProductResponseSchema>;
export type ProductDetailResponse = z.infer<
  typeof ProductDetailResponseSchema
>;
export type PaginatedProductsResponse = z.infer<
  typeof PaginatedProductsResponseSchema
>;

export type UpsertLocationStockDto = z.infer<
  typeof UpsertLocationStockSchema
>;
export type StockQuantityAdjustmentDto = z.infer<
  typeof StockQuantityAdjustmentSchema
>;
export type StockQuery = z.infer<typeof StockQuerySchema>;
export type LocationStockResponse = z.infer<
  typeof LocationStockResponseSchema
>;
export type PaginatedStockResponse = z.infer<
  typeof PaginatedStockResponseSchema
>;
export type BulkStockItem = z.infer<typeof BulkStockItemSchema>;
export type BulkStockRequestDto = z.infer<typeof BulkStockRequestSchema>;
export type BulkStockResponse = z.infer<typeof BulkStockResponseSchema>;
export type StockSummaryQuery = z.infer<typeof StockSummaryQuerySchema>;
export type StockSummaryItem = z.infer<typeof StockSummaryItemSchema>;
export type PaginatedStockSummaryResponse = z.infer<
  typeof PaginatedStockSummaryResponseSchema
>;