import { z } from 'zod';
import {
  SupplierStatusSchema,
  PurchaseOrderStatusSchema,
} from './enums.js';

// ────────────────────────────────────────────────────────────────────────────
// Supplier schemas
// ────────────────────────────────────────────────────────────────────────────

export const CreateSupplierSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  initials: z.string().max(10).optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  initials: z.string().max(10).optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: SupplierStatusSchema.optional(),
});

export const SupplierQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  includeInactive: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === 'true' || v === true)
    .default(false)
    .optional(),
});

export const SupplierResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  initials: z.string().nullable(),
  contact: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  status: SupplierStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PaginatedSuppliersResponseSchema = z.object({
  data: z.array(SupplierResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

// ────────────────────────────────────────────────────────────────────────────
// SupplierProduct schemas
// ────────────────────────────────────────────────────────────────────────────

export const CreateSupplierProductSchema = z.object({
  productId: z.string().uuid(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio inválido'),
  leadTimeDays: z.number().int().min(0).optional(),
});

export const UpdateSupplierProductSchema = z.object({
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio inválido')
    .optional(),
  leadTimeDays: z.number().int().min(0).optional(),
});

export const SupplierProductResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  productId: z.string().uuid(),
  price: z.string(),
  leadTimeDays: z.number().int().nullable(),
  updatedAt: z.coerce.date(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    brand: z.string().nullable(),
  }),
});

// ────────────────────────────────────────────────────────────────────────────
// PurchaseOrder schemas
// ────────────────────────────────────────────────────────────────────────────

export const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  locationId: z.string().uuid(),
  expectedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const UpdatePurchaseOrderSchema = z.object({
  expectedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const UpdatePurchaseOrderStatusSchema = z.object({
  status: z.enum(['SENT', 'CONFIRMED', 'CANCELLED']),
});

export const AddPurchaseOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio inválido'),
  unitsPerPackage: z.number().int().min(1, 'Unidades por empaque debe ser al menos 1').default(1),
});

export const UpdatePurchaseOrderItemSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  unitPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio inválido')
    .optional(),
});

export const PurchaseOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  supplierId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: PurchaseOrderStatusSchema.optional(),
  search: z.string().optional(),
});

export const PurchaseOrderItemResponseSchema = z.object({
  id: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int(),
  unitPrice: z.string(),
  subtotal: z.string(),
  createdAt: z.coerce.date(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    brand: z.string().nullable(),
  }),
});

export const PurchaseOrderResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  locationId: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.coerce.date(),
  status: PurchaseOrderStatusSchema,
  notes: z.string().nullable(),
  expectedDate: z.coerce.date().nullable(),
  total: z.string(),
  supplierName: z.string(),
  locationName: z.string(),
  itemCount: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PurchaseOrderDetailResponseSchema =
  PurchaseOrderResponseSchema.extend({
    items: z.array(PurchaseOrderItemResponseSchema),
    supplier: z.object({
      id: z.string().uuid(),
      name: z.string(),
      contact: z.string().nullable(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
    }),
    location: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
  });

export const PaginatedPurchaseOrdersResponseSchema = z.object({
  data: z.array(PurchaseOrderResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

// ────────────────────────────────────────────────────────────────────────────
// Inferred types
// ────────────────────────────────────────────────────────────────────────────

export type CreateSupplierDto = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierDto = z.infer<typeof UpdateSupplierSchema>;
export type SupplierQuery = z.infer<typeof SupplierQuerySchema>;
export type SupplierResponse = z.infer<typeof SupplierResponseSchema>;
export type PaginatedSuppliersResponse = z.infer<
  typeof PaginatedSuppliersResponseSchema
>;

export type CreateSupplierProductDto = z.infer<
  typeof CreateSupplierProductSchema
>;
export type UpdateSupplierProductDto = z.infer<
  typeof UpdateSupplierProductSchema
>;
export type SupplierProductResponse = z.infer<
  typeof SupplierProductResponseSchema
>;

export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrderSchema>;
export type UpdatePurchaseOrderDto = z.infer<typeof UpdatePurchaseOrderSchema>;
export type UpdatePurchaseOrderStatusDto = z.infer<
  typeof UpdatePurchaseOrderStatusSchema
>;
export type AddPurchaseOrderItemDto = z.infer<
  typeof AddPurchaseOrderItemSchema
>;
export type UpdatePurchaseOrderItemDto = z.infer<
  typeof UpdatePurchaseOrderItemSchema
>;
export type PurchaseOrderQuery = z.infer<typeof PurchaseOrderQuerySchema>;
export type PurchaseOrderItemResponse = z.infer<
  typeof PurchaseOrderItemResponseSchema
>;
export type PurchaseOrderResponse = z.infer<typeof PurchaseOrderResponseSchema>;
export type PurchaseOrderDetailResponse = z.infer<
  typeof PurchaseOrderDetailResponseSchema
>;
export type PaginatedPurchaseOrdersResponse = z.infer<
  typeof PaginatedPurchaseOrdersResponseSchema
>;