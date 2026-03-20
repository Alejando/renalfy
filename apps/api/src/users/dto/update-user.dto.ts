import { createZodDto } from 'nestjs-zod';
import { UpdateUserSchema } from '@repo/types';

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
