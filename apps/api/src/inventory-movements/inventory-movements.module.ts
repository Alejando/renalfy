import { Module } from '@nestjs/common';
import { InventoryMovementsController } from './inventory-movements.controller.js';
import { InventoryMovementsService } from './inventory-movements.service.js';

@Module({
  controllers: [InventoryMovementsController],
  providers: [InventoryMovementsService],
})
export class InventoryMovementsModule {}
