import { createZodDto } from 'nestjs-zod';
import { CreateSupplierSchema } from '@repo/types';

export class CreateSupplierDto extends createZodDto(CreateSupplierSchema) {}
