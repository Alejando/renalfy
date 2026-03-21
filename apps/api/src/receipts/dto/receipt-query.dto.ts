import { createZodDto } from 'nestjs-zod';
import { ReceiptQuerySchema } from '@repo/types';

export class ReceiptQueryDto extends createZodDto(ReceiptQuerySchema) {}
