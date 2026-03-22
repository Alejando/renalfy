import { z } from 'zod';
import { PaymentTypeSchema, ReceiptStatusSchema } from './enums.js';

export const CreateReceiptSchema = z.object({
  patientId: z.string().uuid(),
  locationId: z.string().uuid(),
  serviceTypeId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  date: z.coerce.date(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentType: PaymentTypeSchema,
  notes: z.string().optional(),
});

export const UpdateReceiptStatusSchema = z.object({
  status: ReceiptStatusSchema,
  notes: z.string().optional(),
});

export const ReceiptQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: ReceiptStatusSchema.optional(),
  patientId: z.string().uuid().optional(),
  paymentType: PaymentTypeSchema.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const ReceiptResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  patientId: z.string().uuid(),
  userId: z.string().uuid(),
  serviceTypeId: z.string().uuid().nullable(),
  planId: z.string().uuid().nullable(),
  folio: z.string(),
  date: z.coerce.date(),
  amount: z.string(),
  paymentType: PaymentTypeSchema,
  status: ReceiptStatusSchema,
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PaginatedReceiptsResponseSchema = z.object({
  data: z.array(ReceiptResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type CreateReceiptDto = z.infer<typeof CreateReceiptSchema>;
export type UpdateReceiptStatusDto = z.infer<typeof UpdateReceiptStatusSchema>;
export type ReceiptQuery = z.infer<typeof ReceiptQuerySchema>;
export type ReceiptResponse = z.infer<typeof ReceiptResponseSchema>;
export type PaginatedReceiptsResponse = z.infer<
  typeof PaginatedReceiptsResponseSchema
>;
