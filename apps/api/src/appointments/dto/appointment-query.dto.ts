import { createZodDto } from 'nestjs-zod';
import { AppointmentQuerySchema } from '@repo/types';

export class AppointmentQueryDto extends createZodDto(AppointmentQuerySchema) {}
