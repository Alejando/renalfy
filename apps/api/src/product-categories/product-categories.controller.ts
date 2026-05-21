import {
  Controller,
  Get,
  Post,
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
import { ProductCategoriesService } from './product-categories.service.js';
import { CreateProductCategoryDto } from './dto/create-category.dto.js';
import { CategoryQueryDto } from './dto/category-query.dto.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

const OWNERS_ADMINS: UserRole[] = ['OWNER', 'ADMIN'];

@Controller('product-categories')
@UseGuards(JwtAuthGuard)
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Get()
  findAll(
    @Query() query: CategoryQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productCategoriesService.findAll(user.tenantId, query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...OWNERS_ADMINS)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateProductCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productCategoriesService.create(dto, user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...OWNERS_ADMINS)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.productCategoriesService.remove(id, user.tenantId);
  }
}
