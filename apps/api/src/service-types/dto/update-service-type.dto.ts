import { createZodDto } from 'nestjs-zod';
import { UpdateServiceTypeSchema } from '@repo/types';

export class UpdateServiceTypeDto extends createZodDto(
  UpdateServiceTypeSchema,
) {}
