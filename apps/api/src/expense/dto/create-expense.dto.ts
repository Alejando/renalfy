import { createZodDto } from 'nestjs-zod';
import { CreateExpenseSchema } from '@repo/types';

export class CreateExpenseDto extends createZodDto(CreateExpenseSchema) {}
