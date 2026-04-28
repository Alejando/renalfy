import { createZodDto } from 'nestjs-zod';
import { ClosePurchaseOrderSchema } from '@repo/types';

export class ClosePurchaseOrderDto extends createZodDto(
  ClosePurchaseOrderSchema,
) {}
