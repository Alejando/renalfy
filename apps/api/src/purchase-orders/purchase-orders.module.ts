import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SuppliersModule } from '../suppliers/suppliers.module.js';

@Module({
  imports: [PrismaModule, SuppliersModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
