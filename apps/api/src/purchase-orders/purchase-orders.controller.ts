import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto.js';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto.js';
import { AddPurchaseOrderItemDto } from './dto/add-purchase-order-item.dto.js';
import { UpdatePurchaseOrderItemDto } from './dto/update-purchase-order-item.dto.js';
import { ClosePurchaseOrderDto } from './dto/close-purchase-order.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { UserRole } from '@repo/types';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  findAll(
    @CurrentUser()
    user: { tenantId: string; role: UserRole; locationId: string | null },
    @Query() query: PurchaseOrderQueryDto,
  ) {
    return this.purchaseOrdersService.findAll(
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
    return this.purchaseOrdersService.findOne(
      user.tenantId,
      user.role,
      user.locationId,
      id,
    );
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  create(
    @CurrentUser() user: { tenantId: string; userId: string },
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.create(user.tenantId, user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  update(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto | UpdatePurchaseOrderStatusDto,
  ) {
    const body = dto as Record<string, unknown>;
    if (body.status) {
      return this.purchaseOrdersService.updateStatus(
        user.tenantId,
        id,
        body.status as Parameters<
          typeof this.purchaseOrdersService.updateStatus
        >[2],
      );
    }
    return this.purchaseOrdersService.update(
      user.tenantId,
      user.role,
      id,
      dto as UpdatePurchaseOrderDto,
    );
  }

  @Post(':id/items')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  addItem(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: AddPurchaseOrderItemDto,
  ) {
    return this.purchaseOrdersService.addItem(user.tenantId, id, dto);
  }

  @Patch(':orderId/items/:itemId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  updateItem(
    @CurrentUser() user: { tenantId: string },
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePurchaseOrderItemDto,
  ) {
    return this.purchaseOrdersService.updateItem(
      user.tenantId,
      orderId,
      itemId,
      dto,
    );
  }

  @Post(':orderId/items/:itemId/delete')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  removeItem(
    @CurrentUser() user: { tenantId: string },
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.purchaseOrdersService.removeItem(
      user.tenantId,
      orderId,
      itemId,
    );
  }

  @Post(':id/close')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  close(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: ClosePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.closePurchaseOrder(
      user.tenantId,
      user.role,
      id,
      dto,
    );
  }
}
