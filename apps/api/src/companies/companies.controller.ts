import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { UserRole } from '@repo/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator.js';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { CompanyQueryDto } from './dto/company-query.dto.js';

const OWNERS_ADMINS: UserRole[] = ['OWNER', 'ADMIN'];

@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(...OWNERS_ADMINS)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companiesService.create(
      dto,
      user.tenantId,
      user.role as UserRole,
    );
  }

  @Get()
  findAll(
    @Query() query: CompanyQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companiesService.findAll(user.tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.companiesService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles(...OWNERS_ADMINS)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companiesService.update(
      id,
      dto,
      user.tenantId,
      user.role as UserRole,
    );
  }

  @Delete(':id')
  @Roles(...OWNERS_ADMINS)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.companiesService.remove(
      id,
      user.tenantId,
      user.role as UserRole,
    );
  }
}
