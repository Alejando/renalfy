import { createZodDto } from 'nestjs-zod';
import { CreateProductCategorySchema } from '@repo/types';

export class CreateProductCategoryDto extends createZodDto(
  CreateProductCategorySchema,
) {}
