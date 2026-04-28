import { createZodDto } from 'nestjs-zod';
import { UpdateSupplierSchema } from '@repo/types';

export class UpdateSupplierDto extends createZodDto(UpdateSupplierSchema) {}
