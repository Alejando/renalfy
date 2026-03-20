import { createZodDto } from 'nestjs-zod';
import { CreateMeasurementSchema } from '@repo/types';

export class CreateMeasurementDto extends createZodDto(
  CreateMeasurementSchema,
) {}
