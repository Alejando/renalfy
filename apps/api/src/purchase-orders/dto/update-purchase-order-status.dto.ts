import { createZodDto } from 'nestjs-zod';
import { UpdatePurchaseOrderStatusSchema } from '@repo/types';

export class UpdatePurchaseOrderStatusDto extends createZodDto(
  UpdatePurchaseOrderStatusSchema,
) {}
