import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PurchasesService } from './purchases.service.js';
import { PurchaseQueryDto } from './dto/purchase-query.dto.js';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { UserRole } from '@repo/types';

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  findAll(
    @CurrentUser()
    user: { tenantId: string; role: UserRole; locationId: string | null },
    @Query() query: PurchaseQueryDto,
  ) {
    return this.purchasesService.findAll(
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
    return this.purchasesService.findOne(
      user.tenantId,
      user.role,
      user.locationId,
      id,
    );
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(
    @CurrentUser()
    user: {
      tenantId: string;
      userId: string;
      role: UserRole;
      locationId: string | null;
    },
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchasesService.create(
      user.tenantId,
      user.userId,
      user.role,
      user.locationId ?? '',
      dto,
    );
  }
}
