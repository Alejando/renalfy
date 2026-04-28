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
const TENANT_ID = '00000000-e2e0-4013-a000-000100000001';
const OWNER_ID = '00000000-e2e0-4013-a000-000100000002';
const MANAGER_ID = '00000000-e2e0-4013-a000-000100000003';
const LOCATION_ID = '00000000-e2e0-4013-a000-000100000004';
const PRODUCT_ID_A = '00000000-e2e0-4013-a000-000100000005';
const PRODUCT_ID_B = '00000000-e2e0-4013-a000-000100000006';
const OWNER_EMAIL = 'suppliers-owner-e2e@renalfy.test';
const MANAGER_EMAIL = 'suppliers-manager-e2e@renalfy.test';
const TEST_PASSWORD = 'testpassword123';

describe('Suppliers API (e2e)', () => {
  let app: INestApplication<App>;
  let db: Client;
  let ownerToken: string;
  let managerToken: string;

  beforeAll(async () => {
    db = await createMigrationClient();
    const hashed = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);

    await db.query(
      `INSERT INTO "Tenant" (id, slug, name, status, plan, "updatedAt")
       VALUES ($1, $2, $3, 'ACTIVE', 'starter', NOW())
       ON CONFLICT DO NOTHING`,
      [TENANT_ID, 'suppliers-e2e', 'Suppliers E2E Org'],
    );

    await db.query(
      `INSERT INTO "Location" (id, "tenantId", name, status, "updatedAt")
       VALUES ($1, $2, 'Test Location', 'active', NOW())
       ON CONFLICT DO NOTHING`,
      [LOCATION_ID, TENANT_ID],
    );

    await db.query(
      `INSERT INTO "User" (id, "tenantId", name, email, password, role, status, "updatedAt")
       VALUES ($1, $2, 'E2E Owner', $3, $4, 'OWNER', 'ACTIVE', NOW())
       ON CONFLICT DO NOTHING`,
      [OWNER_ID, TENANT_ID, OWNER_EMAIL, hashed],
    );

    await db.query(
      `INSERT INTO "User" (id, "tenantId", name, email, password, role, status, "locationId", "updatedAt")
       VALUES ($1, $2, 'E2E Manager', $3, $4, 'MANAGER', 'ACTIVE', $5, NOW())
       ON CONFLICT DO NOTHING`,
      [MANAGER_ID, TENANT_ID, MANAGER_EMAIL, hashed, LOCATION_ID],
    );

    // Insert products for association tests
    await db.query(
      `INSERT INTO "Product" (id, "tenantId", name, "productType", "purchasePrice", "salePrice", "updatedAt")
       VALUES ($1, $2, 'Guantes de Látex', 'CONSUMABLE', 50.00, 100.00, NOW()),
              ($3, $2, 'Mascarillas Quirúrgicas', 'CONSUMABLE', 30.00, 80.00, NOW())
       ON CONFLICT DO NOTHING`,
      [PRODUCT_ID_A, TENANT_ID, PRODUCT_ID_B],
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

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
    await db.query(`DELETE FROM "SupplierProduct" WHERE "tenantId" = $1`, [
      TENANT_ID,
    ]);
    await db.query(`DELETE FROM "Supplier" WHERE "tenantId" = $1`, [TENANT_ID]);
    await db.query(`DELETE FROM "Product" WHERE "tenantId" = $1`, [TENANT_ID]);
    await db.query(`DELETE FROM "User" WHERE "tenantId" = $1`, [TENANT_ID]);
    await db.query(`DELETE FROM "Location" WHERE "tenantId" = $1`, [TENANT_ID]);
    await db.query(`DELETE FROM "Tenant" WHERE id = $1`, [TENANT_ID]);
    await db.end();
    await app.close();
  });

  // ──────────────────────────────────────────────────────────────────
  // US1: Supplier CRUD
  // ──────────────────────────────────────────────────────────────────

  let supplierId: string;

  describe('POST /api/suppliers', () => {
    it('should create a supplier as OWNER', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Distribuidora Médica E2E',
          initials: 'DME',
          contact: 'Juan Contacto',
          phone: '5551112233',
          email: 'contacto@dme.com',
          address: 'Calle Salud 100',
          notes: 'Proveedor E2E',
        })
        .expect(201);

      const body = res.body as { id: string; name: string; status: string };
      expect(body).toHaveProperty('id');
      expect(body.name).toBe('Distribuidora Médica E2E');
      expect(body.status).toBe('ACTIVE');
      supplierId = body.id;
    });

    it('should return 409 when supplier name already exists for tenant', () => {
      return request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Distribuidora Médica E2E' })
        .expect(409);
    });

    it('should return 403 when MANAGER tries to create a supplier', () => {
      return request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Manager Supplier' })
        .expect(403);
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .post('/api/suppliers')
        .send({ name: 'No Auth Supplier' })
        .expect(401);
    });
  });

  describe('GET /api/suppliers', () => {
    it('should return paginated list of suppliers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/suppliers')
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
      expect(body.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter suppliers by search term', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/suppliers?search=Distribuidora')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as { data: Array<{ name: string }> };
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].name).toContain('Distribuidora');
    });

    it('should return only active suppliers by default', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as { data: Array<{ status: string }> };
      for (const item of body.data) {
        expect(item.status).toBe('ACTIVE');
      }
    });

    it('should include inactive suppliers when includeInactive is true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/suppliers?includeInactive=true')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as { data: Array<{ status: string }> };
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/suppliers/:id', () => {
    it('should return supplier by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as { id: string; name: string };
      expect(body.id).toBe(supplierId);
      expect(body.name).toBe('Distribuidora Médica E2E');
    });

    it('should return 404 for non-existent supplier', () => {
      return request(app.getHttpServer())
        .get('/api/suppliers/00000000-0000-4000-a000-000000099999')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/suppliers/:id', () => {
    it('should update supplier data as OWNER', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Distribuidora Médica E2E Edit', phone: '5559999999' })
        .expect(200);

      const body = res.body as { name: string; phone: string };
      expect(body.name).toBe('Distribuidora Médica E2E Edit');
      expect(body.phone).toBe('5559999999');
    });

    it('should return 403 when MANAGER tries to update', () => {
      return request(app.getHttpServer())
        .patch(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('should return 409 when updating to duplicate name', async () => {
      // Create second supplier
      const res = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Otro Proveedor E2E' })
        .expect(201);

      const otherId = (res.body as { id: string }).id;

      return request(app.getHttpServer())
        .patch(`/api/suppliers/${otherId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Distribuidora Médica E2E Edit' })
        .expect(409);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // US2: Supplier Products
  // ──────────────────────────────────────────────────────────────────

  describe('Supplier Products', () => {
    describe('POST /api/suppliers/:id/products', () => {
      it('should add a product to supplier as OWNER', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/suppliers/${supplierId}/products`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ productId: PRODUCT_ID_A, price: '150.00', leadTimeDays: 5 })
          .expect(201);

        const body = res.body as {
          id: string;
          supplierId: string;
          productId: string;
          price: string;
        };
        expect(body).toHaveProperty('id');
        expect(body.supplierId).toBe(supplierId);
        expect(body.productId).toBe(PRODUCT_ID_A);
        expect(parseFloat(body.price)).toBe(150.0);
      });

      it('should return 403 when MANAGER tries to add product', () => {
        return request(app.getHttpServer())
          .post(`/api/suppliers/${supplierId}/products`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send({ productId: PRODUCT_ID_B, price: '200.00' })
          .expect(403);
      });
    });

    describe('GET /api/suppliers/:id/products', () => {
      it('should return products for supplier', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/suppliers/${supplierId}/products`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as Array<{ id: string; productId: string }>;
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThanOrEqual(1);
        expect(body.some((p) => p.productId === PRODUCT_ID_A)).toBe(true);
      });
    });

    describe('PATCH /api/suppliers/:supplierId/products/:productId', () => {
      it('should update product price for supplier', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/suppliers/${supplierId}/products/${PRODUCT_ID_A}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ price: '175.50' })
          .expect(200);

        const body = res.body as { price: string };
        expect(parseFloat(body.price)).toBe(175.5);
      });

      it('should return 403 when MANAGER tries to update product', () => {
        return request(app.getHttpServer())
          .patch(`/api/suppliers/${supplierId}/products/${PRODUCT_ID_A}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send({ price: '999' })
          .expect(403);
      });
    });

    describe('DELETE /api/suppliers/:supplierId/products/:productId', () => {
      it('should return 403 when MANAGER tries to delete product', () => {
        return request(app.getHttpServer())
          .delete(`/api/suppliers/${supplierId}/products/${PRODUCT_ID_A}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(403);
      });

      it('should remove product from supplier as OWNER', async () => {
        await request(app.getHttpServer())
          .delete(`/api/suppliers/${supplierId}/products/${PRODUCT_ID_A}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        // Verify product was removed
        const res = await request(app.getHttpServer())
          .get(`/api/suppliers/${supplierId}/products`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as Array<{ productId: string }>;
        expect(body.some((p) => p.productId === PRODUCT_ID_A)).toBe(false);
      });
    });

    describe('GET /api/products/:id/suppliers', () => {
      it('should list suppliers for a product', async () => {
        // Re-add the product
        await request(app.getHttpServer())
          .post(`/api/suppliers/${supplierId}/products`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ productId: PRODUCT_ID_A, price: '150.00' })
          .expect(201);

        const res = await request(app.getHttpServer())
          .get(`/api/products/${PRODUCT_ID_A}/suppliers`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as Array<{ id: string }>;
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Edge cases
  // ──────────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('should allow MANAGER to read suppliers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const body = res.body as { data: unknown[] };
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should not return suppliers from another tenant', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as { data: Array<{ tenantId: string }> };
      for (const item of body.data) {
        expect(item.tenantId).toBe(TENANT_ID);
      }
    });
  });
});
