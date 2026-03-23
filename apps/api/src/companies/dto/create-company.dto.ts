import { createZodDto } from 'nestjs-zod';
import { CreateCompanySchema } from '@repo/types';

export class CreateCompanyDto extends createZodDto(CreateCompanySchema) {}
