import { Controller, Get, Param, Query } from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { SupplierQueryDto } from './dto/supplier-query.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { UserRole } from '@repo/types';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Query() query: SupplierQueryDto,
  ) {
    return this.suppliersService.findAll(user.tenantId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.suppliersService.findOne(user.tenantId, id);
  }
}
