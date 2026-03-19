import { createZodDto } from 'nestjs-zod';
import { LoginSchema } from '@repo/types';

export class LoginDto extends createZodDto(LoginSchema) {}
