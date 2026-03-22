import { createZodDto } from 'nestjs-zod';
import { CreateReceiptSchema } from '@repo/types';

export class CreateReceiptDto extends createZodDto(CreateReceiptSchema) {}
