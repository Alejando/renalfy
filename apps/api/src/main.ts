import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ZodValidationPipe } from 'nestjs-zod';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security: trust proxy for correct client IP behind reverse proxy
  app.set('trust proxy', 1);

  // Configure bodyParser limits
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ limit: '100kb' }));

  // Security headers (HSTS, CSP, X-Frame-Options, etc.)

  app.use(helmet());

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
