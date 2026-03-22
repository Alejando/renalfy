import { createZodDto } from 'nestjs-zod';
import { ServiceTypeQuerySchema } from '@repo/types';

export class ServiceTypeQueryDto extends createZodDto(ServiceTypeQuerySchema) {}
