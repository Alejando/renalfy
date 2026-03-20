import { createZodDto } from 'nestjs-zod';
import { CreateServiceTypeSchema } from '@repo/types';

export class CreateServiceTypeDto extends createZodDto(
  CreateServiceTypeSchema,
) {}
