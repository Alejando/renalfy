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
} from '@nestjs/common';
import type { UserRole } from '@repo/types';
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
  @Roles(...OWNERS_ADMINS)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateProductCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productCategoriesService.create(dto, user.tenantId);
  }

  @Delete(':id')
  @Roles(...OWNERS_ADMINS)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.productCategoriesService.remove(id, user.tenantId);
  }
}
