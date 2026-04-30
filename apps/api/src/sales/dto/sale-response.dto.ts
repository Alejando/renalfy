import { createZodDto } from 'nestjs-zod';
import { SaleResponseSchema } from '@repo/types';

export class SaleResponseDto extends createZodDto(SaleResponseSchema) {}
