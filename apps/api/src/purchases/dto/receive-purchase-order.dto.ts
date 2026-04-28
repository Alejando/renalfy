import { createZodDto } from 'nestjs-zod';
import { ReceivePurchaseOrderSchema } from '@repo/types';

export class ReceivePurchaseOrderDto extends createZodDto(
  ReceivePurchaseOrderSchema,
) {}
