import { createZodDto } from 'nestjs-zod';
import { BulkStockRequestSchema } from '@repo/types';

export class BulkStockRequestDto extends createZodDto(BulkStockRequestSchema) {}
