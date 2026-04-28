import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { SuppliersService } from './suppliers.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductSuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get(':id/suppliers')
  findSuppliersByProduct(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.suppliersService.findSuppliersByProduct(user.tenantId, id);
  }
}
