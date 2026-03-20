import { createZodDto } from 'nestjs-zod';
import { UpdateUserStatusSchema } from '@repo/types';

export class UpdateUserStatusDto extends createZodDto(UpdateUserStatusSchema) {}
