import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { StockService } from './stock.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';
const LOCATION_ID = 'loc-uuid-1';
const LOCATION_ID_B = 'loc-uuid-2';
const PRODUCT_ID = 'prod-uuid-1';
const STOCK_ID = 'stock-uuid-1';

const mockProduct = {
  id: PRODUCT_ID,
  tenantId: TENANT_ID,
  name: 'Eritropoyetina 4000 UI',
  brand: 'Biotek',
  category: 'Medicamentos',
  description: null,
  purchasePrice: '150.00',
  salePrice: '200.00',
  packageQty: 5,
  globalAlert: 10,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockStockRow = {
  id: STOCK_ID,
  tenantId: TENANT_ID,
  locationId: LOCATION_ID,
  productId: PRODUCT_ID,
  quantity: 20,
  minStock: 2,
  alertLevel: 5,
  packageQty: null,
  product: mockProduct,
};

const mockLocation = {
  id: LOCATION_ID,
  name: 'Sucursal Centro',
  tenantId: TENANT_ID,
};

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    locationStock: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(mockStockRow),
      findUnique: jest.fn().mockResolvedValue(mockStockRow),
      upsert: jest.fn().mockResolvedValue(mockStockRow),
      update: jest.fn().mockResolvedValue(mockStockRow),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue(mockStockRow),
      count: jest.fn().mockResolvedValue(1),
    },
    product: {
      findFirst: jest.fn().mockResolvedValue(mockProduct),
      findMany: jest.fn().mockResolvedValue([mockProduct]),
    },
    location: {
      findFirst: jest.fn().mockResolvedValue(mockLocation),
      findMany: jest.fn().mockResolvedValue([mockLocation]),
    },
    ...overrides,
  } as unknown as PrismaService;
}

function makePrismaWithStockRows(rows: unknown[]): PrismaService {
  return makePrisma({
    locationStock: {
      findMany: jest.fn().mockResolvedValue(rows),
      findFirst: jest.fn().mockResolvedValue(mockStockRow),
      findUnique: jest.fn().mockResolvedValue(mockStockRow),
      upsert: jest.fn().mockResolvedValue(mockStockRow),
      update: jest.fn().mockResolvedValue(mockStockRow),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue(mockStockRow),
      count: jest.fn().mockResolvedValue(rows.length),
    },
  });
}

