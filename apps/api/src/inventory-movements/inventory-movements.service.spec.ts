/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryMovementsService } from './inventory-movements.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const LOCATION_ID = '550e8400-e29b-41d4-a716-446655440003';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440004';
const MOVEMENT_ID = '550e8400-e29b-41d4-a716-446655440005';

describe('InventoryMovementsService', () => {
  let service: InventoryMovementsService;
  let prisma: PrismaService;

  const makePrisma = (overrides = {}) => ({
    inventoryMovement: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirstOrThrow: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    inventoryMovementItem: {
      findMany: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryMovementsService,
        { provide: PrismaService, useValue: makePrisma() },
      ],
    }).compile();

    service = module.get<InventoryMovementsService>(InventoryMovementsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated inventory movements for OWNER', async () => {
      const mockMovements = [
        {
          id: MOVEMENT_ID,
          tenantId: TENANT_ID,
          locationId: LOCATION_ID,
          userId: USER_ID,
          date: new Date('2026-04-28'),
          type: 'IN',
          reference: 'PURCHASE-123',
          notes: null,
          createdAt: new Date('2026-04-28'),
          items: [
            {
              id: 'item1',
              inventoryMovementId: MOVEMENT_ID,
              productId: PRODUCT_ID,
              quantity: 500,
              product: {
                id: PRODUCT_ID,
                name: 'Product 1',
                brand: 'Brand 1',
              },
            },
          ],
        },
      ];

      (prisma.inventoryMovement.findMany as jest.Mock).mockResolvedValue(
        mockMovements,
      );
      (prisma.inventoryMovement.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data[0].type).toBe('IN');
      expect(result.data[0].reference).toBe('PURCHASE-123');
    });

    it('should reject STAFF role', async () => {
      await expect(
        service.findAll(TENANT_ID, 'STAFF', null, {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter by locationId', async () => {
      (prisma.inventoryMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inventoryMovement.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 1,
        limit: 20,
        locationId: LOCATION_ID,
      });

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: LOCATION_ID }),
        }),
      );
    });

    it('should filter by type', async () => {
      (prisma.inventoryMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inventoryMovement.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 1,
        limit: 20,
        type: 'IN',
      });

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'IN' }),
        }),
      );
    });

    it('should filter by productId', async () => {
      (prisma.inventoryMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inventoryMovement.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 1,
        limit: 20,
        productId: PRODUCT_ID,
      });

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            items: expect.objectContaining({
              some: expect.objectContaining({ productId: PRODUCT_ID }),
            }),
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2026-04-01');
      const dateTo = new Date('2026-04-30');

      (prisma.inventoryMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inventoryMovement.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 1,
        limit: 20,
        dateFrom,
        dateTo,
      });

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: dateFrom,
              lte: dateTo,
            }),
          }),
        }),
      );
    });

    it('should restrict MANAGER to their location', async () => {
      (prisma.inventoryMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inventoryMovement.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(TENANT_ID, 'MANAGER', LOCATION_ID, {
        page: 1,
        limit: 20,
      });

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ locationId: LOCATION_ID }),
        }),
      );
    });

    it('should apply pagination', async () => {
      (prisma.inventoryMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inventoryMovement.count as jest.Mock).mockResolvedValue(50);

      await service.findAll(TENANT_ID, 'OWNER', null, {
        page: 3,
        limit: 10,
      });

      expect(prisma.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return movement detail with items for OWNER', async () => {
      const mockMovement = {
        id: MOVEMENT_ID,
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        userId: USER_ID,
        date: new Date('2026-04-28'),
        type: 'IN',
        reference: 'PURCHASE-123',
        notes: 'Test notes',
        createdAt: new Date('2026-04-28'),
      };

      const mockItems = [
        {
          id: 'item1',
          inventoryMovementId: MOVEMENT_ID,
          productId: PRODUCT_ID,
          quantity: 500,
          product: {
            id: PRODUCT_ID,
            name: 'Product 1',
            brand: 'Brand 1',
          },
        },
      ];

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        return fn({
          $executeRaw: jest.fn(),
          inventoryMovement: {
            findFirstOrThrow: jest.fn().mockResolvedValue(mockMovement),
          },
          inventoryMovementItem: {
            findMany: jest.fn().mockResolvedValue(mockItems),
          },
        });
      });

      const result = await service.findOne(
        TENANT_ID,
        'OWNER',
        null,
        MOVEMENT_ID,
      );

      expect(result.id).toBe(MOVEMENT_ID);
      expect(result.type).toBe('IN');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(500);
    });

    it('should reject STAFF role', async () => {
      await expect(
        service.findOne(TENANT_ID, 'STAFF', null, MOVEMENT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should restrict MANAGER to their location', async () => {
      const mockMovement = {
        id: MOVEMENT_ID,
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        userId: USER_ID,
        date: new Date('2026-04-28'),
        type: 'IN',
        reference: 'PURCHASE-123',
        notes: null,
        createdAt: new Date('2026-04-28'),
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        return fn({
          $executeRaw: jest.fn(),
          inventoryMovement: {
            findFirstOrThrow: jest.fn().mockResolvedValue(mockMovement),
          },
          inventoryMovementItem: {
            findMany: jest.fn().mockResolvedValue([]),
          },
        });
      });

      const result = await service.findOne(
        TENANT_ID,
        'MANAGER',
        LOCATION_ID,
        MOVEMENT_ID,
      );

      expect(result.id).toBe(MOVEMENT_ID);
    });

    it('should throw NotFoundException for non-existent movement', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          $executeRaw: jest.fn(),
          inventoryMovement: {
            findFirstOrThrow: jest
              .fn()
              .mockRejectedValue(new Error('Not found')),
          },
        };
        return fn(tx);
      });

      await expect(
        service.findOne(TENANT_ID, 'OWNER', null, MOVEMENT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if MANAGER tries to access other location', async () => {
      const otherLocationId = '550e8400-e29b-41d4-a716-446655440099';

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          $executeRaw: jest.fn(),
          inventoryMovement: {
            findFirstOrThrow: jest
              .fn()
              .mockRejectedValue(new Error('Not found')),
          },
        };
        return fn(tx);
      });

      await expect(
        service.findOne(TENANT_ID, 'MANAGER', otherLocationId, MOVEMENT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
