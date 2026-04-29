import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());

  const allowedOrigins = process.env.ALLOWED_ORIGINS;

  if (allowedOrigins) {
    const originsArray = allowedOrigins.split(',').map((o) => o.trim());
    app.enableCors({
      origin: originsArray,
      credentials: true,
    });
  } else {
    app.enableCors();
  }

  await app.listen(process.env['PORT'] ?? 3001);
}
void bootstrap();
