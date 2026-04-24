import { createZodDto } from 'nestjs-zod';
import { StockSummaryQuerySchema } from '@repo/types';

export class StockSummaryQueryDto extends createZodDto(
  StockSummaryQuerySchema,
) {}
