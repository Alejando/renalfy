import { z } from 'zod';
import { ConsentTypeSchema, PatientStatusSchema } from './enums.js';

export const CreateConsentSchema = z.object({
  type: ConsentTypeSchema,
  version: z.string().min(1),
  ipAddress: z.string().optional(),
  signatureUrl: z.string().url().optional(),
});

export const CreatePatientSchema = z.object({
  name: z.string().min(1),
  locationId: z.string().uuid(),
  birthDate: z.coerce.date().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  consent: CreateConsentSchema,
});

export const UpdatePatientSchema = z.object({
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const PatientQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  include: z.enum(['deleted']).optional(),
});

export const PatientResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  name: z.string(),
  birthDate: z.coerce.date().nullable(),
  phone: z.string().nullable(),
  mobile: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  status: PatientStatusSchema,
  hasConsent: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PaginatedPatientsResponseSchema = z.object({
  data: z.array(PatientResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type CreateConsentDto = z.infer<typeof CreateConsentSchema>;
export type CreatePatientDto = z.infer<typeof CreatePatientSchema>;
export type UpdatePatientDto = z.infer<typeof UpdatePatientSchema>;
export type PatientQuery = z.infer<typeof PatientQuerySchema>;
export type PatientResponse = z.infer<typeof PatientResponseSchema>;
export type PaginatedPatientsResponse = z.infer<
  typeof PaginatedPatientsResponseSchema
>;
