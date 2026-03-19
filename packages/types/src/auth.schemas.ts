import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Requerido'),
  newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid().nullable(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  status: z.string(),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
