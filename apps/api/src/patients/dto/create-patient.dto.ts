import { createZodDto } from 'nestjs-zod';
import { CreatePatientSchema } from '@repo/types';

export class CreatePatientDto extends createZodDto(CreatePatientSchema) {}
