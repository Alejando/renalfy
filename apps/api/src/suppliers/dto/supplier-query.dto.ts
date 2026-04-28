import { createZodDto } from 'nestjs-zod';
import { SupplierQuerySchema } from '@repo/types';

export class SupplierQueryDto extends createZodDto(SupplierQuerySchema) {}
