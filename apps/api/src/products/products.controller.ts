import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { UserRole } from '@repo/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

const OWNERS_ADMINS: UserRole[] = ['OWNER', 'ADMIN'];

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...OWNERS_ADMINS)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productsService.create(
      dto,
      user.tenantId,
      user.role as UserRole,
    );
  }

  @Get('categories')
  findCategories(@CurrentUser() user: CurrentUserPayload) {
    return this.productsService.findCategories(user.tenantId);
  }

  @Get()
  findAll(
    @Query() query: ProductQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('locationId') locationId: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const effectiveLocationId = ['MANAGER', 'STAFF'].includes(user.role)
      ? (user.locationId ?? undefined)
      : locationId;
    return this.productsService.findOne(id, user.tenantId, effectiveLocationId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...OWNERS_ADMINS)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productsService.update(
      id,
      dto,
      user.tenantId,
      user.role as UserRole,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...OWNERS_ADMINS)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.productsService.remove(
      id,
      user.tenantId,
      user.role as UserRole,
    );
  }
}
