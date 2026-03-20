import { createZodDto } from 'nestjs-zod';
import { CreateLocationSchema } from '@repo/types';

export class CreateLocationDto extends createZodDto(CreateLocationSchema) {}
