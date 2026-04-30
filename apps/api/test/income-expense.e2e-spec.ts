/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Income & Expense E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let tenantId: string;
  let userId: string;
  let locationId: string;
  let incomeId: string;
  let expenseId: string;

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
    // Create tenant
    const tenantRes = await prisma.tenant.create({
      data: {
        slug: `test-${Date.now()}`,
        name: `Test Tenant ${Date.now()}`,
      },
    });
    tenantId = tenantRes.id;

    // Create user (MANAGER)
    const userRes = await prisma.user.create({
      data: {
        tenantId,
        email: `test-${Date.now()}@test.com`,
        name: 'Test Manager',
        password: 'hash',
        role: 'MANAGER',
      },
    });
    userId = userRes.id;

    // Create location
    const locationRes = await prisma.location.create({
      data: {
        tenantId,
        name: 'Test Location',
        code: 'TST',
      },
    });
    locationId = locationRes.id;

    // Create a valid JWT token
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    accessToken = jwt.sign(
      { sub: userId, tenantId, role: 'MANAGER', locationId },
      jwtSecret,
      { expiresIn: '15m' },
    );
  });

  afterEach(async () => {
    // Clean up
    await prisma.income.deleteMany({ where: { tenantId } });
    await prisma.expense.deleteMany({ where: { tenantId } });
    await prisma.location.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  });

  describe('Income - POST /api/income', () => {
    it('should create income record with 201 status (T074)', async () => {
      const incomeData = {
        locationId,
        type: 'SERVICE_FEE',
        amount: '500.00',
        description: 'Test service income',
      };

      const res = await request(app.getHttpServer())
        .post('/api/income')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(incomeData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.type).toBe('SERVICE_FEE');
      expect(res.body.amount).toBe('500.00');
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.userId).toBe(userId);
      incomeId = res.body.id;
    });

    it('should reject STAFF role (T074)', async () => {
      // Create staff user
      const staffRes = await prisma.user.create({
        data: {
          tenantId,
          email: `staff-${Date.now()}@test.com`,
          name: 'Test Staff',
          password: 'hash',
          role: 'STAFF',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const jwt = require('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'test-secret';
      const staffToken = jwt.sign(
        { sub: staffRes.id, tenantId, role: 'STAFF', locationId },
        jwtSecret,
        { expiresIn: '15m' },
      );

      const incomeData = {
        locationId,
        type: 'SERVICE_FEE',
        amount: '500.00',
      };

      const res = await request(app.getHttpServer())
        .post('/api/income')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(incomeData);

      expect(res.status).toBe(403);
    });
  });

  describe('Income - GET /api/income', () => {
    it('should filter income by type and date (T076)', async () => {
      // Create multiple incomes
      const now = new Date();

      const dateStr = now.toISOString().split('T')[0];

      // Create incomes of different types
      await prisma.income.create({
        data: {
          tenantId,
          locationId,
          type: 'SERVICE_FEE',
          amount: '100.00',
          userId,
          status: 'ACTIVE',
        },
      });

      await prisma.income.create({
        data: {
          tenantId,
          locationId,
          type: 'DEPOSIT',
          amount: '200.00',
          userId,
          status: 'ACTIVE',
        },
      });

      // Filter by type
      const typeRes = await request(app.getHttpServer())
        .get('/api/income')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'SERVICE_FEE' });

      expect(typeRes.status).toBe(200);
      expect(typeRes.body.data.length).toBe(1);
      expect(typeRes.body.data[0].type).toBe('SERVICE_FEE');

      // Filter by date range
      const dateRes = await request(app.getHttpServer())
        .get('/api/income')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ dateFrom: dateStr, dateTo: dateStr });

      expect(dateRes.status).toBe(200);
      expect(dateRes.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return paginated results (T076)', async () => {
      // Create 10 incomes
      for (let i = 0; i < 10; i++) {
        await prisma.income.create({
          data: {
            tenantId,
            locationId,
            type: 'OTHER',
            amount: '50.00',
            userId,
            status: 'ACTIVE',
          },
        });
      }

      // Get first page with limit 5
      const page1 = await request(app.getHttpServer())
        .get('/api/income')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 5 });

      expect(page1.status).toBe(200);
      expect(page1.body.data.length).toBe(5);
      expect(page1.body.total).toBe(10);
      expect(page1.body.page).toBe(1);
      expect(page1.body.limit).toBe(5);

      // Get second page
      const page2 = await request(app.getHttpServer())
        .get('/api/income')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 2, limit: 5 });

      expect(page2.status).toBe(200);
      expect(page2.body.data.length).toBe(5);
      expect(page2.body.page).toBe(2);
    });
  });

  describe('Income - PATCH /api/income/:id/cancel', () => {
    it('should cancel income by setting status=CANCELLED (T075)', async () => {
      // Create income
      const createRes = await request(app.getHttpServer())
        .post('/api/income')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          type: 'SERVICE_FEE',
          amount: '500.00',
        });

      incomeId = createRes.body.id;

      // Cancel income
      const cancelRes = await request(app.getHttpServer())
        .patch(`/api/income/${incomeId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('CANCELLED');
      expect(cancelRes.body.cancelledAt).toBeDefined();
    });

    it('should reject double-cancel', async () => {
      // Create income
      const createRes = await request(app.getHttpServer())
        .post('/api/income')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          type: 'SERVICE_FEE',
          amount: '500.00',
        });

      incomeId = createRes.body.id;

      // Cancel income
      const cancelRes = await request(app.getHttpServer())
        .patch(`/api/income/${incomeId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(cancelRes.status).toBe(200);

      // Try to cancel again
      const doubleRes = await request(app.getHttpServer())
        .patch(`/api/income/${incomeId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(doubleRes.status).toBe(400);
    });
  });

  describe('Expense - POST /api/expense', () => {
    it('should create expense record with 201 status (T077)', async () => {
      const expenseData = {
        locationId,
        type: 'SUPPLIES',
        amount: '250.00',
        description: 'Test supplies expense',
      };

      const res = await request(app.getHttpServer())
        .post('/api/expense')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(expenseData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.type).toBe('SUPPLIES');
      expect(res.body.amount).toBe('250.00');
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.userId).toBe(userId);
      expenseId = res.body.id;
    });

    it('should reject STAFF role', async () => {
      // Create staff user
      const staffRes = await prisma.user.create({
        data: {
          tenantId,
          email: `staff-${Date.now()}@test.com`,
          name: 'Test Staff',
          password: 'hash',
          role: 'STAFF',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const jwt = require('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'test-secret';
      const staffToken = jwt.sign(
        { sub: staffRes.id, tenantId, role: 'STAFF', locationId },
        jwtSecret,
        { expiresIn: '15m' },
      );

      const expenseData = {
        locationId,
        type: 'SUPPLIES',
        amount: '250.00',
      };

      const res = await request(app.getHttpServer())
        .post('/api/expense')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(expenseData);

      expect(res.status).toBe(403);
    });
  });

  describe('Expense - GET /api/expense', () => {
    it('should filter expense by type and date', async () => {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      // Create expenses of different types
      await prisma.expense.create({
        data: {
          tenantId,
          locationId,
          type: 'SUPPLIES',
          amount: '100.00',
          userId,
          status: 'ACTIVE',
        },
      });

      await prisma.expense.create({
        data: {
          tenantId,
          locationId,
          type: 'PAYROLL',
          amount: '5000.00',
          userId,
          status: 'ACTIVE',
        },
      });

      // Filter by type
      const typeRes = await request(app.getHttpServer())
        .get('/api/expense')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'SUPPLIES' });

      expect(typeRes.status).toBe(200);
      expect(typeRes.body.data.length).toBe(1);
      expect(typeRes.body.data[0].type).toBe('SUPPLIES');

      // Filter by date range
      const dateRes = await request(app.getHttpServer())
        .get('/api/expense')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ dateFrom: dateStr, dateTo: dateStr });

      expect(dateRes.status).toBe(200);
      expect(dateRes.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return paginated results', async () => {
      // Create 10 expenses
      for (let i = 0; i < 10; i++) {
        await prisma.expense.create({
          data: {
            tenantId,
            locationId,
            type: 'OTHER',
            amount: '50.00',
            userId,
            status: 'ACTIVE',
          },
        });
      }

      // Get first page with limit 5
      const page1 = await request(app.getHttpServer())
        .get('/api/expense')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 5 });

      expect(page1.status).toBe(200);
      expect(page1.body.data.length).toBe(5);
      expect(page1.body.total).toBe(10);
      expect(page1.body.page).toBe(1);
      expect(page1.body.limit).toBe(5);

      // Get second page
      const page2 = await request(app.getHttpServer())
        .get('/api/expense')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 2, limit: 5 });

      expect(page2.status).toBe(200);
      expect(page2.body.data.length).toBe(5);
      expect(page2.body.page).toBe(2);
    });
  });

  describe('Expense - PATCH /api/expense/:id/cancel', () => {
    it('should cancel expense by setting status=CANCELLED', async () => {
      // Create expense
      const createRes = await request(app.getHttpServer())
        .post('/api/expense')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          type: 'SUPPLIES',
          amount: '250.00',
        });

      expenseId = createRes.body.id;

      // Cancel expense
      const cancelRes = await request(app.getHttpServer())
        .patch(`/api/expense/${expenseId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('CANCELLED');
      expect(cancelRes.body.cancelledAt).toBeDefined();
    });

    it('should reject double-cancel', async () => {
      // Create expense
      const createRes = await request(app.getHttpServer())
        .post('/api/expense')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          locationId,
          type: 'SUPPLIES',
          amount: '250.00',
        });

      expenseId = createRes.body.id;

      // Cancel expense
      const cancelRes = await request(app.getHttpServer())
        .patch(`/api/expense/${expenseId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(cancelRes.status).toBe(200);

      // Try to cancel again
      const doubleRes = await request(app.getHttpServer())
        .patch(`/api/expense/${expenseId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(doubleRes.status).toBe(400);
    });
  });
});