describe('StockService', () => {
  // ─── findAll ─────────────────────────────────────────────────────
  describe('findAll — MANAGER/STAFF scope', () => {
    it('should return only rows for MANAGERs locationId', async () => {
      const prisma = makePrismaWithStockRows([mockStockRow]);
      const service = new StockService(prisma);
      const result = await service.findAll(TENANT_ID, 'MANAGER', LOCATION_ID, {
        page: 1,
        limit: 20,
        onlyLowStock: false,
      });
      expect(result.data).toHaveLength(1);
    });

    it('should throw BadRequestException for MANAGER without locationId', async () => {
      const prisma = makePrisma();
      const service = new StockService(prisma);
      await expect(
        service.findAll(TENANT_ID, 'MANAGER', null, {
          page: 1,
          limit: 20,
          onlyLowStock: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ignore locationId query param for MANAGER', async () => {
      const prisma = makePrismaWithStockRows([mockStockRow]);
      const service = new StockService(prisma);
      await service.findAll(TENANT_ID, 'MANAGER', LOCATION_ID, {
        page: 1,
        limit: 20,
        onlyLowStock: false,
        locationId: LOCATION_ID_B,
      });
      expect(prisma.locationStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: LOCATION_ID }),
        }),
      );
    });

    it('should filter onlyLowStock correctly', async () => {
      const prisma = makePrismaWithStockRows([mockStockRow]);
      const service = new StockService(prisma);
      const result = await service.findAll(TENANT_ID, 'MANAGER', LOCATION_ID, {
        page: 1,
        limit: 20,
        onlyLowStock: true,
      });
      expect(result).toBeDefined();
    });
  });

  describe('findAll — OWNER/ADMIN scope', () => {
    it('should return all-location rows for OWNER', async () => {
      const prisma = makePrismaWithStockRows([mockStockRow]);
      const service = new StockService(prisma);
      const result = await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 1,
        limit: 20,
        onlyLowStock: false,
      });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by locationId when provided by OWNER', async () => {
      const prisma = makePrismaWithStockRows([mockStockRow]);
      const service = new StockService(prisma);
      await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 1,
        limit: 20,
        onlyLowStock: false,
        locationId: LOCATION_ID,
      });
      expect(prisma.locationStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: LOCATION_ID }),
        }),
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────
  describe('findOne', () => {
    it('should return a stock row with computed fields', async () => {
      const prisma = makePrisma();
      const service = new StockService(prisma);
      const result = await service.findOne(STOCK_ID, TENANT_ID, 'OWNER', null);
      expect(result.id).toBe(STOCK_ID);
      expect(result.effectiveAlertLevel).toBe(5);
      expect(result.isBelowAlert).toBe(false);
      expect(result.effectivePackageQty).toBe(5);
    });

    it('should throw NotFoundException for unknown id', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn(),
          update: jest.fn(),
          deleteMany: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      await expect(
        service.findOne('non-existent', TENANT_ID, 'OWNER', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for MANAGER accessing other location', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue({
            ...mockStockRow,
            locationId: LOCATION_ID_B,
          }),
          findUnique: jest.fn(),
          upsert: jest.fn(),
          update: jest.fn(),
          deleteMany: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      await expect(
        service.findOne(STOCK_ID, TENANT_ID, 'MANAGER', LOCATION_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── upsertByLocation ────────────────────────────────────────────
  describe('upsertByLocation', () => {
    it('should create a new row when none exists', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          upsert: jest.fn().mockResolvedValue({
            ...mockStockRow,
            minStock: 3,
            alertLevel: 5,
          }),
          update: jest.fn(),
          deleteMany: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      const result = await service.upsertByLocation(
        {
          locationId: LOCATION_ID,
          productId: PRODUCT_ID,
          alertLevel: 5,
          minStock: 3,
        },
        TENANT_ID,
        'OWNER',
        null,
      );
      expect(prisma.locationStock.upsert).toHaveBeenCalled();
      expect(result.minStock).toBe(3);
    });

    it('should throw ForbiddenException for MANAGER with foreign locationId', async () => {
      const prisma = makePrisma();
      const service = new StockService(prisma);
      await expect(
        service.upsertByLocation(
          { locationId: LOCATION_ID_B, productId: PRODUCT_ID, alertLevel: 5 },
          TENANT_ID,
          'MANAGER',
          LOCATION_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for unknown productId', async () => {
      const prisma = makePrisma({
        product: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      await expect(
        service.upsertByLocation(
          { locationId: LOCATION_ID, productId: 'unknown-uuid', alertLevel: 5 },
          TENANT_ID,
          'OWNER',
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for unknown locationId', async () => {
      const prisma = makePrisma({
        product: {
          findFirst: jest.fn().mockResolvedValue(mockProduct),
          findMany: jest.fn(),
        },
        location: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      await expect(
        service.upsertByLocation(
          { locationId: 'unknown-loc', productId: PRODUCT_ID, alertLevel: 5 },
          TENANT_ID,
          'OWNER',
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── adjustQuantity ───────────────────────────────────────────────
  describe('adjustQuantity', () => {
    it('should SET quantity to absolute value', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(mockStockRow),
          findUnique: jest.fn(),
          upsert: jest.fn(),
          update: jest
            .fn()
            .mockResolvedValue({ ...mockStockRow, quantity: 50 }),
          deleteMany: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
        location: {
          findFirst: jest.fn().mockResolvedValue(mockLocation),
          findMany: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      const result = await service.adjustQuantity(
        STOCK_ID,
        'SET',
        50,
        TENANT_ID,
        'OWNER',
      );
      expect(prisma.locationStock.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 50 } }),
      );
      expect(result.quantity).toBe(50);
    });

    it('should apply DELTA adjustment', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(mockStockRow),
          findUnique: jest.fn(),
          upsert: jest.fn(),
          update: jest
            .fn()
            .mockResolvedValue({ ...mockStockRow, quantity: 10 }),
          deleteMany: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
        location: {
          findFirst: jest.fn().mockResolvedValue(mockLocation),
          findMany: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      await service.adjustQuantity(STOCK_ID, 'DELTA', -10, TENANT_ID, 'OWNER');
      expect(prisma.locationStock.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 10 } }),
      );
    });

    it('should throw UnprocessableEntityException when DELTA produces negative quantity', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn(),
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockStockRow, quantity: 30 }),
          findUnique: jest.fn(),
          upsert: jest.fn(),
          update: jest.fn(),
          deleteMany: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      await expect(
        service.adjustQuantity(STOCK_ID, 'DELTA', -40, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw ForbiddenException for MANAGER role', async () => {
      const prisma = makePrisma();
      const service = new StockService(prisma);
      await expect(
        service.adjustQuantity(STOCK_ID, 'SET', 50, TENANT_ID, 'MANAGER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for unknown id', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn(),
          update: jest.fn(),
          deleteMany: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      await expect(
        service.adjustQuantity('unknown', 'SET', 50, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── bulkInit ─────────────────────────────────────────────────────
  describe('bulkInit', () => {
    it('should create all valid items', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          upsert: jest.fn().mockResolvedValue(mockStockRow),
          update: jest.fn(),
          deleteMany: jest.fn(),
          create: jest.fn().mockResolvedValue(mockStockRow),
          count: jest.fn(),
        },
        product: {
          findFirst: jest.fn().mockResolvedValue(mockProduct),
          findMany: jest.fn(),
        },
        location: {
          findFirst: jest.fn().mockResolvedValue(mockLocation),
          findMany: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      const result = await service.bulkInit(
        {
          items: [
            { locationId: LOCATION_ID, productId: PRODUCT_ID, quantity: 10 },
          ],
        },
        TENANT_ID,
        'OWNER',
      );
      expect(result.created + result.updated).toBeGreaterThanOrEqual(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect errors for invalid productIds', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          upsert: jest.fn(),
          update: jest.fn(),
          deleteMany: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
        product: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn(),
        },
        location: {
          findFirst: jest.fn().mockResolvedValue(mockLocation),
          findMany: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      const result = await service.bulkInit(
        {
          items: [
            {
              locationId: LOCATION_ID,
              productId: 'unknown-uuid',
              quantity: 10,
            },
          ],
        },
        TENANT_ID,
        'OWNER',
      );
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should throw ForbiddenException for MANAGER role', async () => {
      const prisma = makePrisma();
      const service = new StockService(prisma);
      await expect(
        service.bulkInit(
          {
            items: [
              { locationId: LOCATION_ID, productId: PRODUCT_ID, quantity: 10 },
            ],
          },
          TENANT_ID,
          'MANAGER',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getSummary ─────────────────────────────────────────────────
  describe('getSummary', () => {
    it('should aggregate stock per product across locations', async () => {
      const rows = [
        {
          ...mockStockRow,
          id: 's1',
          locationId: LOCATION_ID,
          quantity: 10,
          alertLevel: 5,
          product: {
            ...mockProduct,
            globalAlert: 10,
            id: PRODUCT_ID,
            name: 'P1',
            brand: null,
            category: null,
            packageQty: 5,
            tenantId: TENANT_ID,
          },
        },
        {
          ...mockStockRow,
          id: 's2',
          locationId: LOCATION_ID_B,
          quantity: 3,
          alertLevel: 0,
          product: {
            ...mockProduct,
            globalAlert: 10,
            id: PRODUCT_ID,
            name: 'P1',
            brand: null,
            category: null,
            packageQty: 5,
            tenantId: TENANT_ID,
          },
        },
      ];
      const prisma = makePrismaWithStockRows(rows);
      const service = new StockService(prisma);
      const result = await service.getSummary(TENANT_ID, {
        page: 1,
        limit: 20,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].productId).toBe(PRODUCT_ID);
      expect(result.data[0].totalQuantity).toBe(13);
      expect(result.data[0].locationBreakdown).toHaveLength(2);
    });
  });

  // ─── hasStockInLocation ──────────────────────────────────────────
  describe('hasStockInLocation', () => {
    it('should return hasStock true when quantity > 0', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { productId: PRODUCT_ID, quantity: 5, product: { name: 'P1' } },
            ]),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          upsert: jest.fn(),
          update: jest.fn(),
          deleteMany: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      const result = await service.hasStockInLocation(LOCATION_ID, TENANT_ID);
      expect(result.hasStock).toBe(true);
      expect(result.products).toHaveLength(1);
    });

    it('should return hasStock false when no rows with quantity > 0', async () => {
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          upsert: jest.fn(),
          update: jest.fn(),
          deleteMany: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
      });
      const service = new StockService(prisma);
      const result = await service.hasStockInLocation(LOCATION_ID, TENANT_ID);
      expect(result.hasStock).toBe(false);
      expect(result.products).toHaveLength(0);
    });
  });
});
