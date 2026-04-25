import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CategoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export class CategoryQueryDto extends createZodDto(CategoryQuerySchema) {}
