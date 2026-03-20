import { createZodDto } from 'nestjs-zod';
import { CreateUserSchema } from '@repo/types';

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
