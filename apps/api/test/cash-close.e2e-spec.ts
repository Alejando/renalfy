/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanupDatabase, closeCleanupClient } from './cleanup.js';

describe('CashClose E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let tenantId: string;
  let userId: string;
  let locationId: string;
  const saleIds: string[] = [];
  const incomeIds: string[] = [];
  const expenseIds: string[] = [];
  let cashCloseId: string;

  const testDate = new Date();
  testDate.setUTCHours(0, 0, 0, 0);

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
    await closeCleanupClient();
  });

  beforeEach(async () => {
    // Create tenant
    const tenantRes = await prisma.tenant.create({
      data: {
        slug: `test-${Date.now()}`,
        name: `Test Tenant ${Date.now()}`,
      },
    });
    tenantId = tenantRes.id;

    // Create user (OWNER)
    const userRes = await prisma.user.create({
      data: {
        tenantId,
        email: `test-${Date.now()}@test.com`,
        name: 'Test Owner',
        password: 'hash',
        role: 'OWNER',
      },
    });
    userId = userRes.id;

    // Create location
    const locationRes = await prisma.location.create({
      data: {
        tenantId,
        name: 'Test Location',
      },
    });
    locationId = locationRes.id;

    // Create product for sales
    const productRes = await prisma.product.create({
      data: {
        tenantId,
        name: 'Test Product',
        brand: 'Test Brand',
        purchasePrice: 10.0,
        salePrice: 20.0,
      },
    });

    // Create location stock
    await prisma.locationStock.create({
      data: {
        tenantId,
        locationId,
        productId: productRes.id,
        quantity: 1000,
      },
    });

    // Create sales
    for (let i = 0; i < 100; i++) {
      const saleRes = await prisma.sale.create({
        data: {
          tenantId,
          locationId,
          folio: `TST-2026-${String(i).padStart(5, '0')}`,
          totalAmount: 100.0,
          paymentType: 'CASH',
          status: 'ACTIVE',
          userId,
        },
      });
      saleIds.push(saleRes.id);
    }

    // Create incomes
    for (let i = 0; i < 50; i++) {
      const incomeRes = await prisma.income.create({
        data: {
          tenantId,
          locationId,
          type: 'OTHER',
          customType: 'Test Income',
          amount: 50.0,
          status: 'ACTIVE',
          userId,
        },
      });
      incomeIds.push(incomeRes.id);
    }

    // Create expenses
    for (let i = 0; i < 25; i++) {
      const expenseRes = await prisma.expense.create({
        data: {
          tenantId,
          locationId,
          type: 'OTHER',
          customType: 'Test Expense',
          amount: 25.0,
          status: 'ACTIVE',
          userId,
        },
      });
      expenseIds.push(expenseRes.id);
    }

    // Create a valid JWT token
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require('jsonwebtoken') as {
      sign(payload: unknown, secret: string, options: unknown): string;
    };
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    accessToken = jwt.sign({ userId, tenantId, role: 'OWNER' }, jwtSecret, {
      expiresIn: '15m',
    });
  });

  afterEach(async () => {
    // Cleanup using superuser client to bypass RLS
    await cleanupDatabase();
    saleIds.length = 0;
    incomeIds.length = 0;
    expenseIds.length = 0;
    cashCloseId = '';
  });

  describe('POST /api/cash-close', () => {
    it('should create CashClose with 100 sales + 50 incomes + 25 expenses and calculate total correctly', async () => {
      const startTime = Date.now();

      const res = await request(app.getHttpServer())
        .post('/api/cash-close')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          date: testDate.toISOString().split('T')[0],
        });

      const elapsedTime = Date.now() - startTime;

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        status: 'CLOSED',
        tenantId,
        locationId,
      });

      // Verify calculation: 100*100 + 50*50 - 25*25 = 10000 + 2500 - 625 = 11875
      const expectedTotal = 100 * 100 + 50 * 50 - 25 * 25;
      expect(parseFloat(res.body.calculatedTotal)).toBe(expectedTotal);
      expect(parseFloat(res.body.salesTotal)).toBe(100 * 100);
      expect(parseFloat(res.body.incomesTotal)).toBe(50 * 50);
      expect(parseFloat(res.body.expensesTotal)).toBe(25 * 25);

      // Verify performance: < 1 second for 1000+ records
      expect(elapsedTime).toBeLessThan(1000);

      cashCloseId = res.body.id;
    });

    it('should reject duplicate close with 409 Conflict', async () => {
      // First close
      const res1 = await request(app.getHttpServer())
        .post('/api/cash-close')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          date: testDate.toISOString().split('T')[0],
        });

      expect(res1.status).toBe(201);
      cashCloseId = res1.body.id;

      // Second close same date
      const res2 = await request(app.getHttpServer())
        .post('/api/cash-close')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          date: testDate.toISOString().split('T')[0],
        });

      expect(res2.status).toBe(409);
      expect(res2.body.message).toContain('already closed');
    });

    it('should prevent new sales for closed period with 400', async () => {
      // Close period
      const closeRes = await request(app.getHttpServer())
        .post('/api/cash-close')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          date: testDate.toISOString().split('T')[0],
        });

      expect(closeRes.status).toBe(201);
      cashCloseId = closeRes.body.id;

      // Try to create sale after period is closed
      const saleRes = await request(app.getHttpServer())
        .post('/api/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          items: [
            {
              productId: 'some-product-id',
              quantity: 1,
              unitPrice: '10.00',
              tax: '0.00',
            },
          ],
          paymentType: 'CASH',
        });

      expect(saleRes.status).toBe(400);
      expect(saleRes.body.message).toContain('período de caja');
    });
  });

  describe('GET /api/cash-close/:id', () => {
    it('should return CashClose by id', async () => {
      // Create close
      const createRes = await request(app.getHttpServer())
        .post('/api/cash-close')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          date: testDate.toISOString().split('T')[0],
        });

      expect(createRes.status).toBe(201);
      cashCloseId = createRes.body.id;

      // Get by id
      const res = await request(app.getHttpServer())
        .get(`/api/cash-close/${cashCloseId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: cashCloseId,
        status: 'CLOSED',
      });
    });
  });

  describe('GET /api/cash-close', () => {
    it('should return paginated CashCloses', async () => {
      // Create close
      const createRes = await request(app.getHttpServer())
        .post('/api/cash-close')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          date: testDate.toISOString().split('T')[0],
        });

      expect(createRes.status).toBe(201);
      cashCloseId = createRes.body.id;

      // List
      const res = await request(app.getHttpServer())
        .get('/api/cash-close')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          page: 1,
          limit: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 10,
      });
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('State immutability', () => {
    it('should mark sales/income/expense as isClosed=true with closedAt timestamp', async () => {
      // Create close
      const createRes = await request(app.getHttpServer())
        .post('/api/cash-close')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          date: testDate.toISOString().split('T')[0],
        });

      expect(createRes.status).toBe(201);
      cashCloseId = createRes.body.id;

      // Verify sales are marked
      const sale = await prisma.sale.findUnique({
        where: { id: saleIds[0] },
      });
      expect(sale?.isClosed).toBe(true);
      expect(sale?.closedAt).not.toBeNull();

      // Verify incomes are marked
      const income = await prisma.income.findUnique({
        where: { id: incomeIds[0] },
      });
      expect(income?.isClosed).toBe(true);
      expect(income?.closedAt).not.toBeNull();

      // Verify expenses are marked
      const expense = await prisma.expense.findUnique({
        where: { id: expenseIds[0] },
      });
      expect(expense?.isClosed).toBe(true);
      expect(expense?.closedAt).not.toBeNull();
    });
  });
});
