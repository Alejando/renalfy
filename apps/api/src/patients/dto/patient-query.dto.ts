import { createZodDto } from 'nestjs-zod';
import { PatientQuerySchema } from '@repo/types';

export class PatientQueryDto extends createZodDto(PatientQuerySchema) {}
