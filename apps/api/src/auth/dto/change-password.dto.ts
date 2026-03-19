import { createZodDto } from 'nestjs-zod';
import { ChangePasswordSchema } from '@repo/types';

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
