import { createZodDto } from 'nestjs-zod';
import { UpdatePurchaseOrderSchema } from '@repo/types';

export class UpdatePurchaseOrderDto extends createZodDto(
  UpdatePurchaseOrderSchema,
) {}
