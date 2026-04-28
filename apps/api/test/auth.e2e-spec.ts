import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';
import { AppModule } from './../src/app.module';

// Uses DATABASE_MIGRATION_URL (renalfy superuser, BYPASSRLS) to insert and clean fixtures.
// The app itself uses DATABASE_URL (renalfy_app, RLS enforced).
async function createMigrationClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env['DATABASE_MIGRATION_URL'],
  });
  await client.connect();
  return client;
}

const TEST_TENANT_ID = '00000000-e2e0-4000-a000-000000000001';
const TEST_USER_ID = '00000000-e2e0-4000-a000-000000000002';
const TEST_SUSPENDED_USER_ID = '00000000-e2e0-4000-a000-000000000003';
const TEST_EMAIL = 'auth-e2e@renalfy.test';
const TEST_PASSWORD = 'correct-password-123';
const BCRYPT_ROUNDS = 10;

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let db: Client;

  beforeAll(async () => {
    db = await createMigrationClient();

    const hashed = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);

    // Insert tenant fixture (no tenantId column — platform-level table)
    await db.query(
      `INSERT INTO "Tenant" (id, slug, name, status, plan, "updatedAt")
       VALUES ($1, $2, $3, 'ACTIVE', 'starter', NOW())
       ON CONFLICT DO NOTHING`,
      [TEST_TENANT_ID, 'auth-e2e-test', 'Auth E2E Test Org'],
    );

    // Insert active user fixture
    await db.query(
      `INSERT INTO "User" (id, "tenantId", name, email, password, role, status, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'OWNER', 'ACTIVE', NOW())
       ON CONFLICT DO NOTHING`,
      [TEST_USER_ID, TEST_TENANT_ID, 'E2E Test User', TEST_EMAIL, hashed],
    );

    // Insert suspended user fixture
    await db.query(
      `INSERT INTO "User" (id, "tenantId", name, email, password, role, status, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'STAFF', 'SUSPENDED', NOW())
       ON CONFLICT DO NOTHING`,
      [
        TEST_SUSPENDED_USER_ID,
        TEST_TENANT_ID,
        'Suspended User',
        'suspended-e2e@renalfy.test',
        hashed,
      ],
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
    // Clean up test fixtures in reverse dependency order
    await db.query(`DELETE FROM "User" WHERE "tenantId" = $1`, [
      TEST_TENANT_ID,
    ]);
    await db.query(`DELETE FROM "Tenant" WHERE id = $1`, [TEST_TENANT_ID]);
    await db.end();
    await app.close();
  });

  // ──────────────────────────────────────────────────────────────────
  // POST /api/auth/login
  // ──────────────────────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should return 200 with accessToken and refreshToken for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(200);

      const body = res.body as { accessToken: string; refreshToken: string };
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
    });

    it('should return 401 with unknown email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: 'nobody@example.com', password: TEST_PASSWORD })
        .expect(401);
    });

    it('should return 401 with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: TEST_EMAIL, password: 'wrong-password' })
        .expect(401);
    });

    it('should return 400 when email field is missing (Zod validation)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ password: TEST_PASSWORD })
        .expect(400);
    });

    it('should return 403 when user is SUSPENDED', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: 'suspended-e2e@renalfy.test', password: TEST_PASSWORD })
        .expect(403);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // GET /api/auth/me
  // ──────────────────────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      accessToken = (res.body as { accessToken: string }).accessToken;
    });

    it('should return 200 with user profile when token is valid', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', TEST_USER_ID);
      expect(res.body).toHaveProperty('email', TEST_EMAIL);
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // PATCH /api/auth/me/password
  // ──────────────────────────────────────────────────────────────────
  describe('PATCH /api/auth/me/password', () => {
    let accessToken: string;
    const newPassword = 'updated-password-456';

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      accessToken = (res.body as { accessToken: string }).accessToken;
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .patch('/api/auth/me/password')
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(401);
    });

    it('should return 401 with wrong currentPassword', () => {
      return request(app.getHttpServer())
        .patch('/api/auth/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'definitely-wrong',
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(401);
    });

    it('should return 204 when currentPassword is correct', async () => {
      await request(app.getHttpServer())
        .patch('/api/auth/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(204);

      // Restore original password so later tests are not affected
      const restored = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);
      await db.query(`UPDATE "User" SET password = $1 WHERE id = $2`, [
        restored,
        TEST_USER_ID,
      ]);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // POST /api/auth/logout
  // ──────────────────────────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      accessToken = (res.body as { accessToken: string }).accessToken;
    });

    it('should return 204 with valid token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).post('/api/auth/logout').expect(401);
    });
  });
});
