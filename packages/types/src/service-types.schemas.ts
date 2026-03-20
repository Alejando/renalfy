import { z } from 'zod';
import { ServiceTypeStatusSchema } from './enums.js';

export const CreateServiceTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive().optional(),
});

export const UpdateServiceTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
});

export const ServiceTypeResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().nullable(),
  status: ServiceTypeStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateServiceTypeDto = z.infer<typeof CreateServiceTypeSchema>;
export type UpdateServiceTypeDto = z.infer<typeof UpdateServiceTypeSchema>;
export type ServiceTypeResponse = z.infer<typeof ServiceTypeResponseSchema>;
