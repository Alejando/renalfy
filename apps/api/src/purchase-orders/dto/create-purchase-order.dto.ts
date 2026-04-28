import { createZodDto } from 'nestjs-zod';
import { CreatePurchaseOrderSchema } from '@repo/types';

export class CreatePurchaseOrderDto extends createZodDto(
  CreatePurchaseOrderSchema,
) {}
