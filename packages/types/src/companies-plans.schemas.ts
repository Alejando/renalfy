import { z } from 'zod';
import { PlanStatusSchema } from './enums.js';

// ────────────────────────────────────────────────────────────────────────────
// Company schemas
// ────────────────────────────────────────────────────────────────────────────

export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
});

export const CompanyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export const CompanyResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  taxId: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  contactPerson: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PaginatedCompaniesResponseSchema = z.object({
  data: z.array(CompanyResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>;
export type CompanyQuery = z.infer<typeof CompanyQuerySchema>;
export type CompanyResponse = z.infer<typeof CompanyResponseSchema>;
export type PaginatedCompaniesResponse = z.infer<
  typeof PaginatedCompaniesResponseSchema
>;

// ────────────────────────────────────────────────────────────────────────────
// Plan schemas
// ────────────────────────────────────────────────────────────────────────────

export const CreatePlanSchema = z.object({
  patientId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  serviceTypeId: z.string().uuid().optional(),
  startDate: z.coerce.date(),
  plannedSessions: z.number().int().min(1, 'Sesiones debe ser > 0'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de monto inválido'),
  notes: z.string().optional(),
});

export const UpdatePlanSchema = z.object({
  companyId: z.string().uuid().optional(),
  serviceTypeId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  plannedSessions: z.number().int().min(1).optional(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Formato de monto inválido')
    .optional(),
  status: PlanStatusSchema.optional(),
  notes: z.string().optional(),
});

export const PlanQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  patientId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  status: PlanStatusSchema.optional(),
});

export const PlanResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  patientId: z.string().uuid(),
  companyId: z.string().uuid().nullable(),
  serviceTypeId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  startDate: z.coerce.date(),
  plannedSessions: z.number().int(),
  usedSessions: z.number().int(),
  amount: z.string(),
  status: PlanStatusSchema,
  notes: z.string().nullable(),
  patientName: z.string(),
  companyName: z.string().nullable(),
  serviceTypeName: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PaginatedPlansResponseSchema = z.object({
  data: z.array(PlanResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type CreatePlanDto = z.infer<typeof CreatePlanSchema>;
export type UpdatePlanDto = z.infer<typeof UpdatePlanSchema>;
export type PlanQuery = z.infer<typeof PlanQuerySchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
export type PaginatedPlansResponse = z.infer<typeof PaginatedPlansResponseSchema>;
