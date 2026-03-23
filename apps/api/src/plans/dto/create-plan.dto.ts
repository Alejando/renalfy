import { createZodDto } from 'nestjs-zod';
import { CreatePlanSchema } from '@repo/types';

export class CreatePlanDto extends createZodDto(CreatePlanSchema) {}
