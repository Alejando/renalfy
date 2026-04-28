import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller.js';
import { SuppliersCrudController } from './suppliers-crud.controller.js';
import { ProductSuppliersController } from './product-suppliers.controller.js';
import { SuppliersService } from './suppliers.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    SuppliersController,
    SuppliersCrudController,
    ProductSuppliersController,
  ],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
