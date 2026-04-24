import { ConflictException, NotFoundException } from '@nestjs/common';
import { LocationsService } from './locations.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StockService } from '../stock/stock.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';
const OTHER_TENANT_ID = 'tenant-uuid-2';
const LOCATION_ID = 'location-uuid-1';
const OTHER_LOCATION_ID = 'location-uuid-2';

const mockLocation = {
  id: LOCATION_ID,
  tenantId: TENANT_ID,
  name: 'Sucursal Centro',
  address: 'Av. Principal 123',
  phone: '3311223344',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeStockService(
  overrides: Record<string, unknown> = {},
): StockService {
  return {
    hasStockInLocation: jest
      .fn()
      .mockResolvedValue({ hasStock: false, products: [] }),
    ...overrides,
  } as unknown as StockService;
}

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    location: {
      create: jest.fn().mockResolvedValue(mockLocation),
      findMany: jest.fn().mockResolvedValue([mockLocation]),
      findFirst: jest.fn().mockResolvedValue(mockLocation),
      update: jest.fn().mockResolvedValue(mockLocation),
    },
    locationStock: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('LocationsService', () => {
  describe('create', () => {
    it('should create a location with the tenantId from the caller', async () => {
      const prisma = makePrisma();
      const stockService = makeStockService();
      const service = new LocationsService(prisma, stockService);

      await service.create(
        { name: 'Sucursal Centro', address: 'Av. Principal 123' },
        TENANT_ID,
      );

      expect(prisma.location.create).toHaveBeenCalledWith({
        data: {
          name: 'Sucursal Centro',
          address: 'Av. Principal 123',
          tenantId: TENANT_ID,
        },
      });
    });

    it('should return the created location', async () => {
      const prisma = makePrisma();
      const stockService = makeStockService();
      const service = new LocationsService(prisma, stockService);

      const result = await service.create(
        { name: 'Sucursal Centro' },
        TENANT_ID,
      );

      expect(result).toEqual(mockLocation);
    });
  });

  describe('findAll', () => {
    it('should return only locations of the tenant', async () => {
      const prisma = makePrisma();
      const stockService = makeStockService();
      const service = new LocationsService(prisma, stockService);

      await service.findAll(TENANT_ID, null);

      expect(prisma.location.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
      });
    });

    it('should filter by locationId when provided (MANAGER/STAFF)', async () => {
      const prisma = makePrisma();
      const stockService = makeStockService();
      const service = new LocationsService(prisma, stockService);

      await service.findAll(TENANT_ID, LOCATION_ID);

      expect(prisma.location.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, id: LOCATION_ID },
      });
    });
  });

  describe('findOne', () => {
    it('should return the location when it belongs to the tenant', async () => {
      const prisma = makePrisma();
      const stockService = makeStockService();
      const service = new LocationsService(prisma, stockService);

      const result = await service.findOne(LOCATION_ID, TENANT_ID, null);

      expect(result).toEqual(mockLocation);
    });

    it('should throw NotFoundException when location does not belong to the tenant', async () => {
      const prisma = makePrisma({
        location: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
        },
      });
      const stockService = makeStockService();
      const service = new LocationsService(prisma, stockService);

      await expect(
        service.findOne(LOCATION_ID, OTHER_TENANT_ID, null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when MANAGER requests a different location', async () => {
      const prisma = makePrisma({
        location: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
        },
      });
      const stockService = makeStockService();
      const service = new LocationsService(prisma, stockService);

      await expect(
        service.findOne(OTHER_LOCATION_ID, TENANT_ID, LOCATION_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update the location when it belongs to the tenant', async () => {
      const prisma = makePrisma();
      const stockService = makeStockService();
      const service = new LocationsService(prisma, stockService);

      await service.update(LOCATION_ID, { name: 'Nuevo nombre' }, TENANT_ID);

      expect(prisma.location.update).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, tenantId: TENANT_ID },
        data: { name: 'Nuevo nombre' },
      });
    });

    it('should throw NotFoundException when location does not belong to tenant', async () => {
      const prisma = makePrisma({
        location: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn().mockRejectedValue({ code: 'P2025' }),
        },
      });
      const stockService = makeStockService();
      const service = new LocationsService(prisma, stockService);

      await expect(
        service.update(LOCATION_ID, { name: 'X' }, OTHER_TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete by setting status to inactive when no stock exists', async () => {
      const prisma = makePrisma();
      const stockService = makeStockService({
        hasStockInLocation: jest
          .fn()
          .mockResolvedValue({ hasStock: false, products: [] }),
      });
      const service = new LocationsService(prisma, stockService);

      await service.remove(LOCATION_ID, TENANT_ID);

      expect(prisma.locationStock.deleteMany).toHaveBeenCalledWith({
        where: { locationId: LOCATION_ID, tenantId: TENANT_ID, quantity: 0 },
      });
      expect(prisma.location.update).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, tenantId: TENANT_ID },
        data: { status: 'inactive' },
      });
    });

    it('should throw ConflictException when location has stock > 0', async () => {
      const prisma = makePrisma();
      const stockService = makeStockService({
        hasStockInLocation: jest.fn().mockResolvedValue({
          hasStock: true,
          products: [
            { productId: 'prod-1', productName: 'Eritropoyetina', quantity: 5 },
          ],
        }),
      });
      const service = new LocationsService(prisma, stockService);

      await expect(service.remove(LOCATION_ID, TENANT_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when location does not belong to tenant', async () => {
      const prisma = makePrisma({
        location: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn().mockRejectedValue({ code: 'P2025' }),
        },
      });
      const stockService = makeStockService();
      const service = new LocationsService(prisma, stockService);

      await expect(
        service.remove(LOCATION_ID, OTHER_TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
