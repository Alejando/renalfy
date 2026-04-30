import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { CashCloseQuery, CashCloseResponse } from '@repo/types';
import { CashCloseService } from './cash-close.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { FinancialPermissionGuard } from '../common/guards/financial-permission.guard.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator.js';
import { CreateCashCloseDto } from './dto/create-cash-close.dto.js';

@Controller('cash-close')
export class CashCloseController {
  constructor(private readonly cashCloseService: CashCloseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, FinancialPermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCashCloseDto,
  ): Promise<CashCloseResponse> {
    return this.cashCloseService.create(user.tenantId, user.userId, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<CashCloseResponse> {
    return this.cashCloseService.findOne(user.tenantId, id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, FinancialPermissionGuard)
  async findByPeriod(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CashCloseQuery & { page?: string; limit?: string },
  ): Promise<{
    data: CashCloseResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    return this.cashCloseService.findByPeriod(user.tenantId, {
      ...query,
      page,
      limit,
    });
  }
}
