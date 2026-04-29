import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: {
      json: { limit: '10kb' },
      urlencoded: { limit: '10kb' },
    },
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());

  // Default to localhost if ALLOWED_ORIGINS not set (safe fallback)
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    optionsSuccessStatus: 200,
  });

  await app.listen(process.env['PORT'] ?? 3001);
}
void bootstrap();
