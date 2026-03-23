import { createZodDto } from 'nestjs-zod';
import { UpdatePlanSchema } from '@repo/types';

export class UpdatePlanDto extends createZodDto(UpdatePlanSchema) {}
