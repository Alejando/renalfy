import { createZodDto } from 'nestjs-zod';
import { UpdateReceiptStatusSchema } from '@repo/types';

export class UpdateReceiptStatusDto extends createZodDto(
  UpdateReceiptStatusSchema,
) {}
