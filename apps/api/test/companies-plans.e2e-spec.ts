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

const BCRYPT_ROUNDS = 10;
const TENANT_ID = '00000000-e2e0-4013-a000-000000000001';
const OWNER_ID = '00000000-e2e0-4013-a000-000000000002';
const MANAGER_ID = '00000000-e2e0-4013-a000-000000000003';
const LOCATION_ID = '00000000-e2e0-4013-a000-000000000004';
const PATIENT_ID = '00000000-e2e0-4013-a000-000000000005';
const SERVICE_TYPE_ID = '00000000-e2e0-4013-a000-000000000006';
const OWNER_EMAIL = 'owner-companies-e2e@renalfy.test';
const MANAGER_EMAIL = 'manager-companies-e2e@renalfy.test';
const TEST_PASSWORD = 'testpassword123';

describe('Companies & Plans API (e2e)', () => {
  let app: INestApplication<App>;
  let db: Client;
  let ownerToken: string;
  let managerToken: string;

  beforeAll(async () => {
    db = await createMigrationClient();
    const hashed = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);

    // Insert tenant
    await db.query(
      `INSERT INTO "Tenant" (id, slug, name, status, plan, "updatedAt")
       VALUES ($1, $2, $3, 'ACTIVE', 'starter', NOW())
       ON CONFLICT DO NOTHING`,
      [TENANT_ID, 'companies-plans-e2e', 'Companies Plans E2E Org'],
    );

    // Insert location
    await db.query(
      `INSERT INTO "Location" (id, "tenantId", name, address, phone, status, "updatedAt")
       VALUES ($1, $2, 'Test Location', 'Calle 1', '3300000000', 'active', NOW())
       ON CONFLICT DO NOTHING`,
      [LOCATION_ID, TENANT_ID],
    );

    // Insert OWNER user
    await db.query(
      `INSERT INTO "User" (id, "tenantId", name, email, password, role, status, "updatedAt")
       VALUES ($1, $2, 'E2E Owner', $3, $4, 'OWNER', 'ACTIVE', NOW())
       ON CONFLICT DO NOTHING`,
      [OWNER_ID, TENANT_ID, OWNER_EMAIL, hashed],
    );

    // Insert MANAGER user (with location constraint)
    await db.query(
      `INSERT INTO "User" (id, "tenantId", name, email, password, role, status, "locationId", "updatedAt")
       VALUES ($1, $2, 'E2E Manager', $3, $4, 'MANAGER', 'ACTIVE', $5, NOW())
       ON CONFLICT DO NOTHING`,
      [MANAGER_ID, TENANT_ID, MANAGER_EMAIL, hashed, LOCATION_ID],
    );

    // Insert service type
    await db.query(
      `INSERT INTO "ServiceType" (id, "tenantId", name, description, price, status, "updatedAt")
       VALUES ($1, $2, 'Hemodiálisis', 'Sesión de hemodiálisis', 1500.00, 'ACTIVE', NOW())
       ON CONFLICT DO NOTHING`,
      [SERVICE_TYPE_ID, TENANT_ID],
    );

    // Insert patient with consent
    await db.query(
      `INSERT INTO "Patient" (id, "tenantId", "locationId", name, status, "updatedAt")
       VALUES ($1, $2, $3, 'Paciente E2E', 'ACTIVE', NOW())
       ON CONFLICT DO NOTHING`,
      [PATIENT_ID, TENANT_ID, LOCATION_ID],
    );
    await db.query(
      `INSERT INTO "PatientConsent" (id, "tenantId", "patientId", type, version)
       VALUES (gen_random_uuid(), $1, $2, 'PRIVACY_NOTICE', 'v1.0')
       ON CONFLICT DO NOTHING`,
      [TENANT_ID, PATIENT_ID],
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    // Get tokens
    const ownerRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Tenant-ID', TENANT_ID)
      .send({ email: OWNER_EMAIL, password: TEST_PASSWORD });
    ownerToken = (ownerRes.body as { accessToken: string }).accessToken;

    const managerRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Tenant-ID', TENANT_ID)
      .send({ email: MANAGER_EMAIL, password: TEST_PASSWORD });
    managerToken = (managerRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    // Clean in reverse dependency order
    await db.query(`DELETE FROM "Plan" WHERE "tenantId" = $1`, [TENANT_ID]);
    await db.query(`DELETE FROM "Company" WHERE "tenantId" = $1`, [TENANT_ID]);
    await db.query(`DELETE FROM "PatientConsent" WHERE "tenantId" = $1`, [
      TENANT_ID,
    ]);
    await db.query(`DELETE FROM "Patient" WHERE "tenantId" = $1`, [TENANT_ID]);
    await db.query(`DELETE FROM "ServiceType" WHERE "tenantId" = $1`, [
      TENANT_ID,
    ]);
    await db.query(`DELETE FROM "User" WHERE "tenantId" = $1`, [TENANT_ID]);
    await db.query(`DELETE FROM "Location" WHERE "tenantId" = $1`, [TENANT_ID]);
    await db.query(`DELETE FROM "Tenant" WHERE id = $1`, [TENANT_ID]);
    await db.end();
    await app.close();
  });

  // ──────────────────────────────────────────────────────────────────
  // COMPANIES
  // ──────────────────────────────────────────────────────────────────

  describe('Companies', () => {
    let companyId: string;

    describe('POST /api/companies', () => {
      it('should create a company as OWNER', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/companies')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Acme Corp E2E',
            taxId: 'ACE010101AAA',
            email: 'info@acme.com',
          })
          .expect(201);

        const body = res.body as { id: string; name: string };
        expect(body).toHaveProperty('id');
        expect(body.name).toBe('Acme Corp E2E');
        companyId = body.id;
      });

      it('should return 409 when company name already exists for tenant', () => {
        return request(app.getHttpServer())
          .post('/api/companies')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Acme Corp E2E' })
          .expect(409);
      });

      it('should return 403 when MANAGER tries to create a company', () => {
        return request(app.getHttpServer())
          .post('/api/companies')
          .set('Authorization', `Bearer ${managerToken}`)
          .send({ name: 'Manager Company' })
          .expect(403);
      });

      it('should return 401 without auth token', () => {
        return request(app.getHttpServer())
          .post('/api/companies')
          .send({ name: 'No Auth Company' })
          .expect(401);
      });
    });

    describe('GET /api/companies', () => {
      it('should return paginated list of companies', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/companies')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as {
          data: unknown[];
          total: number;
          page: number;
          limit: number;
        };
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('total');
        expect(Array.isArray(body.data)).toBe(true);
      });

      it('should filter companies by search term', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/companies?search=Acme')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as { data: Array<{ name: string }> };
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data[0].name).toContain('Acme');
      });
    });

    describe('GET /api/companies/:id', () => {
      it('should return company by id', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/companies/${companyId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as { id: string; name: string };
        expect(body.id).toBe(companyId);
        expect(body.name).toBe('Acme Corp E2E');
      });

      it('should return 404 for non-existent company id', () => {
        return request(app.getHttpServer())
          .get('/api/companies/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(404);
      });
    });

    describe('PATCH /api/companies/:id', () => {
      it('should update company fields', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/companies/${companyId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ phone: '3312345678' })
          .expect(200);

        const body = res.body as { phone: string };
        expect(body.phone).toBe('3312345678');
      });

      it('should return 403 when MANAGER tries to update', () => {
        return request(app.getHttpServer())
          .patch(`/api/companies/${companyId}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send({ phone: '0000000000' })
          .expect(403);
      });
    });

    describe('DELETE /api/companies/:id', () => {
      it('should delete company with no associated plans', async () => {
        // Create a separate company to delete
        const createRes = await request(app.getHttpServer())
          .post('/api/companies')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'To Delete Corp' })
          .expect(201);

        const toDeleteId = (createRes.body as { id: string }).id;

        await request(app.getHttpServer())
          .delete(`/api/companies/${toDeleteId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(204);
      });

      it('should return 403 when MANAGER tries to delete', () => {
        return request(app.getHttpServer())
          .delete(`/api/companies/${companyId}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(403);
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // PLANS
  // ──────────────────────────────────────────────────────────────────

  describe('Plans', () => {
    let planId: string;

    describe('POST /api/plans', () => {
      it('should create a plan as OWNER', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/plans')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            patientId: PATIENT_ID,
            locationId: LOCATION_ID,
            serviceTypeId: SERVICE_TYPE_ID,
            startDate: '2024-01-01',
            plannedSessions: 12,
            amount: '5000.00',
          })
          .expect(201);

        const body = res.body as {
          id: string;
          status: string;
          usedSessions: number;
          patientName: string;
        };
        expect(body).toHaveProperty('id');
        expect(body.status).toBe('ACTIVE');
        expect(body.usedSessions).toBe(0);
        expect(body.patientName).toBe('Paciente E2E');
        planId = body.id;
      });

      it('should return 409 when creating duplicate ACTIVE plan for same patient+serviceType', () => {
        return request(app.getHttpServer())
          .post('/api/plans')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            patientId: PATIENT_ID,
            locationId: LOCATION_ID,
            serviceTypeId: SERVICE_TYPE_ID,
            startDate: '2024-01-01',
            plannedSessions: 6,
            amount: '2500.00',
          })
          .expect(409);
      });

      it('should auto-fill locationId from MANAGER user', async () => {
        // MANAGER has locationId in JWT — no need to send it in body
        // First we need to change existing plan status to avoid conflict
        await db.query(`UPDATE "Plan" SET status = 'INACTIVE' WHERE id = $1`, [
          planId,
        ]);

        const res = await request(app.getHttpServer())
          .post('/api/plans')
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            patientId: PATIENT_ID,
            serviceTypeId: SERVICE_TYPE_ID,
            startDate: '2024-02-01',
            plannedSessions: 6,
            amount: '3000.00',
          })
          .expect(201);

        const body = res.body as { locationId: string };
        expect(body.locationId).toBe(LOCATION_ID);

        // Reset plan status back
        await db.query(`UPDATE "Plan" SET status = 'ACTIVE' WHERE id = $1`, [
          planId,
        ]);
        // Clean up the manager's plan
        await db.query(
          `DELETE FROM "Plan" WHERE "tenantId" = $1 AND id != $2`,
          [TENANT_ID, planId],
        );
      });

      it('should return 404 for non-existent patient', () => {
        return request(app.getHttpServer())
          .post('/api/plans')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            patientId: '00000000-0000-0000-0000-000000000000',
            locationId: LOCATION_ID,
            startDate: '2024-01-01',
            plannedSessions: 12,
            amount: '5000.00',
          })
          .expect(404);
      });
    });

    describe('GET /api/plans', () => {
      it('should return paginated list of plans', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/plans')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as {
          data: unknown[];
          total: number;
          page: number;
          limit: number;
        };
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.total).toBeGreaterThan(0);
      });

      it('should filter plans by patientId', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/plans?patientId=${PATIENT_ID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as { data: Array<{ patientId: string }> };
        expect(body.data.every((p) => p.patientId === PATIENT_ID)).toBe(true);
      });

      it('should filter plans by status', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/plans?status=ACTIVE')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as { data: Array<{ status: string }> };
        expect(body.data.every((p) => p.status === 'ACTIVE')).toBe(true);
      });

      it('MANAGER should only see plans from their location', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/plans')
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(200);

        const body = res.body as { data: Array<{ locationId: string }> };
        expect(body.data.every((p) => p.locationId === LOCATION_ID)).toBe(true);
      });
    });

    describe('GET /api/plans/:id', () => {
      it('should return plan with enriched data', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/plans/${planId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as {
          id: string;
          patientName: string;
          serviceTypeName: string;
        };
        expect(body.id).toBe(planId);
        expect(body.patientName).toBe('Paciente E2E');
        expect(body.serviceTypeName).toBe('Hemodiálisis');
      });

      it('should return 404 for non-existent plan', () => {
        return request(app.getHttpServer())
          .get('/api/plans/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(404);
      });
    });

    describe('PATCH /api/plans/:id', () => {
      it('should update plan notes', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/plans/${planId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ notes: 'Updated via e2e test' })
          .expect(200);

        const body = res.body as { notes: string };
        expect(body.notes).toBe('Updated via e2e test');
      });

      it('should allow ACTIVE → INACTIVE status transition', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/plans/${planId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ status: 'INACTIVE' })
          .expect(200);

        expect((res.body as { status: string }).status).toBe('INACTIVE');

        // Reset back to ACTIVE for subsequent tests
        await request(app.getHttpServer())
          .patch(`/api/plans/${planId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ status: 'ACTIVE' });
      });

      it('should return 409 when trying to modify EXHAUSTED plan', async () => {
        // Force plan to EXHAUSTED via DB
        await db.query(`UPDATE "Plan" SET status = 'EXHAUSTED' WHERE id = $1`, [
          planId,
        ]);

        await request(app.getHttpServer())
          .patch(`/api/plans/${planId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ notes: 'Cannot update' })
          .expect(409);

        // Reset back for cleanup
        await db.query(`UPDATE "Plan" SET status = 'ACTIVE' WHERE id = $1`, [
          planId,
        ]);
      });
    });

    describe('DELETE /api/plans/:id', () => {
      it('should return 409 when trying to delete plan with usedSessions > 0', async () => {
        await db.query(`UPDATE "Plan" SET "usedSessions" = 1 WHERE id = $1`, [
          planId,
        ]);

        await request(app.getHttpServer())
          .delete(`/api/plans/${planId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(409);

        await db.query(`UPDATE "Plan" SET "usedSessions" = 0 WHERE id = $1`, [
          planId,
        ]);
      });

      it('should delete plan when usedSessions is 0', async () => {
        // Create a fresh plan to delete
        const createRes = await request(app.getHttpServer())
          .post('/api/plans')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            patientId: PATIENT_ID,
            locationId: LOCATION_ID,
            startDate: '2024-03-01',
            plannedSessions: 5,
            amount: '2000.00',
            // No serviceTypeId to avoid conflict with existing ACTIVE plan
          })
          .expect(201);

        const toDeleteId = (createRes.body as { id: string }).id;

        await request(app.getHttpServer())
          .delete(`/api/plans/${toDeleteId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(204);
      });
    });
  });
});
