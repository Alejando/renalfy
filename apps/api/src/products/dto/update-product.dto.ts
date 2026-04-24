import { createZodDto } from 'nestjs-zod';
import { UpdateProductSchema } from '@repo/types';

export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}
