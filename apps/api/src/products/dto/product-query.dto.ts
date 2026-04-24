import { createZodDto } from 'nestjs-zod';
import { ProductQuerySchema } from '@repo/types';

export class ProductQueryDto extends createZodDto(ProductQuerySchema) {}
