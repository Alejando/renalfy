import { z } from 'zod';
import { AppointmentStatusSchema } from './enums.js';

export const CreateAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  locationId: z.string().uuid(),
  serviceTypeId: z.string().uuid().optional(),
  scheduledAt: z.coerce.date(),
  clinicalData: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
});

export const UpdateAppointmentStatusSchema = z.object({
  status: AppointmentStatusSchema,
  notes: z.string().optional(),
});

export const AppointmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  date: z.string().optional(),
  status: AppointmentStatusSchema.optional(),
  patientId: z.string().uuid().optional(),
});

export const CreateMeasurementSchema = z.object({
  recordedAt: z.coerce.date(),
  data: z.record(z.string(), z.unknown()),
  notes: z.string().optional(),
});

export const MeasurementResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  recordedAt: z.coerce.date(),
  data: z.record(z.string(), z.unknown()),
  notes: z.string().nullable(),
});

export const AppointmentResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  patientId: z.string().uuid(),
  userId: z.string().uuid(),
  serviceTypeId: z.string().uuid().nullable(),
  receiptId: z.string().uuid().nullable(),
  scheduledAt: z.coerce.date(),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  status: AppointmentStatusSchema,
  clinicalData: z.record(z.string(), z.unknown()).nullable(),
  notes: z.string().nullable(),
  measurements: z.array(MeasurementResponseSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PaginatedAppointmentsResponseSchema = z.object({
  data: z.array(AppointmentResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentStatusDto = z.infer<
  typeof UpdateAppointmentStatusSchema
>;
export type AppointmentQuery = z.infer<typeof AppointmentQuerySchema>;
export type CreateMeasurementDto = z.infer<typeof CreateMeasurementSchema>;
export type MeasurementResponse = z.infer<typeof MeasurementResponseSchema>;
export type AppointmentResponse = z.infer<typeof AppointmentResponseSchema>;
export type PaginatedAppointmentsResponse = z.infer<
  typeof PaginatedAppointmentsResponseSchema
>;
