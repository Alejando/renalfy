import { z } from 'zod';

export const CashCloseStatusSchema = z.enum(['OPEN', 'CLOSED']);

export const CreateCashCloseSchema = z.object({
  locationId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((str) => new Date(str)),
});

export const CashCloseResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  date: z.coerce.date(),
  status: CashCloseStatusSchema,
  calculatedTotal: z.string(),
  salesTotal: z.string(),
  incomesTotal: z.string(),
  expensesTotal: z.string(),
  userId: z.string().uuid(),
  createdAt: z.coerce.date(),
  closedAt: z.coerce.date(),
});

export const CashCloseQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type CashCloseStatus = z.infer<typeof CashCloseStatusSchema>;
export type CreateCashCloseDto = z.infer<typeof CreateCashCloseSchema>;
export type CashCloseResponse = z.infer<typeof CashCloseResponseSchema>;
export type CashCloseQuery = z.infer<typeof CashCloseQuerySchema>;
