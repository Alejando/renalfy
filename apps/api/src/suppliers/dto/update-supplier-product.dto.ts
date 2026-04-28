import { createZodDto } from 'nestjs-zod';
import { UpdateSupplierProductSchema } from '@repo/types';

export class UpdateSupplierProductDto extends createZodDto(
  UpdateSupplierProductSchema,
) {}
