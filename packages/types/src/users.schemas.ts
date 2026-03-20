import { z } from 'zod';
import { UserRoleSchema, UserStatusSchema } from './enums.js';

const MANAGER_STAFF_ROLES = ['MANAGER', 'STAFF'] as const;

export const CreateUserSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    role: UserRoleSchema,
    locationId: z.string().uuid().optional(),
    phone: z.string().optional(),
  })
  .refine(
    (data) => {
      const requiresLocation = (MANAGER_STAFF_ROLES as readonly string[]).includes(data.role);
      return !requiresLocation || data.locationId !== undefined;
    },
    { message: 'locationId is required for MANAGER and STAFF roles', path: ['locationId'] },
  );

export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  locationId: z.string().uuid().optional(),
});

export const UpdateUserStatusSchema = z.object({
  status: UserStatusSchema,
});

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid().nullable(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type UpdateUserStatusDto = z.infer<typeof UpdateUserStatusSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
