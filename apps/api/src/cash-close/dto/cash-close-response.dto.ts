import { createZodDto } from 'nestjs-zod';
import { CashCloseResponseSchema } from '@repo/types';

export class CashCloseResponseDto extends createZodDto(
  CashCloseResponseSchema,
) {}
