import { createZodDto } from 'nestjs-zod';
import { UpdatePatientSchema } from '@repo/types';

export class UpdatePatientDto extends createZodDto(UpdatePatientSchema) {}
