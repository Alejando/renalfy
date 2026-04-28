import { ConflictException, NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import type {
  CreateSupplierDto,
  UpdateSupplierDto,
  CreateSupplierProductDto,
} from '@repo/types';
import type { PrismaService } from '../prisma/prisma.service.js';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

const TENANT_ID = 'tenant-uuid-1';
const SUPPLIER_ID = 'supplier-uuid-1';
const PRODUCT_ID = 'product-uuid-1';

const mockSupplier = {
  id: SUPPLIER_ID,
  tenantId: TENANT_ID,
  name: 'Distribuidora Médica del Norte',
  initials: 'DMN',
  contact: 'Juan Pérez',
  phone: '55-1234-5678',
  email: 'jperez@dmn.mx',
  address: 'Av. Industrial 123, Monterrey',
  notes: 'Proveedor de medicamentos',
  status: 'ACTIVE' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockProduct = {
  id: PRODUCT_ID,
  tenantId: TENANT_ID,
  name: 'Eritropoyetina 4000 UI',
  brand: 'Biotek',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockSupplierProduct = {
  id: 'sp-uuid-1',
  tenantId: TENANT_ID,
  supplierId: SUPPLIER_ID,
  productId: PRODUCT_ID,
  price: '150.00',
  leadTimeDays: 7,
  updatedAt: new Date('2024-01-01'),
  product: mockProduct,
};

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    supplier: {
      findMany: jest.fn().mockResolvedValue([mockSupplier]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(mockSupplier),
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockSupplier),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue(mockSupplier),
      update: jest.fn().mockResolvedValue(mockSupplier),
    },
    supplierProduct: {
      findMany: jest.fn().mockResolvedValue([mockSupplierProduct]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(mockSupplierProduct),
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockSupplierProduct),
      create: jest.fn().mockResolvedValue(mockSupplierProduct),
      update: jest.fn().mockResolvedValue(mockSupplierProduct),
      delete: jest.fn().mockResolvedValue(mockSupplierProduct),
    },
    product: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockProduct),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('SuppliersService', () => {
  describe('findAll', () => {
    it('should return only active suppliers by default', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      await service.findAll(TENANT_ID, { page: 1, limit: 20 });

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, status: 'ACTIVE' },
        }),
      );
    });

    it('should include inactive when includeInactive is true', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      await service.findAll(TENANT_ID, {
        page: 1,
        limit: 20,
        includeInactive: true,
      });

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
    });

    it('should apply search filter', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      await service.findAll(TENANT_ID, {
        page: 1,
        limit: 20,
        search: 'médica',
      });

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: 'ACTIVE',
            name: expect.objectContaining({
              contains: 'médica',
              mode: 'insensitive',
            }),
          }),
        }),
      );
    });

    it('should paginate results', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      const result = await service.findAll(TENANT_ID, { page: 2, limit: 10 });

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should return supplier by id', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      const result = await service.findOne(TENANT_ID, SUPPLIER_ID);

      expect(result).toEqual(mockSupplier);
      expect(prisma.supplier.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: SUPPLIER_ID, tenantId: TENANT_ID },
      });
    });

    it('should throw NotFoundException if supplier not found', async () => {
      const prisma = makePrisma({
        supplier: {
          findUniqueOrThrow: jest.fn().mockRejectedValue(new Error()),
        },
      });
      const service = new SuppliersService(prisma);

      await expect(service.findOne(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const validDto: CreateSupplierDto = {
      name: 'Nuevo Proveedor',
      contact: 'Contacto',
      phone: '55-1111-2222',
      email: 'test@test.com',
    };

    it('should create supplier when name is unique', async () => {
      const prisma = makePrisma({
        supplier: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest
            .fn()
            .mockResolvedValue({ ...mockSupplier, name: validDto.name }),
        },
      });
      const service = new SuppliersService(prisma);

      const result = await service.create(TENANT_ID, validDto);

      expect(prisma.supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: validDto.name,
            tenantId: TENANT_ID,
          }),
        }),
      );
      expect(result.name).toBe(validDto.name);
    });

    it('should throw ConflictException when name already exists', async () => {
      const prisma = makePrisma({
        supplier: {
          findFirst: jest.fn().mockResolvedValue(mockSupplier),
        },
      });
      const service = new SuppliersService(prisma);

      await expect(service.create(TENANT_ID, validDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateSupplierDto = {
      contact: 'Nuevo contacto',
      phone: '55-9999-8888',
    };

    it('should update supplier fields', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      await service.update(TENANT_ID, SUPPLIER_ID, updateDto);

      expect(prisma.supplier.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SUPPLIER_ID, tenantId: TENANT_ID },
          data: expect.objectContaining({
            contact: updateDto.contact,
            phone: updateDto.phone,
          }),
        }),
      );
    });

    it('should allow setting status to INACTIVE', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      await service.update(TENANT_ID, SUPPLIER_ID, { status: 'INACTIVE' });

      expect(prisma.supplier.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'INACTIVE' }),
        }),
      );
    });

    it('should throw ConflictException if new name conflicts', async () => {
      const prisma = makePrisma({
        supplier: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...mockSupplier, id: 'other-id' }),
        },
      });
      const service = new SuppliersService(prisma);

      await expect(
        service.update(TENANT_ID, SUPPLIER_ID, { name: 'Conflicting Name' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not check uniqueness if name not in update', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      await service.update(TENANT_ID, SUPPLIER_ID, { phone: '55-0000-1111' });

      expect(prisma.supplier.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('addProduct', () => {
    const dto: CreateSupplierProductDto = {
      productId: PRODUCT_ID,
      price: '200.00',
      leadTimeDays: 5,
    };

    it('should create supplier-product association', async () => {
      const prisma = makePrisma({
        supplierProduct: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockSupplierProduct),
        },
        product: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(mockProduct),
        },
      });
      const service = new SuppliersService(prisma);

      const result = await service.addProduct(TENANT_ID, SUPPLIER_ID, dto);

      expect(prisma.supplierProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            supplierId: SUPPLIER_ID,
            productId: dto.productId,
            price: dto.price,
            leadTimeDays: dto.leadTimeDays,
          }),
        }),
      );
      expect(result.product).toBeDefined();
    });

    it('should throw ConflictException if association already exists', async () => {
      const prisma = makePrisma({
        supplierProduct: {
          findFirst: jest.fn().mockResolvedValue(mockSupplierProduct),
        },
      });
      const service = new SuppliersService(prisma);

      await expect(
        service.addProduct(TENANT_ID, SUPPLIER_ID, dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const prisma = makePrisma({
        product: {
          findUniqueOrThrow: jest
            .fn()
            .mockRejectedValue(new Error('Not found')),
        },
      });
      const service = new SuppliersService(prisma);

      await expect(
        service.addProduct(TENANT_ID, SUPPLIER_ID, dto),
      ).rejects.toThrow();
    });
  });

  describe('findProductsBySupplier', () => {
    it('should return products for a supplier', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      const result = await service.findProductsBySupplier(
        TENANT_ID,
        SUPPLIER_ID,
      );

      expect(result).toHaveLength(1);
      expect(prisma.supplierProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { supplierId: SUPPLIER_ID, tenantId: TENANT_ID },
        }),
      );
    });
  });

  describe('findSuppliersByProduct', () => {
    it('should return suppliers that offer a product', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      const result = await service.findSuppliersByProduct(
        TENANT_ID,
        PRODUCT_ID,
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('removeProduct', () => {
    it('should delete supplier-product association', async () => {
      const prisma = makePrisma();
      const service = new SuppliersService(prisma);

      await service.removeProduct(TENANT_ID, SUPPLIER_ID, PRODUCT_ID);

      expect(prisma.supplierProduct.delete).toHaveBeenCalledWith({
        where: {
          productId_supplierId: {
            productId: PRODUCT_ID,
            supplierId: SUPPLIER_ID,
          },
        },
      });
    });

    it('should throw NotFoundException if association not found', async () => {
      const prisma = makePrisma({
        supplierProduct: {
          delete: jest.fn().mockRejectedValue(new Error()),
        },
      });
      const service = new SuppliersService(prisma);

      await expect(
        service.removeProduct(TENANT_ID, SUPPLIER_ID, PRODUCT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
