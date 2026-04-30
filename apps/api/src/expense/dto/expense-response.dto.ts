import { createZodDto } from 'nestjs-zod';
import { ExpenseResponseSchema } from '@repo/types';

export class ExpenseResponseDto extends createZodDto(ExpenseResponseSchema) {}
