import { createZodDto } from 'nestjs-zod';
import { CreateSupplierProductSchema } from '@repo/types';

export class CreateSupplierProductDto extends createZodDto(
  CreateSupplierProductSchema,
) {}
