import { createZodDto } from 'nestjs-zod';
import { CompanyQuerySchema } from '@repo/types';

export class CompanyQueryDto extends createZodDto(CompanyQuerySchema) {}
