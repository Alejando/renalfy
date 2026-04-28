import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { InventoryMovementsService } from './inventory-movements.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { UserRole, InventoryMovementQuery } from '@repo/types';

@Controller('inventory-movements')
@UseGuards(JwtAuthGuard)
export class InventoryMovementsController {
  constructor(
    private readonly inventoryMovementsService: InventoryMovementsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: { tenantId: string; role: UserRole; locationId: string | null },
    @Query() query: InventoryMovementQuery,
  ) {
    return this.inventoryMovementsService.findAll(
      user.tenantId,
      user.role,
      user.locationId,
      query,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser()
    user: { tenantId: string; role: UserRole; locationId: string | null },
    @Param('id') id: string,
  ) {
    return this.inventoryMovementsService.findOne(
      user.tenantId,
      user.role,
      user.locationId,
      id,
    );
  }
}
