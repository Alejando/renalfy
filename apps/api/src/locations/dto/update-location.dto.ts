import { createZodDto } from 'nestjs-zod';
import { UpdateLocationSchema } from '@repo/types';

export class UpdateLocationDto extends createZodDto(UpdateLocationSchema) {}
