import { createZodDto } from 'nestjs-zod';
import { UpdateAppointmentStatusSchema } from '@repo/types';

export class UpdateAppointmentStatusDto extends createZodDto(
  UpdateAppointmentStatusSchema,
) {}
