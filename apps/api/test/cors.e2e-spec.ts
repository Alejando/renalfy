import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';
import { AppModule } from './../src/app.module';

async function createMigrationClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env['DATABASE_MIGRATION_URL'],
  });
  await client.connect();
  return client;
}

const TEST_TENANT_ID = '00000000-e2e0-4000-c000-000000000001';
const TEST_USER_ID = '00000000-e2e0-4000-c000-000000000002';
const TEST_EMAIL = 'cors-e2e@renalfy.test';
const TEST_PASSWORD = 'correct-password-123';
const BCRYPT_ROUNDS = 10;

describe('CORS Security (e2e)', () => {
  let app: INestApplication<App>;
  let db: Client;

  beforeAll(async () => {
    db = await createMigrationClient();

    const hashed = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);

    await db.query(
      `INSERT INTO "Tenant" (id, slug, name, status, plan, "updatedAt")
       VALUES ($1, $2, $3, 'ACTIVE', 'starter', NOW())
       ON CONFLICT DO NOTHING`,
      [TEST_TENANT_ID, 'cors-e2e-test', 'CORS E2E Test Org'],
    );

    await db.query(
      `INSERT INTO "User" (id, "tenantId", name, email, password, role, status, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'OWNER', 'ACTIVE', NOW())
       ON CONFLICT DO NOTHING`,
      [TEST_USER_ID, TEST_TENANT_ID, 'CORS Test User', TEST_EMAIL, hashed],
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await db.query(`DELETE FROM "User" WHERE "tenantId" = $1`, [
      TEST_TENANT_ID,
    ]);
    await db.query(`DELETE FROM "Tenant" WHERE id = $1`, [TEST_TENANT_ID]);
    await db.end();
    await app.close();
  });

  describe('CORS Configuration', () => {
    it('should allow requests from whitelisted origin (localhost:3020)', async () => {
      const origin = 'http://localhost:3020';
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', origin)
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should allow requests from whitelisted origin (renalfy.app)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', 'https://renalfy.app')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should work without Origin header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
    });

    it('should reject invalid credentials even with valid Origin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', 'http://localhost:3020')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: TEST_EMAIL, password: 'wrong-password' });

      expect(res.status).toBe(401);
    });
  });
});
