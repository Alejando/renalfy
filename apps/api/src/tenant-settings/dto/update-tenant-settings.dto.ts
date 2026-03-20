import { createZodDto } from 'nestjs-zod';
import { UpdateTenantSettingsSchema } from '@repo/types';

export class UpdateTenantSettingsDto extends createZodDto(
  UpdateTenantSettingsSchema,
) {}
