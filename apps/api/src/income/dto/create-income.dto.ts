import { createZodDto } from 'nestjs-zod';
import { CreateIncomeSchema } from '@repo/types';

export class CreateIncomeDto extends createZodDto(CreateIncomeSchema) {}
