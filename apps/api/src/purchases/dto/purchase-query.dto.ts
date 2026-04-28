import { createZodDto } from 'nestjs-zod';
import { PurchaseQuerySchema } from '@repo/types';

export class PurchaseQueryDto extends createZodDto(PurchaseQuerySchema) {}
