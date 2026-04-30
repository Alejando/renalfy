import { createZodDto } from 'nestjs-zod';
import { IncomeResponseSchema } from '@repo/types';

export class IncomeResponseDto extends createZodDto(IncomeResponseSchema) {}
