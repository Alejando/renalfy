import { createZodDto } from 'nestjs-zod';
import { ExpenseQuerySchema } from '@repo/types';

export class ExpenseQueryDto extends createZodDto(ExpenseQuerySchema) {}
