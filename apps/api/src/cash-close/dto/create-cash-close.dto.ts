import { createZodDto } from 'nestjs-zod';
import { CreateCashCloseSchema } from '@repo/types';

export class CreateCashCloseDto extends createZodDto(CreateCashCloseSchema) {}
