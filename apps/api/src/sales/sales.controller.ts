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
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Audit } from '../common/decorators/audit.decorator.js';
import { SalesService } from './sales.service.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import type { UserRole } from '@repo/types';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Audit({ action: 'CREATE', resource: 'Sale' })
  create(
    @CurrentUser()
    user: {
      tenantId: string;
      userId: string;
      role: UserRole;
      locationId: string | null;
    },
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(
      user.tenantId,
      user.userId,
      user.role,
      user.locationId,
      dto,
    );
  }

  @Get()
  @Audit({ action: 'READ', resource: 'Sale' })
  findAll(
    @CurrentUser()
    user: { tenantId: string; role: UserRole; locationId: string | null },
    @Query() query: Record<string, string>,
  ) {
    const statusRaw = query['status'];
    const paymentTypeRaw = query['paymentType'];
    const pageNum = query['page'] ? Number(query['page']) : 1;
    const limitNum = query['limit'] ? Number(query['limit']) : 50;

    return this.salesService.findAll(
      user.tenantId,
      user.role,
      user.locationId,
      {
        dateFrom: query['dateFrom'],
        dateTo: query['dateTo'],
        locationId: query['locationId'],
        status:
          (statusRaw as 'ACTIVE' | 'CANCELLED' | 'FINISHED' | 'SETTLED') ??
          undefined,
        paymentType:
          (paymentTypeRaw as
            | 'CASH'
            | 'CREDIT'
            | 'BENEFIT'
            | 'INSURANCE'
            | 'TRANSFER') ?? undefined,
        page: pageNum,
        limit: limitNum,
      },
    );
  }

  @Get(':id')
  @Audit({ action: 'READ', resource: 'Sale' })
  findOne(
    @CurrentUser()
    user: { tenantId: string; role: UserRole; locationId: string | null },
    @Param('id') id: string,
  ) {
    return this.salesService.findOne(
      user.tenantId,
      id,
      user.role,
      user.locationId,
    );
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Audit({ action: 'DELETE', resource: 'Sale' })
  cancel(
    @CurrentUser()
    user: { tenantId: string; role: UserRole; locationId: string | null },
    @Param('id') id: string,
  ) {
    return this.salesService.cancel(
      user.tenantId,
      id,
      user.role,
      user.locationId,
    );
  }
}
