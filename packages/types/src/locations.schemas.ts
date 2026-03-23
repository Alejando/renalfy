import { z } from 'zod';

export const CreateLocationSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export const UpdateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export const LocationResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  status: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateLocationDto = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationDto = z.infer<typeof UpdateLocationSchema>;
export type LocationResponse = z.infer<typeof LocationResponseSchema>;
