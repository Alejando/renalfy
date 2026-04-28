import { createZodDto } from 'nestjs-zod';
import { UpdatePurchaseOrderItemSchema } from '@repo/types';

export class UpdatePurchaseOrderItemDto extends createZodDto(
  UpdatePurchaseOrderItemSchema,
) {}
