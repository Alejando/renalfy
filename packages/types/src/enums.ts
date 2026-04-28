import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'SUPER_ADMIN',
  'OWNER',
  'ADMIN',
  'MANAGER',
  'STAFF',
]);

export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);

export const TenantStatusSchema = z.enum([
  'TRIAL',
  'ACTIVE',
  'SUSPENDED',
  'CANCELLED',
]);

export const PatientStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'DELETED']);

export const ServiceTypeStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const ReceiptStatusSchema = z.enum([
  'ACTIVE',
  'FINISHED',
  'SETTLED',
  'CANCELLED',
]);

export const PaymentTypeSchema = z.enum([
  'CASH',
  'CREDIT',
  'BENEFIT',
  'INSURANCE',
  'TRANSFER',
]);

export const AppointmentStatusSchema = z.enum([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

export const PlanStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'EXHAUSTED']);

export const SupplierStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const PurchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'RECEIVED',
  'CANCELLED',
]);

export const MovementTypeSchema = z.enum(['IN', 'OUT']);

export const PaymentMethodSchema = z.enum([
  'CASH',
  'CREDIT',
  'TRANSFER',
  'OTHER',
]);

export const SaleStatusSchema = z.enum(['PENDING', 'SETTLED', 'CANCELLED']);

export const ConsentTypeSchema = z.enum([
  'PRIVACY_NOTICE',
  'TREATMENT',
  'DATA_SHARING',
]);

export const ProductTypeSchema = z.enum(['SALE', 'CONSUMABLE']);

// Inferred types
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type TenantStatus = z.infer<typeof TenantStatusSchema>;
export type PatientStatus = z.infer<typeof PatientStatusSchema>;
export type ServiceTypeStatus = z.infer<typeof ServiceTypeStatusSchema>;
export type ReceiptStatus = z.infer<typeof ReceiptStatusSchema>;
export type PaymentType = z.infer<typeof PaymentTypeSchema>;
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type PlanStatus = z.infer<typeof PlanStatusSchema>;
export type SupplierStatus = z.infer<typeof SupplierStatusSchema>;
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>;
export type MovementType = z.infer<typeof MovementTypeSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type SaleStatus = z.infer<typeof SaleStatusSchema>;
export type ConsentType = z.infer<typeof ConsentTypeSchema>;
export type ProductType = z.infer<typeof ProductTypeSchema>;
