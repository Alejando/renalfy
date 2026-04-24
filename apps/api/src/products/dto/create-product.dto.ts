import { createZodDto } from 'nestjs-zod';
import { CreateProductSchema } from '@repo/types';

export class CreateProductDto extends createZodDto(CreateProductSchema) {}
