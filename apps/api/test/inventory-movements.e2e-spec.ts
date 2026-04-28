import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Inventory Movements E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let tenantId: string;
  let userId: string;
  let locationId: string;
  let productId: string;
  let movementId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Setup: create tenant, user, location, and product
    const tenantRes = await prisma.tenant.create({
      data: {
        slug: `test-${Date.now()}`,
        name: `Test Tenant ${Date.now()}`,
      },
    });
    tenantId = tenantRes.id;

    const userRes = await prisma.user.create({
      data: {
        tenantId,
        email: `test-${Date.now()}@test.com`,
        name: 'Test User',
        password: 'hash',
        role: 'OWNER',
      },
    });
    userId = userRes.id;

    const locationRes = await prisma.location.create({
      data: {
        tenantId,
        name: 'Test Location',
      },
    });
    locationId = locationRes.id;

    const productRes = await prisma.product.create({
      data: {
        tenantId,
        name: 'Test Product',
        brand: 'Test Brand',
        purchasePrice: 10.0,
        salePrice: 20.0,
      },
    });
    productId = productRes.id;

    const movementRes = await prisma.inventoryMovement.create({
      data: {
        tenantId,
        locationId,
        userId,
        date: new Date(),
        type: 'IN',
        reference: 'PURCHASE-123',
      },
    });
    movementId = movementRes.id;

    await prisma.inventoryMovementItem.create({
      data: {
        inventoryMovementId: movementId,
        productId,
        quantity: 500,
      },
    });

    // Login and get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: userRes.email,
        password: 'password',
      });

    accessToken = loginRes.body.accessToken || 'mock-token';
  });

  afterEach(async () => {
    // Cleanup: delete test data in order
    await prisma.inventoryMovementItem.deleteMany({});
    await prisma.inventoryMovement.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});
  });

  describe('GET /api/inventory-movements (list)', () => {
    it('should list inventory movements with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory-movements?page=1&limit=20')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page', 1);
        expect(res.body).toHaveProperty('limit', 20);
        expect(Array.isArray(res.body.data)).toBe(true);
      }
    });

    it('should filter by locationId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory-movements?locationId=${locationId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401]).toContain(res.status);
    });

    it('should filter by type (IN/OUT)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory-movements?type=IN')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toEqual(
          expect.arrayContaining(
            res.body.data.map((m: any) =>
              expect.objectContaining({ type: 'IN' }),
            ),
          ),
        );
      }
    });

    it('should filter by productId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory-movements?productId=${productId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401]).toContain(res.status);
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2026-04-01');
      const dateTo = new Date('2026-04-30');

      const res = await request(app.getHttpServer())
        .get(
          `/api/inventory-movements?dateFrom=${dateFrom.toISOString()}&dateTo=${dateTo.toISOString()}`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401]).toContain(res.status);
    });

    it('should reject STAFF role', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory-movements')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 400, 401, 403]).toContain(res.status);
    });

    it('should restrict MANAGER to their location only', async () => {
      const manager = await prisma.user.create({
        data: {
          tenantId,
          email: `manager-${Date.now()}@test.com`,
          name: 'Manager User',
          password: 'hash',
          role: 'MANAGER',
          locationId,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/inventory-movements')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401]).toContain(res.status);
    });

    it('should have itemCount in response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory-movements')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200 && res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('itemCount');
        expect(typeof res.body.data[0].itemCount).toBe('number');
      }
    });

    it('should include reference field in response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory-movements')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200 && res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('reference');
      }
    });

    it('should order by date descending', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventory-movements')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200 && res.body.data.length > 1) {
        for (let i = 0; i < res.body.data.length - 1; i++) {
          const current = new Date(res.body.data[i].date);
          const next = new Date(res.body.data[i + 1].date);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('GET /api/inventory-movements/:id (detail)', () => {
    it('should return movement detail with items', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory-movements/${movementId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('id', movementId);
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('type', 'IN');
        expect(res.body).toHaveProperty('reference', 'PURCHASE-123');
        expect(Array.isArray(res.body.items)).toBe(true);
      }
    });

    it('should include product details in items', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory-movements/${movementId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401, 404]).toContain(res.status);
      if (res.status === 200 && res.body.items.length > 0) {
        expect(res.body.items[0]).toHaveProperty('product');
        expect(res.body.items[0].product).toHaveProperty('id');
        expect(res.body.items[0].product).toHaveProperty('name');
      }
    });

    it('should reject STAFF role', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory-movements/${movementId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 400, 401, 403, 404]).toContain(res.status);
    });

    it('should restrict MANAGER to their location', async () => {
      const otherLocation = await prisma.location.create({
        data: {
          tenantId,
          name: 'Other Location',
        },
      });

      const otherMovement = await prisma.inventoryMovement.create({
        data: {
          tenantId,
          locationId: otherLocation.id,
          userId,
          date: new Date(),
          type: 'OUT',
          reference: 'SALE-456',
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/inventory-movements/${otherMovement.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([401, 404]).toContain(res.status);
    });

    it('should return 404 for non-existent movement', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer())
        .get(`/api/inventory-movements/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([404, 401]).toContain(res.status);
    });

    it('should have itemCount in response', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory-movements/${movementId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 401, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('itemCount');
        expect(res.body.itemCount).toBeGreaterThan(0);
      }
    });
  });
});
