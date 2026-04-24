import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import type { CreateProductDto } from '@repo/types';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';
const PRODUCT_ID = 'product-uuid-1';

const VALID_CREATE_DTO: CreateProductDto = {
  name: 'Eritropoyetina 4000 UI',
  purchasePrice: '150.00',
  salePrice: '200.00',
  packageQty: 1,
  globalAlert: 0,
};

const mockProduct = {
  id: PRODUCT_ID,
  tenantId: TENANT_ID,
  name: 'Eritropoyetina 4000 UI',
  brand: 'Biotek',
  category: 'Medicamentos',
  description: 'Eritropoyetina recombinante humana',
  purchasePrice: '150.00',
  salePrice: '200.00',
  packageQty: 1,
  globalAlert: 10,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    product: {
      create: jest.fn().mockResolvedValue(mockProduct),
      findMany: jest.fn().mockResolvedValue([mockProduct]),
      findFirst: jest.fn().mockResolvedValue(mockProduct),
      findUnique: jest.fn().mockResolvedValue(mockProduct),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(mockProduct),
      delete: jest.fn().mockResolvedValue(mockProduct),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    locationStock: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    saleItem: { count: jest.fn().mockResolvedValue(0) },
    purchaseItem: { count: jest.fn().mockResolvedValue(0) },
    purchaseOrderItem: { count: jest.fn().mockResolvedValue(0) },
    inventoryMovementItem: { count: jest.fn().mockResolvedValue(0) },
    location: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('ProductsService', () => {
  describe('create', () => {
    it('should create a product for the tenant', async () => {
      const prisma = makePrisma({
        product: {
          create: jest.fn().mockResolvedValue(mockProduct),
          findMany: jest.fn().mockResolvedValue([mockProduct]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(1),
          update: jest.fn().mockResolvedValue(mockProduct),
          delete: jest.fn().mockResolvedValue(mockProduct),
        },
      });
      const service = new ProductsService(prisma);

      const result = await service.create(VALID_CREATE_DTO, TENANT_ID, 'OWNER');

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            name: 'Eritropoyetina 4000 UI',
          }),
        }),
      );
      expect(result.id).toBe(PRODUCT_ID);
    });

    it('should throw ConflictException when name already exists for tenant', async () => {
      const prisma = makePrisma({
        product: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(mockProduct),
          findUnique: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new ProductsService(prisma);

      await expect(
        service.create(VALID_CREATE_DTO, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException for MANAGER role', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      await expect(
        service.create(
          {
            name: 'Product',
            purchasePrice: '10.00',
            salePrice: '15.00',
            packageQty: 1,
            globalAlert: 0,
          },
          TENANT_ID,
          'MANAGER',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STAFF role', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      await expect(
        service.create(
          {
            name: 'Product',
            purchasePrice: '10.00',
            salePrice: '15.00',
            packageQty: 1,
            globalAlert: 0,
          },
          TENANT_ID,
          'STAFF',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should always use tenantId from parameters, never from body', async () => {
      const prisma = makePrisma({
        product: {
          create: jest.fn().mockResolvedValue(mockProduct),
          findMany: jest.fn().mockResolvedValue([mockProduct]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(1),
          update: jest.fn().mockResolvedValue(mockProduct),
          delete: jest.fn().mockResolvedValue(mockProduct),
        },
      });
      const service = new ProductsService(prisma);

      await service.create(VALID_CREATE_DTO, TENANT_ID, 'OWNER');

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update allowed fields', async () => {
      const updatedProduct = { ...mockProduct, name: 'Updated Product' };
      const prisma = makePrisma({
        product: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest
            .fn()
            .mockResolvedValueOnce(mockProduct)
            .mockResolvedValueOnce(null),
          findUnique: jest.fn(),
          count: jest.fn(),
          update: jest.fn().mockResolvedValue(updatedProduct),
          delete: jest.fn(),
        },
      });
      const service = new ProductsService(prisma);

      const result = await service.update(
        PRODUCT_ID,
        { name: 'Updated Product' },
        TENANT_ID,
        'OWNER',
      );

      expect(result.name).toBe('Updated Product');
    });

    it('should throw ConflictException when updating to existing name excluding self', async () => {
      const otherProduct = {
        ...mockProduct,
        id: 'other-id',
        name: 'Taken Name',
      };
      const prisma = makePrisma({
        product: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest
            .fn()
            .mockResolvedValueOnce(mockProduct)
            .mockResolvedValueOnce(otherProduct),
          findUnique: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new ProductsService(prisma);

      await expect(
        service.update(PRODUCT_ID, { name: 'Taken Name' }, TENANT_ID, 'ADMIN'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if product not found', async () => {
      const prisma = makePrisma({
        product: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new ProductsService(prisma);

      await expect(
        service.update(PRODUCT_ID, { name: 'New' }, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for MANAGER role', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      await expect(
        service.update(PRODUCT_ID, { name: 'New' }, TENANT_ID, 'MANAGER'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete product when no stock or historical references exist', async () => {
      const mockTxProductDelete = jest.fn().mockResolvedValue(mockProduct);
      const prisma = makePrisma();
      (prisma as unknown as Record<string, unknown>).$transaction = jest
        .fn()
        .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            product: { delete: mockTxProductDelete },
            $executeRaw: jest.fn().mockResolvedValue(undefined),
          };
          return fn(tx);
        });

      const service = new ProductsService(prisma);
      await service.remove(PRODUCT_ID, TENANT_ID, 'OWNER');

      expect(mockTxProductDelete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PRODUCT_ID } }),
      );
    });

    it('should throw ConflictException when product has stock in locations', async () => {
      const locationName = 'Sucursal Centro';
      const prisma = makePrisma({
        locationStock: {
          findMany: jest.fn().mockResolvedValue([
            {
              productId: PRODUCT_ID,
              quantity: 5,
              locationId: 'loc-1',
              location: { name: locationName },
            },
          ]),
        },
        location: {
          findMany: jest.fn().mockResolvedValue([{ name: locationName }]),
        },
      });
      const service = new ProductsService(prisma);

      await expect(
        service.remove(PRODUCT_ID, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when product has historical references in SaleItem', async () => {
      const prisma = makePrisma({
        saleItem: { count: jest.fn().mockResolvedValue(3) },
      });
      const service = new ProductsService(prisma);

      await expect(
        service.remove(PRODUCT_ID, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when product has historical references in PurchaseItem', async () => {
      const prisma = makePrisma({
        purchaseItem: { count: jest.fn().mockResolvedValue(1) },
      });
      const service = new ProductsService(prisma);

      await expect(
        service.remove(PRODUCT_ID, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if product not found', async () => {
      const prisma = makePrisma({
        product: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new ProductsService(prisma);

      await expect(
        service.remove(PRODUCT_ID, TENANT_ID, 'OWNER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for MANAGER role', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      await expect(
        service.create(VALID_CREATE_DTO, TENANT_ID, 'MANAGER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STAFF role', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      await expect(
        service.create(VALID_CREATE_DTO, TENANT_ID, 'STAFF'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated products for the tenant', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      const result = await service.findAll(TENANT_ID, {
        page: 1,
        limit: 20,
      });

      expect(result).toMatchObject({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('should filter by search term across name, brand, and category', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      await service.findAll(TENANT_ID, {
        page: 1,
        limit: 20,
        search: 'eritro',
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should filter by category exactly', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      await service.findAll(TENANT_ID, {
        page: 1,
        limit: 20,
        category: 'Medicamentos',
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'Medicamentos',
          }),
        }),
      );
    });

    it('should apply pagination with skip and take', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      await service.findAll(TENANT_ID, { page: 2, limit: 10 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should return only products for the given tenant', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single product by id', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      const result = await service.findOne(PRODUCT_ID, TENANT_ID);

      expect(result.id).toBe(PRODUCT_ID);
    });

    it('should throw NotFoundException if product not found', async () => {
      const prisma = makePrisma({
        product: {
          create: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
      });
      const service = new ProductsService(prisma);

      await expect(service.findOne('non-existent', TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enrich with stock when locationId is provided', async () => {
      const stockRow = {
        id: 'stock-id',
        tenantId: TENANT_ID,
        locationId: 'loc-id',
        productId: PRODUCT_ID,
        quantity: 10,
        minStock: 2,
        alertLevel: 5,
        packageQty: null,
      };
      const prisma = makePrisma({
        locationStock: {
          findFirst: jest.fn().mockResolvedValue(stockRow),
          findMany: jest.fn().mockResolvedValue([]),
        },
      });
      const service = new ProductsService(prisma);

      const result = await service.findOne(PRODUCT_ID, TENANT_ID, 'loc-id');

      expect(result.stock).toMatchObject({
        quantity: 10,
        effectiveAlertLevel: 5,
        isBelowAlert: false,
      });
    });

    it('should return stock as null when no locationId provided', async () => {
      const prisma = makePrisma();
      const service = new ProductsService(prisma);

      const result = await service.findOne(PRODUCT_ID, TENANT_ID);

      expect(result.stock).toBeNull();
    });
  });

  describe('findCategories', () => {
    it('should return sorted distinct non-null categories', async () => {
      const prisma = makePrisma({
        product: {
          create: jest.fn(),
          findMany: jest
            .fn()
            .mockResolvedValue([
              { category: 'Insumos' },
              { category: 'Medicamentos' },
            ]),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new ProductsService(prisma);

      const result = await service.findCategories(TENANT_ID);

      expect(result).toEqual(['Insumos', 'Medicamentos']);
    });

    it('should return empty array for tenant with no products', async () => {
      const prisma = makePrisma({
        product: {
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          count: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      const service = new ProductsService(prisma);

      const result = await service.findCategories(TENANT_ID);

      expect(result).toEqual([]);
    });
  });
});
