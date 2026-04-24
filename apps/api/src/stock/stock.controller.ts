import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { UserRole } from '@repo/types';
import { StockService } from './stock.service.js';
import { UpsertLocationStockDto } from './dto/upsert-location-stock.dto.js';
import { StockQuantityAdjustmentDto } from './dto/stock-quantity-adjustment.dto.js';
import { StockQueryDto } from './dto/stock-query.dto.js';
import { StockSummaryQueryDto } from './dto/stock-summary-query.dto.js';
import { BulkStockRequestDto } from './dto/bulk-stock.dto.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

const OWNERS_ADMINS: UserRole[] = ['OWNER', 'ADMIN'];

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('summary')
  @Roles(...OWNERS_ADMINS)
  getSummary(
    @Query() query: StockSummaryQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.stockService.getSummary(user.tenantId, query);
  }

  @Get()
  findAll(
    @Query() query: StockQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.stockService.findAll(
      user.tenantId,
      user.role as UserRole,
      user.locationId,
      query,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.stockService.findOne(
      id,
      user.tenantId,
      user.role as UserRole,
      user.locationId,
    );
  }

  @Put('by-location')
  upsertByLocation(
    @Body() dto: UpsertLocationStockDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.stockService.upsertByLocation(
      dto,
      user.tenantId,
      user.role as UserRole,
      user.locationId,
    );
  }

  @Patch(':id/quantity')
  @Roles(...OWNERS_ADMINS)
  adjustQuantity(
    @Param('id') id: string,
    @Body() dto: StockQuantityAdjustmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const adjustmentType = dto.adjustmentType;
    const value = adjustmentType === 'SET' ? dto.quantity! : dto.delta!;
    return this.stockService.adjustQuantity(
      id,
      adjustmentType,
      value,
      user.tenantId,
      user.role as UserRole,
    );
  }

  @Post('bulk')
  @Roles(...OWNERS_ADMINS)
  @HttpCode(HttpStatus.CREATED)
  bulkInit(
    @Body() dto: BulkStockRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.stockService.bulkInit(
      dto,
      user.tenantId,
      user.role as UserRole,
    );
  }
}
