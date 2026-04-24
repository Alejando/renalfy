import { createZodDto } from 'nestjs-zod';
import { UpsertLocationStockSchema } from '@repo/types';

export class UpsertLocationStockDto extends createZodDto(
  UpsertLocationStockSchema,
) {}
