import { createZodDto } from 'nestjs-zod';
import { PurchaseOrderQuerySchema } from '@repo/types';

export class PurchaseOrderQueryDto extends createZodDto(
  PurchaseOrderQuerySchema,
) {}
