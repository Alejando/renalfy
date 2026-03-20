import { createZodDto } from 'nestjs-zod';
import { UpsertClinicalTemplateSchema } from '@repo/types';

export class UpsertClinicalTemplateDto extends createZodDto(
  UpsertClinicalTemplateSchema,
) {}
