import { z } from 'zod';
import { PaymentTypeSchema } from './enums.js';

export const SaleStatusSchema = z.enum([
  'ACTIVE',
  'FINISHED',
  'SETTLED',
  'CANCELLED',
]);

export const SaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  tax: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export const CreateSaleSchema = z.object({
  locationId: z.string().uuid(),
  paymentType: PaymentTypeSchema,
  items: z.array(SaleItemSchema).min(1),
  linkedPlanId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const SaleResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  folio: z.string(),
  totalAmount: z.string(),
  paymentType: PaymentTypeSchema,
  status: SaleStatusSchema,
  isClosed: z.boolean(),
  userId: z.string().uuid(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  finishedAt: z.coerce.date().nullable(),
  settledAt: z.coerce.date().nullable(),
  closedAt: z.coerce.date().nullable(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      productId: z.string().uuid(),
      quantity: z.number().int(),
      unitPrice: z.string(),
      tax: z.string(),
      subtotal: z.string(),
      createdAt: z.coerce.date(),
    })
  ),
});

export const SaleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: SaleStatusSchema.optional(),
  paymentType: PaymentTypeSchema.optional(),
  locationId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const PaginatedSalesResponseSchema = z.object({
  data: z.array(SaleResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type SaleStatus = z.infer<typeof SaleStatusSchema>;
export type SaleItem = z.infer<typeof SaleItemSchema>;
export type CreateSaleDto = z.infer<typeof CreateSaleSchema>;
export type SaleResponse = z.infer<typeof SaleResponseSchema>;
export type SaleQuery = z.infer<typeof SaleQuerySchema>;
export type PaginatedSalesResponse = z.infer<typeof PaginatedSalesResponseSchema>;
