import { z } from 'zod';
import { MovementTypeSchema } from './enums.js';

// ── Recepción ──────────────────────────────────────────────────────────────

export const ReceivePurchaseItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityReceived: z.number().int().min(1, 'Cantidad recibida debe ser al menos 1'),
  unitsPerPackage: z.number().int().min(1, 'Unidades por empaque debe ser al menos 1').default(1),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de precio inválido'),
  tax: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de impuesto inválido').default('0').optional(),
});

export const ReceivePurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  locationId: z.string().uuid(),
  items: z.array(ReceivePurchaseItemSchema).min(1, 'Debe recibir al menos un ítem'),
  notes: z.string().optional(),
});

export const ClosePurchaseOrderSchema = z.object({
  notes: z.string().optional(),
});

// ── Responses ──────────────────────────────────────────────────────────────

export const PurchaseItemResponseSchema = z.object({
  id: z.string().uuid(),
  purchaseId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int(),
  quantityReceived: z.number().int(),
  unitsPerPackage: z.number().int(),
  unitPrice: z.string(),
  tax: z.string(),
  subtotal: z.string(),
  createdAt: z.coerce.date(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    brand: z.string().nullable(),
  }),
});

export const PurchaseResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  userId: z.string().uuid(),
  supplierId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  date: z.coerce.date(),
  amount: z.string(),
  notes: z.string().nullable(),
  supplierName: z.string(),
  locationName: z.string(),
  itemCount: z.number().int(),
  createdAt: z.coerce.date(),
});

export const PurchaseDetailResponseSchema = PurchaseResponseSchema.extend({
  items: z.array(PurchaseItemResponseSchema),
  supplier: z.object({
    id: z.string().uuid(),
    name: z.string(),
    contact: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  location: z.object({ id: z.string().uuid(), name: z.string() }),
});

export const PurchaseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  supplierId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});

export const PaginatedPurchasesResponseSchema = z.object({
  data: z.array(PurchaseResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

// ── Inventory Movements ───────────────────────────────────────────────────

export const InventoryMovementItemResponseSchema = z.object({
  id: z.string().uuid(),
  inventoryMovementId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    brand: z.string().nullable(),
  }),
});

export const InventoryMovementResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.coerce.date(),
  type: MovementTypeSchema,
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  itemCount: z.number().int(),
  createdAt: z.coerce.date(),
});

export const InventoryMovementDetailResponseSchema = InventoryMovementResponseSchema.extend({
  items: z.array(InventoryMovementItemResponseSchema),
});

export const InventoryMovementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  locationId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  type: MovementTypeSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const PaginatedInventoryMovementsResponseSchema = z.object({
  data: z.array(InventoryMovementResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

// ── Inferred types ──────────────────────────────────────────────────────────

export type ReceivePurchaseItemDto = z.infer<typeof ReceivePurchaseItemSchema>;
export type ReceivePurchaseOrderDto = z.infer<typeof ReceivePurchaseOrderSchema>;
export type ClosePurchaseOrderDto = z.infer<typeof ClosePurchaseOrderSchema>;
export type PurchaseItemResponse = z.infer<typeof PurchaseItemResponseSchema>;
export type PurchaseResponse = z.infer<typeof PurchaseResponseSchema>;
export type PurchaseDetailResponse = z.infer<typeof PurchaseDetailResponseSchema>;
export type PurchaseQuery = z.infer<typeof PurchaseQuerySchema>;
export type PaginatedPurchasesResponse = z.infer<typeof PaginatedPurchasesResponseSchema>;
export type InventoryMovementItemResponse = z.infer<typeof InventoryMovementItemResponseSchema>;
export type InventoryMovementResponse = z.infer<typeof InventoryMovementResponseSchema>;
export type InventoryMovementDetailResponse = z.infer<typeof InventoryMovementDetailResponseSchema>;
export type InventoryMovementQuery = z.infer<typeof InventoryMovementQuerySchema>;
export type PaginatedInventoryMovementsResponse = z.infer<typeof PaginatedInventoryMovementsResponseSchema>;
