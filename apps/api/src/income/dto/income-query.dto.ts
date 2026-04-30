import { createZodDto } from 'nestjs-zod';
import { IncomeQuerySchema } from '@repo/types';

export class IncomeQueryDto extends createZodDto(IncomeQuerySchema) {}
