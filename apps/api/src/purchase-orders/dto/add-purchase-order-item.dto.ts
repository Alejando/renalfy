import { createZodDto } from 'nestjs-zod';
import { AddPurchaseOrderItemSchema } from '@repo/types';

export class AddPurchaseOrderItemDto extends createZodDto(
  AddPurchaseOrderItemSchema,
) {}
