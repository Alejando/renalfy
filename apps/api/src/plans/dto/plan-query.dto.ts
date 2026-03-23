import { createZodDto } from 'nestjs-zod';
import { PlanQuerySchema } from '@repo/types';

export class PlanQueryDto extends createZodDto(PlanQuerySchema) {}
