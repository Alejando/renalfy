import { createZodDto } from 'nestjs-zod';
import { CreateAppointmentSchema } from '@repo/types';

export class CreateAppointmentDto extends createZodDto(
  CreateAppointmentSchema,
) {}
