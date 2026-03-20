import { z } from 'zod';

export const TemplateFieldTypeSchema = z.enum([
  'text',
  'number',
  'boolean',
  'select',
]);

export const TemplateFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: TemplateFieldTypeSchema,
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const UpsertClinicalTemplateSchema = z.object({
  serviceTypeId: z.string().uuid(),
  fields: z.array(TemplateFieldSchema).min(1),
});

export const ClinicalTemplateQuerySchema = z.object({
  serviceTypeId: z.string().uuid().optional(),
});

export const ClinicalTemplateResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  fields: z.array(TemplateFieldSchema),
  updatedAt: z.coerce.date(),
});

export type TemplateFieldType = z.infer<typeof TemplateFieldTypeSchema>;
export type TemplateField = z.infer<typeof TemplateFieldSchema>;
export type UpsertClinicalTemplateDto = z.infer<
  typeof UpsertClinicalTemplateSchema
>;
export type ClinicalTemplateQuery = z.infer<typeof ClinicalTemplateQuerySchema>;
export type ClinicalTemplateResponse = z.infer<
  typeof ClinicalTemplateResponseSchema
>;
