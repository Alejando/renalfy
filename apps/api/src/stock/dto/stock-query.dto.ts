import { createZodDto } from 'nestjs-zod';
import { StockQuerySchema } from '@repo/types';

export class StockQueryDto extends createZodDto(StockQuerySchema) {}
