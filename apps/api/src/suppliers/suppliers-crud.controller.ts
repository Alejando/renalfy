import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { SuppliersService } from './suppliers.service.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto.js';
import { UpdateSupplierProductDto } from './dto/update-supplier-product.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersCrudController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  create(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  update(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user.tenantId, id, dto);
  }

  @Get(':id/products')
  findProductsBySupplier(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.suppliersService.findProductsBySupplier(user.tenantId, id);
  }

  @Post(':id/products')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  addProduct(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: CreateSupplierProductDto,
  ) {
    return this.suppliersService.addProduct(user.tenantId, id, dto);
  }

  @Patch(':supplierId/products/:productId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  updateProduct(
    @CurrentUser() user: { tenantId: string },
    @Param('supplierId') supplierId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateSupplierProductDto,
  ) {
    return this.suppliersService.updateProduct(
      user.tenantId,
      supplierId,
      productId,
      dto,
    );
  }

  @Delete(':supplierId/products/:productId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  removeProduct(
    @CurrentUser() user: { tenantId: string },
    @Param('supplierId') supplierId: string,
    @Param('productId') productId: string,
  ) {
    return this.suppliersService.removeProduct(
      user.tenantId,
      supplierId,
      productId,
    );
  }
}
