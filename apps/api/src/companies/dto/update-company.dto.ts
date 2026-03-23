import { createZodDto } from 'nestjs-zod';
import { UpdateCompanySchema } from '@repo/types';

export class UpdateCompanyDto extends createZodDto(UpdateCompanySchema) {}
