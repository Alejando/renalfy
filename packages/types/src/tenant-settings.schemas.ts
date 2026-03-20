import { z } from 'zod';

export const UpdateTenantSettingsSchema = z.object({
  logoUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (#RRGGBB)')
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (#RRGGBB)')
    .optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  customDomain: z.string().optional(),
});

export const TenantSettingsSchema = z.object({
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  primaryColor: z.string().nullable(),
  secondaryColor: z.string().nullable(),
  tagline: z.string().nullable(),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
});

export const PublicTenantResponseSchema = z.object({
  name: z.string(),
  slug: z.string(),
  settings: TenantSettingsSchema.nullable(),
});

export type UpdateTenantSettingsDto = z.infer<typeof UpdateTenantSettingsSchema>;
export type TenantSettings = z.infer<typeof TenantSettingsSchema>;
export type PublicTenantResponse = z.infer<typeof PublicTenantResponseSchema>;
