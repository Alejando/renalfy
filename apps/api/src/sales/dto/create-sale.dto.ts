import { createZodDto } from 'nestjs-zod';
import { CreateSaleSchema } from '@repo/types';

export class CreateSaleDto extends createZodDto(CreateSaleSchema) {}
